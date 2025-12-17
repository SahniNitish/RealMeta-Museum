import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { connectToDatabase } from '../utils/db';
import { Artwork } from '../models/Artwork';
import { Museum } from '../models/Museum';
import { recognizeArtworkFromImage } from '../services/vision';
import { fetchFromWikipedia } from '../services/resources';
import { synthesizeWithElevenLabs, generateMultiLanguageAudio } from '../services/tts';
import { translateDescription } from '../services/translation';
import { generateImageEmbedding } from '../services/clip';
import Logger from '../utils/logger';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dest = path.join(__dirname, '..', '..', 'uploads');
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9-_]/gi, '_');
    const name = `${Date.now()}_${base}${ext || '.jpg'}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, _file, cb) => {
    cb(null, true); // Accept any file
  }
});

// Upload an image and create a draft artwork record
router.post('/upload', upload.single('image'), async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const file = req.file;
    const { museumId } = req.body;

    Logger.debug(`Upload debug: ${JSON.stringify({
      hasFile: !!file,
      filename: file?.filename,
      originalname: file?.originalname,
      museumId,
      contentType: req.headers['content-type']
    })}`);

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!museumId) {
      return res.status(400).json({ error: 'Museum ID is required' });
    }

    // Verify museum exists
    const museum = await Museum.findById(museumId);
    if (!museum) {
      return res.status(404).json({ error: 'Museum not found' });
    }

    const imageUrl = `/uploads/${file.filename}`;
    const absPath = path.join(__dirname, '..', '..', 'uploads', file.filename);

    // Generate CLIP embedding for image matching
    Logger.info('Generating CLIP embedding...');
    let imageEmbedding: number[] = [];
    try {
      imageEmbedding = await generateImageEmbedding(absPath);
      Logger.info('CLIP embedding generated successfully');
    } catch (embError) {
      Logger.warn(`CLIP embedding generation failed: ${embError}`);
      // Continue without embedding - visitor matching won't work but admin can still upload
    }

    // Try AI recognition
    const ai = await recognizeArtworkFromImage(absPath);
    let wiki = null;
    if (ai.title) {
      wiki = await fetchFromWikipedia(`${ai.title} ${ai.author || ''}`.trim());
    }

    // Create initial artwork with basic info
    const baseDescription = wiki?.description || ai.description || 'Artwork uploaded to museum system.';

    // Auto-translate description if we have one
    let descriptions = { en: baseDescription };
    let audioUrls = {};

    if (baseDescription && baseDescription !== 'Set OPENAI_API_KEY to enable recognition.') {
      Logger.info('Auto-translating initial description...');
      try {
        descriptions = await translateDescription(baseDescription, 'en');
        Logger.info('Translations completed');
      } catch (error) {
        Logger.warn(`Translation failed, using English only: ${error}`);
        descriptions = { en: baseDescription, fr: baseDescription, es: baseDescription } as any;
      }

      // Try audio generation but don't fail the upload if it doesn't work
      Logger.info('Attempting audio generation...');
      try {
        audioUrls = await generateMultiLanguageAudio(descriptions);
        Logger.info('Audio files generated');
      } catch (ttsError) {
        Logger.warn(`Audio generation failed (upload will continue without audio): ${ttsError}`);
        // Continue without audio - upload will still succeed
      }
    }

    const doc = await Artwork.create({
      title: ai.title || 'Unlabeled Artwork',
      author: ai.author,
      year: ai.year,
      style: ai.style,
      description: baseDescription,
      museumId: museum._id,
      imageEmbedding: imageEmbedding.length > 0 ? imageEmbedding : undefined,
      descriptions,
      imageUrl,
      sources: wiki?.sources,
      audioUrls: Object.keys(audioUrls).length > 0 ? audioUrls : undefined
    });

    res.json({
      id: doc._id,
      imageUrl,
      ai,
      wiki,
      autoTranslated: Object.keys(descriptions).length > 1,
      audioGenerated: Object.keys(audioUrls),
      descriptions: {
        english: (descriptions as any).en || baseDescription,
        french: (descriptions as any).fr || (descriptions as any).en || baseDescription,
        spanish: (descriptions as any).es || (descriptions as any).en || baseDescription
      },
      audioUrls: {
        english: (audioUrls as any).en || undefined,
        french: (audioUrls as any).fr || undefined,
        spanish: (audioUrls as any).es || undefined
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const stack = err instanceof Error ? err.stack : undefined;
    Logger.error(`Upload route error: ${message}`);
    Logger.error(`Stack trace: ${stack}`);
    res.status(500).json({ error: message, details: stack?.split('\n').slice(0, 3).join('\n') });
  }
});

// Save finalized metadata for an artwork
router.post('/:id/finalize', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const { title, author, year, style, description, sources, sourceLanguage = 'en' } = req.body || {};

    if (!description) {
      return res.status(400).json({ error: 'Description is required for translation and audio generation' });
    }

    Logger.info(`Auto-translating description from ${sourceLanguage} to all languages...`);

    // ALWAYS translate to all 3 languages automatically
    const descriptions = await translateDescription(description, sourceLanguage);

    Logger.info(`Translations completed: ${JSON.stringify({
      en: descriptions.en?.substring(0, 50) + '...',
      fr: descriptions.fr?.substring(0, 50) + '...',
      es: descriptions.es?.substring(0, 50) + '...'
    })}`);

    Logger.info('Generating audio in all 3 languages...');

    // ALWAYS generate audio in all 3 languages automatically
    const audioUrls = await generateMultiLanguageAudio(descriptions);

    Logger.info(`Audio generation completed: ${JSON.stringify(Object.keys(audioUrls))}`);

    const updated = await Artwork.findByIdAndUpdate(
      id,
      {
        title,
        author,
        year,
        style,
        description: descriptions[sourceLanguage as keyof typeof descriptions], // Use translated version as main description
        descriptions, // Store all translations
        sources,
        audioUrls // Store all audio files
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: 'Not found' });

    res.json({
      id: updated._id,
      title: updated.title,
      author: updated.author,
      year: updated.year,
      style: updated.style,
      imageUrl: updated.imageUrl,

      // All translations
      descriptions: {
        english: descriptions.en,
        french: descriptions.fr,
        spanish: descriptions.es
      },

      // All audio files
      audioUrls: {
        english: audioUrls.en,
        french: audioUrls.fr,
        spanish: audioUrls.es
      },

      sources: updated.sources,

      // Summary
      translationsGenerated: ['English', 'French', 'Spanish'],
      audioFilesGenerated: Object.keys(audioUrls).map(lang => {
        const langNames = { en: 'English', fr: 'French', es: 'Spanish' };
        return langNames[lang as keyof typeof langNames];
      }),

      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    Logger.error(`Finalize error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// Test translation endpoint
