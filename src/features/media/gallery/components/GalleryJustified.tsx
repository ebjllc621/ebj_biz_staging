/**
 * GalleryJustified - Justified row-based layout renderer
 *
 * Uses react-photo-album v3 RowsPhotoAlbum for natural aspect-ratio rows.
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 8C - Justified Layout + Enhanced Lightbox
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import { useState, useEffect } from 'react';
import { RowsPhotoAlbum } from 'react-photo-album';
import 'react-photo-album/rows.css';
import { Play } from 'lucide-react';
import { resolveItemDimensions } from '../utils/image-dimensions';
import type { LayoutRendererProps, GalleryItem } from '../types/gallery-types';

interface JustifiedPhoto {
  src: string;
  width: number;
  height: number;
  key: string;
  alt: string;
  /** Original gallery item index — kept for overlay lookup */
  itemIndex: number;
}

function buildPhotos(
  items: GalleryItem[],
  dimensions: Array<{ width: number; height: number }>
): JustifiedPhoto[] {
  return items.map((item, i) => ({
    src: item.url,
    width: dimensions[i]?.width ?? 1200,
    height: dimensions[i]?.height ?? 900,
    key: item.id,
    alt: item.alt,
    itemIndex: i
  }));
}

export function GalleryJustified({
  items,
  onItemClick,
  showFeaturedBadge,
  entityName
}: LayoutRendererProps) {
  const [dimensions, setDimensions] = useState<
    Array<{ width: number; height: number }> | null
  >(null);

  useEffect(() => {
    if (items.length === 0) return;
    resolveItemDimensions(items).then(setDimensions);
  }, [items]);

  if (items.length === 0) return null;

  // Loading skeleton while dimensions are resolved
  if (dimensions === null) {
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="relative h-[250px] flex-grow rounded-lg bg-gray-200 animate-pulse"
            style={{ width: '300px' }}
          />
        ))}
      </div>
    );
  }

  const photos = buildPhotos(items, dimensions);

  const targetRowHeight =
    typeof window !== 'undefined' && window.innerWidth < 768 ? 200 : 250;

  return (
    <RowsPhotoAlbum
      photos={photos}
      spacing={8}
      targetRowHeight={targetRowHeight}
      onClick={({ index }) => onItemClick(index)}
      render={{
        photo: (_props, { photo, index, width, height }) => {
          const item: GalleryItem | undefined = items[photo.itemIndex];

          return (
            <button
              key={photo.key}
              onClick={() => onItemClick(photo.itemIndex)}
              className="relative overflow-hidden rounded-lg bg-gray-100 group focus:outline-none focus:ring-2 focus:ring-biz-orange focus:ring-offset-2"
              style={{ width, height, display: 'block' }}
              aria-label={`View ${photo.alt || `${entityName ?? 'item'} ${index + 1}`}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.src}
                alt={photo.alt}
                width={width}
                height={height}
                className="block w-full h-full object-cover transition-transform group-hover:scale-105"
              />

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium">
                  View
                </span>
              </div>

              {/* Video play overlay */}
              {item?.type === 'video' && (
                <>
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                      <Play className="w-4 h-4 text-biz-orange ml-0.5" />
                    </div>
                  </div>
                  {item.videoProvider && item.videoProvider !== 'unknown' && (
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 rounded text-xs text-white capitalize pointer-events-none">
                      {item.videoProvider}
                    </div>
                  )}
                </>
              )}

              {/* Primary Badge */}
              {showFeaturedBadge && photo.itemIndex === 0 && (
                <div className="absolute top-2 left-2 bg-biz-orange text-white px-2 py-1 rounded text-xs font-medium">
                  Primary
                </div>
              )}
            </button>
          );
        }
      }}
    />
  );
}

export default GalleryJustified;
