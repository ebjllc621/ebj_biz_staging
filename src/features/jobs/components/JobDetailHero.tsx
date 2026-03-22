/**
 * JobDetailHero - Hero section for job detail page
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Jobs Share & Recommend Integration
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/job_ops/build/3-5-26/JOB_SHARE_RECOMMEND_BRAIN_PLAN.md
 */
'use client';

import Image from 'next/image';
import { Briefcase, MapPin, DollarSign, Clock, Calendar, Share2 } from 'lucide-react';
import type { Job } from '@features/jobs/types';
import { RecommendButton } from '@features/sharing/components/RecommendButton';

interface JobDetailHeroProps {
  job: Job;
  listingName?: string;
  listingLogo?: string;
  onApplyClick: () => void;
  onSaveClick: () => void;
  onShareClick: () => void;
  isSaved?: boolean;
  className?: string;
  onRecommendSuccess?: () => void;
}

/**
 * Format employment type for display
 */
function formatEmploymentType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Format compensation for display
 */
function formatCompensation(
  type: string,
  min: number | null,
  max: number | null
): string {
  if (type === 'unpaid') return 'Unpaid Position';
  if (type === 'competitive') return 'Competitive Salary';

  if (min && max) {
    return `$${min.toLocaleString()} - $${max.toLocaleString()}${type === 'hourly' ? '/hr' : '/yr'}`;
  } else if (min) {
    return `$${min.toLocaleString()}+${type === 'hourly' ? '/hr' : '/yr'}`;
  } else if (max) {
    return `Up to $${max.toLocaleString()}${type === 'hourly' ? '/hr' : '/yr'}`;
  }

  return formatEmploymentType(type);
}

/**
 * Format date for display
 */
function formatDate(date: Date | null): string {
  if (!date) return 'TBD';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(date));
}

export function JobDetailHero({
  job,
  listingName,
  listingLogo,
  onApplyClick,
  onSaveClick,
  onShareClick,
  isSaved = false,
  className = '',
  onRecommendSuccess
}: JobDetailHeroProps) {
  const location = job.work_location_type === 'remote'
    ? 'Remote'
    : [job.city, job.state].filter(Boolean).join(', ') || 'Location TBD';

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      <div className="p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Company Logo */}
          <div className="flex-shrink-0">
            <div className="relative w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl overflow-hidden">
              {listingLogo ? (
                <Image
                  src={listingLogo}
                  alt={listingName || 'Company logo'}
                  fill
                  className="object-contain p-4"
                  sizes="128px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-biz-navy to-blue-700">
                  <Briefcase className="w-12 h-12 text-white" />
                </div>
              )}
            </div>
          </div>

          {/* Job Info */}
          <div className="flex-1 min-w-0">
            {/* Company Name */}
            {listingName && (
              <span className="text-sm font-medium uppercase text-biz-orange tracking-wide">
                {listingName}
              </span>
            )}

            {/* Job Title */}
            <h1 className="text-2xl lg:text-3xl font-bold text-biz-navy mt-2">
              {job.title}
            </h1>

            {/* Key Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div className="flex items-start gap-2">
                <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Employment Type</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatEmploymentType(job.employment_type)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Compensation</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatCompensation(job.compensation_type, job.compensation_min, job.compensation_max)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Location</p>
                  <p className="text-sm font-medium text-gray-900">{location}</p>
                  {job.work_location_type !== 'onsite' && (
                    <span className="inline-block text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded mt-1">
                      {formatEmploymentType(job.work_location_type)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500">Application Deadline</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(job.application_deadline)}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons - All same height, single row on desktop */}
            <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 mt-6">
              <button
                onClick={onApplyClick}
                className="flex-1 sm:flex-none inline-flex items-center justify-center whitespace-nowrap px-4 py-2 text-sm bg-biz-orange text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors"
              >
                Apply Now
              </button>
              <button
                onClick={onSaveClick}
                className={`inline-flex items-center justify-center whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-colors ${
                  isSaved
                    ? 'border-biz-orange text-biz-orange bg-orange-50'
                    : 'border-gray-300 text-gray-700 hover:border-biz-orange hover:text-biz-orange'
                }`}
              >
                {isSaved ? 'Saved' : 'Save Job'}
              </button>
              <button
                onClick={onShareClick}
                className="inline-flex items-center justify-center whitespace-nowrap gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border-2 border-gray-300 text-gray-700 hover:border-biz-navy hover:text-biz-navy transition-colors"
              >
                <Share2 className="w-4 h-4 flex-shrink-0" />
                <span>Share</span>
              </button>
              <RecommendButton
                entityType="job_posting"
                entityId={job.id.toString()}
                entityPreview={{
                  title: job.title,
                  description: job.description,
                  image_url: listingLogo || null,
                  url: `/jobs/${job.slug}`
                }}
                variant="secondary"
                size="sm"
                className="!py-2 !px-4 !border-2 !rounded-lg !font-semibold !text-sm !whitespace-nowrap [&>svg]:w-4 [&>svg]:h-4 [&>svg]:flex-shrink-0"
                onRecommendSuccess={onRecommendSuccess}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default JobDetailHero;
