/**
 * VideoEmbedInput - Controlled multi-URL input for video embeds
 * with platform auto-detection and colored badges.
 *
 * @authority CLAUDE.md - Build Map v2.1
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 1 - Shared Media Upload Components
 */

'use client';

import { useCallback } from 'react';
import { parseVideoUrl } from '@features/media/gallery/utils/video-url-parser';
import { PLATFORM_COLORS } from '@features/media/types/shared-media';
import type { VideoEmbedInputProps } from '@features/media/types/shared-media';

// ============================================================================
// COMPONENT
// ============================================================================

export default function VideoEmbedInput({
  videoUrls,
  maxVideos,
  onUrlsChange,
  disabled = false,
}: VideoEmbedInputProps) {
  // Add a new empty URL input
  const handleAdd = useCallback(() => {
    if (videoUrls.length < maxVideos) {
      onUrlsChange([...videoUrls, '']);
    }
  }, [videoUrls, maxVideos, onUrlsChange]);

  // Remove a URL input at given index
  const handleRemove = useCallback(
    (index: number) => {
      const updated = videoUrls.filter((_, i) => i !== index);
      onUrlsChange(updated);
    },
    [videoUrls, onUrlsChange]
  );

  // Update a URL at given index
  const handleChange = useCallback(
    (index: number, value: string) => {
      const updated = videoUrls.map((url, i) => (i === index ? value : url));
      onUrlsChange(updated);
    },
    [videoUrls, onUrlsChange]
  );

  // Show tier upgrade message when no videos are allowed
  if (maxVideos === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
        <p className="text-sm text-gray-500">
          Video embeds are not available on your current plan.
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Upgrade your plan to add video embeds.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {videoUrls.map((url, index) => {
        const parsed = url.trim() ? parseVideoUrl(url.trim()) : null;
        const isValid = parsed && parsed.provider !== 'unknown';
        const isUnknown = parsed && parsed.provider === 'unknown' && url.trim().length > 0;
        const platformInfo = parsed ? PLATFORM_COLORS[parsed.provider] : null;

        return (
          <div key={index} className="flex items-start gap-2">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => handleChange(index, e.target.value)}
                  disabled={disabled}
                  placeholder="Paste YouTube, Vimeo, TikTok, Rumble, or Dailymotion URL"
                  aria-label={`Video URL ${index + 1}`}
                  className={`
                    w-full rounded-md border px-3 py-2 text-sm
                    focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent
                    disabled:bg-gray-100 disabled:cursor-not-allowed
                    ${isUnknown
                      ? 'border-red-300 bg-red-50'
                      : isValid
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-300 bg-white'
                    }
                  `}
                />
                {isValid && platformInfo && (
                  <span
                    className={`
                      shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                      ${platformInfo.bg} ${platformInfo.text}
                    `}
                  >
                    {platformInfo.label}
                  </span>
                )}
              </div>
              {isUnknown && (
                <p className="text-xs text-red-600" role="alert">
                  Unrecognized video URL. Supported: YouTube, Vimeo, TikTok, Dailymotion, Rumble, or direct .mp4/.webm/.mov links.
                </p>
              )}
            </div>

            {/* Remove button */}
            <button
              type="button"
              onClick={() => handleRemove(index)}
              disabled={disabled}
              aria-label={`Remove video URL ${index + 1}`}
              className="mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        );
      })}

      {/* Add video button */}
      {videoUrls.length < maxVideos && (
        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-[#ed6437] px-3 py-2 text-sm font-medium text-[#ed6437] hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add video URL
        </button>
      )}

      {/* Limit indicator */}
      {maxVideos > 0 && (
        <p className="text-xs text-gray-500">
          {videoUrls.length}/{maxVideos} videos
        </p>
      )}
    </div>
  );
}
