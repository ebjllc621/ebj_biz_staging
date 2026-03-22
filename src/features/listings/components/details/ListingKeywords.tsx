/**
 * ListingKeywords - SEO Keywords Display (Dashboard-Only)
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 4 - Missing Components
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Badge/tag display of SEO keywords
 * - Edit mode only (DASHBOARD_ONLY feature)
 * - Published mode ALWAYS returns null
 * - No API needed - reads from listing.keywords field
 * - Empty state with configure link to SEO page
 *
 * @see docs/pages/layouts/listings/details/detailspageenhance/3-1-26/phases/PHASE_4_BRAIN_PLAN.md
 */
'use client';

import Link from 'next/link';
import { Tag, Settings } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';

interface ListingKeywordsProps {
  /** Listing data */
  listing: Listing;
  /** Whether in edit mode */
  isEditing?: boolean;
}

export function ListingKeywords({ listing, isEditing }: ListingKeywordsProps) {
  // ALWAYS return null in published mode (DASHBOARD_ONLY feature)
  if (!isEditing) {
    return null;
  }

  // Show empty state in edit mode when no keywords
  if (!listing.keywords || listing.keywords.length === 0) {
    return (
      <section className="bg-white rounded-lg shadow-sm p-6 border-2 border-dashed border-gray-300">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <Tag className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              SEO Keywords
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              No keywords set. Add keywords to improve search visibility.
            </p>
            <Link
              href={`/dashboard/listings/${String(listing.id)}/seo` as any}
              className="inline-flex items-center gap-2 px-4 py-2 bg-biz-navy text-white text-sm font-medium rounded-md hover:bg-biz-navy/90 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configure SEO
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-biz-navy flex items-center gap-2">
          <Tag className="w-5 h-5 text-biz-orange" />
          SEO Keywords
          <span className="text-sm font-normal text-gray-500">
            ({listing.keywords.length})
          </span>
        </h2>

        {/* Edit Link */}
        <Link
          href={`/dashboard/listings/${String(listing.id)}/seo` as any}
          className="text-sm text-biz-orange hover:text-biz-orange/80 transition-colors flex items-center gap-1"
        >
          <Settings className="w-4 h-4" />
          Edit
        </Link>
      </div>

      {/* Dashboard-Only Notice */}
      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-700">
          <strong>Dashboard Only:</strong> These keywords help search engines find your listing.
          They are not displayed to public visitors.
        </p>
      </div>

      {/* Keywords Tags */}
      <div className="flex flex-wrap gap-2">
        {listing.keywords.map((keyword, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-full border border-gray-200"
          >
            <Tag className="w-3 h-3 text-gray-500" />
            {keyword}
          </span>
        ))}
      </div>
    </section>
  );
}
