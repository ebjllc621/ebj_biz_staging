/**
 * Listing Followers Page
 * Route: /dashboard/listings/[listingId]/followers
 *
 * @tier ADVANCED
 * @phase Phase 9 - Communication/Reputation
 */

import { Metadata } from 'next';
import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { FollowersManager } from '@features/dashboard/components/managers/FollowersManager';

export const metadata: Metadata = {
  title: 'Followers | Listing Manager | Bizconekt',
  description: 'View users who have bookmarked your listing'
};

interface PageProps {
  params: { listingId: string };
}

export default function FollowersPage(_props: PageProps) {
  // Manager uses ListingContext for selectedListingId
  return (
    <ListingManagerTemplate
      title="Followers"
      description="View users who have bookmarked your listing"
      featureId="followers"
    >
      <FollowersManager />
    </ListingManagerTemplate>
  );
}
