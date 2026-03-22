/**
 * @component VideoSEOEditModal
 * @tier STANDARD
 * @phase Video Gallery Manager
 *
 * Batch SEO metadata editor for selected videos. Replicates GallerySEOEditModal
 * with video-specific adaptations: provider badge replaces image thumbnail,
 * labels say "videos" instead of "images".
 *
 * Uses key-based unmount/remount pattern (VideoSEOEditModalInner) to guarantee
 * fresh local state whenever the modal opens.
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Film } from 'lucide-react';
import BizModal from '@/components/BizModal/BizModal';
import SEOHealthBadge from '@features/media/admin/components/SEOHealthBadge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VideoSEOItem {
  url: string;
  altText?: string;
  titleText?: string;
  provider?: string; // e.g. 'youtube', 'vimeo'
}

/* eslint-disable no-unused-vars */
export interface VideoSEOEditModalProps {
  isOpen?: boolean;
  onClose: () => void;
  videos?: VideoSEOItem[];
  /** Alias for videos (used by VideoManager) */
  items?: VideoSEOItem[];
  onSave: (
    updates: Array<{ url: string; altText: string; titleText: string }>
  ) => Promise<void>;
  isSaving?: boolean;
}
/* eslint-enable no-unused-vars */

// ---------------------------------------------------------------------------
// Provider badge helper
// ---------------------------------------------------------------------------

function ProviderBadge({ provider }: { provider?: string }) {
  const label = provider
    ? provider.charAt(0).toUpperCase() + provider.slice(1).toLowerCase()
    : 'Video';

  return (
    <div className="flex flex-col items-center justify-center gap-1 w-16 h-16 rounded-md bg-gray-100 border border-gray-200 flex-shrink-0">
      <Film size={20} className="text-[#ed6437]" />
      <span className="text-[10px] font-medium text-gray-600 leading-none truncate max-w-[56px] text-center">
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-row field state
// ---------------------------------------------------------------------------

interface RowState {
  altText: string;
  titleText: string;
}

// ---------------------------------------------------------------------------
// Inner component — remounted on open to guarantee fresh state
// ---------------------------------------------------------------------------

function VideoSEOEditModalInner({
  isOpen = true,
  onClose,
  videos: videosProp,
  items,
  onSave,
  isSaving = false,
}: VideoSEOEditModalProps) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const videos = useMemo(() => videosProp ?? items ?? [], [videosProp, items]);
  const [rows, setRows] = useState<RowState[]>(() =>
    videos.map((v): RowState => ({
      altText: v.altText ?? '',
      titleText: v.titleText ?? '',
    }))
  );

  // Track which rows have been changed
  const [dirty, setDirty] = useState<Set<number>>(new Set());

  const handleFieldChange = useCallback(
    (index: number, field: keyof RowState, value: string) => {
      setRows((prev) => {
        const next = [...prev];
        const current = next[index];
        if (current) {
          next[index] = { ...current, [field]: value };
        }
        return next;
      });
      setDirty((prev) => new Set(prev).add(index));
    },
    []
  );

  const handleSave = useCallback(async () => {
    const updates = videos
      .map((v, i) => ({
        url: v.url,
        altText: rows[i]?.altText ?? '',
        titleText: rows[i]?.titleText ?? '',
      }))
      .filter((_, i) => dirty.has(i));

    if (updates.length === 0) {
      onClose();
      return;
    }

    await onSave(updates);
  }, [videos, rows, dirty, onSave, onClose]);

  const footer = (
    <div className="flex justify-end gap-3">
      <button
        type="button"
        onClick={onClose}
        disabled={isSaving}
        className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#ed6437] disabled:opacity-40 min-h-[44px]"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving || dirty.size === 0}
        className="px-4 py-2 rounded-md text-sm font-medium text-white bg-[#ed6437] hover:bg-[#d45a2f] focus:outline-none focus:ring-2 focus:ring-[#ed6437] disabled:opacity-40 min-h-[44px]"
      >
        {isSaving ? 'Saving…' : `Save ${dirty.size > 0 ? `(${dirty.size})` : ''}`}
      </button>
    </div>
  );

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit SEO Metadata (${videos.length} video${videos.length !== 1 ? 's' : ''})`}
      footer={footer}
      maxWidth="lg"
    >
      <div className="overflow-y-auto max-h-[60vh]">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-3 py-2 text-left font-medium text-gray-600 w-20">
                Video
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">
                Alt Text
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-600">
                Title Text
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-600 w-28">
                SEO Health
              </th>
            </tr>
          </thead>
          <tbody>
            {videos.map((video, index) => (
              <tr
                key={video.url}
                className={`border-b border-gray-100 ${
                  dirty.has(index) ? 'bg-orange-50' : ''
                }`}
              >
                {/* Provider icon column */}
                <td className="px-3 py-3">
                  <ProviderBadge provider={video.provider} />
                </td>

                {/* Alt text */}
                <td className="px-3 py-3">
                  <input
                    type="text"
                    value={rows[index]?.altText ?? ''}
                    onChange={(e) =>
                      handleFieldChange(index, 'altText', e.target.value)
                    }
                    placeholder="Describe this video…"
                    maxLength={255}
                    aria-label={`Alt text for video ${index + 1}`}
                    className="w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent min-h-[40px]"
                  />
                </td>

                {/* Title text */}
                <td className="px-3 py-3">
                  <input
                    type="text"
                    value={rows[index]?.titleText ?? ''}
                    onChange={(e) =>
                      handleFieldChange(index, 'titleText', e.target.value)
                    }
                    placeholder="Video title…"
                    maxLength={255}
                    aria-label={`Title text for video ${index + 1}`}
                    className="w-full px-2 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent min-h-[40px]"
                  />
                </td>

                {/* SEO health badge */}
                <td className="px-3 py-3">
                  <SEOHealthBadge
                    altText={rows[index]?.altText ?? ''}
                    titleText={rows[index]?.titleText ?? ''}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {videos.length === 0 && (
          <p className="text-center text-gray-500 py-8 text-sm">
            No videos selected.
          </p>
        )}
      </div>
    </BizModal>
  );
}

// ---------------------------------------------------------------------------
// Public wrapper — key-based remount guarantees fresh inner state
// ---------------------------------------------------------------------------

export default function VideoSEOEditModal(props: VideoSEOEditModalProps) {
  const videoList = props.videos ?? props.items ?? [];
  const key = props.isOpen
    ? `open-${videoList.length}`
    : 'closed';

  return <VideoSEOEditModalInner key={key} {...props} />;
}
