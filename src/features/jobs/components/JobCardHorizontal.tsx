/**
 * JobCardHorizontal - List view job card for Jobs page
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Jobs Phase 1 - Core Job CRUD & Display
 * @governance Build Map v2.1 ENHANCED
 *
 * Horizontal variant of job card for list view display.
 * Displays job information in a row format with expanded details.
 *
 * @see src/features/jobs/components/JobCard.tsx - Grid variant reference
 */
'use client';

import Link from 'next/link';
import type { Route } from 'next';
import Image from 'next/image';
import { Briefcase, MapPin, DollarSign, Clock, Calendar } from 'lucide-react';
import type { JobWithCoordinates } from '@features/jobs/types';

interface JobCardHorizontalProps {
  /** Job data with coordinates */
  job: JobWithCoordinates;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format employment type for display
 */
function formatEmploymentType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Format compensation for display
 * Note: DB may return numeric values as strings, so we convert explicitly
 */
function formatCompensation(
  type: string,
  min: number | string | null,
  max: number | string | null,
  currency: string
): string {
  if (type === 'unpaid') return 'Unpaid';
  if (type === 'competitive') return 'Competitive';

  // Convert to numbers (DB may return strings)
  const minVal = min != null ? Number(min) : null;
  const maxVal = max != null ? Number(max) : null;

  if (minVal && maxVal) {
    return `$${minVal.toFixed(0)} - $${maxVal.toFixed(0)}${type === 'hourly' ? '/hr' : '/yr'}`;
  } else if (minVal) {
    return `$${minVal.toFixed(0)}+${type === 'hourly' ? '/hr' : '/yr'}`;
  } else if (maxVal) {
    return `Up to $${maxVal.toFixed(0)}${type === 'hourly' ? '/hr' : '/yr'}`;
  }

  return formatEmploymentType(type);
}

/**
 * Calculate days since posted
 */
function getDaysSincePosted(date: Date): number {
  const now = new Date();
  const postedDate = new Date(date);
  const diffTime = now.getTime() - postedDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * JobCardHorizontal component
 * Displays job information in a horizontal card format for list view
 */
export function JobCardHorizontal({ job, className = '' }: JobCardHorizontalProps) {
  const daysSince = getDaysSincePosted(job.created_at);
  const isCommunityGig = Boolean(job.is_community_gig);
  const location = job.work_location_type === 'remote'
    ? 'Remote'
    : [job.city, job.state].filter(Boolean).join(', ') || 'Location TBD';

  return (
    <Link
      href={`/jobs/${job.slug}` as Route}
      className={`block group ${className}`}
    >
      <article className={`relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border ${isCommunityGig ? 'border-l-4 border-l-green-500 border-gray-100' : 'border-gray-100'}`}>
        <div className="flex flex-col sm:flex-row">
          {/* Company Logo */}
          <div className="relative h-32 w-full sm:w-32 sm:h-32 flex-shrink-0 bg-gradient-to-br from-blue-50 to-blue-100">
            {job.listing_logo ? (
              <Image
                src={job.listing_logo}
                alt={job.listing_name || 'Company logo'}
                fill
                className="object-contain p-4"
                sizes="128px"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-biz-navy to-blue-700">
                <Briefcase className="w-10 h-10 text-white" />
              </div>
            )}

            {/* Community Gig Badge */}
            {isCommunityGig && (
              <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                Community
              </span>
            )}

            {/* New Badge (non-community only) */}
            {!isCommunityGig && daysSince <= 7 && (
              <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                {daysSince === 0 ? 'New' : `${daysSince}d`}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {/* Company Name or Community Posted label */}
                {isCommunityGig ? (
                  <span className="text-xs font-medium uppercase text-green-600 tracking-wide">
                    Community Posted
                  </span>
                ) : job.listing_name ? (
                  <span className="text-xs font-medium uppercase text-biz-orange tracking-wide">
                    {job.listing_name}
                  </span>
                ) : null}

                {/* Job Title */}
                <h3 className="font-semibold text-biz-navy mt-1 text-lg group-hover:text-biz-orange transition-colors">
                  {job.title}
                </h3>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatEmploymentType(job.employment_type)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {location}
                  </span>
                  <span className="flex items-center gap-1 font-medium text-gray-700">
                    <DollarSign className="w-3.5 h-3.5" />
                    {formatCompensation(
                      job.compensation_type,
                      job.compensation_min,
                      job.compensation_max,
                      job.compensation_currency
                    )}
                  </span>
                </div>

                {/* Description Preview */}
                {job.description && (
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                    {job.description}
                  </p>
                )}

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {job.work_location_type !== 'onsite' && (
                    <span className="inline-flex text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                      {formatEmploymentType(job.work_location_type)}
                    </span>
                  )}
                  {job.is_featured && (
                    <span className="inline-flex text-xs text-white bg-biz-orange px-2 py-1 rounded">
                      Featured
                    </span>
                  )}
                </div>
              </div>

              {/* Posted Date (desktop only) */}
              <div className="hidden sm:flex flex-col items-end text-xs text-gray-500">
                <Calendar className="w-4 h-4 mb-1" />
                <span>Posted</span>
                <span className="font-medium">
                  {daysSince === 0 ? 'Today' : `${daysSince}d ago`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default JobCardHorizontal;
