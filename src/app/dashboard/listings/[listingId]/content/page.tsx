/**
 * Content Manager Page - /dashboard/listings/[listingId]/content
 *
 * @description Manage content (articles, podcasts, videos) for a listing
 * @component Server Component (imports client ContentManager)
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Content Phase 5A
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier1_Phases/PHASE_5A_DASHBOARD_CONTENT_MANAGER.md
 */

import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { ContentManager } from '@features/dashboard/components/managers/ContentManager';

export default function ContentPage() {
  return (
    <ListingManagerTemplate
      title="Content"
      description="Create and manage articles, podcasts, and videos for your listing"
    >
      <ContentManager />
    </ListingManagerTemplate>
  );
}
