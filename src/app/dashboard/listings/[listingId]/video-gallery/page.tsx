/**
 * @component VideoGalleryPage
 * @type Server Component Page
 * @tier STANDARD
 * @phase Offers Integration - Video Gallery
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * Listing Manager page for managing a listing's video gallery.
 * Wraps VideoManager in the standard ListingManagerTemplate shell.
 */

import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { VideoManager } from '@features/dashboard/components/managers/VideoManager';

export default function VideoGalleryPage() {
  return (
    <ListingManagerTemplate
      title="Video Gallery"
      description="Manage your listing's video gallery"
      featureId="video-gallery"
    >
      <VideoManager />
    </ListingManagerTemplate>
  );
}
