/**
 * GalleryGrid - Standard grid layout renderer
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 8A - Gallery Display Standardization
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import Image from 'next/image';
import { Play, Film } from 'lucide-react';
import type { LayoutRendererProps, GalleryItem } from '../types/gallery-types';

export function GalleryGrid({
  items,
  onItemClick,
  showFeaturedBadge,
  entityName
}: LayoutRendererProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((item: GalleryItem, index: number) => (
        <button
          key={item.id}
          onClick={() => onItemClick(index)}
          className={`relative overflow-hidden rounded-lg bg-gray-100 group focus:outline-none focus:ring-2 focus:ring-biz-orange focus:ring-offset-2 ${item.type === 'video' ? 'aspect-video' : 'aspect-square min-h-[200px]'}`}
          aria-label={`View ${item.alt || `${entityName ?? 'item'} ${index + 1}`}`}
          style={item.type === 'image' ? { minHeight: '200px' } : undefined}
        >
          {item.url ? (
            <Image
              src={item.url}
              alt={item.alt}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <Film className="w-8 h-8 text-gray-600" />
            </div>
          )}

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium">
              View
            </span>
          </div>

          {/* Video play overlay */}
          {item.type === 'video' && (
            <>
              {/* Play button overlay */}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="w-4 h-4 text-biz-orange ml-0.5" />
                </div>
              </div>
              {/* Provider badge */}
              {item.videoProvider && item.videoProvider !== 'unknown' && (
                <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 rounded text-xs text-white capitalize pointer-events-none">
                  {item.videoProvider}
                </div>
              )}
            </>
          )}

          {/* Primary Badge */}
          {showFeaturedBadge && index === 0 && (
            <div className="absolute top-2 left-2 bg-biz-orange text-white px-2 py-1 rounded text-xs font-medium">
              Primary
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

export default GalleryGrid;
