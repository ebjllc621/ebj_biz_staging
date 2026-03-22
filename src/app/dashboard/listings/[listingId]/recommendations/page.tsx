/**
 * Listing Recommendations Page
 * Route: /dashboard/listings/[listingId]/recommendations
 *
 * @tier ADVANCED
 * @phase Phase 9 - Communication/Reputation
 */

import { Metadata } from 'next';
import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { RecommendationsManager } from '@features/dashboard/components/managers/RecommendationsManager';

export const metadata: Metadata = {
  title: 'Recommendations | Listing Manager | Bizconekt',
  description: 'Manage featured reviews for your listing'
};

interface PageProps {
  params: { listingId: string };
}

export default function RecommendationsPage(_props: PageProps) {
  // Manager uses ListingContext for selectedListingId
  return (
    <ListingManagerTemplate
      title="Recommendations"
      description="Manage featured reviews for your listing"
      featureId="recommendations"
    >
      <RecommendationsManager />
    </ListingManagerTemplate>
  );
}
