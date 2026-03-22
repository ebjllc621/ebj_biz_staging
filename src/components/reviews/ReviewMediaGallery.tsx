/**
 * ReviewMediaGallery - Review Media Thumbnail Grid
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 7 - Review Media & Advanced Features
 * @governance Build Map v2.1 ENHANCED
 *
 * Renders a horizontal thumbnail strip for review media (images + video embeds).
 * Clicking a thumbnail fires onImageClick(index) to open a lightbox.
 */

'use client';

import Image from 'next/image';
import { Play } from 'lucide-react';

export interface ReviewMediaGalleryProps {
  media: string[];
  onImageClick?: (index: number) => void;
  maxThumbnails?: number;
}

function isVideoUrl(url: string): boolean {
  return (
    /youtube\.com|youtu\.be|vimeo\.com|rumble\.com/i.test(url) ||
    /\.(mp4|webm|mov)$/i.test(url)
  );
}

export function ReviewMediaGallery({
  media,
  onImageClick,
  maxThumbnails = 5,
}: ReviewMediaGalleryProps) {
  const visible = media.slice(0, maxThumbnails);
  const remaining = media.length - maxThumbnails;

  return (
    <div className="flex gap-2 mt-3 overflow-x-auto">
      {visible.map((url, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onImageClick?.(index)}
          className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden group cursor-pointer"
          aria-label={`View media ${index + 1}`}
        >
          {isVideoUrl(url) ? (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <Play className="w-8 h-8 text-white" />
            </div>
          ) : (
            <Image
              src={url}
              alt={`Review media ${index + 1}`}
              fill
              className="object-cover group-hover:scale-105 transition-transform"
              sizes="80px"
              loading="lazy"
            />
          )}
          {index === maxThumbnails - 1 && remaining > 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-medium text-sm">+{remaining}</span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

export default ReviewMediaGallery;