router.post('/test-translation', async (req: Request, res: Response) => {
  try {
    const { text, sourceLanguage = 'en' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    Logger.info(`Testing translation of: "${text}"`);

    const translations = await translateDescription(text, sourceLanguage);

    res.json({
      original: text,
      sourceLanguage,
      translations,
      success: true
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Test ElevenLabs TTS endpoint
router.post('/test-tts', async (req: Request, res: Response) => {
  try {
    const { text = "Hello, this is a test of the text to speech system.", language = 'en' } = req.body;

    Logger.info(`Testing TTS for language: ${language}`);
    Logger.info(`Text: ${text}`);

    const audioUrl = await synthesizeWithElevenLabs({
      text,
      language: language as 'en' | 'fr' | 'es'
    });

    if (audioUrl) {
      res.json({
        success: true,
        audioUrl,
        language,
        message: `Audio generated successfully in ${language}`
      });
    } else {
      res.json({
        success: false,
        message: 'TTS failed - check your ElevenLabs API key and console logs'
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`TTS test error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// Test AI Vision Recognition
router.post('/test-vision', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    Logger.info(`Testing AI Vision with image: ${file.filename}`);

    const imagePath = path.join(__dirname, '..', '..', 'uploads', file.filename);
    const aiResult = await recognizeArtworkFromImage(imagePath);

    res.json({
      success: true,
      filename: file.filename,
      imageUrl: `/uploads/${file.filename}`,
      aiAnalysis: aiResult,
      message: 'AI Vision analysis completed'
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`Vision test error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// Test Hugging Face API specifically
router.post('/test-huggingface', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    Logger.info(`Testing Hugging Face Vision with image: ${file.filename}`);

    const imagePath = path.join(__dirname, '..', '..', 'uploads', file.filename);
    const { recognizeWithHuggingFace } = await import('../services/huggingface-vision');
    const hfResult = await recognizeWithHuggingFace(imagePath);

    res.json({
      success: true,
      filename: file.filename,
      imageUrl: `/uploads/${file.filename}`,
      huggingFaceAnalysis: hfResult,
      provider: 'Hugging Face (FREE)',
      message: 'Hugging Face Vision analysis completed'
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`Hugging Face test error: ${message}`);
    res.status(500).json({ error: `Hugging Face test failed: ${message}` });
  }
});

// Delete an artwork and its associated files
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const doc = await Artwork.findById(id);
    if (!doc) return res.status(404).json({ error: 'Not found' });

    // Collect files to remove
    const files: string[] = [];
    if (doc.imageUrl) files.push(path.join(__dirname, '..', '..', doc.imageUrl.replace(/^\//, '')));
    if (doc.audioUrl) files.push(path.join(__dirname, '..', '..', doc.audioUrl.replace(/^\//, '')));
    if (doc.audioUrls) {
      for (const url of Object.values(doc.audioUrls)) {
        if (url) files.push(path.join(__dirname, '..', '..', url.replace(/^\//, '')));
      }
    }

    // Delete DB document
    await Artwork.findByIdAndDelete(id);

    // Best-effort delete files
    for (const file of files) {
      try { fs.existsSync(file) && fs.unlinkSync(file); } catch { }
    }

    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;


