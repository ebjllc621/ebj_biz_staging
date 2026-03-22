/**
 * Listings Page - Public Business Listings Directory
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
 * FEATURES (Phase 1):
 * - SEO metadata export (title, description, keywords, OpenGraph)
 * - ErrorBoundary wrapper for error handling
 * - Server Component pattern (no client-side hooks)
 *
 * DEFERRED TO PHASE 2:
 * - ListingsPageClient component (client interactivity)
 * - Data fetching from /api/listings/search
 * - Filter/sort controls
 * - Map integration (Phase 3)
 *
 * @see docs/pages/layouts/listings/BRAIN_PLAN_LISTINGS_PAGE.md
 * @see docs/pages/layouts/listings/phases/PHASE_1_BRAIN_PLAN.md
 */

import type { Metadata } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ListingsPageClient } from './ListingsPageClient';

/**
 * SEO Metadata for Listings Page
 */
export const metadata: Metadata = {
  title: 'Discover Listings You\'ll Love! - Bizconekt',
  description: 'Discover local listings and connect with professionals in your area. Explore our comprehensive directory of verified business listings with detailed profiles, reviews, and contact information.',
  keywords: 'business listings, local businesses, business directory, find businesses, professional services, local directory, business search',
  openGraph: {
    title: 'Discover Listings You\'ll Love! - Bizconekt',
    description: 'Discover local listings and connect with professionals in your area.',
    type: 'website',
  },
};

/**
 * Error fallback component for listings page
 */
function ListingsPageError() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-4">
          Unable to Load Listings
        </h2>
        <p className="text-red-700 mb-6">
          We encountered an error while loading the listings page. Please try refreshing the page.
        </p>
        <a
          href="/listings"
          className="inline-block px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Refresh Page
        </a>
      </div>
    </div>
  );
}

/**
 * Listings Page - Server Component
 *
 * Wraps content in ErrorBoundary for error handling.
 * Phase 2 integrates ListingsPageClient with data fetching and interactivity.
 */
export default function ListingsPage() {
  return (
    <ErrorBoundary
      fallback={<ListingsPageError />}
      isolate={true}
      componentName="ListingsPage"
    >
      <ListingsPageClient />
    </ErrorBoundary>
  );
}
