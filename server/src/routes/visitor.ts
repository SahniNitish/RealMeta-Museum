import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Museum } from '../models/Museum';
import { Artwork } from '../models/Artwork';
import { connectToDatabase } from '../utils/db';
import { generateImageEmbedding, findBestMatches, isConfidentMatch } from '../services/clip';

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
    console.error('❌ Error fetching museum by QR code:', error);
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

    console.log('🔍 Visitor artwork identification request:', {
      qrCode,
      language,
      hasFile: !!file,
      filename: file?.filename
    });

    if (!file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    tempFilePath = file.path;

    // Find museum by QR code
    const museum = await Museum.findOne({ qrCode: qrCode.toLowerCase() });

    if (!museum) {
      return res.status(404).json({ error: 'Museum not found' });
    }

    console.log(`📍 Museum found: ${museum.name}`);

    // Get all artworks for this museum with embeddings
    const artworks = await Artwork.find({
      museumId: museum._id,
      imageEmbedding: { $exists: true, $ne: [] }
    });

    console.log(`🎨 Found ${artworks.length} artworks with embeddings in ${museum.name}`);

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
    console.log('🎨 Generating embedding for visitor photo...');
    const visitorEmbedding = await generateImageEmbedding(tempFilePath);
    console.log('✅ Visitor photo embedding generated');

    // Find best matches
    const matches = findBestMatches(visitorEmbedding, artworks, 3);

    console.log('🎯 Match results:', matches.map(m => ({
      title: m.artwork.title,
      score: (m.score * 100).toFixed(1) + '%'
    })));

    // Determine if we have a confident match
    const confident = matches.length > 0 && isConfidentMatch(matches[0].score);

    // Format response
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
      sources: artwork.sources
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
    console.error('❌ Error identifying artwork:', error);
    res.status(500).json({ error: error.message });
  } finally {
    // Clean up temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log('🗑️ Temporary visitor photo deleted');
      } catch (cleanupError) {
        console.error('⚠️ Failed to delete temporary file:', cleanupError);
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
      sources: artwork.sources
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
    console.error('❌ Error fetching museum artworks:', error);
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
        museum: artwork.museumId ? {
          id: (artwork.museumId as any)._id,
          name: (artwork.museumId as any).name,
          location: (artwork.museumId as any).location
        } : null
      }
    });
  } catch (error: any) {
    console.error('❌ Error fetching artwork:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
