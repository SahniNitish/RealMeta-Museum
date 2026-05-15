import { Router, Request, Response, NextFunction } from 'express';
import { connectToDatabase } from '../utils/db';
import { Admin } from '../models/Admin';
import { Museum } from '../models/Museum';
import { Artwork } from '../models/Artwork';
import Logger from '../utils/logger';
import { authenticateAdmin } from './auth';

const router = Router();

// Superadmin middleware — must be used after authenticateAdmin
const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  const adminReq = req as Request & { admin: { adminId: string; role: string } };
  if (adminReq.admin?.role !== 'superadmin') {
    return res.status(403).json({ error: 'Superadmin access required' });
  }
  next();
};

// All routes require authentication + superadmin role
router.use(authenticateAdmin, requireSuperAdmin);

// GET /api/superadmin/stats — platform-wide statistics
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const [totalMuseums, totalArtworks, totalAdmins] = await Promise.all([
      Museum.countDocuments(),
      Artwork.countDocuments(),
      Admin.countDocuments(),
    ]);

    res.json({
      totalMuseums,
      totalArtworks,
      totalAdmins,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`Superadmin stats error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// GET /api/superadmin/museums — all museums with admin info + artwork counts
router.get('/museums', async (_req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const museums = await Museum.find().sort({ createdAt: -1 }).lean();

    // Get admin info and artwork counts for each museum
    const museumData = await Promise.all(
      museums.map(async (museum) => {
        const [admin, artworkCount] = await Promise.all([
          Admin.findOne({ museumId: museum._id }).select('name email role isVerified createdAt').lean(),
          Artwork.countDocuments({ museumId: museum._id }),
        ]);

        return {
          _id: museum._id,
          name: museum.name,
          location: museum.location,
          qrCode: museum.qrCode,
          website: museum.website,
          description: museum.description,
          createdAt: museum.createdAt,
          admin: admin
            ? {
                name: admin.name,
                email: admin.email,
                isVerified: admin.isVerified,
                createdAt: admin.createdAt,
              }
            : null,
          artworkCount,
        };
      })
    );

    res.json(museumData);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`Superadmin museums error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// GET /api/superadmin/museums/:id/artworks — artworks for a specific museum
router.get('/museums/:id/artworks', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const { id } = req.params;

    const museum = await Museum.findById(id).lean();
    if (!museum) {
      return res.status(404).json({ error: 'Museum not found' });
    }

    const artworks = await Artwork.find({ museumId: id })
      .select('title author year style imageUrl createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      museum: {
        _id: museum._id,
        name: museum.name,
        location: museum.location,
      },
      artworks,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`Superadmin museum artworks error: ${message}`);
    res.status(500).json({ error: message });
  }
});

export default router;
