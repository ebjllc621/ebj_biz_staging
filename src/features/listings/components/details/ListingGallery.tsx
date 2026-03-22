/**
 * ListingGallery - Image-Only Gallery Display
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 8B - Gallery Layout Selector
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Image-only gallery via GalleryDisplay (no videos)
 * - Delegates to GalleryDisplay for grid/masonry/carousel/justified layouts
 * - Featured badge on first item
 * - Edit mode empty state handling
 * - gallery_layout preference from listing data
 *
 * Videos are displayed separately via ListingVideoGallerySection.
 */
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Image as ImageIcon, Settings } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';
import { GalleryDisplay } from '@features/media/gallery';
import type { GalleryItem, GalleryLayout } from '@features/media/gallery';

interface ListingGalleryProps {
  /** Listing data */
  listing: Listing;
  isEditMode?: boolean;
}

export function ListingGallery({ listing, isEditMode }: ListingGalleryProps) {
  const imageItems = useMemo<GalleryItem[]>(() => {
    const legacyImages = (listing.gallery_images || []) as string[];
    return legacyImages.map((url, idx) => ({
      id: `image-${idx}`,
      type: 'image' as const,
      url,
      alt: `${listing.name} gallery image ${idx + 1}`
    }));
  }, [listing.gallery_images, listing.name]);

  const hasImages = imageItems.length > 0;

  // Show empty state in edit mode when no images
  if (isEditMode && !hasImages) {
    return (
      <section className="bg-white rounded-lg shadow-sm p-6 border-2 border-dashed border-gray-300">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              Gallery
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              No images yet. Add photos to your gallery.
            </p>
            <Link
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              href={`/dashboard/listings/${String(listing.id)}/gallery` as any}
              className="inline-flex items-center gap-2 px-4 py-2 bg-biz-navy text-white text-sm font-medium rounded-md hover:bg-biz-navy/90 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configure
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Return null in published mode when no images
  if (!hasImages) {
    return null;
  }

  const layout = (listing.gallery_layout ?? 'grid') as GalleryLayout;

  return (
    <section className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-biz-navy mb-4 flex items-center gap-2">
        <ImageIcon className="w-5 h-5 text-biz-orange" />
        Gallery
        <span className="text-sm font-normal text-gray-500">
          ({imageItems.length} {imageItems.length === 1 ? 'photo' : 'photos'})
        </span>
      </h2>

      <GalleryDisplay
        items={imageItems}
        layout={layout}
        enableLightbox={true}
        showFeaturedBadge={true}
        entityName={listing.name}
      />
    </section>
  );
}

export default ListingGallery;
