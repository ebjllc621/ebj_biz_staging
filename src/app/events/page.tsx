/**
 * Events Page - Public Events Directory
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
 * - EventsPageClient component integration (client interactivity)
 * - Server Component pattern (no client-side hooks)
 *
 * DEFERRED TO FUTURE PHASES:
 * - Event card components (Phase 4)
 * - Map integration (Phase 5)
 * - Filter/sort controls (Phase 6)
 *
 * @see docs/pages/layouts/events/BRAIN_PLAN_EVENTS_PAGE.md
 * @see docs/pages/layouts/events/phases/PHASE_2_BRAIN_PLAN.md
 */

import type { Metadata } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { EventsPageClient } from './EventsPageClient';

/**
 * SEO Metadata for Events Page
 */
export const metadata: Metadata = {
  title: 'Events - Bizconekt',
  description: 'Discover upcoming events, workshops, and community gatherings. Browse local events with dates, venues, and registration options. Find events near you.',
  keywords: 'events, local events, community events, workshops, gatherings, event listings, upcoming events, event calendar',
  openGraph: {
    title: 'Events - Bizconekt',
    description: 'Discover upcoming events and community gatherings in your area.',
    type: 'website',
  },
};

/**
 * Error fallback component for events page
 */
function EventsPageError() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-4">
          Unable to Load Events
        </h2>
        <p className="text-red-700 mb-6">
          We encountered an error while loading the events page. Please try refreshing the page.
        </p>
        <a
          href="/events"
          className="inline-block px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Refresh Page
        </a>
      </div>
    </div>
  );
}

/**
 * Events Page - Server Component
 *
 * Wraps EventsPageClient in ErrorBoundary for error handling.
 * Phase 2 integrates EventsPageClient for client interactivity.
 */
export default function EventsPage() {
  return (
    <ErrorBoundary
      fallback={<EventsPageError />}
      isolate={true}
      componentName="EventsPage"
    >
      {/* [PHASE_2_COMPONENT]: EventsPageClient integrated */}
      <EventsPageClient />
    </ErrorBoundary>
  );
}
