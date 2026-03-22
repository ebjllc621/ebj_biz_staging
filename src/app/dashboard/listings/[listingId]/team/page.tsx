/**
 * Team Manager Page - /dashboard/listings/[listingId]/team
 *
 * @description Manage team members for a listing
 * @component Server Component (imports client TeamManager)
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Phase 8 - Features Section Pages
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_8_BRAIN_PLAN.md
 */

import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { TeamManager } from '@features/dashboard/components/managers/TeamManager';

export default function TeamPage() {
  return (
    <ListingManagerTemplate
      title="Team"
      description="Manage your team members and their profiles"
      featureId="team"
    >
      <TeamManager />
    </ListingManagerTemplate>
  );
}
