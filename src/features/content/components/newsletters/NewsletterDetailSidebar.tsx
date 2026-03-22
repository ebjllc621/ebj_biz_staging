/**
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase N3 - Newsletter Detail Page
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Route } from 'next';
import { Mail, Eye, Clock, Bookmark, MapPin, ExternalLink, Calendar, Hash } from 'lucide-react';
import type { Newsletter } from '@core/types/newsletter';
import type { Listing } from '@core/services/ListingService';
import { NewsletterSubscribeForm } from '@features/content/components/newsletters/NewsletterSubscribeForm';
import { ContentSubscribeCard } from '@features/content/components/shared/ContentSubscribeCard';

interface NewsletterDetailSidebarProps {
  newsletter: Newsletter;
  listing: Listing | null;
  className?: string;
}

/**
 * Format reading time for display
 */
function formatReadingTime(minutes: number | null): string {
  if (!minutes || minutes < 1) return 'Less than 1 min';
  if (minutes === 1) return '1 min read';
  return `${minutes} min read`;
}

/**
 * Format view count with K/M suffix
 */
function formatViewCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
}

/**
 * Format date for display
 */
function formatDate(date: Date | null): string {
  if (!date) return 'Not published';
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(date));
}

export function NewsletterDetailSidebar({ newsletter, listing, className = '' }: NewsletterDetailSidebarProps) {
  const location = [listing?.city, listing?.state].filter(Boolean).join(', ');

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Card 1: Business Info (only if listing exists) */}
      {listing && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Published By
          </h3>

          {/* Listing Header */}
          <div className="flex items-start gap-3">
            <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
              {listing.logo_url ? (
                <Image
                  src={listing.logo_url}
                  alt={listing.name}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700">
                  <Mail className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-biz-navy truncate">{listing.name}</p>
              {listing.type && (
                <p className="text-sm text-gray-500 truncate capitalize">{listing.type}</p>
              )}
              {location && (
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" />
                  {location}
                </p>
              )}
            </div>
          </div>

          {/* View Business Link */}
          <Link
            href={`/listings/${listing.slug}` as Route}
            className="mt-4 flex items-center justify-center gap-1.5 w-full px-4 py-2 text-sm font-semibold text-biz-orange border-2 border-biz-orange rounded-lg hover:bg-biz-orange hover:text-white transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View Business
          </Link>

          {/* Contact Buttons */}
          {(listing.phone || listing.email || listing.website) && (
            <>
              <div className="my-4 border-t border-gray-100" />
              <div className="space-y-2">
                {listing.phone && (
                  <a
                    href={`tel:${listing.phone}`}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-biz-navy transition-colors"
                  >
                    <span className="text-gray-400">Phone:</span>
                    <span className="font-medium">{listing.phone}</span>
                  </a>
                )}
                {listing.email && (
                  <a
                    href={`mailto:${listing.email}`}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-biz-navy transition-colors truncate"
                  >
                    <span className="text-gray-400 flex-shrink-0">Email:</span>
                    <span className="font-medium truncate">{listing.email}</span>
                  </a>
                )}
                {listing.website && (
                  <a
                    href={listing.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-biz-navy transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="font-medium truncate">Website</span>
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Content Subscribe Card */}
      {listing && (
        <ContentSubscribeCard
          followType="newsletter"
          targetId={listing.id}
          targetName={listing.name}
        />
      )}

      {/* Card 2: Newsletter Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Newsletter Info
        </h3>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Published</p>
              <p className="text-sm font-medium text-gray-800">{formatDate(newsletter.published_at)}</p>
            </div>
          </div>

          {newsletter.issue_number !== null && (
            <div className="flex items-center gap-3">
              <Hash className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Issue Number</p>
                <p className="text-sm font-medium text-gray-800">#{newsletter.issue_number}</p>
              </div>
            </div>
          )}

          {newsletter.reading_time !== null && (
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Reading Time</p>
                <p className="text-sm font-medium text-gray-800">{formatReadingTime(newsletter.reading_time)}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Eye className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Views</p>
              <p className="text-sm font-medium text-gray-800">{formatViewCount(newsletter.view_count)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Bookmark className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Bookmarks</p>
              <p className="text-sm font-medium text-gray-800">{formatViewCount(newsletter.bookmark_count)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2.5: Subscribe Form */}
      <NewsletterSubscribeForm
        listingId={newsletter.listing_id}
        listingName={listing?.name}
      />

      {/* Card 3: More from this business (placeholder) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          More from this business
        </h3>
        <p className="text-sm text-gray-400 italic">Related newsletters coming soon.</p>
      </div>
    </div>
  );
}

export default NewsletterDetailSidebar;
