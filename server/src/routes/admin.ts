import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { connectToDatabase } from '../utils/db';
import { Artwork } from '../models/Artwork';
import { recognizeArtworkFromImage } from '../services/vision';
import { fetchFromWikipedia } from '../services/resources';
import { synthesizeWithElevenLabs, generateMultiLanguageAudio } from '../services/tts';
import { translateDescription } from '../services/translation';
import fs from 'fs';

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
    
    console.log('Upload debug:', { 
      hasFile: !!file, 
      filename: file?.filename,
      originalname: file?.originalname,
      contentType: req.headers['content-type']
    });
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const imageUrl = `/uploads/${file.filename}`;
    // Try AI recognition
    const absPath = path.join(__dirname, '..', '..', 'uploads', file.filename);
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
      console.log('🌍 Auto-translating initial description...');
      try {
        descriptions = await translateDescription(baseDescription, 'en');
        console.log('🎵 Generating initial audio files...');
        audioUrls = await generateMultiLanguageAudio(descriptions);
      } catch (error) {
        console.log('⚠️ Translation/audio generation failed during upload:', error);
        // Fallback: at least generate English audio so UI has narration
        try {
          console.log('🎵 Fallback: generating English audio only...');
          const enOnly = { en: baseDescription } as any;
          audioUrls = await generateMultiLanguageAudio(enOnly);
        } catch (ttsError) {
          console.log('❌ Fallback English audio failed:', ttsError);
        }
      }
    }

    const doc = await Artwork.create({
      title: ai.title || 'Unlabeled Artwork',
      author: ai.author,
      year: ai.year,
      style: ai.style,
      description: baseDescription,
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
        english: descriptions.en,
        french: descriptions.fr,
        spanish: descriptions.es
      },
      audioUrls: {
        english: audioUrls.en,
        french: audioUrls.fr,
        spanish: audioUrls.es
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
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

    console.log(`🌍 Auto-translating description from ${sourceLanguage} to all languages...`);
    
    // ALWAYS translate to all 3 languages automatically
    const descriptions = await translateDescription(description, sourceLanguage);
    
    console.log('✅ Translations completed:', {
      en: descriptions.en?.substring(0, 50) + '...',
      fr: descriptions.fr?.substring(0, 50) + '...',
      es: descriptions.es?.substring(0, 50) + '...'
    });

    console.log('🎵 Generating audio in all 3 languages...');
    
    // ALWAYS generate audio in all 3 languages automatically
    const audioUrls = await generateMultiLanguageAudio(descriptions);
    
    console.log('✅ Audio generation completed:', Object.keys(audioUrls));

    const updated = await Artwork.findByIdAndUpdate(
      id,
      { 
        title, 
        author, 
        year, 
        style, 
        description: descriptions[sourceLanguage], // Use translated version as main description
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
    console.error('❌ Finalize error:', message);
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

    console.log(`🧪 Testing translation of: "${text}"`);
    
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
    
    console.log(`🎵 Testing TTS for language: ${language}`);
    console.log(`📝 Text: ${text}`);
    
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
    console.error('TTS test error:', message);
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

    console.log(`🔍 Testing AI Vision with image: ${file.filename}`);
    
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
    console.error('Vision test error:', message);
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

    console.log(`🤖 Testing Hugging Face Vision with image: ${file.filename}`);
    
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
    console.error('Hugging Face test error:', message);
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
      try { fs.existsSync(file) && fs.unlinkSync(file); } catch {}
    }

    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;


