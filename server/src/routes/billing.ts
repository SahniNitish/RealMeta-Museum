import { Router, Request, Response } from 'express';
import { connectToDatabase } from '../utils/db';
import { Museum } from '../models/Museum';
import { Artwork } from '../models/Artwork';
import { authenticateAdmin } from './auth';
import { PLANS, PlanType } from '../config/plans';
import {
  createStripeCustomer,
  createCheckoutSession,
  createPortalSession,
  constructWebhookEvent,
} from '../services/stripe';
import Logger from '../utils/logger';

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://museum.realmeta.ca';

// GET /api/billing/subscription — current plan info + usage
router.get('/subscription', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const adminReq = req as Request & { admin: { museumId: string } };
    const museum = await Museum.findById(adminReq.admin.museumId);
    if (!museum) return res.status(404).json({ error: 'Museum not found' });

    const artworkCount = await Artwork.countDocuments({ museumId: museum._id });
    const sub = museum.subscription;

    res.json({
      plan: sub?.plan || 'free',
      status: sub?.status || 'active',
      artworkLimit: sub?.artworkLimit ?? 5,
      artworkCount,
      stripeCustomerId: sub?.stripeCustomerId || null,
      stripeSubscriptionId: sub?.stripeSubscriptionId || null,
      trialStartDate: sub?.trialStartDate || null,
      trialEndDate: sub?.trialEndDate || null,
      currentPeriodStart: sub?.currentPeriodStart || null,
      currentPeriodEnd: sub?.currentPeriodEnd || null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd || false,
      customPrice: sub?.customPrice || null,
      isActive: museum.isActive !== false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`Billing subscription fetch error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// POST /api/billing/create-checkout-session — start Stripe checkout
router.post('/create-checkout-session', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const adminReq = req as Request & { admin: { museumId: string; email: string } };
    const { plan } = req.body as { plan: PlanType };

    if (!plan || !PLANS[plan] || plan === 'free' || plan === 'custom') {
      return res.status(400).json({ error: 'Invalid plan. Choose starter or professional.' });
    }

    const priceId = PLANS[plan].stripePriceId;
    if (!priceId) {
      return res.status(400).json({ error: 'Stripe price not configured for this plan.' });
    }

    const museum = await Museum.findById(adminReq.admin.museumId);
    if (!museum) return res.status(404).json({ error: 'Museum not found' });

    // Create Stripe customer if needed
    let customerId = museum.subscription?.stripeCustomerId;
    if (!customerId) {
      customerId = await createStripeCustomer(adminReq.admin.email, museum.name);
      await Museum.findByIdAndUpdate(museum._id, {
        'subscription.stripeCustomerId': customerId,
      });
    }

    const successUrl = `${FRONTEND_URL}/admin/billing?success=true`;
    const cancelUrl = `${FRONTEND_URL}/admin/billing?canceled=true`;

    const sessionUrl = await createCheckoutSession(
      customerId,
      priceId,
      museum._id.toString(),
      successUrl,
      cancelUrl
    );

    res.json({ url: sessionUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`Checkout session error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// POST /api/billing/create-portal-session — Stripe Customer Portal
router.post('/create-portal-session', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const adminReq = req as Request & { admin: { museumId: string } };
    const museum = await Museum.findById(adminReq.admin.museumId);
    if (!museum) return res.status(404).json({ error: 'Museum not found' });

    const customerId = museum.subscription?.stripeCustomerId;
    if (!customerId) {
      return res.status(400).json({ error: 'No Stripe customer found. Please subscribe first.' });
    }

    const returnUrl = `${FRONTEND_URL}/admin/settings`;
    const url = await createPortalSession(customerId, returnUrl);

    res.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`Portal session error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// POST /api/billing/webhook — Stripe webhook handler (raw body, no auth)
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    const event = constructWebhookEvent(req.body, signature);

    await connectToDatabase();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const museumId = session.metadata?.museumId;
        const subscriptionId = session.subscription as string;

        if (museumId && subscriptionId) {
          // Determine plan from price
          const planEntry = Object.entries(PLANS).find(
            ([, p]) => p.stripePriceId && session.metadata?.priceId === p.stripePriceId
          );

          // Default to starter if we can't determine the plan from metadata
          let plan: PlanType = 'starter';
          let artworkLimit: number = PLANS.starter.artworkLimit;

          if (planEntry) {
            plan = planEntry[0] as PlanType;
            artworkLimit = planEntry[1].artworkLimit as number;
          }

          await Museum.findByIdAndUpdate(museumId, {
            'subscription.status': 'active',
            'subscription.plan': plan,
            'subscription.artworkLimit': artworkLimit,
            'subscription.stripeSubscriptionId': subscriptionId,
            'subscription.stripeCustomerId': session.customer,
          });

          Logger.info(`Museum ${museumId} activated ${plan} plan via checkout`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const museumId = subscription.metadata?.museumId;
        if (museumId) {
          const status = subscription.status === 'active' ? 'active'
            : subscription.status === 'trialing' ? 'trialing'
            : subscription.status === 'past_due' ? 'past_due'
            : 'canceled';

          const update: any = {
            'subscription.status': status,
            'subscription.cancelAtPeriodEnd': subscription.cancel_at_period_end,
          };

          if (subscription.current_period_start) {
            update['subscription.currentPeriodStart'] = new Date(subscription.current_period_start * 1000);
          }
          if (subscription.current_period_end) {
            update['subscription.currentPeriodEnd'] = new Date(subscription.current_period_end * 1000);
          }

          // Update price ID and determine plan
          const priceId = subscription.items?.data?.[0]?.price?.id;
          if (priceId) {
            update['subscription.stripePriceId'] = priceId;
            const planEntry = Object.entries(PLANS).find(([, p]) => p.stripePriceId === priceId);
            if (planEntry) {
              update['subscription.plan'] = planEntry[0];
              update['subscription.artworkLimit'] = planEntry[1].artworkLimit;
            }
          }

          await Museum.findByIdAndUpdate(museumId, update);
          Logger.info(`Museum ${museumId} subscription updated: ${status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const museumId = subscription.metadata?.museumId;
        if (museumId) {
          await Museum.findByIdAndUpdate(museumId, {
            'subscription.status': 'canceled',
            'subscription.plan': 'free',
            'subscription.artworkLimit': 5,
            'subscription.stripeSubscriptionId': null,
            'subscription.stripePriceId': null,
            'subscription.cancelAtPeriodEnd': false,
          });
          Logger.info(`Museum ${museumId} subscription canceled, downgraded to free`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription;
        if (subscriptionId) {
          await Museum.findOneAndUpdate(
            { 'subscription.stripeSubscriptionId': subscriptionId },
            { 'subscription.status': 'past_due' }
          );
          Logger.warn(`Payment failed for subscription ${subscriptionId}`);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription;
        if (subscriptionId) {
          await Museum.findOneAndUpdate(
            { 'subscription.stripeSubscriptionId': subscriptionId },
            { 'subscription.status': 'active' }
          );
          Logger.info(`Payment successful for subscription ${subscriptionId}`);
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error(`Webhook error: ${message}`);
    res.status(400).json({ error: `Webhook error: ${message}` });
  }
});

export default router;
