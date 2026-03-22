/**
 * Guide Manager Page - /dashboard/listings/[listingId]/guides
 *
 * @description Manage guides for a listing (multi-section educational content)
 * @component Server Component (imports client GuideManager)
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Tier 2 Content Types - Phase G8
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier2_Phases/PHASE_G8_DASHBOARD_GUIDE_CREATION.md
 */

import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { GuideManager } from '@features/dashboard/components/managers/GuideManager';

export default function GuidesPage() {
  return (
    <ListingManagerTemplate
      title="Guides"
      description="Create and manage multi-section educational guides"
    >
      <GuideManager />
    </ListingManagerTemplate>
  );
}
