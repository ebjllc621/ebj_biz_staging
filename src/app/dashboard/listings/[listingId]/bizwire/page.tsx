/**
 * Listing Manager BizWire Page
 * Route: /dashboard/listings/[listingId]/bizwire
 *
 * @authority docs/components/contactListing/phases/PHASE_5_PLAN.md T5.10
 * @tier ADVANCED
 *
 * Server component shell — delegates to BizWireManager client component.
 * Follows the pattern from /dashboard/listings/[listingId]/messages/page.tsx.
 */

import { Metadata } from 'next';
import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { BizWireManager } from '@features/bizwire/components/BizWireManager';

export const metadata: Metadata = {
  title: 'BizWire | Listing Manager | Bizconekt',
  description: 'Manage customer inquiries and conversations for your listing'
};

interface PageProps {
  params: { listingId: string };
}

export default function BizWirePage(_props: PageProps) {
  return (
    <ListingManagerTemplate
      title="BizWire"
      description="Manage customer inquiries and conversations"
      featureId="bizwire"
    >
      <BizWireManager />
    </ListingManagerTemplate>
  );
}
