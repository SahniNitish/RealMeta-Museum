export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    artworkLimit: 5,
    stripePriceId: null,
  },
  starter: {
    name: 'Starter',
    price: 19.99,
    artworkLimit: 100,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || '',
  },
  professional: {
    name: 'Professional',
    price: 49.99,
    artworkLimit: 250,
    stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || '',
  },
  custom: {
    name: 'Custom',
    price: 0, // Set by SuperAdmin
    artworkLimit: 0, // Set by SuperAdmin
    stripePriceId: null, // Created dynamically
  },
} as const;

export type PlanType = keyof typeof PLANS;

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'deactivated';

export const TRIAL_DURATION_DAYS = 30;
