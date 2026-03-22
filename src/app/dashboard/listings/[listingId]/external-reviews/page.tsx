/**
 * External Reviews Dashboard Page
 * Route: /dashboard/listings/[listingId]/external-reviews
 *
 * @tier STANDARD
 * @phase Phase 6B - Task 6.6b: Dashboard External Reviews Page
 */

import { Metadata } from 'next';
import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { ExternalReviewsManager } from '@features/dashboard/components/managers/ExternalReviewsManager';

export const metadata: Metadata = {
  title: 'External Reviews | Listing Manager | Bizconekt',
  description: 'Connect and manage external review sources for your listing'
};

interface PageProps {
  params: { listingId: string };
}

export default function ExternalReviewsPage(_props: PageProps) {
  // Manager uses ListingContext for selectedListingId and selectedListing.tier
  return (
    <ListingManagerTemplate
      title="External Reviews"
      description="Connect your Google Places listing to display external reviews on your profile"
    >
      <ExternalReviewsManager />
    </ListingManagerTemplate>
  );
}
