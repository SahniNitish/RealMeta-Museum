import { Router, Request, Response, NextFunction } from 'express';
import { connectToDatabase } from '../utils/db';
import { Admin } from '../models/Admin';
import { Museum } from '../models/Museum';
import { Artwork } from '../models/Artwork';
import { Visitor } from '../models/Visitor';
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

    const [totalMuseums, totalArtworks, totalAdmins, totalVisitors] = await Promise.all([
      Museum.countDocuments(),
      Artwork.countDocuments(),
      Admin.countDocuments(),
      Visitor.countDocuments(),
    ]);

    res.json({
      totalMuseums,
      totalArtworks,
      totalAdmins,
      totalVisitors,
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

// GET /api/superadmin/analytics — platform-wide visitor analytics
router.get('/analytics', async (_req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);

    // Basic counts
    const [totalVisitors, todayVisitors, weekVisitors, monthVisitors] = await Promise.all([
      Visitor.countDocuments(),
      Visitor.countDocuments({ visitedAt: { $gte: todayStart } }),
      Visitor.countDocuments({ visitedAt: { $gte: weekAgo } }),
      Visitor.countDocuments({ visitedAt: { $gte: monthAgo } }),
    ]);

    // Visitors per museum (top 10)
    const visitorsPerMuseum = await Visitor.aggregate([
      { $group: { _id: '$museumId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'museums',
          localField: '_id',
          foreignField: '_id',
          as: 'museum',
        },
      },
      { $unwind: { path: '$museum', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          count: 1,
          museumName: { $ifNull: ['$museum.name', 'Unknown'] },
        },
      },
    ]);

    // Language breakdown
    const languageBreakdown = await Visitor.aggregate([
      { $group: { _id: '$language', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Daily visitors for the last 14 days
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    const dailyVisitors = await Visitor.aggregate([
      { $match: { visitedAt: { $gte: fourteenDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$visitedAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill in missing days with 0
    const dailyData: { date: string; count: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(fourteenDaysAgo);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const found = dailyVisitors.find((dv: any) => dv._id === dateStr);
      dailyData.push({ date: dateStr, count: found ? found.count : 0 });
    }

    res.json({
      totalVisitors,
      todayVisitors,
      weekVisitors,
      monthVisitors,
      visitorsPerMuseum,
      languageBreakdown,
      dailyVisitors: dailyData,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`Superadmin analytics error: ${message}`);
    res.status(500).json({ error: message });
  }
});

export default router;
