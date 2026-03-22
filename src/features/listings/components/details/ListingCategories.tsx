/**
 * @component ListingCategories
 * @tier SIMPLE
 * @phase Phase 2 - Overview & Description Section (updated for sidebar layout)
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 *
 * Displays categories, features, and amenities as tags.
 * Supports compact mode for sidebar (2 rows + "See all" expand).
 * Categories are clickable links to /listings?category=[slug].
 * Returns null if nothing to show.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Tag, ChevronDown, ChevronUp } from 'lucide-react';
import type { Route } from 'next';
import type { Listing } from '@core/services/ListingService';

/** Category information for multi-category display */
interface CategoryInfo {
  id: number;
  name: string;
  slug: string;
}

interface ListingCategoriesProps {
  listing: Listing;
  /** All categories the listing belongs to (multi-category support) */
  categories?: CategoryInfo[];
  /** Legacy: Single category name (backwards compatibility) */
  categoryName?: string;
  /** Legacy: Single category slug (backwards compatibility) */
  categorySlug?: string;
  /** Compact mode for sidebar - shows 2 rows with "See all" expand */
  compact?: boolean;
}

export function ListingCategories({
  listing,
  categories = [],
  categoryName,
  categorySlug,
  compact = false,
}: ListingCategoriesProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsExpand, setNeedsExpand] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Derive display categories: prefer array, fallback to legacy single category
  const displayCategories: CategoryInfo[] = categories.length > 0
    ? categories
    : (categoryName && categorySlug && listing.category_id)
      ? [{ id: listing.category_id, name: categoryName, slug: categorySlug }]
      : [];

  // Check if there's anything to display
  const hasCategories = displayCategories.length > 0;
  const hasFeatures = listing.features && listing.features.length > 0;
  const hasAmenities = listing.amenities && listing.amenities.length > 0;

  // All tags combined for compact mode
  const allTags = [
    ...displayCategories.map(c => ({ type: 'category' as const, ...c })),
    ...(listing.features || []).map((f, i) => ({ type: 'feature' as const, id: i, name: f, slug: '' })),
    ...(listing.amenities || []).map((a, i) => ({ type: 'amenity' as const, id: i + 1000, name: a, slug: '' })),
  ];

  // Check if content overflows 2 rows
  // Each tag: py-1 (8px) + text (~16px) = ~24px height, gap-1.5 = 6px
  // Two rows: 24 + 6 + 24 = 54px
  useEffect(() => {
    if (compact && containerRef.current) {
      const el = containerRef.current;
      setNeedsExpand(el.scrollHeight > 58);
    }
  }, [compact, allTags.length]);

  if (!hasCategories && !hasFeatures && !hasAmenities) {
    return null;
  }

  // Compact sidebar mode
  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Tag className="w-4 h-4 text-biz-navy" />
          Categories
        </h3>
        <div
          ref={containerRef}
          className={`flex flex-wrap gap-1.5 overflow-hidden transition-all duration-200 ${
            isExpanded ? 'max-h-[500px]' : 'max-h-[58px]'
          }`}
        >
          {displayCategories.map((category) => (
            <Link
              key={`cat-${category.id}`}
              href={`/listings?category=${category.slug}&fromListing=${listing.id}` as Route}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
            >
              {category.name}
            </Link>
          ))}
          {(listing.features || []).map((feature, index) => (
            <span
              key={`feat-${index}`}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
            >
              {feature}
            </span>
          ))}
          {(listing.amenities || []).map((amenity, index) => (
            <span
              key={`amen-${index}`}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"
            >
              {amenity}
            </span>
          ))}
        </div>
        {needsExpand && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 text-xs font-medium text-biz-navy hover:text-biz-navy/80 flex items-center gap-1 transition-colors"
          >
            {isExpanded ? (
              <>Show less <ChevronUp className="w-3 h-3" /></>
            ) : (
              <>See all <ChevronDown className="w-3 h-3" /></>
            )}
          </button>
        )}
      </div>
    );
  }

  // Full mode (original layout)
  return (
    <div className="space-y-4">
      {/* Categories - supports multiple */}
      {hasCategories && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Tag className="w-4 h-4" />
            {displayCategories.length === 1 ? 'Category' : 'Categories'}
          </h3>
          <div className="flex flex-wrap gap-2">
            {displayCategories.map((category) => (
              <Link
                key={category.id}
                href={`/listings?category=${category.slug}&fromListing=${listing.id}` as Route}
                className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Features */}
      {hasFeatures && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Features</h3>
          <div className="flex flex-wrap gap-2">
            {listing.features!.map((feature, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Amenities */}
      {hasAmenities && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Amenities</h3>
          <div className="flex flex-wrap gap-2">
            {listing.amenities!.map((amenity, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"
              >
                {amenity}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
