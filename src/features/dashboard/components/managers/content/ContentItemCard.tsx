/**
 * ContentItemCard - Content Item Display Card
 *
 * @description Individual content card for articles, podcasts, and videos
 *   with edit/publish/view/delete actions and stats row
 * @component Client Component
 * @tier STANDARD
 * @phase Content Phase 5A
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier1_Phases/PHASE_5A_DASHBOARD_CONTENT_MANAGER.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - Orange theme (#ed6437) for action buttons
 * - Follows EventCard.tsx pattern exactly
 */
'use client';

import React from 'react';
import Image from 'next/image';
import {
  Edit2, Trash2, ExternalLink, Eye, Bookmark,
  FileText, Headphones, Play, Clock, Send, Archive
} from 'lucide-react';
import type { ContentArticle, ContentVideo, ContentPodcast } from '@core/services/ContentService';

// ============================================================================
// TYPES
// ============================================================================

export interface ContentItemCardProps {
  item: ContentArticle | ContentVideo | ContentPodcast;
  contentType: 'articles' | 'podcasts' | 'videos';
  onEdit: () => void;
  onPublish: () => void;
  onDelete: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'published': return 'bg-green-100 text-green-800';
    case 'draft': return 'bg-gray-100 text-gray-700';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'archived': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function getStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getPublicPath(contentType: 'articles' | 'podcasts' | 'videos', slug: string): string {
  return `/${contentType}/${slug}`;
}

function getContentTypeIcon(contentType: 'articles' | 'podcasts' | 'videos') {
  switch (contentType) {
    case 'articles': return FileText;
    case 'podcasts': return Headphones;
    case 'videos': return Play;
  }
}

function getNextStatusAction(status: string): { label: string; icon: typeof Send | typeof Archive; action: 'publish' | 'archive' | 'republish' } | null {
  switch (status) {
    case 'draft':
    case 'pending':
      return { label: 'Publish', icon: Send, action: 'publish' };
    case 'published':
      return { label: 'Archive', icon: Archive, action: 'archive' };
    case 'archived':
      return { label: 'Re-publish', icon: Send, action: 'republish' };
    default:
      return null;
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ContentItemCard - Content item display card
 *
 * @param item - Content item data (article, podcast, or video)
 * @param contentType - Type of content ('articles' | 'podcasts' | 'videos')
 * @param onEdit - Edit callback
 * @param onPublish - Publish/status-change callback
 * @param onDelete - Delete callback
 * @returns Content item card
 */
export function ContentItemCard({ item, contentType, onEdit, onPublish, onDelete }: ContentItemCardProps) {
  const TypeIcon = getContentTypeIcon(contentType);
  const statusAction = getNextStatusAction(item.status);

  // Thumbnail / featured image
  let thumbnail: string | null = null;
  if ('featured_image' in item) {
    thumbnail = item.featured_image;
  } else if ('thumbnail' in item) {
    thumbnail = item.thumbnail;
  }

  // Type-specific metadata
  let metaInfo: string | null = null;
  if ('reading_time' in item && item.reading_time) {
    metaInfo = `${item.reading_time} min read`;
  } else if ('duration' in item && item.duration) {
    metaInfo = formatDuration(item.duration);
  }

  // Video type badge
  let videoTypeBadge: string | null = null;
  if ('video_type' in item) {
    videoTypeBadge = item.video_type;
  }

  const publicPath = getPublicPath(contentType, item.slug);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-3">
        {/* Thumbnail */}
        {thumbnail ? (
          <div className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-gray-100 relative">
            <Image
              src={thumbnail}
              alt={item.title}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="w-16 h-16 flex-shrink-0 rounded-md bg-gray-100 flex items-center justify-center">
            <TypeIcon className="w-7 h-7 text-gray-400" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title + Badges */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-900 truncate flex-1">
              {item.title}
            </h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${getStatusBadgeClass(item.status)}`}>
              {getStatusLabel(item.status)}
            </span>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
            <span>{formatDate(item.created_at)}</span>
            {metaInfo && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {metaInfo}
              </span>
            )}
            {videoTypeBadge && (
              <span className="uppercase text-gray-400">{videoTypeBadge}</span>
            )}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {item.view_count.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Bookmark className="w-3 h-3" />
              {item.bookmark_count.toLocaleString()}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Edit */}
            <button
              onClick={onEdit}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-[#ed6437] hover:bg-orange-50 rounded transition-colors"
              title="Edit"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>

            {/* Status action (Publish / Archive / Re-publish) */}
            {statusAction && (
              <button
                onClick={onPublish}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-[#ed6437] hover:bg-orange-50 rounded transition-colors"
                title={statusAction.label}
              >
                <statusAction.icon className="w-3.5 h-3.5" />
                {statusAction.label}
              </button>
            )}

            {/* View public page */}
            <a
              href={publicPath}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-[#ed6437] hover:bg-orange-50 rounded transition-colors"
              title="View public page"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View
            </a>

            {/* Delete */}
            <button
              onClick={onDelete}
              className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors ml-auto"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContentItemCard;
