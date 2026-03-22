/**
 * JobCard - Grid view job card for Jobs page
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Jobs Phase 1 - Core Job CRUD & Display
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * Grid variant of job card extending EventCard pattern.
 * Displays job information with company logo, badges, and key details.
 * Includes employment type badge, compensation display, and location.
 *
 * @see src/features/events/components/EventCard.tsx - Base pattern reference
 */
'use client';

import Link from 'next/link';
import type { Route } from 'next';
import Image from 'next/image';
import { Briefcase, MapPin, DollarSign, Clock } from 'lucide-react';
import type { JobWithCoordinates } from '@features/jobs/types';
import { useLCPImagePriority } from '@core/hooks/useLCPImagePriority';

interface JobCardProps {
  /** Job data with coordinates */
  job: JobWithCoordinates;
  /** Additional CSS classes */
  className?: string;
  /** Index in grid for LCP optimization */
  index?: number;
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
 * JobCard component
 * Displays job information in a card format for grid view
 */
export function JobCard({ job, className = '', index = 0 }: JobCardProps) {
  const { priority } = useLCPImagePriority({ layout: 'grid', index });
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
      <article className={`relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full border ${isCommunityGig ? 'border-l-4 border-l-green-500 border-gray-100' : 'border-gray-100'}`}>
        {/* Company Logo / Header */}
        <div className="relative h-32 w-full bg-gradient-to-br from-blue-50 to-blue-100">
          {job.listing_logo ? (
            <Image
              src={job.listing_logo}
              alt={job.listing_name || 'Company logo'}
              fill
              priority={priority}
              className="object-contain p-4"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-biz-navy to-blue-700">
              <Briefcase className="w-12 h-12 text-white" />
            </div>
          )}

          {/* Community Gig Badge */}
          {isCommunityGig && (
            <span className="absolute top-3 left-3 bg-green-500 text-white text-xs font-medium px-2.5 py-1 rounded-full">
              Community Gig
            </span>
          )}

          {/* Days Since Posted Badge (non-community only to avoid overlap) */}
          {!isCommunityGig && daysSince <= 7 && (
            <span className="absolute top-3 left-3 bg-green-500 text-white text-xs font-medium px-2.5 py-1 rounded-full">
              {daysSince === 0 ? 'New' : `${daysSince}d ago`}
            </span>
          )}

          {/* Featured Badge */}
          {job.is_featured && (
            <span className="absolute top-3 right-3 bg-biz-orange text-white text-xs font-medium px-2.5 py-1 rounded-full">
              Featured
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
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
          <h3 className="font-semibold text-biz-navy mt-1 line-clamp-2 group-hover:text-biz-orange transition-colors">
            {job.title}
          </h3>

          {/* Employment Type Badge */}
          <div className="mt-2">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
              <Clock className="w-3 h-3" />
              {formatEmploymentType(job.employment_type)}
            </span>
          </div>

          {/* Compensation */}
          <p className="flex items-center gap-1.5 text-sm text-gray-700 mt-2 font-medium">
            <DollarSign className="w-3.5 h-3.5" />
            <span>{formatCompensation(
              job.compensation_type,
              job.compensation_min,
              job.compensation_max,
              job.compensation_currency
            )}</span>
          </p>

          {/* Location */}
          <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
            <MapPin className="w-3.5 h-3.5" />
            <span className="line-clamp-1">{location}</span>
          </p>

          {/* Work Location Type Badge */}
          {job.work_location_type !== 'onsite' && (
            <div className="mt-2">
              <span className="inline-flex text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                {formatEmploymentType(job.work_location_type)}
              </span>
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}

export default JobCard;
