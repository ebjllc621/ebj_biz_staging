/**
 * Offers Sell Page - /dashboard/listings/[listingId]/offers/sell
 *
 * @description Track how customers claim and redeem your offers
 * @component Server Component (imports client OffersSellManager)
 * @tier STANDARD
 * @phase Offers Phase 2 - Orphaned Routes + Hook Triggers
 * @authority docs/pages/layouts/integrationPointRef/offers/phases/PHASE_2_PLAN.md
 */

import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { OffersSellManager } from '@features/dashboard/components/managers/offers/OffersSellManager';

export default function OffersSellPage() {
  return (
    <ListingManagerTemplate
      title="Sell via Offers"
      description="Track how customers claim and redeem your offers"
      featureId="offers"
    >
      <OffersSellManager />
    </ListingManagerTemplate>
  );
}
