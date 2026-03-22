'use client';

/**
 * SocialMediaManagerModal - Post content to connected social platforms
 *
 * @description Triggered after content/newsletter/event/guide publish. Shows
 *   connected social platforms with per-platform text editing, character validation,
 *   platform-specific preview cards, and scheduled post management.
 * @component Client Component
 * @tier ADVANCED
 * @phase Tier 5A Social Media Manager - Phase 7 (scheduling)
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier5A_Phases/PHASE_7_POST_SCHEDULING_CONTENT_CALENDAR.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - BizModal for the modal shell (MANDATORY)
 * - fetchWithCsrf via useSocialMediaPost hook
 * - credentials: 'include' on GET calls (via hook)
 * - Validation follows SEOPreviewPanel 3-tier pattern (good/warning/error)
 */

import React, { useEffect, useRef } from 'react';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Calendar,
  Clock,
  Trash2,
  Hash,
} from 'lucide-react';
import BizModal, { BizModalButton } from '@/components/BizModal/BizModal';
import { useSocialMediaPost } from '@features/dashboard/hooks/useSocialMediaPost';
import type { SocialConnection, SocialPlatform, PlatformConstraints, PlatformCharacterValidation, SocialPost } from '@core/types/social-media';

// ============================================================================
// TYPES
// ============================================================================

interface SocialMediaManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: number;
  contentType: string;
  contentId: number;
  contentTitle: string;
  contentUrl?: string;
  contentImageUrl?: string;
}

// ============================================================================
// PLATFORM CONSTRAINTS CONFIG
// ============================================================================

const PLATFORM_CONSTRAINTS: Partial<Record<SocialPlatform, PlatformConstraints>> = {
  facebook: {
    maxCharacters: 63206,
    warningThreshold: 500,
    maxHashtags: null,
    linkCountsAsCharacters: false,
    supportsImages: true,
    supportsMultipleImages: true,
    maxImages: 10,
    platformDisplayName: 'Facebook',
  },
  twitter: {
    maxCharacters: 280,
    warningThreshold: 250,
    maxHashtags: null,
    linkCountsAsCharacters: true,
    supportsImages: true,
    supportsMultipleImages: true,
    maxImages: 4,
    platformDisplayName: 'X (Twitter)',
  },
  instagram: {
    maxCharacters: 2200,
    warningThreshold: 2000,
    maxHashtags: 30,
    linkCountsAsCharacters: false,
    supportsImages: true,
    supportsMultipleImages: true,
    maxImages: 10,
    platformDisplayName: 'Instagram',
  },
  linkedin: {
    maxCharacters: 3000,
    warningThreshold: 2700,
    maxHashtags: null,
    linkCountsAsCharacters: false,
    supportsImages: true,
    supportsMultipleImages: false,
    maxImages: 1,
    platformDisplayName: 'LinkedIn',
  },
  tiktok: {
    maxCharacters: 2200,
    warningThreshold: 2000,
    maxHashtags: 100,
    linkCountsAsCharacters: false,
    supportsImages: true,
    supportsMultipleImages: true,
    maxImages: 35,
    platformDisplayName: 'TikTok',
  },
  pinterest: {
    maxCharacters: 500,
    warningThreshold: 400,
    maxHashtags: 20,
    linkCountsAsCharacters: false,
    supportsImages: true,
    supportsMultipleImages: false,
    maxImages: 1,
    platformDisplayName: 'Pinterest',
  },
};

// ============================================================================
// VALIDATION HELPERS (follows SEOPreviewPanel 3-tier pattern)
// @reference src/features/dashboard/components/managers/content/SEOPreviewPanel.tsx
// ============================================================================

function validatePostText(
  text: string,
  constraints: PlatformConstraints
): PlatformCharacterValidation {
  const count = text.length;
  const { maxCharacters, warningThreshold } = constraints;

  if (count === 0) {
    return { status: 'error', message: 'Post text is required', count, max: maxCharacters };
  }
  if (count > maxCharacters) {
    return { status: 'error', message: `Exceeds ${maxCharacters} character limit`, count, max: maxCharacters };
  }
  if (count > warningThreshold) {
    return { status: 'warning', message: `Approaching limit (${maxCharacters - count} remaining)`, count, max: maxCharacters };
  }
  return { status: 'good', message: 'Within limits', count, max: maxCharacters };
}

