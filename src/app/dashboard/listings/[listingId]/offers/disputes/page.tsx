/**
 * Offers Disputes Page - /dashboard/listings/[listingId]/offers/disputes
 *
 * @description Manage disputes for your listing's offers
 * @component Server Component (wraps client DisputesPanel)
 * @tier STANDARD
 * @phase Offers Phase 4 - Disputes System
 * @authority docs/pages/layouts/integrationPointRef/offers/OFFERS_INTEGRATION_REPORT.md
 */

import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { DisputesPanel } from '@features/dashboard/components/managers/offers/DisputesPanel';

interface PageProps {
  params: Promise<{
    listingId: string;
  }>;
}

export default async function OffersDisputesPage({ params }: PageProps) {
  const { listingId } = await params;

  return (
    <ListingManagerTemplate
      title="Offer Disputes"
      description="Manage disputes for your listing's offers"
      featureId="offers"
    >
      <DisputesPanel listingId={parseInt(listingId)} />
    </ListingManagerTemplate>
  );
}
