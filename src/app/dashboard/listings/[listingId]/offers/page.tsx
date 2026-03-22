/**
 * Offers Manager Page - /dashboard/listings/[listingId]/offers
 *
 * @description Manage offers for a listing
 * @component Server Component (imports client OffersManager)
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Phase 8 - Features Section Pages
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_8_BRAIN_PLAN.md
 */

import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { OffersManager } from '@features/dashboard/components/managers/OffersManager';

export default function OffersPage() {
  return (
    <ListingManagerTemplate
      title="Offers"
      description="Manage your listing's special offers and promotions"
      featureId="offers"
    >
      <OffersManager />
    </ListingManagerTemplate>
  );
}
