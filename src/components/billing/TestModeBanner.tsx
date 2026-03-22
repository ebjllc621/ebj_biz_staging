'use client';

/**
 * Test Mode Banner for Billing Pages
 * Shows when Stripe is in test mode (detected client-side via publishable key)
 *
 * @tier SIMPLE
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 8
 */

import { AlertTriangle } from 'lucide-react';

export function TestModeBanner() {
  // Client-side detection using NEXT_PUBLIC_ key
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  const isTestMode = publishableKey.startsWith('pk_test_');

  if (!isTestMode) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-center gap-2">
      <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
      <div>
        <span className="font-semibold text-yellow-800">STRIPE TEST MODE</span>
        <span className="text-yellow-700 ml-2 text-sm">
          No real charges will be processed. Test card: 4242 4242 4242 4242
        </span>
      </div>
    </div>
  );
}
