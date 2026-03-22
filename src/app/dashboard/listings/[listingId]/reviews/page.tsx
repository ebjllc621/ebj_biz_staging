/**
 * Listing Reviews Page
 * Route: /dashboard/listings/[listingId]/reviews
 *
 * @tier ADVANCED
 * @phase Phase 9 - Communication/Reputation
 */

import { Metadata } from 'next';
import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { ReviewsManager } from '@features/dashboard/components/managers/ReviewsManager';

export const metadata: Metadata = {
  title: 'Reviews | Listing Manager | Bizconekt',
  description: 'Manage reviews and owner responses for your listing'
};

interface PageProps {
  params: { listingId: string };
}

export default function ReviewsPage(_props: PageProps) {
  // Manager uses ListingContext for selectedListingId
  return (
    <ListingManagerTemplate
      title="Reviews"
      description="Manage reviews and owner responses for your listing"
      featureId="reviews"
    >
      <ReviewsManager />
    </ListingManagerTemplate>
  );
}
