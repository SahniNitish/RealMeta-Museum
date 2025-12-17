import { Router, Request, Response } from 'express';
import { Museum } from '../models/Museum';
import { Artwork } from '../models/Artwork';
import { connectToDatabase } from '../utils/db';
import QRCode from 'qrcode';
import Logger from '../utils/logger';

const router = Router();

// Helper to generate QR code slug from museum name
function generateQRCode(name: string, location: string): string {
  const slug = `${name}-${location}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const timestamp = Date.now().toString().slice(-4);
  return `${slug}-${timestamp}`;
}

// GET /api/museums - List all museums
router.get('/', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const museums = await Museum.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: museums.length,
      museums
    });
  } catch (error: any) {
    Logger.error(`Error fetching museums: ${error}`);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/museums/:id - Get specific museum
router.get('/:id', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const museum = await Museum.findById(req.params.id);

    if (!museum) {
      return res.status(404).json({ error: 'Museum not found' });
    }

    // Get artwork count for this museum
    const artworkCount = await Artwork.countDocuments({ museumId: museum._id });

    res.json({
      success: true,
      museum: {
        ...museum.toObject(),
        artworkCount
      }
    });
  } catch (error: any) {
    Logger.error(`Error fetching museum: ${error}`);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/museums - Create new museum
router.post('/', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const { name, location, website, description } = req.body;

    if (!name || !location) {
      return res.status(400).json({ error: 'Name and location are required' });
    }

    // Generate unique QR code
    const qrCode = generateQRCode(name, location);

    // Check if QR code already exists (unlikely but possible)
    const existing = await Museum.findOne({ qrCode });
    if (existing) {
      return res.status(409).json({ error: 'Museum with similar name/location already exists' });
    }

    const museum = await Museum.create({
      name,
      location,
      qrCode,
      website,
      description
    });

    Logger.info(`Museum created: ${museum.name} (QR: ${museum.qrCode})`);

    res.status(201).json({
      success: true,
      museum
    });
  } catch (error: any) {
    Logger.error(`Error creating museum: ${error}`);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/museums/:id - Update museum
router.put('/:id', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const { name, location, website, description } = req.body;

    const museum = await Museum.findByIdAndUpdate(
      req.params.id,
      {
        ...(name && { name }),
        ...(location && { location }),
        ...(website !== undefined && { website }),
        ...(description !== undefined && { description })
      },
      { new: true, runValidators: true }
    );

    if (!museum) {
      return res.status(404).json({ error: 'Museum not found' });
    }

    Logger.info(`Museum updated: ${museum.name}`);

    res.json({
      success: true,
      museum
    });
  } catch (error: any) {
    Logger.error(`Error updating museum: ${error}`);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/museums/:id - Delete museum
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const museum = await Museum.findById(req.params.id);

    if (!museum) {
      return res.status(404).json({ error: 'Museum not found' });
    }

    // Check if museum has artworks
    const artworkCount = await Artwork.countDocuments({ museumId: museum._id });

    if (artworkCount > 0) {
      return res.status(400).json({
        error: `Cannot delete museum with ${artworkCount} artworks. Delete artworks first.`
      });
    }

    await Museum.findByIdAndDelete(req.params.id);

    Logger.info(`Museum deleted: ${museum.name}`);

    res.json({
      success: true,
      message: 'Museum deleted successfully'
    });
  } catch (error: any) {
    Logger.error(`Error deleting museum: ${error}`);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/museums/:id/qr - Generate QR code image
router.get('/:id/qr', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const museum = await Museum.findById(req.params.id);

    if (!museum) {
      return res.status(404).json({ error: 'Museum not found' });
    }

    // Generate visitor URL
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const visitorUrl = `${baseUrl}/visit/${museum.qrCode}`;

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(visitorUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({
      success: true,
      museum: {
        id: museum._id,
        name: museum.name,
        qrCode: museum.qrCode
      },
      visitorUrl,
      qrCodeImage: qrCodeDataUrl
    });
  } catch (error: any) {
    Logger.error(`Error generating QR code: ${error}`);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/museums/:id/artworks - Get all artworks for a museum
router.get('/:id/artworks', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const museum = await Museum.findById(req.params.id);

    if (!museum) {
      return res.status(404).json({ error: 'Museum not found' });
    }

    const artworks = await Artwork.find({ museumId: museum._id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      museum: {
        id: museum._id,
        name: museum.name
      },
      count: artworks.length,
      artworks
    });
  } catch (error: any) {
    Logger.error(`Error fetching museum artworks: ${error}`);
    res.status(500).json({ error: error.message });
  }
});

export default router;
