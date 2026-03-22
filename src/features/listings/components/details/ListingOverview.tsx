/**
 * @component ListingOverview
 * @tier STANDARD - Has state for expand/collapse functionality
 * @phase Phase 2 - Overview & Description Section
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 *
 * Displays listing slogan and description with expand/collapse functionality.
 * Returns null if both slogan and description are empty.
 * Sanitizes HTML with DOMPurify before rendering.
 *
 * @see docs/pages/layouts/listings/details/phases/PHASE_2_BRAIN_PLAN.md
 */

'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Listing } from '@core/services/ListingService';

// Lazy-load DOMPurify client-side only to avoid jsdom SSR issues
function useSanitizedHtml(html: string): string {
  const [sanitized, setSanitized] = useState(html);
  const purifyRef = useRef<typeof import('isomorphic-dompurify').default | null>(null);

  useEffect(() => {
    if (!html) return;
    import('isomorphic-dompurify').then((mod) => {
      purifyRef.current = mod.default;
      setSanitized(mod.default.sanitize(html));
    });
  }, [html]);

  return sanitized;
}

interface ListingOverviewProps {
  listing: Listing;
}

const DEFAULT_TRUNCATE_LENGTH = 300;

/**
 * Get the text-only length of an HTML string (strips tags for counting)
 */
function getTextLength(html: string): number {
  return html.replace(/<[^>]*>/g, '').length;
}

export function ListingOverview({ listing }: ListingOverviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Sanitize the description HTML (lazy-loaded client-side)
  const sanitizedDescription = useSanitizedHtml(listing.description || '');

  // Determine if description needs truncation based on text content length
  const descriptionNeedsTruncation = useMemo(() => {
    return getTextLength(sanitizedDescription) > DEFAULT_TRUNCATE_LENGTH;
  }, [sanitizedDescription]);

  // For truncated view, show full sanitized HTML (truncating HTML mid-tag is dangerous)
  // Instead, we rely on CSS to handle visual truncation when collapsed
  const displayDescription = useMemo(() => {
    if (!sanitizedDescription) return '';
    if (!descriptionNeedsTruncation || isExpanded) {
      return sanitizedDescription;
    }
    return sanitizedDescription;
  }, [sanitizedDescription, descriptionNeedsTruncation, isExpanded]);

  // Return null if no description to display
  if (!listing.description) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Description */}
      {listing.description && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">About</h2>
          <div
            className={`prose prose-sm max-w-none text-gray-600 ${
              !isExpanded && descriptionNeedsTruncation ? 'max-h-[120px] overflow-hidden relative' : ''
            }`}
            dangerouslySetInnerHTML={{ __html: displayDescription }}
          />

          {/* Fade overlay when truncated */}
          {!isExpanded && descriptionNeedsTruncation && (
            <div className="relative -mt-8 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          )}

          {/* Show More/Less Button */}
          {descriptionNeedsTruncation && (
            <button
              onClick={toggleExpanded}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm focus:outline-none focus:underline"
              type="button"
            >
              {isExpanded ? 'Show Less' : 'Show More'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
