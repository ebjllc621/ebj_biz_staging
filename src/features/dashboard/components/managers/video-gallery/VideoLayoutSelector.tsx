/**
 * VideoLayoutSelector - Dashboard component for choosing video gallery display layout
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Video Gallery Manager
 * @governance Build Map v2.1 ENHANCED
 * @description Saves to /api/listings/[id]/video-gallery-preferences
 *   and the video_gallery_layout column.
 */
'use client';

import { useState } from 'react';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { VideoGalleryLayout } from '@features/media/gallery';

// ---------------------------------------------------------------------------
// Video-specific layout options
// ---------------------------------------------------------------------------

interface VideoLayoutOption {
  key: VideoGalleryLayout;
  label: string;
  description: string;
}

const VIDEO_LAYOUT_OPTIONS: VideoLayoutOption[] = [
  {
    key: 'grid',
    label: 'Grid',
    description: 'Tiles in a responsive grid',
  },
  {
    key: 'masonry',
    label: 'Masonry',
    description: 'Variable-height Pinterest-style layout',
  },
  {
    key: 'carousel',
    label: 'Carousel',
    description: 'One at a time with prev/next navigation',
  },
  {
    key: 'inline',
    label: 'Inline',
    description: 'Full-width videos stacked vertically',
  },
  {
    key: 'showcase',
    label: 'Showcase',
    description: 'Featured video with thumbnail strip below',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface VideoLayoutSelectorProps {
  listingId: number;
  currentLayout: VideoGalleryLayout;
  onLayoutChange: (_layout: VideoGalleryLayout) => void;
}

export function VideoLayoutSelector({
  listingId,
  currentLayout,
  onLayoutChange
}: VideoLayoutSelectorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimisticLayout, setOptimisticLayout] = useState<VideoGalleryLayout>(currentLayout);

  const handleSelect = async (layout: VideoGalleryLayout) => {
    if (layout === optimisticLayout || isSaving) return;

    setIsSaving(true);
    setError(null);
    setOptimisticLayout(layout);

    try {
      const response = await fetchWithCsrf(
        `/api/listings/${listingId}/video-gallery-preferences`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ video_gallery_layout: layout })
        }
      );

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error ?? 'Failed to save layout preference');
      }

      await onLayoutChange(layout);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save layout preference');
      setOptimisticLayout(currentLayout);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Video Gallery Layout</h3>
          <p className="text-xs text-gray-500 mt-0.5">Choose how your video gallery appears to visitors</p>
        </div>
        {isSaving && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Saving...
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {VIDEO_LAYOUT_OPTIONS.map((option) => {
          const isActive = optimisticLayout === option.key;
          return (
            <button
              key={option.key}
              onClick={() => handleSelect(option.key)}
              disabled={isSaving}
              className={`relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-biz-orange focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                isActive
                  ? 'border-biz-orange bg-orange-50'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
              aria-pressed={isActive}
              aria-label={`${option.label} layout: ${option.description}`}
            >
              {isActive && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-biz-orange flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}

              <VideoLayoutMiniature layoutKey={option.key} />

              <span className={`text-xs font-medium ${isActive ? 'text-biz-orange' : 'text-gray-700'}`}>
                {option.label}
              </span>
              <span className="text-[10px] text-gray-400 text-center leading-tight">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2.5 bg-red-50 text-red-700 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-xs hover:underline flex-shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MINIATURE PREVIEW RENDERER
// ============================================================================

function VideoLayoutMiniature({ layoutKey }: { layoutKey: VideoGalleryLayout }) {
  if (layoutKey === 'grid') {
    return (
      <div className="w-full h-10 grid grid-cols-3 gap-0.5">
        <div className="aspect-square bg-gray-300 rounded-sm" />
        <div className="aspect-square bg-gray-400 rounded-sm" />
        <div className="aspect-square bg-gray-300 rounded-sm" />
        <div className="aspect-square bg-gray-400 rounded-sm" />
        <div className="aspect-square bg-gray-300 rounded-sm" />
        <div className="aspect-square bg-gray-400 rounded-sm" />
      </div>
    );
  }

  if (layoutKey === 'masonry') {
    return (
      <div className="w-full h-10 flex gap-0.5">
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="h-4 bg-gray-300 rounded-sm" />
          <div className="h-6 bg-gray-400 rounded-sm" />
        </div>
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="h-6 bg-gray-400 rounded-sm" />
          <div className="h-4 bg-gray-300 rounded-sm" />
        </div>
        <div className="flex-1 flex flex-col gap-0.5">
          <div className="h-3 bg-gray-300 rounded-sm" />
          <div className="h-7 bg-gray-400 rounded-sm" />
        </div>
      </div>
    );
  }

  if (layoutKey === 'carousel') {
    return (
      <div className="w-full h-10 flex flex-col gap-0.5">
        <div className="w-full flex-1 bg-gray-300 rounded-sm" />
        <div className="flex gap-0.5 justify-center">
          <div className="w-1 h-1 rounded-full bg-biz-orange" />
          <div className="w-1 h-1 rounded-full bg-gray-300" />
          <div className="w-1 h-1 rounded-full bg-gray-300" />
        </div>
      </div>
    );
  }

  if (layoutKey === 'inline') {
    return (
      <div className="w-full h-10 flex flex-col gap-0.5">
        <div className="w-full h-3 bg-gray-300 rounded-sm" />
        <div className="w-full h-3 bg-gray-400 rounded-sm" />
        <div className="w-full h-3 bg-gray-300 rounded-sm" />
      </div>
    );
  }

  if (layoutKey === 'showcase') {
    return (
      <div className="w-full h-10 flex flex-col gap-0.5">
        <div className="w-full flex-1 bg-gray-300 rounded-sm" />
        <div className="flex gap-0.5 h-2">
          <div className="flex-1 bg-biz-orange/60 rounded-sm" />
          <div className="flex-1 bg-gray-400 rounded-sm" />
          <div className="flex-1 bg-gray-400 rounded-sm" />
          <div className="flex-1 bg-gray-400 rounded-sm" />
        </div>
      </div>
    );
  }

  return null;
}

export default VideoLayoutSelector;
