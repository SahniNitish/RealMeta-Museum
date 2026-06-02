import Stripe from 'stripe';
import Logger from '../utils/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export async function createStripeCustomer(email: string, museumName: string): Promise<string> {
  const customer = await stripe.customers.create({
    email,
    name: museumName,
    metadata: { source: 'realmeta-museum' },
  });
  Logger.info(`Created Stripe customer ${customer.id} for ${museumName}`);
  return customer.id;
}

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  museumId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { museumId },
    subscription_data: {
      metadata: { museumId },
    },
  });
  return session.url || '';
}

export async function createPortalSession(customerId: string, returnUrl: string): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}

export async function createCustomPrice(amount: number, museumName: string): Promise<string> {
  // Create a product for this custom plan
  const product = await stripe.products.create({
    name: `RealMeta Custom - ${museumName}`,
    metadata: { type: 'custom' },
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: Math.round(amount * 100), // Convert to cents
    currency: 'usd',
    recurring: { interval: 'month' },
  });

  Logger.info(`Created custom Stripe price ${price.id} for ${museumName} at $${amount}/mo`);
  return price.id;
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
  Logger.info(`Subscription ${subscriptionId} set to cancel at period end`);
}

export function constructWebhookEvent(payload: Buffer, signature: string) {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET || ''
  );
}

export { stripe };
