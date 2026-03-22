/**
 * MediaKitGenerator - Media Kit Management Dashboard Panel
 *
 * Allows Internet Personality profile owners to generate a PDF media kit,
 * upload it to Cloudinary, and share the public download link.
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 9C
 * @reference src/features/dashboard/components/managers/creator-profiles/PlatformConnectionManager.tsx
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use ErrorBoundary (ADVANCED tier requirement)
 * - Orange theme (#ed6437)
 * - fetchWithCsrf for all mutations
 * - credentials: 'include' for fetch calls
 */
'use client';

import React, { useState, useCallback } from 'react';
import { Loader2, AlertCircle, FileText, ExternalLink, Copy, CheckCircle, RefreshCw } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { fetchWithCsrf } from '@core/utils/csrf';

// ============================================================================
// Types
// ============================================================================

export interface MediaKitGeneratorProps {
  profileId: number;
  currentMediaKitUrl: string | null;
  profileSlug: string;
  onMediaKitGenerated: (url: string) => void;
}

// ============================================================================
// Inner Component
// ============================================================================

function MediaKitGeneratorContent({
  profileId,
  currentMediaKitUrl,
  profileSlug,
  onMediaKitGenerated,
}: MediaKitGeneratorProps) {
  const { selectedListingId } = useListingContext();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!selectedListingId) return;

    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/creator-profiles/media-kit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_id: profileId }),
          credentials: 'include',
        }
      );

      if (!res.ok) {
        const errData = await res.json() as { error?: string };
        throw new Error(errData.error || 'Failed to generate media kit');
      }

      const data = await res.json() as { data: { media_kit_url: string } };
      const url = data.data.media_kit_url;
      if (url) {
        onMediaKitGenerated(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate media kit');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedListingId, profileId, onMediaKitGenerated]);

  const handleCopyLink = useCallback(async () => {
    const publicUrl = `/api/content/internet-personalities/${profileSlug}/media-kit`;
    try {
      await navigator.clipboard.writeText(
        typeof window !== 'undefined'
          ? `${window.location.origin}${publicUrl}`
          : publicUrl
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Failed to copy link to clipboard');
    }
  }, [profileSlug]);

  const hasMediaKit = Boolean(currentMediaKitUrl);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
        <FileText className="w-5 h-5 text-[#ed6437]" />
        <div>
          <h3 className="font-semibold text-gray-900">Media Kit</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Auto-generated PDF with your profile stats, platforms, and rate card
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">
        {/* Description */}
        <p className="text-sm text-gray-600">
          Generate a professional media kit PDF to share with brands and collaborators.
          Your media kit includes your bio, platform stats, audience overview, content
          categories, collaboration types, rate card, and past collaborations.
        </p>

        {/* Current Media Kit Link */}
        {currentMediaKitUrl && (
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700 flex-1">Media kit generated and ready to share.</p>
            <a
              href={currentMediaKitUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium flex-shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View PDF
            </a>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 text-xs ml-auto flex-shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => void handleGenerate()}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : hasMediaKit ? (
              <RefreshCw className="w-4 h-4" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            {isGenerating
              ? 'Generating...'
              : hasMediaKit
                ? 'Regenerate Media Kit'
                : 'Generate Media Kit'}
          </button>

          {hasMediaKit && (
            <button
              onClick={() => void handleCopyLink()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? 'Copied!' : 'Copy Public Link'}
            </button>
          )}
        </div>

        {/* Public Link Note */}
        {hasMediaKit && (
          <p className="text-xs text-gray-400">
            Public link:{' '}
            <span className="font-mono">
              /api/content/internet-personalities/{profileSlug}/media-kit
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Exported component with ErrorBoundary (ADVANCED tier requirement)
// ============================================================================

export function MediaKitGenerator(props: MediaKitGeneratorProps) {
  return (
    <ErrorBoundary
      componentName="MediaKitGenerator"
      fallback={
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">
            Failed to load media kit generator. Please refresh the page.
          </p>
        </div>
      }
    >
      <MediaKitGeneratorContent {...props} />
    </ErrorBoundary>
  );
}
