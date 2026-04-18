/**
 * Lazy-loads Stripe.js only when needed (never in tests).
 * The publishable key is read from VITE_STRIPE_PUBLISHABLE_KEY.
 */
import type { Stripe } from '@stripe/stripe-js';

let _stripe: Stripe | null = null;

export async function getStripe(): Promise<Stripe | null> {
  if (typeof window === 'undefined') return null;
  const { loadStripe } = await import('@stripe/stripe-js');
  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
  if (!key) return null;
  if (!_stripe) _stripe = await loadStripe(key);
  return _stripe;
}