function truncatePreview(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '...';
}

type ValidationStatus = 'good' | 'warning' | 'error';

const STATUS_TEXT_COLORS: Record<ValidationStatus, string> = {
  good: 'text-green-700',
  warning: 'text-yellow-700',
  error: 'text-red-700',
};

function ValidationIcon({ status }: { status: ValidationStatus }) {
  if (status === 'good') {
    return <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />;
  }
  if (status === 'warning') {
    return <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />;
  }
  return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
}

// ============================================================================
// HELPERS
// ============================================================================

function getPlatformColor(platform: SocialPlatform): string {
  switch (platform) {
    case 'facebook':
      return '#1877F2';
    case 'twitter':
      return '#1DA1F2';
    case 'instagram':
      return '#E4405F';
    case 'linkedin':
      return '#0A66C2';
    case 'tiktok':
      return '#000000';
    case 'pinterest':
      return '#E60023';
    default:
      return '#6B7280';
  }
}

function getPlatformIcon(platform: SocialPlatform) {
  switch (platform) {
    case 'facebook':
      return <Facebook className="w-5 h-5" style={{ color: getPlatformColor('facebook') }} />;
    case 'twitter':
      return <Twitter className="w-5 h-5" style={{ color: getPlatformColor('twitter') }} />;
    case 'instagram':
      return <Instagram className="w-5 h-5" style={{ color: getPlatformColor('instagram') }} />;
    case 'linkedin':
      return <Linkedin className="w-5 h-5" style={{ color: getPlatformColor('linkedin') }} />;
    case 'tiktok':
      return (
        <div className="w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: '#000000', color: '#FFFFFF' }}>
          TK
        </div>
      );
    case 'pinterest':
      return (
        <div className="w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: '#E60023', color: '#FFFFFF' }}>
          P
        </div>
      );
    default:
      return null;
  }
}

function getConnectionDisplayName(connection: SocialConnection): string {
  return connection.platform_page_name || connection.platform_username || connection.platform;
}

/**
 * Returns the minimum datetime-local string value (5 minutes from now)
 */
