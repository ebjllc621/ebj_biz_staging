/**
 * JobMarketInsightCard Component
 *
 * Content insight card for job market trends, salary guides, and industry reports
 *
 * GOVERNANCE COMPLIANCE:
 * - 'use client' directive for client component
 * - Import aliases: @core/, @features/, @components/
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @tier STANDARD
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 * @reference src/features/content/components/ContentArticleCard.tsx - Content card pattern
 */

'use client';

import Link from 'next/link';
import type { Route } from 'next';
import type { JobMarketContent } from '@features/jobs/types';

interface JobMarketInsightCardProps {
  content: JobMarketContent;
  featured?: boolean;
}

export function JobMarketInsightCard({ content, featured = false }: JobMarketInsightCardProps) {
  const contentTypeLabels: Record<string, string> = {
    trends: 'Market Trends',
    salary_guide: 'Salary Guide',
    skills_report: 'Skills Report',
    industry_outlook: 'Industry Outlook',
    hiring_tips: 'Hiring Tips'
  };

  const contentTypeColors: Record<string, string> = {
    trends: 'bg-blue-100 text-blue-800',
    salary_guide: 'bg-green-100 text-green-800',
    skills_report: 'bg-purple-100 text-purple-800',
    industry_outlook: 'bg-orange-100 text-orange-800',
    hiring_tips: 'bg-yellow-100 text-yellow-800'
  };

  const contentTypeLabel = contentTypeLabels[content.content_type] || content.content_type;
  const contentTypeColor = contentTypeColors[content.content_type] || 'bg-gray-100 text-gray-800';

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const cardClasses = featured
    ? 'bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow border-2 border-primary'
    : 'bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow';

  return (
    <Link href={`/jobs/insights/${content.slug}` as Route} className="block">
      <div className={cardClasses}>
        {/* Cover Image */}
        {content.cover_image_url && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <img
              src={content.cover_image_url}
              alt={content.title}
              className={`w-full object-cover ${featured ? 'h-64' : 'h-48'}`}
            />
          </div>
        )}

        {/* Header */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${contentTypeColor}`}>
              {contentTypeLabel}
            </span>
            {content.is_featured && !featured && (
              <span className="text-xs text-yellow-600 font-semibold">Featured</span>
            )}
          </div>
          <h3 className={`font-semibold text-gray-900 mb-2 ${featured ? 'text-2xl' : 'text-lg'}`}>
            {content.title}
          </h3>
        </div>

        {/* Summary */}
        {content.summary && (
          <p className={`text-gray-600 mb-4 ${featured ? 'text-base' : 'text-sm'} line-clamp-3`}>
            {content.summary}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          {content.published_date && (
            <div className="flex items-center">
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {formatDate(content.published_date)}
            </div>
          )}
          <div className="flex items-center">
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            {content.view_count.toLocaleString()} views
          </div>
        </div>

        {/* Regions & Categories */}
        {(content.regions || content.job_categories) && (
          <div className="space-y-2">
            {content.regions && content.regions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {content.regions.slice(0, 2).map((region, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                  >
                    📍 {region}
                  </span>
                ))}
                {content.regions.length > 2 && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs text-gray-600">
                    +{content.regions.length - 2} more
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Read More Link */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <span className="text-primary font-semibold hover:underline flex items-center">
            Read Full Report
            <svg
              className="w-4 h-4 ml-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
