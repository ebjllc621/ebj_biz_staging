/**
 * @component Client Component
 * @tier STANDARD
 * @phase Phase G3 - Guide Detail Page
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Route } from 'next';
import {
  BookOpen,
  Eye,
  Clock,
  Bookmark,
  MapPin,
  ExternalLink,
  Calendar,
  Tag,
  CheckCircle,
  List,
  BarChart2
} from 'lucide-react';
import type { Guide, GuideDifficultyLevel } from '@core/types/guide';
import type { Listing } from '@core/services/ListingService';
import { ContentSubscribeCard } from '@features/content/components/shared/ContentSubscribeCard';

interface GuideDetailSidebarProps {
  guide: Guide;
  listing: Listing | null;
  activeSection?: number | null;
  completedSectionIds?: Set<number>;
  percentComplete?: number;
  isProgressAvailable?: boolean;
  className?: string;
}

/**
 * Difficulty badge config — color-coded by level
 */
const difficultyConfig: Record<GuideDifficultyLevel, { label: string; badgeCls: string }> = {
  beginner: { label: 'Beginner', badgeCls: 'bg-green-100 text-green-700' },
  intermediate: { label: 'Intermediate', badgeCls: 'bg-yellow-100 text-yellow-700' },
  advanced: { label: 'Advanced', badgeCls: 'bg-red-100 text-red-700' }
};

/**
 * Format estimated time for display
 */
function formatEstimatedTime(minutes: number | null): string {
  if (!minutes || minutes < 1) return 'Less than 1 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
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

export function GuideDetailSidebar({
  guide,
  listing,
  activeSection,
  completedSectionIds,
  percentComplete,
  isProgressAvailable,
  className = ''
}: GuideDetailSidebarProps) {
  const location = [listing?.city, listing?.state].filter(Boolean).join(', ');
  const difficulty = difficultyConfig[guide.difficulty_level];
  const sectionCount = guide.sections?.length ?? 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Card 0: Progress Bar (authenticated users only) */}
      {isProgressAvailable && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Your Progress
          </h3>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${percentComplete ?? 0}%` }}
              />
            </div>
            <span className="text-sm font-bold text-gray-700 min-w-[3rem] text-right">
              {percentComplete ?? 0}%
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {completedSectionIds?.size ?? 0} of {sectionCount} sections completed
          </p>
          {(percentComplete ?? 0) === 100 && (
            <div className="mt-2 flex items-center gap-1.5 text-green-600 text-sm font-semibold">
              <CheckCircle className="w-4 h-4" />
              Guide Complete!
            </div>
          )}
        </div>
      )}

      {/* Card 1: Sticky Table of Contents (only if guide has sections) */}
      {sectionCount > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 lg:sticky lg:top-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Table of Contents
          </h3>
          <nav className="space-y-1">
            {guide.sections?.map((section) => (
              <a
                key={section.id}
                href={`#section-${section.section_number}`}
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById(`section-${section.section_number}`)
                    ?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                  activeSection === section.section_number
                    ? 'bg-biz-orange/10 text-biz-orange font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-biz-navy'
                }`}
              >
                <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                  completedSectionIds?.has(section.id)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {completedSectionIds?.has(section.id) ? '✓' : section.section_number}
                </span>
                <span className="truncate">{section.title}</span>
                {section.estimated_time && (
                  <span className="ml-auto text-xs text-gray-400 flex-shrink-0">
                    {section.estimated_time}m
                  </span>
                )}
              </a>
            ))}
          </nav>
        </div>
      )}

      {/* Card 2: Business Info (only if listing exists) */}
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
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-green-600">
                  <BookOpen className="w-6 h-6 text-white" />
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
          followType="business"
          targetId={listing.id}
          targetName={listing.name}
        />
      )}

      {/* Card 3: Guide Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Guide Info
        </h3>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Published</p>
              <p className="text-sm font-medium text-gray-800">{formatDate(guide.published_at)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <BarChart2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Difficulty</p>
              <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${difficulty.badgeCls}`}>
                {difficulty.label}
              </span>
            </div>
          </div>

          {guide.estimated_time !== null && (
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Estimated Time</p>
                <p className="text-sm font-medium text-gray-800">
                  {formatEstimatedTime(guide.estimated_time)}
                </p>
              </div>
            </div>
          )}

          {sectionCount > 0 && (
            <div className="flex items-center gap-3">
              <List className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Sections</p>
                <p className="text-sm font-medium text-gray-800">
                  {sectionCount} {sectionCount === 1 ? 'section' : 'sections'}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Eye className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Views</p>
              <p className="text-sm font-medium text-gray-800">{formatViewCount(guide.view_count)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Bookmark className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Bookmarks</p>
              <p className="text-sm font-medium text-gray-800">
                {formatViewCount(guide.bookmark_count)}
              </p>
            </div>
          </div>

          {guide.completion_count > 0 && (
            <div className="flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Completions</p>
                <p className="text-sm font-medium text-gray-800">
                  {formatViewCount(guide.completion_count)}
                </p>
              </div>
            </div>
          )}

          {guide.version !== null && (
            <div className="flex items-center gap-3">
              <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Version</p>
                <p className="text-sm font-medium text-gray-800">{guide.version}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card 4: More from this business (placeholder) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          More from this business
        </h3>
        <p className="text-sm text-gray-400 italic">Related guides coming soon.</p>
      </div>
    </div>
  );
}

export default GuideDetailSidebar;
