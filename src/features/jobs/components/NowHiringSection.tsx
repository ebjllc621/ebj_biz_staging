/**
 * NowHiringSection - Job listings section for listing detail page
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Jobs Phase 1 - Core Job CRUD & Display
 * @governance Build Map v2.1 ENHANCED
 *
 * Displays active job postings from a business listing.
 * Integrates into listing detail page alongside other content sections.
 */
'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { Briefcase, MapPin, DollarSign, ChevronRight } from 'lucide-react';
import type { Job } from '@features/jobs/types';

interface NowHiringSectionProps {
  listingId: number;
  listingName: string;
  jobs: Job[];
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
  max: number | string | null
): string {
  if (type === 'unpaid') return 'Unpaid';
  if (type === 'competitive') return 'Competitive';

  // Convert to numbers (DB may return strings)
  const minVal = min != null ? Number(min) : null;
  const maxVal = max != null ? Number(max) : null;

  if (minVal && maxVal) {
    return `$${minVal.toFixed(0)} - $${maxVal.toFixed(0)}`;
  } else if (minVal) {
    return `$${minVal.toFixed(0)}+`;
  }

  return '';
}

export function NowHiringSection({
  listingId,
  listingName,
  jobs,
  className = ''
}: NowHiringSectionProps) {
  if (jobs.length === 0) {
    return null;
  }

  return (
    <section className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-biz-orange" />
          <h2 className="text-2xl font-bold text-biz-navy">Now Hiring</h2>
        </div>
        <Link
          href={`/jobs?listing=${listingId}` as Route}
          className="text-sm text-biz-orange hover:text-orange-600 font-medium flex items-center gap-1"
        >
          View All
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-4">
        {jobs.map((job) => {
          const location = job.work_location_type === 'remote'
            ? 'Remote'
            : [job.city, job.state].filter(Boolean).join(', ') || 'Location TBD';

          return (
            <Link
              key={job.id}
              href={`/jobs/${job.slug}` as Route}
              className="block p-4 rounded-lg border border-gray-200 hover:border-biz-orange hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-biz-navy hover:text-biz-orange transition-colors">
                    {job.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5" />
                      {formatEmploymentType(job.employment_type)}
                    </span>
                    {job.compensation_min && (
                      <span className="flex items-center gap-1 font-medium text-gray-700">
                        <DollarSign className="w-3.5 h-3.5" />
                        {formatCompensation(job.compensation_type, job.compensation_min, job.compensation_max)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {location}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>

      {jobs.length > 3 && (
        <div className="mt-4 text-center">
          <Link
            href={`/jobs?listing=${listingId}` as Route}
            className="inline-flex items-center gap-2 text-biz-orange hover:text-orange-600 font-medium"
          >
            View {jobs.length - 3} More Job{jobs.length - 3 !== 1 ? 's' : ''}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </section>
  );
}

export default NowHiringSection;
