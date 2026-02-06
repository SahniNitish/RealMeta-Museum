import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Museum } from '../models/Museum';
import { Artwork } from '../models/Artwork';
import { Visitor } from '../models/Visitor';
import { connectToDatabase } from '../utils/db';
import { generateImageEmbedding, findBestMatches, isConfidentMatch } from '../services/clip';
import Logger from '../utils/logger';

const router = Router();

// Configure multer for visitor photo uploads (temporary)
const visitorStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dest = path.join(__dirname, '..', '..', 'uploads', 'visitor_temp');
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `visitor_${Date.now()}${ext || '.jpg'}`;
    cb(null, name);
  },
});

const visitorUpload = multer({
  storage: visitorStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  }
});

// GET /api/visit/:qrCode - Get museum info by QR code
router.get('/:qrCode', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const { qrCode } = req.params;

    const museum = await Museum.findOne({ qrCode: qrCode.toLowerCase() });

    if (!museum) {
      return res.status(404).json({ error: 'Museum not found' });
    }

    // Get artwork count
    const artworkCount = await Artwork.countDocuments({ museumId: museum._id });

    res.json({
      success: true,
      museum: {
        id: museum._id,
        name: museum.name,
        location: museum.location,
        description: museum.description,
        website: museum.website,
        artworkCount
      }
    });
  } catch (error: any) {
    Logger.error(`Error fetching museum by QR code: ${error}`);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/visit/:qrCode/identify - Upload visitor photo and match artwork
router.post('/:qrCode/identify', visitorUpload.single('photo'), async (req: Request, res: Response) => {
  let tempFilePath: string | null = null;

  try {
    await connectToDatabase();

    const { qrCode } = req.params;
    const { language = 'en' } = req.body;
    const file = req.file;

    Logger.info(`Visitor artwork identification request: ${JSON.stringify({
      qrCode,
      language,
      hasFile: !!file,
      filename: file?.filename
    })}`);

    if (!file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    tempFilePath = file.path;

    // Find museum by QR code
    const museum = await Museum.findOne({ qrCode: qrCode.toLowerCase() });

    if (!museum) {
      return res.status(404).json({ error: 'Museum not found' });
    }

    Logger.info(`Museum found: ${museum.name}`);

    // Get all artworks for this museum with embeddings
    const artworks = await Artwork.find({
      museumId: museum._id,
      imageEmbedding: { $exists: true, $ne: [] }
    });

    Logger.info(`Found ${artworks.length} artworks with embeddings in ${museum.name}`);

    if (artworks.length === 0) {
      return res.json({
        success: false,
        error: 'No artworks with embeddings found in this museum',
        museum: {
          id: museum._id,
          name: museum.name
        }
      });
    }

    // Generate embedding for visitor's photo
    Logger.info('Generating embedding for visitor photo...');
    const visitorEmbedding = await generateImageEmbedding(tempFilePath);
    Logger.info('Visitor photo embedding generated');

    // Find best matches - get ALL matches for debugging
    const allMatches = findBestMatches(visitorEmbedding, artworks, artworks.length);

    // Log ALL artwork scores for debugging
    Logger.info(`=== ARTWORK MATCHING DEBUG ===`);
    Logger.info(`Total artworks with embeddings: ${artworks.length}`);
    Logger.info(`All match scores (sorted by similarity):`);
    allMatches.forEach((m, idx) => {
      Logger.info(`  ${idx + 1}. "${m.artwork.title}" by ${m.artwork.author || 'Unknown'} - Score: ${(m.score * 100).toFixed(2)}%`);
    });
    Logger.info(`==============================`);

    // Get top 3 for response
    const matches = allMatches.slice(0, 3);

    Logger.info(`Match results: ${JSON.stringify(matches.map(m => ({
      title: m.artwork.title,
      score: (m.score * 100).toFixed(1) + '%'
    })))}`);

    // Determine if we have a confident match
    // Threshold of 0.50 is more permissive for real-world phone photos
    // (different angles, lighting, partial views of artwork)
    const CONFIDENCE_THRESHOLD = 0.50;
    const confident = matches.length > 0 && isConfidentMatch(matches[0].score, CONFIDENCE_THRESHOLD);

    // If no confident match, return early with "no artwork found"
    if (!confident) {
      Logger.info(`No confident match found. Best score: ${matches.length > 0 ? (matches[0].score * 100).toFixed(1) + '%' : 'N/A'}`);
      return res.json({
        success: false,
        noMatch: true,
        message: 'No artwork recognized. Please try pointing your camera directly at an artwork in this museum.',
        museum: {
          id: museum._id,
          name: museum.name
        },
        bestScore: matches.length > 0 ? Math.round(matches[0].score * 100) : 0,
        totalArtworks: artworks.length
      });
    }

    // Format response with all media fields
    const formatArtwork = (artwork: any, score: number) => ({
      id: artwork._id,
      title: artwork.title,
      author: artwork.author,
      year: artwork.year,
      style: artwork.style,
      imageUrl: artwork.imageUrl,
      description: artwork.descriptions?.[language] || artwork.descriptions?.en || artwork.description,
      audioUrl: artwork.audioUrls?.[language] || artwork.audioUrls?.en,
      matchScore: Math.round(score * 100), // Convert to percentage
      sources: artwork.sources,
      externalLinks: artwork.externalLinks,
      // Include additional media
      additionalPhotos: artwork.additionalPhotos || [],
      videos: artwork.videos || [],
      musicTracks: artwork.musicTracks || [],
      documents: artwork.documents || []
    });

    res.json({
      success: true,
      confident,
      museum: {
        id: museum._id,
        name: museum.name
      },
      bestMatch: matches.length > 0 ? formatArtwork(matches[0].artwork, matches[0].score) : null,
      alternatives: matches.slice(1).map(m => formatArtwork(m.artwork, m.score)),
      totalArtworks: artworks.length
    });

  } catch (error: any) {
    Logger.error(`Error identifying artwork: ${error}`);
    Logger.error(`Stack trace: ${error.stack}`);
    res.status(500).json({
      error: error.message || 'Internal Server Error',
      details: error.stack?.split('\n').slice(0, 3).join(' | ') || 'No stack trace'
    });
  } finally {
    // Clean up temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        Logger.info('Temporary visitor photo deleted');
      } catch (cleanupError) {
        Logger.warn(`Failed to delete temporary file: ${cleanupError}`);
      }
    }
  }
});

