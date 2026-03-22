/**
 * @component Client Component
 * @tier STANDARD
 * @phase Phase N3 - Newsletter Detail Page
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import Image from 'next/image';
import {
  Mail,
  Clock,
  Eye,
  Bookmark,
  Calendar,
  Share2,
  Flag,
  Star
} from 'lucide-react';
import { RecommendButton } from '@features/sharing/components/RecommendButton';
import type { Newsletter } from '@core/types/newsletter';

interface NewsletterDetailHeroProps {
  newsletter: Newsletter;
  listingName?: string;
  listingLogo?: string;
  onShareClick: () => void;
  onBookmarkClick: () => void;
  onReportClick: () => void;
  isBookmarked?: boolean;
  className?: string;
  onRecommendSuccess?: () => void;
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
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

/**
 * Format date for display
 */
function formatDate(date: Date | null): string {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(date));
}

export function NewsletterDetailHero({
  newsletter,
  listingName,
  onShareClick,
  onBookmarkClick,
  onReportClick,
  isBookmarked = false,
  className = '',
  onRecommendSuccess
}: NewsletterDetailHeroProps) {
  const publishedDate = formatDate(newsletter.published_at);
  const displayTags = newsletter.tags.slice(0, 5);

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      {/* Featured Image Banner */}
      <div className="relative h-48 sm:h-64 w-full bg-gray-100">
        {newsletter.featured_image ? (
          <Image
            src={newsletter.featured_image}
            alt={newsletter.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 66vw, 50vw"
            priority
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700">
            <Mail className="w-16 h-16 text-white opacity-75" />
          </div>
        )}

        {/* Featured Badge */}
        {newsletter.is_featured && (
          <span className="absolute top-3 right-3 bg-yellow-400 text-biz-navy text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
            <Star className="w-3 h-3" />
            Featured
          </span>
        )}

        {/* Issue Number Badge */}
        {newsletter.issue_number && (
          <span className="absolute top-3 left-3 bg-biz-orange text-white text-xs font-medium px-2.5 py-1 rounded-full">
            Issue #{newsletter.issue_number}
          </span>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6">
        {/* Listing Name */}
        {listingName && (
          <span className="text-sm font-medium uppercase text-biz-orange tracking-wide">
            {listingName}
          </span>
        )}

        {/* Newsletter Title */}
        <h1 className="text-2xl lg:text-3xl font-bold text-biz-navy mt-2">
          {newsletter.title}
        </h1>

        {/* Metadata Row */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-4">
          {newsletter.reading_time !== null && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {formatReadingTime(newsletter.reading_time)}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Eye className="w-4 h-4" />
            {formatViewCount(newsletter.view_count)} views
          </span>
          {newsletter.bookmark_count > 0 && (
            <span className="flex items-center gap-1.5">
              <Bookmark className="w-4 h-4" />
              {formatViewCount(newsletter.bookmark_count)}
            </span>
          )}
          {publishedDate && (
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {publishedDate}
            </span>
          )}
        </div>

        {/* Tags Row */}
        {displayTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {displayTags.map((tag, index) => (
              <span
                key={index}
                className="text-xs text-biz-orange bg-biz-orange/10 px-2 py-0.5 rounded"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center gap-2 mt-6">
          <button
            onClick={onBookmarkClick}
            className={`inline-flex items-center justify-center whitespace-nowrap gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-colors ${
              isBookmarked
                ? 'border-biz-orange text-biz-orange bg-orange-50'
                : 'border-gray-300 text-gray-700 hover:border-biz-orange hover:text-biz-orange'
            }`}
          >
            <Bookmark className="w-4 h-4 flex-shrink-0" />
            {isBookmarked ? 'Bookmarked' : 'Bookmark'}
          </button>

          <button
            onClick={onShareClick}
            className="inline-flex items-center justify-center whitespace-nowrap gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border-2 border-gray-300 text-gray-700 hover:border-biz-navy hover:text-biz-navy transition-colors"
          >
            <Share2 className="w-4 h-4 flex-shrink-0" />
            Share
          </button>

          <button
            onClick={onReportClick}
            className="inline-flex items-center justify-center whitespace-nowrap gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border-2 border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
          >
            <Flag className="w-4 h-4 flex-shrink-0" />
            Report
          </button>

          <RecommendButton
            entityType="newsletter"
            entityId={newsletter.id.toString()}
            entityPreview={{
              title: newsletter.title,
              description: newsletter.excerpt || newsletter.web_content?.substring(0, 200) || '',
              image_url: newsletter.featured_image || null,
              url: `/newsletters/${newsletter.slug || ''}`
            }}
            variant="secondary"
            size="sm"
            className="!py-2 !px-4 !border-2 !rounded-lg !font-semibold !text-sm !whitespace-nowrap [&>svg]:w-4 [&>svg]:h-4 [&>svg]:flex-shrink-0"
            onRecommendSuccess={onRecommendSuccess}
          />
        </div>
      </div>
    </div>
  );
}

export default NewsletterDetailHero;