function getMinScheduleTime(): string {
  const min = new Date(Date.now() + 5 * 60 * 1000);
  // Format as YYYY-MM-DDTHH:MM for datetime-local input
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${min.getFullYear()}-${pad(min.getMonth() + 1)}-${pad(min.getDate())}T${pad(min.getHours())}:${pad(min.getMinutes())}`;
}

// ============================================================================
// PREVIEW CARD COMPONENTS
// ============================================================================

function FacebookPreviewCard({
  text,
  displayName,
  contentUrl,
  contentTitle,
}: {
  text: string;
  displayName: string;
  contentUrl?: string;
  contentTitle: string;
}) {
  const domain = contentUrl ? new URL(contentUrl).hostname : 'bizconekt.com';

  return (
    <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="px-3 py-2 flex items-center gap-1">
        <Facebook className="w-3.5 h-3.5" style={{ color: '#1877F2' }} />
        <span className="text-xs font-medium text-gray-500">Facebook Post Preview</span>
      </div>
      <div className="px-3 pb-3">
        <div className="rounded-lg border border-gray-200 bg-[#F0F2F5] p-3">
          <p className="text-sm font-semibold text-gray-900 mb-1">{displayName}</p>
          <p className="text-sm text-gray-800 mb-2 whitespace-pre-wrap">{truncatePreview(text, 300)}</p>
          {contentUrl && (
            <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">
              <div className="bg-gray-100 h-24 flex items-center justify-center">
                <span className="text-gray-400 text-xs">Link Preview Image</span>
              </div>
              <div className="p-2.5">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">{domain}</p>
                <p className="text-sm font-medium text-gray-900 line-clamp-2">{contentTitle}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TwitterPreviewCard({
  text,
  displayName,
  contentUrl,
}: {
  text: string;
  displayName: string;
  contentUrl?: string;
}) {
  return (
    <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="px-3 py-2 flex items-center gap-1">
        <Twitter className="w-3.5 h-3.5" style={{ color: '#1DA1F2' }} />
        <span className="text-xs font-medium text-gray-500">X Post Preview</span>
      </div>
      <div className="px-3 pb-3">
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-sm font-semibold text-gray-900 mb-0.5">
            {displayName}
            <span className="text-gray-400 font-normal ml-1 text-xs">@{displayName.replace(/\s+/g, '').toLowerCase()}</span>
          </p>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{truncatePreview(text, 280)}</p>
          {contentUrl && (
            <p className="text-sm text-[#1DA1F2] mt-1 truncate">{contentUrl}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function InstagramPreviewCard({
  text,
  displayName,
  contentImageUrl,
}: {
  text: string;
  displayName: string;
  contentImageUrl?: string;
}) {
  return (
    <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="px-3 py-2 flex items-center gap-1">
        <Instagram className="w-3.5 h-3.5" style={{ color: '#E4405F' }} />
        <span className="text-xs font-medium text-gray-500">Instagram Post Preview</span>
      </div>
      <div className="px-3 pb-3">
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          {contentImageUrl ? (
            <div className="w-full aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
              <img src={contentImageUrl} alt="Post preview" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-full aspect-square bg-gradient-to-br from-purple-100 via-pink-50 to-orange-100 flex items-center justify-center">
              <Instagram className="w-12 h-12 text-gray-300" />
            </div>
          )}
          <div className="p-3">
            <p className="text-sm font-semibold text-gray-900 mb-1">{displayName}</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{truncatePreview(text, 300)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkedInPreviewCard({
  text,
  displayName,
  contentUrl,
  contentTitle,
}: {
  text: string;
  displayName: string;
  contentUrl?: string;
  contentTitle: string;
}) {
  const domain = contentUrl ? new URL(contentUrl).hostname : 'bizconekt.com';

  return (
    <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="px-3 py-2 flex items-center gap-1">
        <Linkedin className="w-3.5 h-3.5" style={{ color: '#0A66C2' }} />
        <span className="text-xs font-medium text-gray-500">LinkedIn Post Preview</span>
      </div>
      <div className="px-3 pb-3">
        <div className="rounded-lg border border-gray-200 bg-[#F3F2EF] p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-[#0A66C2] flex items-center justify-center">
              <span className="text-white text-xs font-bold">{displayName.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{displayName}</p>
              <p className="text-[10px] text-gray-500">Just now</p>
            </div>
          </div>
          <p className="text-sm text-gray-800 mb-2 whitespace-pre-wrap">{truncatePreview(text, 400)}</p>
          {contentUrl && (
            <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">
              <div className="bg-gray-100 h-20 flex items-center justify-center">
                <span className="text-gray-400 text-xs">Article Preview</span>
              </div>
              <div className="p-2.5">
                <p className="text-sm font-medium text-gray-900 line-clamp-2">{contentTitle}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{domain}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TikTokPreviewCard({
  text,
  displayName,
  contentImageUrl,
}: {
  text: string;
  displayName: string;
  contentImageUrl?: string;
}) {
  return (
    <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="px-3 py-2 flex items-center gap-1">
        <div className="w-3.5 h-3.5 rounded-sm bg-black flex items-center justify-center">
          <span className="text-white text-[6px] font-bold">TK</span>
        </div>
        <span className="text-xs font-medium text-gray-500">TikTok Post Preview</span>
      </div>
      <div className="px-3 pb-3">
        <div className="rounded-lg border border-gray-200 bg-black overflow-hidden">
          {contentImageUrl ? (
            <div className="w-full aspect-[9/16] max-h-48 bg-gray-900 flex items-center justify-center overflow-hidden">
              <img src={contentImageUrl} alt="Post preview" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-full aspect-[9/16] max-h-48 bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
              <span className="text-gray-500 text-xs">Video/Photo Preview</span>
            </div>
          )}
          <div className="p-3">
            <p className="text-sm font-semibold text-white mb-0.5">@{displayName}</p>
            <p className="text-xs text-gray-300 whitespace-pre-wrap line-clamp-3">{truncatePreview(text, 150)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PinterestPreviewCard({
  text,
  displayName,
  contentImageUrl,
  contentUrl,
}: {
  text: string;
  displayName: string;
  contentImageUrl?: string;
  contentUrl?: string;
}) {
  return (
    <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="px-3 py-2 flex items-center gap-1">
        <div className="w-3.5 h-3.5 rounded-full bg-[#E60023] flex items-center justify-center">
          <span className="text-white text-[7px] font-bold">P</span>
        </div>
        <span className="text-xs font-medium text-gray-500">Pinterest Pin Preview</span>
      </div>
      <div className="px-3 pb-3">
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm max-w-[200px]">
          {contentImageUrl ? (
            <div className="w-full aspect-[2/3] bg-gray-100 overflow-hidden">
              <img src={contentImageUrl} alt="Pin preview" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-full aspect-[2/3] bg-gradient-to-b from-red-50 to-pink-50 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-[#E60023] flex items-center justify-center">
                <span className="text-white text-sm font-bold">P</span>
              </div>
            </div>
          )}
          <div className="p-2.5">
            <p className="text-xs font-semibold text-gray-900 line-clamp-2">{truncatePreview(text, 100)}</p>
            {contentUrl && (
              <p className="text-[10px] text-gray-400 mt-1 truncate">{new URL(contentUrl).hostname}</p>
            )}
            <p className="text-[10px] text-gray-500 mt-1">{displayName}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// AI HASHTAG SUGGESTION HELPER (Rule-Based)
// ============================================================================

const COMMON_HASHTAGS: Record<string, string[]> = {
  article: ['#blog', '#news', '#trending', '#article', '#reading'],
  newsletter: ['#newsletter', '#subscribe', '#updates', '#news'],
  event: ['#event', '#community', '#networking', '#upcoming'],
  guide: ['#guide', '#howto', '#tips', '#tutorial', '#learn'],
};

const PLATFORM_HASHTAGS: Partial<Record<SocialPlatform, string[]>> = {
  instagram: ['#instagood', '#photooftheday', '#instadaily'],
  tiktok: ['#fyp', '#foryou', '#viral'],
  twitter: [],
  linkedin: ['#business', '#professional', '#networking'],
  pinterest: ['#pinspiration', '#ideas'],
  facebook: [],
};

function generateHashtags(
  contentType: string,
  contentTitle: string,
  platform: SocialPlatform,
  maxCount: number = 5
): string[] {
  const tags: string[] = [];

  // Content-type hashtags
  const contentTags = COMMON_HASHTAGS[contentType] || COMMON_HASHTAGS.article || [];
  tags.push(...contentTags.slice(0, 3));

  // Platform-specific hashtags
  const platformTags = PLATFORM_HASHTAGS[platform] || [];
  tags.push(...platformTags.slice(0, 2));

  // Title-derived hashtags: extract significant words (4+ chars, not common words)
  const stopWords = new Set(['this', 'that', 'with', 'from', 'your', 'have', 'will', 'been', 'about', 'their', 'them', 'than', 'each', 'make', 'like', 'just', 'over', 'such', 'more']);
  const titleWords = contentTitle
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !stopWords.has(w))
    .slice(0, 3)
    .map(w => `#${w}`);
  tags.push(...titleWords);

  // Deduplicate and limit
  return [...new Set(tags)].slice(0, maxCount);
}

