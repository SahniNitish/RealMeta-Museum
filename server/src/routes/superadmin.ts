import { Router, Request, Response, NextFunction } from 'express';
import { connectToDatabase } from '../utils/db';
import { Admin } from '../models/Admin';
import { Museum } from '../models/Museum';
import { Artwork } from '../models/Artwork';
import { Visitor } from '../models/Visitor';
import { PLANS, PlanType, TRIAL_DURATION_DAYS } from '../config/plans';
import { createCustomPrice } from '../services/stripe';
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

// GET /api/superadmin/museums — all museums with admin info + artwork counts + subscription
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
          subscription: museum.subscription || { plan: 'free', status: 'active', artworkLimit: 5 },
          isActive: museum.isActive !== false,
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
        subscription: museum.subscription,
        isActive: museum.isActive,
      },
      artworks,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`Superadmin museum artworks error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// POST /api/superadmin/museums/:id/activate — activate a museum
router.post('/museums/:id/activate', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const museum = await Museum.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );
    if (!museum) return res.status(404).json({ error: 'Museum not found' });
    Logger.info(`Museum ${req.params.id} activated by superadmin`);
    res.json({ success: true, isActive: museum.isActive });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /api/superadmin/museums/:id/deactivate — deactivate a museum
router.post('/museums/:id/deactivate', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const museum = await Museum.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!museum) return res.status(404).json({ error: 'Museum not found' });
    Logger.info(`Museum ${req.params.id} deactivated by superadmin`);
    res.json({ success: true, isActive: museum.isActive });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /api/superadmin/museums/:id/set-trial — start 30-day trial
router.post('/museums/:id/set-trial', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const now = new Date();
    const trialEnd = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

    const museum = await Museum.findByIdAndUpdate(
      req.params.id,
      {
        isActive: true,
        'subscription.plan': 'starter',
        'subscription.status': 'trialing',
        'subscription.artworkLimit': PLANS.starter.artworkLimit,
        'subscription.trialStartDate': now,
        'subscription.trialEndDate': trialEnd,
      },
      { new: true }
    );
    if (!museum) return res.status(404).json({ error: 'Museum not found' });
    Logger.info(`Museum ${req.params.id} set to trial by superadmin (ends ${trialEnd.toISOString()})`);
    res.json({ success: true, subscription: museum.subscription });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /api/superadmin/museums/:id/set-plan — change plan
router.post('/museums/:id/set-plan', async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const { plan, artworkLimit, customPrice } = req.body as {
      plan: PlanType;
      artworkLimit?: number;
      customPrice?: number;
    };

    if (!plan || !['free', 'starter', 'professional', 'custom'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const update: any = {
      'subscription.plan': plan,
      'subscription.status': 'active',
    };

    if (plan === 'custom') {
      if (!artworkLimit || artworkLimit < 1) {
        return res.status(400).json({ error: 'Custom plan requires artworkLimit > 0' });
      }
      update['subscription.artworkLimit'] = artworkLimit;

      if (customPrice && customPrice > 0) {
        const museum = await Museum.findById(req.params.id);
        if (!museum) return res.status(404).json({ error: 'Museum not found' });

        // Create a Stripe price for this custom plan
        const stripePriceId = await createCustomPrice(customPrice, museum.name);
        update['subscription.stripePriceId'] = stripePriceId;
        update['subscription.customPrice'] = customPrice;
      }
    } else {
      update['subscription.artworkLimit'] = PLANS[plan].artworkLimit;
    }

    const museum = await Museum.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!museum) return res.status(404).json({ error: 'Museum not found' });

    Logger.info(`Museum ${req.params.id} set to ${plan} plan by superadmin`);
    res.json({ success: true, subscription: museum.subscription });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`Set plan error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// GET /api/superadmin/subscription-stats — plan distribution stats
router.get('/subscription-stats', async (_req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const museums = await Museum.find().lean();

    const planDistribution: Record<string, number> = { free: 0, starter: 0, professional: 0, custom: 0 };
    const statusDistribution: Record<string, number> = { active: 0, trialing: 0, past_due: 0, canceled: 0, deactivated: 0 };
    let activeTrials = 0;
    let paidMuseums = 0;

    for (const m of museums) {
      const plan = m.subscription?.plan || 'free';
      const status = m.subscription?.status || 'active';

      planDistribution[plan] = (planDistribution[plan] || 0) + 1;
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;

      if (status === 'trialing') activeTrials++;
      if (['starter', 'professional', 'custom'].includes(plan) && ['active', 'trialing'].includes(status)) {
        paidMuseums++;
      }
    }

    res.json({
      planDistribution,
      statusDistribution,
      activeTrials,
      paidMuseums,
      totalMuseums: museums.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`Subscription stats error: ${message}`);
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
