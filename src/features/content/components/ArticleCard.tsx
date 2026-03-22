/**
 * ArticleCard - Grid view article card for Content page
 *
 * @component Client Component
 * @tier SIMPLE
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * @see src/features/offers/components/OfferCard.tsx - Pattern reference
 * @see docs/pages/layouts/content/phases/PHASE_4_COMPONENTS.md
 */
'use client';

import Link from 'next/link';
import type { Route } from 'next';
import Image from 'next/image';
import { FileText, Clock, Eye, Bookmark, Star } from 'lucide-react';
import type { ContentArticle } from '@core/services/ContentService';

interface ArticleCardProps {
  /** Article data */
  article: ContentArticle;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format reading time for display
 */
function formatReadingTime(minutes: number): string {
  if (minutes < 1) return 'Less than 1 min';
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
 * ArticleCard component
 * Displays article information in a card format for grid view
 */
export function ArticleCard({ article, className = '' }: ArticleCardProps) {
  return (
    <Link
      href={`/articles/${article.slug}` as Route}
      className={`block group ${className}`}
    >
      <article className="relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full">
        {/* Featured Image */}
        <div className="relative h-40 w-full bg-gray-100">
          {article.featured_image ? (
            <Image
              src={article.featured_image}
              alt={article.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700">
              <FileText className="w-12 h-12 text-white" />
            </div>
          )}

          {/* Featured Badge */}
          {article.is_featured && (
            <span className="absolute top-3 right-3 bg-yellow-400 text-biz-navy text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <Star className="w-3 h-3" />
              Featured
            </span>
          )}

          {/* Sponsored Badge */}
          {article.is_sponsored && (
            <span className="absolute top-3 left-3 bg-biz-orange text-white text-xs font-medium px-2.5 py-1 rounded-full">
              Sponsored
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <h3 className="font-semibold text-biz-navy mt-1 line-clamp-2 group-hover:text-biz-orange transition-colors">
            {article.title}
          </h3>

          {/* Excerpt */}
          {article.excerpt && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-3">
              {article.excerpt}
            </p>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
            {/* Reading time */}
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatReadingTime(article.reading_time)}
            </span>

            {/* View count */}
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {formatViewCount(article.view_count)}
            </span>

            {/* Bookmark count */}
            {article.bookmark_count > 0 && (
              <span className="flex items-center gap-1">
                <Bookmark className="w-3.5 h-3.5" />
                {formatViewCount(article.bookmark_count)}
              </span>
            )}
          </div>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {article.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="text-xs text-biz-orange bg-biz-orange/10 px-2 py-0.5 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}

export default ArticleCard;
