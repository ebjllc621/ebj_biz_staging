/**
 * StripeProvider - Lazy-loaded Stripe Elements provider
 *
 * Wraps children with Stripe Elements context using the publishable key.
 * Supports PaymentElement which auto-renders: Cards, ACH, PayPal, Apple Pay, Google Pay.
 *
 * @tier SIMPLE
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 1
 */

'use client';

import { useMemo, type ReactNode } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

interface StripeProviderProps {
  children: ReactNode;
  clientSecret: string;
}

export function StripeProvider({ children, clientSecret }: StripeProviderProps) {
  const stripePromise = useMemo(
    () => loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''),
    []
  );

  const options = useMemo(() => ({
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#ed6437',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#ef4444',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        borderRadius: '8px',
      },
    },
  }), [clientSecret]);

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
}
