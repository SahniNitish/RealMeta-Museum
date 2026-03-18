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
import { uploadToS3, generateS3Key, deleteFromS3, extractS3KeyFromUrl, isS3Url } from '../services/s3';
import Logger from '../utils/logger';

const router = Router();

// Temporary storage for processing before S3 upload
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dest = path.join(__dirname, '..', '..', 'uploads', 'temp');
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

// Helper to clean up temp file
const cleanupTempFile = (filePath: string) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      Logger.info(`Cleaned up temp file: ${filePath}`);
    }
  } catch (err) {
    Logger.warn(`Failed to cleanup temp file: ${filePath}`);
  }
};

// File size limits (in bytes)
const FILE_LIMITS = {
  image: 10 * 1024 * 1024,    // 10MB
  video: 100 * 1024 * 1024,   // 100MB
  audio: 50 * 1024 * 1024,    // 50MB
  document: 20 * 1024 * 1024, // 20MB
};

const upload = multer({
  storage,
  limits: { fileSize: FILE_LIMITS.image }, // 10MB for artwork images
  fileFilter: (_req, _file, cb) => {
    cb(null, true); // Accept any file
  }
});

// Allowed MIME types
const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'],
  document: ['application/pdf'],
};

// Multer configurations for different media types
const imageUpload = multer({
  storage,
  limits: { fileSize: FILE_LIMITS.image },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.image.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image format. Allowed: JPEG, PNG, WebP, GIF'));
    }
  }
});

const videoUpload = multer({
  storage,
  limits: { fileSize: FILE_LIMITS.video },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.video.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid video format. Allowed: MP4, WebM, MOV'));
    }
  }
});

const audioUpload = multer({
  storage,
  limits: { fileSize: FILE_LIMITS.audio },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.audio.includes(file.mimetype) || file.originalname.endsWith('.mp3')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio format. Allowed: MP3, WAV, OGG'));
    }
  }
});

const documentUpload = multer({
  storage,
  limits: { fileSize: FILE_LIMITS.document },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.document.includes(file.mimetype) || file.originalname.endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid document format. Allowed: PDF'));
    }
  }
});

// Helper to extract YouTube video ID
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Helper to extract Vimeo video ID
function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

