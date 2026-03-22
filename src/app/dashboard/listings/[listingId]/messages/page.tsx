/**
 * Listing Messages Page
 * Route: /dashboard/listings/[listingId]/messages
 *
 * @tier ADVANCED
 * @phase Phase 9 - Communication/Reputation
 */

import { Metadata } from 'next';
import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { MessagesManager } from '@features/dashboard/components/managers/MessagesManager';

export const metadata: Metadata = {
  title: 'Messages | Listing Manager | Bizconekt',
  description: 'Manage business inquiry messages for your listing'
};

interface PageProps {
  params: { listingId: string };
}

export default function MessagesPage(_props: PageProps) {
  // Manager uses ListingContext for selectedListingId
  return (
    <ListingManagerTemplate
      title="Messages"
      description="Manage business inquiry messages for your listing"
      featureId="messages"
    >
      <MessagesManager />
    </ListingManagerTemplate>
  );
}
