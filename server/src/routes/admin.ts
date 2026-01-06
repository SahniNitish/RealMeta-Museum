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
// OPTIMIZED: Run CLIP, AI, and Wikipedia in parallel. Translation/Audio deferred to finalize.
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

    // OPTIMIZATION: Run CLIP embedding and AI recognition in parallel
    Logger.info('Starting parallel processing: CLIP embedding + AI recognition...');
    const startTime = Date.now();

    const [clipResult, ai] = await Promise.all([
      // CLIP embedding (wrapped to handle errors gracefully)
      generateImageEmbedding(absPath).catch((err) => {
        Logger.warn(`CLIP embedding generation failed: ${err}`);
        return [] as number[];
      }),
      // AI recognition
      recognizeArtworkFromImage(absPath)
    ]);

    const imageEmbedding = clipResult;
    Logger.info(`Parallel processing completed in ${Date.now() - startTime}ms`);

    // Fetch Wikipedia info in parallel if we have a title (fast operation)
    let wiki = null;
    if (ai.title) {
      try {
        wiki = await fetchFromWikipedia(`${ai.title} ${ai.author || ''}`.trim());
      } catch (wikiErr) {
        Logger.warn(`Wikipedia fetch failed: ${wikiErr}`);
      }
    }

    // Create initial artwork with basic info - NO translation/audio during upload
    const baseDescription = wiki?.description || ai.description || 'Artwork uploaded to museum system.';

    const doc = await Artwork.create({
      title: ai.title || 'Unlabeled Artwork',
      author: ai.author,
      year: ai.year,
      style: ai.style,
      description: baseDescription,
      museumId: museum._id,
      imageEmbedding: imageEmbedding.length > 0 ? imageEmbedding : undefined,
      descriptions: { en: baseDescription }, // Basic English only, translations on finalize
      imageUrl,
      sources: wiki?.sources
      // audioUrls will be generated on finalize
    });

    Logger.info(`Upload completed in ${Date.now() - startTime}ms total`);

    res.json({
      id: doc._id,
      imageUrl,
      ai,
      wiki,
      autoTranslated: false, // Translations happen on finalize
      audioGenerated: [],    // Audio happens on finalize
      descriptions: {
        english: baseDescription,
        french: baseDescription, // Placeholder - will be translated on save
        spanish: baseDescription
      },
      audioUrls: {
        english: undefined,
        french: undefined,
        spanish: undefined
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
    const { title, author, year, style, description, sources, externalLinks, sourceLanguage = 'en' } = req.body || {};

    if (!description) {
      return res.status(400).json({ error: 'Description is required for translation and audio generation' });
    }

    Logger.info(`Auto-translating description from ${sourceLanguage} to all languages...`);

    // Translate to all 3 languages automatically
    const descriptions = await translateDescription(description, sourceLanguage);

    Logger.info(`Translations completed: ${JSON.stringify({
      en: descriptions.en?.substring(0, 50) + '...',
      fr: descriptions.fr?.substring(0, 50) + '...',
      es: descriptions.es?.substring(0, 50) + '...'
    })}`);

    Logger.info('Generating audio in all 3 languages...');

    // Generate audio in all 3 languages automatically
    const audioUrls = await generateMultiLanguageAudio(descriptions);

    Logger.info(`Audio generation completed: ${JSON.stringify(Object.keys(audioUrls))}`);

    const updated = await Artwork.findByIdAndUpdate(
      id,
      {
        title,
        author,
        year,
        style,
        description: descriptions[sourceLanguage as keyof typeof descriptions],
        descriptions,
        sources,
        externalLinks, // External resource links (Google Drive, etc.)
        audioUrls
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
      externalLinks: updated.externalLinks,

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


