/**
 * Newsletter Manager Page - /dashboard/listings/[listingId]/newsletters
 *
 * @description Manage newsletters for a listing
 * @component Server Component (imports client NewsletterManager)
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Tier 2 Content Types - Phase N7A
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier2_Phases/PHASE_N7A_DASHBOARD_NEWSLETTER_MANAGER.md
 */

import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { NewsletterManager } from '@features/dashboard/components/managers/NewsletterManager';

export default function NewslettersPage() {
  return (
    <ListingManagerTemplate
      title="Newsletters"
      description="Create and send newsletters to your subscribers"
    >
      <NewsletterManager />
    </ListingManagerTemplate>
  );
}
