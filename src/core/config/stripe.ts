/**
 * Stripe Configuration
 *
 * Server-side Stripe client initialization with environment variable validation.
 * STRIPE_SECRET_KEY must NEVER be exposed to the client (no NEXT_PUBLIC_ prefix).
 *
 * @authority CLAUDE.md - Security section
 * @phase Phase 5A - Native Ticketing
 */

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-02-25.clover',
  typescript: true,
});

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
