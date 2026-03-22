/**
 * Offers Page - Public Offers & Deals Directory
 *
 * Server Component wrapper with SEO metadata and ErrorBoundary protection.
 * Phase 1 establishes page structure; Phase 2 implements client interactivity.
 *
 * @component Server Component (NO hooks, NO browser APIs)
 * @tier ADVANCED (map integration, complex state in future phases)
 * @phase Phase 2 - Client Component Integration
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * FEATURES (Phase 2):
 * - SEO metadata export (title, description, keywords, OpenGraph)
 * - ErrorBoundary wrapper for error handling
 * - Server Component pattern (no client-side hooks)
 * - OffersPageClient component integration with full interactivity
 *
 * DEFERRED TO FUTURE PHASES:
 * - API endpoint /api/offers/search (Phase 3)
 * - Offer card components (Phase 4)
 * - Map integration (Phase 5)
 * - Filter/sort controls (Phase 6)
 *
 * @see docs/pages/layouts/offers/BRAIN_PLAN_OFFERS_PAGE.md
 * @see docs/pages/layouts/offers/phases/PHASE_1_BRAIN_PLAN.md
 * @see docs/pages/layouts/offers/phases/PHASE_2_BRAIN_PLAN.md
 */

import type { Metadata } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { OffersPageClient } from './OffersPageClient';

/**
 * SEO Metadata for Offers Page
 */
export const metadata: Metadata = {
  title: 'Offers & Deals - Bizconekt',
  description: 'Discover exclusive offers, deals, and discounts from local businesses. Browse coupons, special promotions, and savings opportunities near you.',
  keywords: 'offers, deals, discounts, coupons, local deals, business offers, special promotions, savings, local discounts',
  openGraph: {
    title: 'Offers & Deals - Bizconekt',
    description: 'Discover exclusive offers and deals from local businesses.',
    type: 'website',
  },
};

/**
 * Error fallback component for offers page
 */
function OffersPageError() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-4">
          Unable to Load Offers
        </h2>
        <p className="text-red-700 mb-6">
          We encountered an error while loading the offers page. Please try refreshing the page.
        </p>
        <a
          href="/offers"
          className="inline-block px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Refresh Page
        </a>
      </div>
    </div>
  );
}

/**
 * Offers Page - Server Component
 *
 * Wraps content in ErrorBoundary for error handling.
 * Phase 2 integrates OffersPageClient with data fetching and interactivity.
 */
export default function OffersPage() {
  return (
    <ErrorBoundary
      fallback={<OffersPageError />}
      isolate={true}
      componentName="OffersPage"
    >
      <OffersPageClient />
    </ErrorBoundary>
  );
}
