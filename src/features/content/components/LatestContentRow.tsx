/**
 * LatestContentRow - Two-card display of the latest approved content
 *
 * @tier SIMPLE
 * @generated DNA v11.4.0
 * @authority CLAUDE.md
 *
 * Displays 2 cards side by side, each showing the latest approved piece
 * of content. The two cards must NOT display the same content type
 * (e.g., one article + one video, or one podcast + one article).
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import Image from 'next/image';
import { FileText, Video, Headphones, Clock, Eye, Sparkles } from 'lucide-react';
import type { ContentArticle, ContentVideo, ContentPodcast } from '@core/services/ContentService';

type LatestItem =
  | (ContentArticle & { type: 'article' })
  | (ContentVideo & { type: 'video' })
  | (ContentPodcast & { type: 'podcast' });

interface LatestContentRowProps {
  className?: string;
}

const TYPE_ICON = {
  article: FileText,
  video: Video,
  podcast: Headphones,
} as const;

const TYPE_LABEL = {
  article: 'Article',
  video: 'Video',
  podcast: 'Podcast',
} as const;

const TYPE_COLOR = {
  article: 'bg-blue-100 text-blue-700',
  video: 'bg-purple-100 text-purple-700',
  podcast: 'bg-green-100 text-green-700',
} as const;

function getContentLink(item: LatestItem): string {
  switch (item.type) {
    case 'article': return `/articles/${item.slug}`;
    case 'video': return `/videos/${item.slug}`;
    case 'podcast': return `/podcasts/${item.slug}`;
  }
}

function getItemImage(item: LatestItem): string | null {
  switch (item.type) {
    case 'article': return item.featured_image;
    case 'video': return item.thumbnail;
    case 'podcast': return item.thumbnail;
  }
}

function getItemDescription(item: LatestItem): string | null {
  switch (item.type) {
    case 'article': return item.excerpt;
    case 'video': return item.description;
    case 'podcast': return item.description;
  }
}

function LatestCardSkeleton() {
  return (
    <div className="animate-pulse bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
      <div className="h-48 bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="h-3 bg-gray-200 rounded w-1/4" />
        <div className="h-5 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  );
}

export function LatestContentRow({ className = '' }: LatestContentRowProps) {
  const [items, setItems] = useState<LatestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchLatest() {
      try {
        // Fetch latest 5 items sorted by most recent, then pick 2 with different types
        const response = await fetch('/api/content/search?sort=recent&pageSize=10&type=all', {
          credentials: 'include',
        });

        if (!response.ok) return;

        const result = await response.json();
        if (!result.success || !result.data?.items) return;

        const allItems: LatestItem[] = result.data.items;

        // Pick 2 items with different content types
        const picked: LatestItem[] = [];
        const usedTypes = new Set<string>();

        for (const item of allItems) {
          if (picked.length >= 2) break;
          if (!usedTypes.has(item.type)) {
            picked.push(item);
            usedTypes.add(item.type);
          }
        }

        if (mounted) setItems(picked);
      } catch {
        // Silent fail — this section is supplementary
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    fetchLatest();
    return () => { mounted = false; };
  }, []);

  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-[#ed6437]" />
          <h2 className="text-lg font-bold text-gray-900">Latest Content</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LatestCardSkeleton />
          <LatestCardSkeleton />
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-[#ed6437]" />
        <h2 className="text-lg font-bold text-gray-900">Latest Content</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map((item) => {
          const Icon = TYPE_ICON[item.type];
          return (
            <Link
              key={`${item.type}-${item.id}`}
              href={getContentLink(item) as Route}
              className="group block"
            >
              <article className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-gray-100 h-full">
                {/* Image */}
                <div className="relative h-48 bg-gray-100">
                  {getItemImage(item) ? (
                    <Image
                      src={getItemImage(item)!}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                  {/* Type badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${TYPE_COLOR[item.type]}`}>
                      <Icon className="w-3 h-3" />
                      {TYPE_LABEL[item.type]}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="text-base font-bold text-gray-900 group-hover:text-[#ed6437] transition-colors line-clamp-2 mb-2">
                    {item.title}
                  </h3>
                  {getItemDescription(item) && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {getItemDescription(item)}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    {'reading_time' in item && item.reading_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {item.reading_time} min read
                      </span>
                    )}
                    {'view_count' in item && (
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {(item as ContentArticle).view_count ?? 0}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default LatestContentRow;
