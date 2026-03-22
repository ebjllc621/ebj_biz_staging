/**
 * GalleryLayoutSelector - Dashboard component for choosing gallery display layout
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 8B - Gallery Layout Selector + Mixed Media Unification
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import { useState } from 'react';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { GalleryLayout } from '@features/media/gallery';
import { LAYOUT_PREVIEWS } from './layout-previews';

interface GalleryLayoutSelectorProps {
  listingId: number;
  currentLayout: GalleryLayout;
  onLayoutChange: (_layout: GalleryLayout) => void;
}

export function GalleryLayoutSelector({
  listingId,
  currentLayout,
  onLayoutChange
}: GalleryLayoutSelectorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimisticLayout, setOptimisticLayout] = useState<GalleryLayout>(currentLayout);

  const handleSelect = async (layout: GalleryLayout) => {
    if (layout === optimisticLayout || isSaving) return;

    setIsSaving(true);
    setError(null);
    setOptimisticLayout(layout);

    try {
      const response = await fetchWithCsrf(
        `/api/listings/${listingId}/gallery-preferences`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gallery_layout: layout })
        }
      );

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error ?? 'Failed to save layout preference');
      }

      await onLayoutChange(layout);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save layout preference');
      // Revert optimistic update
      setOptimisticLayout(currentLayout);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Gallery Layout</h3>
          <p className="text-xs text-gray-500 mt-0.5">Choose how your gallery appears to visitors</p>
        </div>
        {isSaving && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Saving...
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {LAYOUT_PREVIEWS.map((preview) => {
          const isActive = optimisticLayout === preview.key;
          return (
            <button
              key={preview.key}
              onClick={() => handleSelect(preview.key)}
              disabled={isSaving}
              className={`relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-biz-orange focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                isActive
                  ? 'border-biz-orange bg-orange-50'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
              aria-pressed={isActive}
              aria-label={`${preview.label} layout: ${preview.description}`}
            >
              {/* Active checkmark */}
              {isActive && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-biz-orange flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}

              {/* Miniature preview */}
              <LayoutMiniature preview={preview} />

              {/* Label */}
              <span className={`text-xs font-medium ${isActive ? 'text-biz-orange' : 'text-gray-700'}`}>
                {preview.label}
              </span>
              <span className="text-[10px] text-gray-400 text-center leading-tight">
                {preview.description}
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

interface LayoutMiniatureProps {
  preview: typeof LAYOUT_PREVIEWS[number];
}

function LayoutMiniature({ preview }: LayoutMiniatureProps) {
  if (preview.key === 'grid') {
    return (
      <div className="w-full h-10 grid grid-cols-3 gap-0.5">
        {preview.previewBlocks.map((block, i) => (
          <div key={i} className={block.className} />
        ))}
      </div>
    );
  }

  if (preview.key === 'masonry') {
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

  if (preview.key === 'carousel') {
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

  if (preview.key === 'justified') {
    return (
      <div className="w-full h-10 flex flex-col gap-0.5">
        <div className="flex gap-0.5 flex-1">
          <div className="w-[40%] bg-gray-300 rounded-sm" />
          <div className="w-[35%] bg-gray-400 rounded-sm" />
          <div className="w-[25%] bg-gray-300 rounded-sm" />
        </div>
        <div className="flex gap-0.5 flex-1">
          <div className="w-[30%] bg-gray-400 rounded-sm" />
          <div className="w-[45%] bg-gray-300 rounded-sm" />
          <div className="w-[25%] bg-gray-400 rounded-sm" />
        </div>
      </div>
    );
  }

  return null;
}

export default GalleryLayoutSelector;
