/**
 * Creator Profiles Page - /dashboard/listings/[listingId]/creator-profiles
 *
 * @description Manage creator profiles (affiliate marketer, internet personality, and podcaster) for a listing
 * @component Server Component (imports client ProfilesManager)
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 8A
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier3_Phases/PHASE_8A_DASHBOARD_PROFILE_CRUD.md
 */

import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { ProfilesManager } from '@features/dashboard/components/managers/ProfilesManager';

export default function CreatorProfilesPage() {
  return (
    <ListingManagerTemplate
      title="Creator Profiles"
      description="Create and manage your affiliate marketer, internet personality, and podcaster profiles"
    >
      <ProfilesManager />
    </ListingManagerTemplate>
  );
}
