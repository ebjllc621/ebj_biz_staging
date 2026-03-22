/**
 * Gallery Manager Page - /dashboard/listings/[listingId]/gallery
 *
 * @description Manage gallery images for a listing
 * @component Server Component (imports client GalleryManager)
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Phase 8 - Features Section Pages
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_8_BRAIN_PLAN.md
 */

import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { GalleryManager } from '@features/dashboard/components/managers/GalleryManager';

export default function GalleryPage() {
  return (
    <ListingManagerTemplate
      title="Gallery"
      description="Manage your listing's photo gallery"
      featureId="gallery"
    >
      <GalleryManager />
    </ListingManagerTemplate>
  );
}
