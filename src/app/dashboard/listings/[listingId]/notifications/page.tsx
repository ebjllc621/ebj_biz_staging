/**
 * @component ListingNotificationsPage
 * @type Client Component Page
 * @tier STANDARD
 * @phase Phase 3B - Engagement Triggers & Dashboard UI
 * @authority docs/pages/layouts/listings/features/phases/PHASE_3B_BRAIN_PLAN.md
 *
 * Listing Manager page for email and notification preferences.
 * Resolves PAGE-MENU SYNC gap: listingManagerMenu.ts:197 href='notifications'.
 *
 * Phase 3B: Replaces shell with fully functional NotificationPreferencesPanel.
 */
'use client';

import dynamic from 'next/dynamic';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';

const NotificationPreferencesPanel = dynamic(
  () => import('@features/dashboard/components/managers/notifications/NotificationPreferencesPanel').then(m => ({ default: m.NotificationPreferencesPanel })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-gray-100 rounded-lg" />
        <div className="h-64 bg-gray-100 rounded-lg" />
      </div>
    )
  }
);

export default function ListingNotificationsPage() {
  const { selectedListing } = useListingContext();

  return (
    <ListingManagerTemplate
      title="Email &amp; Notifications"
      description="Manage notification preferences and broadcast messages to your followers"
    >
      {selectedListing && (
        <NotificationPreferencesPanel listingId={selectedListing.id} />
      )}
    </ListingManagerTemplate>
  );
}
