/**
 * PodcastDetailSidebar - Full Listing Sidebar for Podcast Detail Page
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
import { Headphones, Clock, Bookmark, Calendar, Mic } from 'lucide-react';
import type { ContentPodcast } from '@core/services/ContentService';
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

interface PodcastDetailSidebarProps {
  podcast: ContentPodcast;
  listing: Listing | null;
  className?: string;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatEpisode(season: number | null, episode: number | null): string | null {
  if (!episode) return null;
  if (season) return `S${season}E${episode}`;
  return `Ep ${episode}`;
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

function PodcastDetailSidebarContent({ podcast, listing, className = '' }: PodcastDetailSidebarProps) {
  const [isSticky, setIsSticky] = useState(false);
  const episodeLabel = formatEpisode(podcast.season_number, podcast.episode_number);
  const durationLabel = formatDuration(podcast.duration);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // If no listing data, show only stats cards
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
          {/* Episode Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Episode Stats
            </h3>
            <div className="space-y-3">
              {episodeLabel && (
                <div className="flex items-center gap-3">
                  <Mic className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Episode</p>
                    <p className="text-sm font-medium text-gray-800">{episodeLabel}</p>
                  </div>
                </div>
              )}
              {durationLabel && (
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Duration</p>
                    <p className="text-sm font-medium text-gray-800">{durationLabel}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Published</p>
                  <p className="text-sm font-medium text-gray-800">{formatDate(podcast.published_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Headphones className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Listens</p>
                  <p className="text-sm font-medium text-gray-800">{formatViewCount(podcast.view_count)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Bookmark className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Bookmarks</p>
                  <p className="text-sm font-medium text-gray-800">{formatViewCount(podcast.bookmark_count)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Listen On (placeholder) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Listen On
            </h3>
            <p className="text-sm text-gray-400 italic">Platform links coming soon.</p>
          </div>

          {/* More Episodes (placeholder) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              More Episodes
            </h3>
            <p className="text-sm text-gray-400 italic">More episodes coming soon.</p>
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
        {/* Business Header (logo, name, rating) - teal accent */}
        <ContentSidebarBusinessHeader listing={listing} accentColor="teal" />

        {/* Creator Profile Card */}
        <ContentSidebarCreatorCard listing={listing} accentColor="teal" />

        {/* Episode Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Episode Stats
          </h3>
          <div className="space-y-3">
            {episodeLabel && (
              <div className="flex items-center gap-3">
                <Mic className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Episode</p>
                  <p className="text-sm font-medium text-gray-800">{episodeLabel}</p>
                </div>
              </div>
            )}
            {durationLabel && (
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="text-sm font-medium text-gray-800">{durationLabel}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Published</p>
                <p className="text-sm font-medium text-gray-800">{formatDate(podcast.published_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Headphones className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Listens</p>
                <p className="text-sm font-medium text-gray-800">{formatViewCount(podcast.view_count)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Bookmark className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Bookmarks</p>
                <p className="text-sm font-medium text-gray-800">{formatViewCount(podcast.bookmark_count)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Listen On (placeholder) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Listen On
          </h3>
          <p className="text-sm text-gray-400 italic">Platform links coming soon.</p>
        </div>

        {/* More Episodes (placeholder) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            More Episodes
          </h3>
          <p className="text-sm text-gray-400 italic">More episodes coming soon.</p>
        </div>

        {/* Quick Contact Card */}
        <ContentSidebarQuickContact listing={listing} sourceId={podcast.id} sourceType="podcast" />

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

export function PodcastDetailSidebar(props: PodcastDetailSidebarProps) {
  return (
    <ErrorBoundary componentName="PodcastDetailSidebar">
      <PodcastDetailSidebarContent {...props} />
    </ErrorBoundary>
  );
}

export default PodcastDetailSidebar;
