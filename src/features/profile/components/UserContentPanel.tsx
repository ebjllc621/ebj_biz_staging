// src/features/profile/components/UserContentPanel.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import Image from 'next/image';
import {
  FileText,
  Video,
  Mic,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

// ========================================
// Types
// ========================================

export interface UserContentItem {
  id: number;
  type: 'article' | 'video' | 'podcast';
  title: string;
  slug: string;
  thumbnail: string | null;
  view_count: number;
  is_featured: boolean;
  published_at: string | null;

  // Article-specific
  excerpt?: string | null;
  reading_time?: number;

  // Video-specific
  video_type?: string;
  duration?: number | null;

  // Podcast-specific
  episode_number?: number | null;
  season_number?: number | null;
  audio_duration?: number | null;
}

export interface UserContentPanelProps {
  username: string;
}

interface ContentResponse {
  items: UserContentItem[];
  total: number;
  hasMore: boolean;
}

// ========================================
// ContentMiniCard Component
// ========================================

interface ContentMiniCardProps {
  content: UserContentItem;
}

function ContentMiniCard({ content }: ContentMiniCardProps) {
  const getTypeConfig = (type: UserContentItem['type']) => {
    switch (type) {
      case 'article':
        return {
          icon: FileText,
          label: 'Article',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-700',
          href: `/articles/${content.slug}`
        };
      case 'video':
        return {
          icon: Video,
          label: 'Video',
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-700',
          href: `/videos/${content.slug}`
        };
      case 'podcast':
        return {
          icon: Mic,
          label: 'Podcast',
          bgColor: 'bg-green-100',
          textColor: 'text-green-700',
          href: `/podcasts/${content.slug}`
        };
    }
  };

  const formatDuration = (seconds: number | null | undefined): string => {
    if (!seconds) return '';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViewCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const typeConfig = getTypeConfig(content.type);
  const TypeIcon = typeConfig.icon;

  return (
    <Link
      href={typeConfig.href as Route}
      className="block bg-white rounded-lg border border-gray-200 hover:border-[#ed6437] transition-all duration-200 hover:shadow-md flex-shrink-0 w-64 h-80"
    >
      {/* Thumbnail */}
      <div className="relative w-full h-40 bg-gray-100 rounded-t-lg overflow-hidden">
        {content.thumbnail ? (
          <Image
            src={content.thumbnail}
            alt={content.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <TypeIcon className="w-12 h-12 text-gray-300" />
          </div>
        )}

        {/* Type badge */}
        <div className={`absolute top-2 left-2 ${typeConfig.bgColor} ${typeConfig.textColor} px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1`}>
          <TypeIcon className="w-3 h-3" />
          {typeConfig.label}
        </div>

        {/* Featured badge */}
        {content.is_featured && (
          <div className="absolute top-2 right-2 bg-[#ed6437] text-white px-2 py-1 rounded-md text-xs font-medium">
            Featured
          </div>
        )}
      </div>

      {/* Content details */}
      <div className="p-3 flex flex-col h-40">
        <h3 className="font-semibold text-[#022641] text-sm line-clamp-2 mb-2">
          {content.title}
        </h3>

        {/* Type-specific metadata */}
        <div className="text-xs text-gray-500 mb-2 flex-grow">
          {content.type === 'article' && content.excerpt && (
            <p className="line-clamp-3">{content.excerpt}</p>
          )}
          {content.type === 'video' && content.duration && (
            <p>Duration: {formatDuration(content.duration)}</p>
          )}
          {content.type === 'podcast' && (
            <div>
              {content.season_number && content.episode_number && (
                <p>S{content.season_number} E{content.episode_number}</p>
              )}
              {content.audio_duration && (
                <p>Duration: {formatDuration(content.audio_duration)}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{formatViewCount(content.view_count)}</span>
          </div>
          {content.type === 'article' && content.reading_time && (
            <span>{content.reading_time} min read</span>
          )}
          {content.published_at && (
            <span>
              {new Date(content.published_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ========================================
// UserContentSkeleton Component
// ========================================

function UserContentSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-shrink-0 w-64 h-80 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// ========================================
// UserContentPanel Component
// ========================================

export function UserContentPanel({ username }: UserContentPanelProps) {
  const [content, setContent] = useState<UserContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Fetch content
  useEffect(() => {
    async function fetchContent() {
      try {
        setLoading(true);
        const response = await fetch(`/api/users/${username}/content`, {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch content');
        }

        const data: ContentResponse = await response.json();
        setContent(data.items || []);
      } catch (err) {
        console.error('Error fetching user content:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchContent();
  }, [username]);

  // Update scroll button states
  const updateScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    updateScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateScrollButtons);
      return () => container.removeEventListener('scroll', updateScrollButtons);
    }
  }, [content]);

  // Scroll handlers
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -280, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 280, behavior: 'smooth' });
    }
  };

  // Loading state
  if (loading) {
    return <UserContentSkeleton />;
  }

  // Error state or no content
  if (error || content.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-[#022641]" />
          <h2 className="text-xl font-bold text-[#022641]">Content</h2>
        </div>
        <Link
          href={`/users/${username}/content` as Route}
          className="flex items-center gap-1 text-sm text-[#ed6437] hover:text-[#d55530] font-medium transition-colors"
        >
          See All
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Horizontal scroller */}
      <div className="relative">
        {/* Left scroll button */}
        {canScrollLeft && (
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5 text-[#022641]" />
          </button>
        )}

        {/* Content container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {content.map((item) => (
            <ContentMiniCard key={`${item.type}-${item.id}`} content={item} />
          ))}
        </div>

        {/* Right scroll button */}
        {canScrollRight && (
          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5 text-[#022641]" />
          </button>
        )}
      </div>
    </div>
  );
}
