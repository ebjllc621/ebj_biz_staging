/**
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 1A - Article Detail Page
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Route } from 'next';
import { getAvatarInitials } from '@core/utils/avatar';
import type { Listing } from '@core/services/ListingService';

interface ArticleAuthorBioProps {
  listing: Listing | null;
  className?: string;
}

/**
 * ArticleAuthorBio — displays the publishing business/author section.
 * Returns null if no listing is associated with the article.
 */
export function ArticleAuthorBio({ listing, className = '' }: ArticleAuthorBioProps) {
  if (!listing) return null;

  const initials = getAvatarInitials(listing.name);
  const truncatedDescription = listing.description
    ? listing.description.substring(0, 200) + (listing.description.length > 200 ? '...' : '')
    : null;

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
      <h2 className="text-lg font-bold text-biz-navy mb-4">About the Author</h2>

      <div className="flex items-start gap-4">
        {/* Listing Logo / Fallback Avatar */}
        <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
          {listing.logo_url ? (
            <Image
              src={listing.logo_url}
              alt={listing.name}
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-biz-navy to-blue-700">
              <span className="text-white text-sm font-bold">{initials}</span>
            </div>
          )}
        </div>

        {/* Listing Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-biz-navy">{listing.name}</p>
          {listing.type && (
            <p className="text-sm text-biz-orange capitalize">{listing.type}</p>
          )}
        </div>
      </div>

      {/* Description */}
      {truncatedDescription && (
        <p className="text-sm text-gray-600 mt-4 leading-relaxed">{truncatedDescription}</p>
      )}

      {/* View Profile Link */}
      <Link
        href={`/listings/${listing.slug}` as Route}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-biz-orange hover:text-orange-600 transition-colors"
      >
        View Profile
        <span aria-hidden="true">&#8594;</span>
      </Link>
    </div>
  );
}

export default ArticleAuthorBio;