// GET /api/visit/:qrCode/artworks - Browse all artworks in museum
router.get('/:qrCode/artworks', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const { qrCode } = req.params;
    const { language = 'en' } = req.query;

    const museum = await Museum.findOne({ qrCode: qrCode.toLowerCase() });

    if (!museum) {
      return res.status(404).json({ error: 'Museum not found' });
    }

    const artworks = await Artwork.find({ museumId: museum._id }).sort({ createdAt: -1 });

    const formattedArtworks = artworks.map(artwork => ({
      id: artwork._id,
      title: artwork.title,
      author: artwork.author,
      year: artwork.year,
      style: artwork.style,
      imageUrl: artwork.imageUrl,
      description: (artwork.descriptions as any)?.[language as string] || (artwork.descriptions as any)?.en || artwork.description,
      audioUrl: (artwork.audioUrls as any)?.[language as string] || (artwork.audioUrls as any)?.en,
      sources: artwork.sources,
      externalLinks: artwork.externalLinks,
      // Include additional media
      additionalPhotos: artwork.additionalPhotos || [],
      videos: artwork.videos || [],
      musicTracks: artwork.musicTracks || [],
      documents: artwork.documents || []
    }));

    res.json({
      success: true,
      museum: {
        id: museum._id,
        name: museum.name
      },
      count: formattedArtworks.length,
      artworks: formattedArtworks
    });
  } catch (error: any) {
    Logger.error(`Error fetching museum artworks: ${error}`);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/visit/:qrCode/debug - Debug endpoint to check artworks and embeddings
router.get('/:qrCode/debug', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const { qrCode } = req.params;

    const museum = await Museum.findOne({ qrCode: qrCode.toLowerCase() });
    if (!museum) {
      return res.status(404).json({ error: 'Museum not found' });
    }

    const artworks = await Artwork.find({ museumId: museum._id });

    const debugInfo = artworks.map(art => ({
      id: art._id,
      title: art.title,
      author: art.author,
      hasEmbedding: !!(art.imageEmbedding && art.imageEmbedding.length > 0),
      embeddingLength: art.imageEmbedding?.length || 0,
      imageUrl: art.imageUrl
    }));

    res.json({
      museum: { id: museum._id, name: museum.name, qrCode: museum.qrCode },
      totalArtworks: artworks.length,
      artworksWithEmbeddings: debugInfo.filter(a => a.hasEmbedding).length,
      artworks: debugInfo
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/visit/artwork/:id - Get specific artwork details
router.get('/artwork/:id', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const { id } = req.params;
    const { language = 'en' } = req.query;

    const artwork = await Artwork.findById(id).populate('museumId');

    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    res.json({
      success: true,
      artwork: {
        id: artwork._id,
        title: artwork.title,
        author: artwork.author,
        year: artwork.year,
        style: artwork.style,
        imageUrl: artwork.imageUrl,
        description: (artwork.descriptions as any)?.[language as string] || (artwork.descriptions as any)?.en || artwork.description,
        audioUrl: (artwork.audioUrls as any)?.[language as string] || (artwork.audioUrls as any)?.en,
        sources: artwork.sources,
        externalLinks: artwork.externalLinks,
        museum: artwork.museumId ? {
          id: (artwork.museumId as any)._id,
          name: (artwork.museumId as any).name,
          location: (artwork.museumId as any).location
        } : null
      }
    });
  } catch (error: any) {
    Logger.error(`Error fetching artwork: ${error}`);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/visit/artwork/:id/translate - On-demand translation and audio generation
// Called when visitor switches to a language not yet cached
router.post('/artwork/:id/translate', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const { id } = req.params;
    const { language = 'en' } = req.body;

    Logger.info(`On-demand translation request: artwork=${id}, language=${language}`);

    const artwork = await Artwork.findById(id);

    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    // Check if we already have this translation cached
    const descriptions = artwork.descriptions as any || {};
    const audioUrls = artwork.audioUrls as any || {};

    if (descriptions[language] && audioUrls[language]) {
      Logger.info(`Translation already cached for ${language}`);
      return res.json({
        success: true,
        cached: true,
        description: descriptions[language],
        audioUrl: audioUrls[language]
      });
    }

    // Get English description as source
    const sourceText = descriptions.en || artwork.description || '';

    if (!sourceText) {
      return res.status(400).json({ error: 'No source description available' });
    }

    // Import services dynamically to avoid circular dependencies
    const { translateToLanguage } = await import('../services/translation');
    const { generateSingleLanguageAudio } = await import('../services/tts');

    // Translate if needed
    let translatedText = descriptions[language];
    if (!translatedText) {
      Logger.info(`Translating to ${language}...`);
      translatedText = await translateToLanguage(sourceText, language, 'en');
      descriptions[language] = translatedText;
    }

    // Generate audio if needed (upload to S3)
    let audioUrl = audioUrls[language];
    if (!audioUrl && translatedText) {
      Logger.info(`Generating audio for ${language}...`);
      audioUrl = await generateSingleLanguageAudio(translatedText, language, {
        museumId: artwork.museumId?.toString(),
        artworkId: id
      });
      if (audioUrl) {
        audioUrls[language] = audioUrl;
      }
    }

    // Save updated translations and audio to database (cache for future)
    await Artwork.findByIdAndUpdate(id, {
      descriptions,
      audioUrls
    });

    Logger.info(`On-demand translation complete for ${language}`);

    res.json({
      success: true,
      cached: false,
      language,
      description: translatedText,
      audioUrl: audioUrl || null
    });

  } catch (error: any) {
    Logger.error(`On-demand translation error: ${error}`);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/visit/languages - Get list of supported languages
router.get('/languages', (_req: Request, res: Response) => {
  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    { code: 'pl', name: 'Polski', flag: '🇵🇱' },
    { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  ];

  res.json({ success: true, languages });
});

// POST /api/visit/:qrCode/visitor - Save visitor info (optional)
router.post('/:qrCode/visitor', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const { qrCode } = req.params;
    const { name, phone, email, language = 'en' } = req.body;

    // Find museum by QR code
    const museum = await Museum.findOne({ qrCode: qrCode.toLowerCase() });

    if (!museum) {
      return res.status(404).json({ error: 'Museum not found' });
    }

    // Generate unique session ID for this visitor
    const sessionId = uuidv4();

    // Create visitor record
    const visitor = await Visitor.create({
      museumId: museum._id,
      name: name?.trim() || undefined,
      phone: phone?.trim() || undefined,
      email: email?.trim()?.toLowerCase() || undefined,
      language,
      sessionId,
      visitedAt: new Date(),
      artworksViewed: []
    });

    Logger.info(`New visitor registered: ${visitor._id} for museum ${museum.name}`);

    res.json({
      success: true,
      visitor: {
        id: visitor._id,
        sessionId: visitor.sessionId,
        language: visitor.language
      },
      museum: {
        id: museum._id,
        name: museum.name
      }
    });
  } catch (error: any) {
    Logger.error(`Error saving visitor: ${error}`);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/visit/:qrCode/track/:artworkId - Track artwork viewed by visitor
router.post('/:qrCode/track/:artworkId', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const { qrCode, artworkId } = req.params;
    const { sessionId } = req.body;

    // Find museum by QR code
    const museum = await Museum.findOne({ qrCode: qrCode.toLowerCase() });

    if (!museum) {
      return res.status(404).json({ error: 'Museum not found' });
    }

    // Verify artwork exists and belongs to this museum
    const artwork = await Artwork.findOne({ _id: artworkId, museumId: museum._id });

    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found in this museum' });
    }

    // If sessionId provided, update existing visitor record
    if (sessionId) {
      const visitor = await Visitor.findOne({ sessionId, museumId: museum._id });

      if (visitor) {
        // Add artwork to viewed list if not already there
        const artworkIdStr = artwork._id.toString();
        const alreadyViewed = visitor.artworksViewed.some(
          (id) => id.toString() === artworkIdStr
        );
        if (!alreadyViewed) {
          visitor.artworksViewed.push(artwork._id as any);
          await visitor.save();
          Logger.info(`Tracked artwork view: visitor=${visitor._id}, artwork=${artwork.title}`);
        }
      }
    }

    res.json({
      success: true,
      tracked: true,
      artwork: {
        id: artwork._id,
        title: artwork.title
      }
    });
  } catch (error: any) {
    Logger.error(`Error tracking artwork view: ${error}`);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/visit/:qrCode/stats - Get visitor stats for a museum (for analytics)
router.get('/:qrCode/stats', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const { qrCode } = req.params;

    const museum = await Museum.findOne({ qrCode: qrCode.toLowerCase() });

    if (!museum) {
      return res.status(404).json({ error: 'Museum not found' });
    }

    // Get visitor count for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayVisitors = await Visitor.countDocuments({
      museumId: museum._id,
      visitedAt: { $gte: today }
    });

    // Get total visitors
    const totalVisitors = await Visitor.countDocuments({
      museumId: museum._id
    });

    // Get this week's visitors
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weekVisitors = await Visitor.countDocuments({
      museumId: museum._id,
      visitedAt: { $gte: weekAgo }
    });

    res.json({
      success: true,
      stats: {
        today: todayVisitors,
        thisWeek: weekVisitors,
        total: totalVisitors
      }
    });
  } catch (error: any) {
    Logger.error(`Error fetching visitor stats: ${error}`);
    res.status(500).json({ error: error.message });
  }
});

export default router;
