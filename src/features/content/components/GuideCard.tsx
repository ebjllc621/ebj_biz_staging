/**
 * GuideCard - Card component for guide list and content hub grid
 *
 * @tier STANDARD
 * @phase Tier 2 Content Types - Phase G5
 * @reference src/features/content/components/NewsletterCard.tsx
 */
'use client';

import Link from 'next/link';
import type { Route } from 'next';
import Image from 'next/image';
import { BookOpen, Clock, Eye, Bookmark, Star, Users, BarChart3 } from 'lucide-react';
import type { Guide, GuideDifficultyLevel } from '@core/types/guide';

interface GuideCardProps {
  guide: Guide;
  className?: string;
}

function formatEstimatedTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
}

function getDifficultyConfig(level: GuideDifficultyLevel): { label: string; className: string } {
  switch (level) {
    case 'beginner':
      return { label: 'Beginner', className: 'bg-green-500 text-white' };
    case 'intermediate':
      return { label: 'Intermediate', className: 'bg-yellow-500 text-white' };
    case 'advanced':
      return { label: 'Advanced', className: 'bg-red-500 text-white' };
    default:
      return { label: 'Beginner', className: 'bg-green-500 text-white' };
  }
}

export function GuideCard({ guide, className = '' }: GuideCardProps) {
  const difficulty = getDifficultyConfig(guide.difficulty_level);

  const cardContent = (
    <article className="relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full">
      {/* Featured Image */}
      <div className="relative h-40 w-full bg-gray-100">
        {guide.featured_image ? (
          <Image
            src={guide.featured_image}
            alt={guide.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-700">
            <BookOpen className="w-12 h-12 text-white" />
          </div>
        )}
        {/* Difficulty Badge (top-left) */}
        <span className={`absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-full ${difficulty.className}`}>
          {difficulty.label}
        </span>
        {/* Featured Badge (top-right) */}
        {guide.is_featured && (
          <span className="absolute top-3 right-3 bg-yellow-400 text-biz-navy text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
            <Star className="w-3 h-3" /> Featured
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-biz-navy mt-1 line-clamp-2 group-hover:text-biz-orange transition-colors">
          {guide.title}
        </h3>
        {guide.subtitle && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{guide.subtitle}</p>
        )}
        {guide.excerpt && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-3">{guide.excerpt}</p>
        )}

        {/* Metadata Row */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
          {guide.estimated_time !== null && guide.estimated_time !== undefined && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatEstimatedTime(guide.estimated_time)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {formatCount(guide.view_count)}
          </span>
          {guide.bookmark_count > 0 && (
            <span className="flex items-center gap-1">
              <Bookmark className="w-3.5 h-3.5" />
              {formatCount(guide.bookmark_count)}
            </span>
          )}
          {guide.completion_count > 0 && (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {formatCount(guide.completion_count)}
            </span>
          )}
        </div>

        {/* Section count indicator */}
        {guide.sections && guide.sections.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
            <BarChart3 className="w-3 h-3" />
            {guide.sections.length} sections
          </div>
        )}

        {/* Tags */}
        {guide.tags && guide.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {guide.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="text-xs text-biz-orange bg-biz-orange/10 px-2 py-0.5 rounded">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );

  if (!guide.slug) {
    return (
      <div className={`block group ${className}`}>
        {cardContent}
      </div>
    );
  }

  return (
    <Link href={`/guides/${guide.slug}` as Route} className={`block group ${className}`}>
      {cardContent}
    </Link>
  );
}

export default GuideCard;
