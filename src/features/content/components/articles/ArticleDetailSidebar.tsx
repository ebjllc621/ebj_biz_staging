/**
 * ArticleDetailSidebar - Full Listing Sidebar for Article Detail Page
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Content Sidebar Unification
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @reference src/features/jobs/components/JobDetailSidebar.tsx
 */
'use client';

import { useEffect, useState } from 'react';
import { Eye, Clock, Bookmark, Calendar } from 'lucide-react';
import type { ContentArticle } from '@core/services/ContentService';
import type { Listing } from '@core/services/ListingService';

// Reusable sidebar components from listings
import { SidebarLocationCard } from '@features/listings/components/details/SidebarLocationCard';
import { SidebarHoursCard } from '@features/listings/components/details/SidebarHoursCard';
import { SidebarSocialCard } from '@features/listings/components/details/SidebarSocialCard';

// Content shared sidebar components
import { ContentSidebarBusinessHeader } from '@features/content/components/shared/ContentSidebarBusinessHeader';
import { ContentSidebarQuickContact } from '@features/content/components/shared/ContentSidebarQuickContact';
import { ContentSidebarFollowButton } from '@features/content/components/shared/ContentSidebarFollowButton';
import { ContentSubscribeCard } from '@features/content/components/shared/ContentSubscribeCard';
import { ContentSidebarCreatorCard } from '@features/content/components/shared/ContentSidebarCreatorCard';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';

interface ArticleDetailSidebarProps {
  article: ContentArticle;
  listing: Listing | null;
  className?: string;
}

function formatReadingTime(minutes: number): string {
  if (minutes < 1) return 'Less than 1 min';
  if (minutes === 1) return '1 min read';
  return `${minutes} min read`;
}

function formatViewCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
}

function formatDate(date: Date | null): string {
  if (!date) return 'Not published';
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(date));
}

function ArticleDetailSidebarContent({ article, listing, className = '' }: ArticleDetailSidebarProps) {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // If no listing data, show only stats card
  if (!listing) {
    return (
      <aside
        className={`
          ${isSticky ? 'sticky top-4' : ''}
          max-h-[calc(100vh-2rem)]
          overflow-y-auto
          scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent
          ${className}
        `}
      >
        <div className="space-y-4">
          {/* Article Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Article Stats
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Published</p>
                  <p className="text-sm font-medium text-gray-800">{formatDate(article.published_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Reading Time</p>
                  <p className="text-sm font-medium text-gray-800">{formatReadingTime(article.reading_time)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Eye className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Views</p>
                  <p className="text-sm font-medium text-gray-800">{formatViewCount(article.view_count)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Bookmark className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Bookmarks</p>
                  <p className="text-sm font-medium text-gray-800">{formatViewCount(article.bookmark_count)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* More Articles (placeholder) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              More Articles
            </h3>
            <p className="text-sm text-gray-400 italic">Related articles coming soon.</p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`
        ${isSticky ? 'sticky top-4' : ''}
        max-h-[calc(100vh-2rem)]
        overflow-y-auto
        scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent
        ${className}
      `}
    >
      <div className="space-y-4">
        {/* Business Header (logo, name, rating) */}
        <ContentSidebarBusinessHeader listing={listing} accentColor="orange" />

        {/* Creator Profile Card */}
        <ContentSidebarCreatorCard listing={listing} accentColor="orange" />

        {/* Article Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Article Stats
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Published</p>
                <p className="text-sm font-medium text-gray-800">{formatDate(article.published_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Reading Time</p>
                <p className="text-sm font-medium text-gray-800">{formatReadingTime(article.reading_time)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Eye className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Views</p>
                <p className="text-sm font-medium text-gray-800">{formatViewCount(article.view_count)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Bookmark className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Bookmarks</p>
                <p className="text-sm font-medium text-gray-800">{formatViewCount(article.bookmark_count)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* More Articles (placeholder) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            More Articles
          </h3>
          <p className="text-sm text-gray-400 italic">Related articles coming soon.</p>
        </div>

        {/* Quick Contact Card */}
        <ContentSidebarQuickContact listing={listing} sourceId={article.id} sourceType="article" />

        {/* Location with Map & Get Directions */}
        <SidebarLocationCard listing={listing} />

        {/* Business Hours */}
        <SidebarHoursCard listing={listing} />

        {/* Social Links */}
        <SidebarSocialCard listing={listing} />

        {/* Content Subscribe Card */}
        <ContentSubscribeCard
          followType="business"
          targetId={listing.id}
          targetName={listing.name}
        />

        {/* Follow Business Button */}
        <ContentSidebarFollowButton listing={listing} />
      </div>
    </aside>
  );
}

export function ArticleDetailSidebar(props: ArticleDetailSidebarProps) {
  return (
    <ErrorBoundary componentName="ArticleDetailSidebar">
      <ArticleDetailSidebarContent {...props} />
    </ErrorBoundary>
  );
}

export default ArticleDetailSidebar;
