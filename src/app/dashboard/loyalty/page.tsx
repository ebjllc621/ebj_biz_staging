/**
 * Loyalty Dashboard Page - User Rewards Overview
 *
 * Displays user's loyalty status across businesses, rewards progress,
 * and available loyalty benefits.
 *
 * @component Server Component
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority CLAUDE.md, .cursor/rules/react18-nextjs14-governance.mdc
 */

import type { Metadata } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { LoyaltyDashboardClient } from './LoyaltyDashboardClient';

/**
 * SEO Metadata for Loyalty Dashboard
 */
export const metadata: Metadata = {
  title: 'My Rewards - Bizconekt Dashboard',
  description: 'View your loyalty status, rewards progress, and benefits across your favorite local businesses.',
};

/**
 * Error fallback component for loyalty dashboard
 */
function LoyaltyDashboardError() {
  return (
    <div className="p-8">
      <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-4">
          Unable to Load Rewards
        </h2>
        <p className="text-red-700 mb-6">
          We encountered an error loading your rewards. Please try refreshing the page.
        </p>
        <a
          href="/dashboard/loyalty"
          className="inline-block px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Refresh Page
        </a>
      </div>
    </div>
  );
}

/**
 * Loyalty Dashboard Page - Server Component
 */
export default function LoyaltyDashboardPage() {
  return (
    <ErrorBoundary
      fallback={<LoyaltyDashboardError />}
      isolate={true}
      componentName="LoyaltyDashboardPage"
    >
      <LoyaltyDashboardClient />
    </ErrorBoundary>
  );
}