// ============================================================================
// PER-PLATFORM EDITOR SECTION
// ============================================================================

function PlatformEditorSection({
  connection,
  isSelected,
  text,
  onTextChange,
  onToggle,
  contentUrl,
  contentTitle,
  contentImageUrl,
  contentType,
}: {
  connection: SocialConnection;
  isSelected: boolean;
  text: string;
  onTextChange: (text: string) => void;
  onToggle: () => void;
  contentUrl?: string;
  contentTitle: string;
  contentImageUrl?: string;
  contentType?: string;
}) {
  const constraints = PLATFORM_CONSTRAINTS[connection.platform];
  const validation = constraints ? validatePostText(text, constraints) : null;
  const displayName = getConnectionDisplayName(connection);

  return (
    <div
      className={`rounded-lg border transition-colors ${
        isSelected ? 'border-[#ed6437] bg-orange-50/30' : 'border-gray-200'
      }`}
    >
      {/* Header: checkbox + platform info */}
      <label className="flex items-center gap-3 p-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="sr-only"
        />
        <div
          className="flex items-center justify-center w-8 h-8 rounded-full"
          style={{ backgroundColor: getPlatformColor(connection.platform) + '20' }}
        >
          {getPlatformIcon(connection.platform)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 capitalize">{connection.platform}</p>
          <p className="text-xs text-gray-500 truncate">{displayName}</p>
        </div>
        <div
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            isSelected ? 'border-[#ed6437] bg-[#ed6437]' : 'border-gray-300'
          }`}
        >
          {isSelected && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </label>

      {/* Expanded editor + preview when selected */}
      {isSelected && (
        <div className="px-3 pb-3 space-y-2">
          {/* Textarea */}
          <textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none"
            placeholder={`What would you like to share on ${constraints?.platformDisplayName ?? connection.platform}?`}
          />

          {/* Validation indicator — SEOPreviewPanel pattern */}
          {validation && (
            <div className="flex items-start gap-2">
              <ValidationIcon status={validation.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-xs font-medium ${STATUS_TEXT_COLORS[validation.status]}`}>
                    {validation.message}
                  </p>
                  <span className="text-xs text-gray-400 shrink-0">
                    {validation.count}/{validation.max} characters
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* AI Hashtag Suggestions */}
          <button
            type="button"
            onClick={() => {
              const hashtags = generateHashtags(
                contentType || 'article',
                contentTitle,
                connection.platform,
                constraints?.maxHashtags ? Math.min(5, constraints.maxHashtags) : 5
              );
              const hashtagText = hashtags.join(' ');
              const currentText = text.trim();
              onTextChange(currentText ? `${currentText}\n\n${hashtagText}` : hashtagText);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            title="Add suggested hashtags"
          >
            <Hash className="w-3.5 h-3.5" />
            Suggest Hashtags
          </button>

          {/* Platform preview card */}
          {connection.platform === 'facebook' && (
            <FacebookPreviewCard
              text={text}
              displayName={displayName}
              contentUrl={contentUrl}
              contentTitle={contentTitle}
            />
          )}
          {connection.platform === 'twitter' && (
            <TwitterPreviewCard
              text={text}
              displayName={displayName}
              contentUrl={contentUrl}
            />
          )}
          {connection.platform === 'instagram' && (
            <InstagramPreviewCard
              text={text}
              displayName={displayName}
              contentImageUrl={contentImageUrl}
            />
          )}
          {connection.platform === 'linkedin' && (
            <LinkedInPreviewCard
              text={text}
              displayName={displayName}
              contentUrl={contentUrl}
              contentTitle={contentTitle}
            />
          )}
          {connection.platform === 'tiktok' && (
            <TikTokPreviewCard
              text={text}
              displayName={displayName}
              contentImageUrl={contentImageUrl}
            />
          )}
          {connection.platform === 'pinterest' && (
            <PinterestPreviewCard
              text={text}
              displayName={displayName}
              contentImageUrl={contentImageUrl}
              contentUrl={contentUrl}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SCHEDULED POST ROW
// ============================================================================

function ScheduledPostRow({
  post,
  onCancel,
}: {
  post: SocialPost;
  onCancel: (postId: number) => void;
}) {
  const scheduledDate = post.scheduled_at ? new Date(post.scheduled_at) : null;
  const formattedDate = scheduledDate
    ? scheduledDate.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unknown time';

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white">
      <div
        className="flex items-center justify-center w-7 h-7 rounded-full shrink-0"
        style={{ backgroundColor: getPlatformColor(post.platform) + '20' }}
      >
        {getPlatformIcon(post.platform)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 capitalize">{post.platform}</p>
        <p className="text-xs text-gray-500 truncate">{post.post_text || ''}</p>
      </div>
      <div className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
        <Clock className="w-3.5 h-3.5" />
        <span>{formattedDate}</span>
      </div>
      <button
        onClick={() => onCancel(post.id)}
        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded"
        title="Cancel scheduled post"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SocialMediaManagerModal({
  isOpen,
  onClose,
  listingId,
  contentType,
  contentId,
  contentTitle,
  contentUrl,
  contentImageUrl,
}: SocialMediaManagerModalProps) {
  const {
    connections,
    isLoadingConnections,
    connectionsError,
    selectedPlatforms,
    togglePlatform,
    selectAll,
    deselectAll,
    platformTexts,
    setPlatformText,
    getPostText,
    postingStatuses,
    isPosting,
    hasPosted,
    fetchConnections,
    postToSelected,
    reset,
    isScheduleMode,
    toggleScheduleMode,
    scheduledAt,
    setScheduledAt,
    scheduledPosts,
    isLoadingScheduled,
    fetchScheduledPosts,
    cancelScheduledPost,
    scheduleToSelected,
  } = useSocialMediaPost({
    listingId,
    contentType,
    contentId,
    contentTitle,
    contentUrl,
  });

  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch connections and scheduled posts when the modal opens
  useEffect(() => {
    if (isOpen && listingId) {
      fetchConnections();
      fetchScheduledPosts();
    }
  }, [isOpen, listingId, fetchConnections, fetchScheduledPosts]);

  // Auto-close 3s after all posts are complete
  useEffect(() => {
    if (hasPosted && !isPosting) {
      autoCloseTimerRef.current = setTimeout(() => {
        handleClose();
      }, 3000);
    }
    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPosted, isPosting]);

  function handleClose() {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
    }
    reset();
    onClose();
  }

  const activeConnections = connections.filter(c => c.is_active);
  const selectedCount = selectedPlatforms.size;

  // Check if any selected platform has validation errors
  const hasValidationErrors = activeConnections
    .filter(c => selectedPlatforms.has(c.platform))
    .some(c => {
      const text = getPostText(c.platform);
      const constraints = PLATFORM_CONSTRAINTS[c.platform];
      if (!constraints) return !text.trim();
      const validation = validatePostText(text, constraints);
      return validation.status === 'error';
    });

  // Schedule time validation
  const isScheduleTimeInvalid = isScheduleMode && (
    !scheduledAt ||
    new Date(scheduledAt) < new Date(Date.now() + 5 * 60 * 1000)
  );

  // ============================================================================
  // Render: Body
  // ============================================================================

  const renderBody = () => {
    if (isLoadingConnections) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
        </div>
      );
    }

    if (connectionsError) {
      return (
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{connectionsError}</span>
        </div>
      );
    }

    if (activeConnections.length === 0) {
      return (
        <div className="text-center py-10 px-4">
          <div className="flex justify-center mb-3">
            <Facebook className="w-8 h-8 text-gray-300 mr-2" />
            <Twitter className="w-8 h-8 text-gray-300 mr-2" />
            <Instagram className="w-8 h-8 text-gray-300 mr-2" />
            <Linkedin className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-600 font-medium">No social accounts connected yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Connect your social accounts from the Social Media settings to start sharing your content automatically.
          </p>
        </div>
      );
    }

    // Complete state
    if (hasPosted) {
      return (
        <div className="space-y-3">
          {postingStatuses.map(s => (
            <div
              key={s.platform}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200"
            >
              {getPlatformIcon(s.platform)}
              <span className="capitalize font-medium text-gray-800 flex-1">{s.platform}</span>
              {s.status === 'success' && (
                <span className="flex items-center gap-1 text-green-600 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  {isScheduleMode ? 'Scheduled' : 'Posted'}
                </span>
              )}
              {s.status === 'failed' && (
                <span className="flex items-center gap-1 text-red-600 text-sm">
                  <XCircle className="w-4 h-4" />
                  {s.error || 'Failed'}
                </span>
              )}
              {s.status === 'posting' && (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              )}
            </div>
          ))}
          <p className="text-xs text-gray-400 text-center mt-2">Closing automatically in 3 seconds...</p>
        </div>
      );
    }

    // Posting in progress
    if (isPosting) {
      return (
        <div className="space-y-3">
          {postingStatuses.map(s => (
            <div
              key={s.platform}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200"
            >
              {getPlatformIcon(s.platform)}
              <span className="capitalize font-medium text-gray-800 flex-1">{s.platform}</span>
              {s.status === 'idle' && <span className="text-xs text-gray-400">Waiting...</span>}
              {s.status === 'posting' && <Loader2 className="w-4 h-4 animate-spin text-[#ed6437]" />}
              {s.status === 'success' && (
                <span className="flex items-center gap-1 text-green-600 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Done
                </span>
              )}
              {s.status === 'failed' && (
                <span className="flex items-center gap-1 text-red-600 text-sm">
                  <XCircle className="w-4 h-4" />
                  Failed
                </span>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Ready state — per-platform editors with preview cards
    return (
      <div className="space-y-5">
        {/* Platform selector header */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Select platforms</span>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-xs text-[#ed6437] hover:underline"
            >
              Select All
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={deselectAll}
              className="text-xs text-gray-500 hover:underline"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Schedule mode toggle */}
        <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg w-fit">
          <button
            onClick={() => isScheduleMode && toggleScheduleMode()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              !isScheduleMode
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Post Now
          </button>
          <button
            onClick={() => !isScheduleMode && toggleScheduleMode()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isScheduleMode
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Schedule
          </button>
        </div>

        {/* Datetime picker — shown in schedule mode */}
        {isScheduleMode && (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Schedule for
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={getMinScheduleTime()}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
            />
            {isScheduleTimeInvalid && scheduledAt && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                Must be at least 5 minutes from now
              </p>
            )}
          </div>
        )}

        {/* Per-platform editor sections */}
        <div className="space-y-3">
          {activeConnections.map(connection => (
            <PlatformEditorSection
              key={connection.id}
              connection={connection}
              isSelected={selectedPlatforms.has(connection.platform)}
              text={getPostText(connection.platform)}
              onTextChange={(text) => setPlatformText(connection.platform, text)}
              onToggle={() => togglePlatform(connection.platform)}
              contentUrl={contentUrl}
              contentTitle={contentTitle}
              contentImageUrl={contentImageUrl}
              contentType={contentType}
            />
          ))}
        </div>

        {/* Upcoming scheduled posts */}
        {(scheduledPosts.length > 0 || isLoadingScheduled) && (
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Upcoming scheduled posts</span>
            </div>
            {isLoadingScheduled ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                <span className="text-sm text-gray-400">Loading...</span>
              </div>
            ) : (
              <div className="space-y-2">
                {scheduledPosts.map(post => (
                  <ScheduledPostRow
                    key={post.id}
                    post={post}
                    onCancel={cancelScheduledPost}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // Footer
  // ============================================================================

  const renderFooter = () => {
    if (hasPosted) {
      return (
        <BizModalButton variant="secondary" onClick={handleClose}>
          Close
        </BizModalButton>
      );
    }

    if (isPosting || isLoadingConnections) {
      return null;
    }

    if (activeConnections.length === 0 || connectionsError) {
      return (
        <BizModalButton variant="secondary" onClick={handleClose}>
          Close
        </BizModalButton>
      );
    }

    return (
      <div className="flex gap-3 justify-end">
        <BizModalButton variant="secondary" onClick={handleClose}>
          Skip
        </BizModalButton>
        {isScheduleMode ? (
          <BizModalButton
            variant="primary"
            onClick={scheduleToSelected}
            disabled={selectedCount === 0 || hasValidationErrors || isScheduleTimeInvalid || !scheduledAt}
          >
            <Calendar className="w-4 h-4 mr-1.5" />
            Schedule for {selectedCount} Platform{selectedCount !== 1 ? 's' : ''}
          </BizModalButton>
        ) : (
          <BizModalButton
            variant="primary"
            onClick={postToSelected}
            disabled={selectedCount === 0 || hasValidationErrors}
          >
            Post to {selectedCount} Platform{selectedCount !== 1 ? 's' : ''}
          </BizModalButton>
        )}
      </div>
    );
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Share to Social Media"
      subtitle={hasPosted ? undefined : `Share "${contentTitle}" with your followers`}
      maxWidth="md"
      footer={renderFooter()}
    >
      {renderBody()}
    </BizModal>
  );
}

export default SocialMediaManagerModal;
