/**
 * VideoDetailSidebar - Full Listing Sidebar for Video Detail Page
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
import { Clock, Eye, Bookmark, Calendar, Video } from 'lucide-react';
import type { ContentVideo } from '@core/services/ContentService';
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

interface VideoDetailSidebarProps {
  video: ContentVideo;
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

function getVideoTypeLabel(videoType: string): string {
  switch (videoType) {
    case 'youtube': return 'YouTube Video';
    case 'vimeo': return 'Vimeo Video';
    case 'upload': return 'Uploaded Video';
    case 'embed': return 'Embedded Video';
    default: return videoType;
  }
}

function VideoDetailSidebarContent({ video, listing, className = '' }: VideoDetailSidebarProps) {
  const [isSticky, setIsSticky] = useState(false);
  const durationLabel = formatDuration(video.duration);

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
          {/* Video Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Video Stats
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Video className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Type</p>
                  <p className="text-sm font-medium text-gray-800">{getVideoTypeLabel(video.video_type)}</p>
                </div>
              </div>
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
                  <p className="text-sm font-medium text-gray-800">{formatDate(video.published_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Eye className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Views</p>
                  <p className="text-sm font-medium text-gray-800">{formatViewCount(video.view_count)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Bookmark className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Bookmarks</p>
                  <p className="text-sm font-medium text-gray-800">{formatViewCount(video.bookmark_count)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Related Videos (placeholder) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Related Videos
            </h3>
            <p className="text-sm text-gray-400 italic">More videos coming soon.</p>
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
        {/* Business Header (logo, name, rating) - purple accent */}
        <ContentSidebarBusinessHeader listing={listing} accentColor="purple" />

        {/* Creator Profile Card */}
        <ContentSidebarCreatorCard listing={listing} accentColor="purple" />

        {/* Video Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Video Stats
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Video className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Type</p>
                <p className="text-sm font-medium text-gray-800">{getVideoTypeLabel(video.video_type)}</p>
              </div>
            </div>
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
                <p className="text-sm font-medium text-gray-800">{formatDate(video.published_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Eye className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Views</p>
                <p className="text-sm font-medium text-gray-800">{formatViewCount(video.view_count)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Bookmark className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Bookmarks</p>
                <p className="text-sm font-medium text-gray-800">{formatViewCount(video.bookmark_count)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Related Videos (placeholder) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Related Videos
          </h3>
          <p className="text-sm text-gray-400 italic">More videos coming soon.</p>
        </div>

        {/* Quick Contact Card */}
        <ContentSidebarQuickContact listing={listing} sourceId={video.id} sourceType="video" />

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

export function VideoDetailSidebar(props: VideoDetailSidebarProps) {
  return (
    <ErrorBoundary componentName="VideoDetailSidebar">
      <VideoDetailSidebarContent {...props} />
    </ErrorBoundary>
  );
}

export default VideoDetailSidebar;
