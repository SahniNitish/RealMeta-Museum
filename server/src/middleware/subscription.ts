import { Request, Response, NextFunction } from 'express';
import { Museum } from '../models/Museum';
import { Artwork } from '../models/Artwork';
import { connectToDatabase } from '../utils/db';
import Logger from '../utils/logger';

/**
 * Blocks requests if museum is deactivated or trial has expired.
 * Lazy-checks trial expiry: flips 'trialing' → 'canceled' if past trialEndDate.
 */
export const checkSubscriptionActive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminReq = req as Request & { admin: { museumId: string } };
    const museumId = adminReq.admin?.museumId;
    if (!museumId) return next(); // Let auth middleware handle missing museumId

    await connectToDatabase();
    const museum = await Museum.findById(museumId);
    if (!museum) {
      return res.status(404).json({ error: 'Museum not found' });
    }

    // Master kill switch
    if (museum.isActive === false) {
      return res.status(403).json({
        error: 'Museum account has been deactivated. Please contact support.',
        deactivated: true,
      });
    }

    // Check subscription status
    const sub = museum.subscription;
    if (sub) {
      if (sub.status === 'deactivated') {
        return res.status(403).json({
          error: 'Museum subscription has been deactivated. Please contact support.',
          deactivated: true,
        });
      }

      // Lazy trial expiry check
      if (sub.status === 'trialing' && sub.trialEndDate && new Date() > sub.trialEndDate) {
        museum.subscription.status = 'canceled';
        museum.subscription.plan = 'free';
        museum.subscription.artworkLimit = 5;
        await museum.save();
        Logger.info(`Trial expired for museum ${museumId}, downgraded to free`);
        // Don't block — they're now on free plan
      }
    }

    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`Subscription check error: ${message}`);
    next(); // Don't block on errors — fail open
  }
};

/**
 * Checks if museum has reached its artwork upload limit.
 * Only apply to upload routes.
 */
export const checkArtworkLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminReq = req as Request & { admin: { museumId: string } };
    const museumId = adminReq.admin?.museumId || req.body.museumId;
    if (!museumId) return next();

    await connectToDatabase();
    const museum = await Museum.findById(museumId);
    if (!museum) return next();

    const limit = museum.subscription?.artworkLimit ?? 5;
    const currentCount = await Artwork.countDocuments({ museumId });

    if (currentCount >= limit) {
      return res.status(403).json({
        error: `Artwork limit reached. Your ${museum.subscription?.plan || 'free'} plan allows ${limit} artworks.`,
        currentCount,
        limit,
        plan: museum.subscription?.plan || 'free',
        upgradeRequired: true,
      });
    }

    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`Artwork limit check error: ${message}`);
    next(); // Fail open
  }
};
