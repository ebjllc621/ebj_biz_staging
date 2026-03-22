/**
 * @component ListingLeadsPage
 * @type Client Component Page
 * @tier STANDARD
 * @phase Phase 2B - Lead Capture System
 * @authority docs/pages/layouts/listings/features/phases/PHASE_2B_BRAIN_PLAN.md
 *
 * Listing Manager page for viewing and exporting captured leads.
 * Wraps ListingLeadCapturePanel in the standard ListingManagerTemplate shell.
 */
'use client';

import { useListingContext } from '@features/dashboard/context/ListingContext';
import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { ListingLeadCapturePanel } from '@features/dashboard/components/managers/leads/ListingLeadCapturePanel';

export default function ListingLeadsPage() {
  const { selectedListing } = useListingContext();

  return (
    <ListingManagerTemplate
      title="Lead Capture"
      description="View and export leads from visitor interactions"
    >
      {selectedListing && (
        <ListingLeadCapturePanel
          listingId={selectedListing.id}
          listingName={selectedListing.name}
          listingTier={selectedListing.tier}
        />
      )}
    </ListingManagerTemplate>
  );
}
