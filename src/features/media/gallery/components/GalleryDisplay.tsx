/**
 * GalleryDisplay - Orchestrator component for gallery layouts
 *
 * Selects layout renderer (grid/masonry/carousel/justified) based on the `layout` prop,
 * manages lightbox state, and enforces error boundary wrapping.
 *
 * @component Client Component
 * @tier ADVANCED - wrapped in ErrorBoundary
 * @phase Phase 8A - Gallery Display Standardization
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { GalleryGrid } from './GalleryGrid';
import type { GalleryDisplayProps } from '../types/gallery-types';

// Dynamic imports for heavier layout libraries
const GalleryMasonry = dynamic(
  () => import('./GalleryMasonry').then(m => ({ default: m.GalleryMasonry })),
  { ssr: false, loading: () => <div className="animate-pulse bg-gray-100 rounded-lg h-64" /> }
);

const GalleryCarousel = dynamic(
  () => import('./GalleryCarousel').then(m => ({ default: m.GalleryCarousel })),
  { ssr: false, loading: () => <div className="animate-pulse bg-gray-100 rounded-lg aspect-video" /> }
);

const GalleryJustified = dynamic(
  () => import('./GalleryJustified').then(m => ({ default: m.GalleryJustified })),
  { ssr: false, loading: () => <div className="animate-pulse bg-gray-100 rounded-lg h-64" /> }
);

const PhotoSwipeLightboxComponent = dynamic(
  () => import('./PhotoSwipeLightbox').then(m => ({ default: m.PhotoSwipeLightbox })),
  { ssr: false }
);

function GalleryDisplayInner({
  items,
  layout = 'grid',
  enableLightbox = true,
  showFeaturedBadge = false,
  entityName = 'Gallery',
  className,
  autoplay = false,
  autoplayInterval = 4000
}: GalleryDisplayProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleItemClick = useMemo(
    () => (index: number) => {
      if (enableLightbox) {
        setLightboxIndex(index);
      }
    },
    [enableLightbox]
  );

  if (items.length === 0) {
    return null;
  }

  const sharedProps = {
    items,
    onItemClick: handleItemClick,
    showFeaturedBadge,
    entityName
  };

  return (
    <div className={className}>
      {layout === 'grid' && <GalleryGrid {...sharedProps} />}
      {layout === 'masonry' && <GalleryMasonry {...sharedProps} />}
      {layout === 'carousel' && (
        <GalleryCarousel
          {...sharedProps}
          autoplay={autoplay}
          autoplayInterval={autoplayInterval}
        />
      )}
      {layout === 'justified' && <GalleryJustified {...sharedProps} />}

      {enableLightbox && lightboxIndex !== null && (
        <PhotoSwipeLightboxComponent
          items={items}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          entityName={entityName}
        />
      )}
    </div>
  );
}

export function GalleryDisplay(props: GalleryDisplayProps) {
  return (
    <ErrorBoundary
      componentName="GalleryDisplay"
      isolate={true}
      fallback={
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
          Gallery could not be loaded.
        </div>
      }
    >
      <GalleryDisplayInner {...props} />
    </ErrorBoundary>
  );
}

export default GalleryDisplay;