// Upload an image and create a draft artwork record
// OPTIMIZED: Run CLIP, AI, and Wikipedia in parallel. Translation/Audio deferred to finalize.
router.post('/upload', upload.single('image'), async (req: Request, res: Response) => {
  let tempFilePath: string | null = null;

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

    tempFilePath = file.path;
    const absPath = tempFilePath;

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

    // Create artwork first to get the ID for S3 path
    const doc = await Artwork.create({
      title: ai.title || 'Unlabeled Artwork',
      author: ai.author,
      year: ai.year,
      style: ai.style,
      description: baseDescription,
      museumId: museum._id,
      imageEmbedding: imageEmbedding.length > 0 ? imageEmbedding : undefined,
      descriptions: { en: baseDescription },
      imageUrl: '', // Will update after S3 upload
      sources: wiki?.sources
    });

    // Upload to S3
    const s3Key = generateS3Key(museumId, doc._id.toString(), 'main', file.originalname);
    const imageUrl = await uploadToS3(absPath, s3Key);

    // Update artwork with S3 URL
    await Artwork.findByIdAndUpdate(doc._id, { imageUrl });

    // Clean up temp file
    cleanupTempFile(tempFilePath);
    tempFilePath = null;

    Logger.info(`Upload completed in ${Date.now() - startTime}ms total`);

    res.json({
      id: doc._id,
      imageUrl,
      ai,
      wiki,
      autoTranslated: false,
      audioGenerated: [],
      descriptions: {
        english: baseDescription,
        french: baseDescription,
        spanish: baseDescription
      },
      audioUrls: {
        english: undefined,
        french: undefined,
        spanish: undefined
      }
    });
  } catch (err: unknown) {
    // Clean up temp file on error
    if (tempFilePath) cleanupTempFile(tempFilePath);

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

    // Get artwork to get museumId for S3 path
    const artwork = await Artwork.findById(id);
    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    // Save metadata immediately
    await Artwork.findByIdAndUpdate(id, {
      title,
      author,
      year,
      style,
      description,
      sources,
      externalLinks,
    });

    // Respond immediately so CloudFront doesn't timeout
    res.json({
      id: artwork._id,
      title,
      author,
      year,
      style,
      imageUrl: artwork.imageUrl,
      message: 'Artwork saved. Translations and audio are being generated in the background.',
      processing: true
    });

    // Process translations and audio in the background (after response sent)
    (async () => {
      try {
        Logger.info(`[Background] Auto-translating description from ${sourceLanguage} to all languages...`);

        const descriptions = await translateDescription(description, sourceLanguage);

        Logger.info(`[Background] Translations completed: ${JSON.stringify({
          en: descriptions.en?.substring(0, 50) + '...',
          fr: descriptions.fr?.substring(0, 50) + '...',
          es: descriptions.es?.substring(0, 50) + '...'
        })}`);

        Logger.info('[Background] Generating audio in all 3 languages...');

        const audioUrls = await generateMultiLanguageAudio(descriptions, {
          museumId: artwork.museumId?.toString(),
          artworkId: id
        });

        Logger.info(`[Background] Audio generation completed: ${JSON.stringify(Object.keys(audioUrls))}`);

        await Artwork.findByIdAndUpdate(id, {
          description: descriptions[sourceLanguage as keyof typeof descriptions],
          descriptions,
          audioUrls
        });

        Logger.info(`[Background] Artwork ${id} fully finalized with translations and audio.`);
      } catch (bgErr: unknown) {
        const bgMessage = bgErr instanceof Error ? bgErr.message : 'Unknown error';
        Logger.error(`[Background] Finalize error for ${id}: ${bgMessage}`);
      }
    })();

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

// ==================== MEDIA ENDPOINTS ====================

// Upload additional photos (max 10)
router.post('/:id/media/photos', imageUpload.array('photos', 10), async (req: Request, res: Response) => {
  const tempFiles: string[] = [];
  try {
    await connectToDatabase();
    const { id } = req.params;
    const files = req.files as Express.Multer.File[];
    const captions = req.body.captions ? JSON.parse(req.body.captions) : [];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No photos uploaded' });
    }

    const artwork = await Artwork.findById(id);
    if (!artwork) return res.status(404).json({ error: 'Artwork not found' });

    const currentPhotos = artwork.additionalPhotos || [];
    if (currentPhotos.length + files.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 photos allowed' });
    }

    // Upload each photo to S3
    const newPhotos = await Promise.all(files.map(async (file, index) => {
      tempFiles.push(file.path);
      const s3Key = generateS3Key(artwork.museumId?.toString() || 'unknown', id, 'photos', file.originalname);
      const url = await uploadToS3(file.path, s3Key);
      return {
        url,
        caption: captions[index] || '',
        uploadedAt: new Date(),
      };
    }));

    const updated = await Artwork.findByIdAndUpdate(
      id,
      { $push: { additionalPhotos: { $each: newPhotos } } },
      { new: true }
    );

    // Clean up temp files
    tempFiles.forEach(cleanupTempFile);

    Logger.info(`Added ${newPhotos.length} photos to artwork ${id}`);
    res.json({ success: true, photos: updated?.additionalPhotos });
  } catch (err: unknown) {
    tempFiles.forEach(cleanupTempFile);
    const message = err instanceof Error ? err.message : 'Unknown error';
    Logger.error(`Photo upload error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// Upload video file or add YouTube/Vimeo URL (max 5)
router.post('/:id/media/videos', videoUpload.single('video'), async (req: Request, res: Response) => {
  let tempFilePath: string | null = null;
  try {
    await connectToDatabase();
    const { id } = req.params;
    const { videoUrl, title } = req.body;
    const file = req.file;

    const artwork = await Artwork.findById(id);
    if (!artwork) return res.status(404).json({ error: 'Artwork not found' });

    const currentVideos = artwork.videos || [];
    if (currentVideos.length >= 5) {
      return res.status(400).json({ error: 'Maximum 5 videos allowed' });
    }

    let newVideo;

    if (file) {
      // File upload to S3
      tempFilePath = file.path;
      const s3Key = generateS3Key(artwork.museumId?.toString() || 'unknown', id, 'videos', file.originalname);
      const url = await uploadToS3(file.path, s3Key);
      cleanupTempFile(tempFilePath);
      tempFilePath = null;

      newVideo = {
        type: 'upload' as const,
        url,
        title: title || file.originalname,
        uploadedAt: new Date(),
      };
    } else if (videoUrl) {
      // YouTube or Vimeo URL
      const youtubeId = extractYouTubeId(videoUrl);
      const vimeoId = extractVimeoId(videoUrl);

      if (youtubeId) {
        newVideo = {
          type: 'youtube' as const,
          url: videoUrl,
          embedId: youtubeId,
          title: title || 'YouTube Video',
          uploadedAt: new Date(),
        };
      } else if (vimeoId) {
        newVideo = {
          type: 'vimeo' as const,
          url: videoUrl,
          embedId: vimeoId,
          title: title || 'Vimeo Video',
          uploadedAt: new Date(),
        };
      } else {
        return res.status(400).json({ error: 'Invalid video URL. Must be YouTube or Vimeo.' });
      }
    } else {
      return res.status(400).json({ error: 'Either video file or URL required' });
    }

    const updated = await Artwork.findByIdAndUpdate(
      id,
      { $push: { videos: newVideo } },
      { new: true }
    );

    Logger.info(`Added video to artwork ${id}: ${newVideo.type}`);
    res.json({ success: true, videos: updated?.videos });
  } catch (err: unknown) {
    if (tempFilePath) cleanupTempFile(tempFilePath);
    const message = err instanceof Error ? err.message : 'Unknown error';
    Logger.error(`Video upload error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// Upload music/audio files (max 5)
router.post('/:id/media/music', audioUpload.single('music'), async (req: Request, res: Response) => {
  let tempFilePath: string | null = null;
  try {
    await connectToDatabase();
    const { id } = req.params;
    const { title, artist } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    tempFilePath = file.path;

    const artwork = await Artwork.findById(id);
    if (!artwork) return res.status(404).json({ error: 'Artwork not found' });

    const currentTracks = artwork.musicTracks || [];
    if (currentTracks.length >= 5) {
      return res.status(400).json({ error: 'Maximum 5 music tracks allowed' });
    }

    // Upload to S3
    const s3Key = generateS3Key(artwork.museumId?.toString() || 'unknown', id, 'audio', file.originalname);
    const url = await uploadToS3(file.path, s3Key);
    cleanupTempFile(tempFilePath);
    tempFilePath = null;

    const newTrack = {
      url,
      title: title || file.originalname,
      artist: artist || '',
      uploadedAt: new Date(),
    };

    const updated = await Artwork.findByIdAndUpdate(
      id,
      { $push: { musicTracks: newTrack } },
      { new: true }
    );

    Logger.info(`Added music track to artwork ${id}: ${newTrack.title}`);
    res.json({ success: true, musicTracks: updated?.musicTracks });
  } catch (err: unknown) {
    if (tempFilePath) cleanupTempFile(tempFilePath);
    const message = err instanceof Error ? err.message : 'Unknown error';
    Logger.error(`Music upload error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// Upload PDF documents (max 5)
router.post('/:id/media/documents', documentUpload.single('document'), async (req: Request, res: Response) => {
  let tempFilePath: string | null = null;
  try {
    await connectToDatabase();
    const { id } = req.params;
    const { title, description } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No document uploaded' });
    }

    tempFilePath = file.path;

    const artwork = await Artwork.findById(id);
    if (!artwork) return res.status(404).json({ error: 'Artwork not found' });

    const currentDocs = artwork.documents || [];
    if (currentDocs.length >= 5) {
      return res.status(400).json({ error: 'Maximum 5 documents allowed' });
    }

    // Upload to S3
    const s3Key = generateS3Key(artwork.museumId?.toString() || 'unknown', id, 'documents', file.originalname);
    const url = await uploadToS3(file.path, s3Key);
    cleanupTempFile(tempFilePath);
    tempFilePath = null;

    const newDoc = {
      url,
      title: title || file.originalname,
      description: description || '',
      uploadedAt: new Date(),
    };

    const updated = await Artwork.findByIdAndUpdate(
      id,
      { $push: { documents: newDoc } },
      { new: true }
    );

    Logger.info(`Added document to artwork ${id}: ${newDoc.title}`);
    res.json({ success: true, documents: updated?.documents });
  } catch (err: unknown) {
    if (tempFilePath) cleanupTempFile(tempFilePath);
    const message = err instanceof Error ? err.message : 'Unknown error';
    Logger.error(`Document upload error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// Delete media item by type and index
router.delete('/:id/media/:type/:index', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const { id, type, index } = req.params;
    const idx = parseInt(index, 10);

    if (isNaN(idx) || idx < 0) {
      return res.status(400).json({ error: 'Invalid index' });
    }

    const validTypes = ['photos', 'videos', 'music', 'documents'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid media type' });
    }

    const artwork = await Artwork.findById(id);
    if (!artwork) return res.status(404).json({ error: 'Artwork not found' });

    // Map type to field name
    const fieldMap: Record<string, 'additionalPhotos' | 'videos' | 'musicTracks' | 'documents'> = {
      photos: 'additionalPhotos',
      videos: 'videos',
      music: 'musicTracks',
      documents: 'documents',
    };
    const fieldName = fieldMap[type];
    const items = artwork[fieldName];

    if (!items || idx >= items.length) {
      return res.status(404).json({ error: 'Media item not found' });
    }

    // Get the URL for file deletion
    const item = items[idx];
    const fileUrl = item?.url;

    // Remove item from array using $unset and $pull
    const unsetUpdate: Record<string, unknown> = {};
    unsetUpdate[`${fieldName}.${idx}`] = 1;
    await Artwork.findByIdAndUpdate(id, { $unset: unsetUpdate });

    const pullUpdate: Record<string, unknown> = {};
    pullUpdate[fieldName] = null;
    const updated = await Artwork.findByIdAndUpdate(
      id,
      { $pull: pullUpdate },
      { new: true }
    );

    // Delete the file from S3 or local
    if (fileUrl) {
      if (isS3Url(fileUrl)) {
        const s3Key = extractS3KeyFromUrl(fileUrl);
        if (s3Key) {
          try {
            await deleteFromS3(s3Key);
          } catch (s3Err) {
            Logger.warn(`Failed to delete from S3: ${s3Key}`);
          }
        }
      } else if (fileUrl.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '..', '..', fileUrl.replace(/^\//, ''));
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            Logger.info(`Deleted local file: ${filePath}`);
          }
        } catch (fileErr) {
          Logger.warn(`Failed to delete file: ${filePath}`);
        }
      }
    }

    Logger.info(`Deleted ${type} at index ${idx} from artwork ${id}`);
    res.json({ success: true, [fieldName]: updated?.[fieldName] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    Logger.error(`Media delete error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// Delete an artwork and its associated files
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const { id } = req.params;
    const doc = await Artwork.findById(id);
    if (!doc) return res.status(404).json({ error: 'Not found' });

    // Collect all URLs to delete
    const urls: string[] = [];
    if (doc.imageUrl) urls.push(doc.imageUrl);
    if (doc.audioUrl) urls.push(doc.audioUrl);
    if (doc.audioUrls) {
      for (const url of Object.values(doc.audioUrls)) {
        if (url) urls.push(url);
      }
    }

    // Collect media file URLs
    if (doc.additionalPhotos) {
      for (const photo of doc.additionalPhotos) {
        if (photo.url) urls.push(photo.url);
      }
    }
    if (doc.videos) {
      for (const video of doc.videos) {
        if (video.type === 'upload' && video.url) {
          urls.push(video.url);
        }
      }
    }
    if (doc.musicTracks) {
      for (const track of doc.musicTracks) {
        if (track.url) urls.push(track.url);
      }
    }
    if (doc.documents) {
      for (const docItem of doc.documents) {
        if (docItem.url) urls.push(docItem.url);
      }
    }

    // Delete DB document
    await Artwork.findByIdAndDelete(id);

    // Best-effort delete files from S3 or local
    for (const url of urls) {
      try {
        if (isS3Url(url)) {
          const s3Key = extractS3KeyFromUrl(url);
          if (s3Key) await deleteFromS3(s3Key);
        } else if (url.startsWith('/uploads/')) {
          const filePath = path.join(__dirname, '..', '..', url.replace(/^\//, ''));
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
      } catch { }
    }

    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;


