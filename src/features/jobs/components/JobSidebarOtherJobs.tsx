/**
 * JobSidebarOtherJobs - Other Open Positions at This Business
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Jobs Phase R2
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Briefcase, ArrowRight } from 'lucide-react';
import type { Job } from '@features/jobs/types';

interface JobSidebarOtherJobsProps {
  listingId: number;
  currentJobId: number;
}

export function JobSidebarOtherJobs({ listingId, currentJobId }: JobSidebarOtherJobsProps) {
  const [otherJobs, setOtherJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOtherJobs();
  }, [listingId, currentJobId]);

  const fetchOtherJobs = async () => {
    try {
      const response = await fetch(`/api/listings/${listingId}/jobs`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const jobs = data.data?.jobs || [];
        // Filter out current job and limit to 3
        setOtherJobs(
          jobs
            .filter((j: Job) => j.id !== currentJobId && j.status === 'active')
            .slice(0, 3)
        );
      }
    } catch (error) {
      console.error('Failed to fetch other jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if no other jobs
  if (isLoading || otherJobs.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Briefcase className="w-4 h-4 text-biz-orange" />
        Other Open Positions
      </h4>

      <div className="space-y-2">
        {otherJobs.map((job) => (
          <Link
            key={job.id}
            href={`/jobs/${job.slug}`}
            className="block p-2 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-biz-orange">
                  {job.title}
                </p>
                <p className="text-xs text-gray-500">
                  {job.employment_type?.replace('_', ' ')}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-biz-orange flex-shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default JobSidebarOtherJobs;
