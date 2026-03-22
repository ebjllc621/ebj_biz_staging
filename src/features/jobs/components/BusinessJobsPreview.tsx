/**
 * BusinessJobsPreview - Shows active job listings from a business on cross-feature pages
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Jobs Phase 7 - Cross-Feature Integration
 *
 * Renders a preview of up to 3 active jobs from a listing.
 * Returns null when loading or no jobs exist (silent-fail pattern).
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { Briefcase, MapPin, ExternalLink } from 'lucide-react';

interface JobPreview {
  id: number;
  title: string;
  slug: string;
  employment_type: string;
  compensation_min: number | null;
  compensation_max: number | null;
  location: string | null;
  job_type: string | null;
  status: string;
}

interface BusinessJobsPreviewProps {
  listingId: number;
  listingName: string | null;
  listingSlug: string | null;
  className?: string;
}

const EMPLOYMENT_TYPE_COLORS: Record<string, string> = {
  full_time: 'bg-blue-100 text-blue-700',
  part_time: 'bg-green-100 text-green-700',
  contract: 'bg-purple-100 text-purple-700',
  seasonal: 'bg-amber-100 text-amber-700',
  temporary: 'bg-red-100 text-red-700',
  internship: 'bg-teal-100 text-teal-700',
  gig: 'bg-pink-100 text-pink-700',
};

function formatEmploymentType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatCompensation(
  min: number | null,
  max: number | null
): string | null {
  if (min !== null && max !== null) {
    return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
  }
  if (min !== null) {
    return `$${min.toLocaleString()}+`;
  }
  if (max !== null) {
    return `$${max.toLocaleString()} max`;
  }
  return null;
}

export function BusinessJobsPreview({
  listingId,
  listingName,
  listingSlug,
  className = '',
}: BusinessJobsPreviewProps) {
  const [jobs, setJobs] = useState<JobPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchJobs() {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/listings/${listingId}/jobs`,
          { credentials: 'include' }
        );
        if (!res.ok) {
          if (isMounted) setIsLoading(false);
          return;
        }
        const result = await res.json();
        const jobsArr: JobPreview[] = result?.data?.jobs || [];
        if (isMounted) {
          const activeJobs = Array.isArray(jobsArr)
            ? jobsArr.filter((j) => j.status === 'active').slice(0, 3)
            : [];
          setJobs(activeJobs);
          setIsLoading(false);
        }
      } catch {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchJobs();
    return () => {
      isMounted = false;
    };
  }, [listingId]);

  if (isLoading || jobs.length === 0) return null;

  return (
    <section className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-biz-navy flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-biz-orange" />
          Open Positions at {listingName || 'this business'}
        </h2>
        {listingSlug && (
          <Link
            href={`/listings/${listingSlug}/jobs` as Route}
            className="text-sm text-biz-orange hover:text-orange-600 flex items-center gap-1 transition-colors"
          >
            View All Jobs <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      <div className="space-y-3">
        {jobs.map((job) => {
          const badgeColor =
            EMPLOYMENT_TYPE_COLORS[job.employment_type] ??
            'bg-gray-100 text-gray-700';
          const compensation = formatCompensation(
            job.compensation_min,
            job.compensation_max
          );

          return (
            <Link
              key={job.id}
              href={`/jobs/${job.slug}` as Route}
              className="flex items-center gap-4 p-3 border border-gray-100 rounded-lg hover:border-biz-orange hover:shadow-sm transition-all bg-white"
            >
              {/* Employment type badge */}
              <div className="flex-shrink-0 w-12 h-12 bg-biz-orange/10 rounded-lg flex flex-col items-center justify-center px-1">
                <Briefcase className="w-5 h-5 text-biz-orange" />
                <span
                  className={`text-xs font-semibold leading-none mt-0.5 px-1 py-0.5 rounded ${badgeColor} text-center`}
                  style={{ fontSize: '9px' }}
                >
                  {formatEmploymentType(job.employment_type).split(' ')[0]}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {job.title}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {compensation && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {compensation}
                    </span>
                  )}
                  {job.location && (
                    <span className="flex items-center gap-0.5 text-xs text-gray-400">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate max-w-[120px]">{job.location}</span>
                    </span>
                  )}
                </div>
              </div>

              <ExternalLink className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
