/**
 * ListingJobs - Active Job Postings for Listing Detail Page
 *
 * Fetches jobs for a listing and renders via NowHiringSection.
 * Returns null when no active jobs in published mode.
 * Shows empty state with configure link in edit mode.
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 7 - Cross-Feature Integration
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Briefcase, Settings } from 'lucide-react';
import { NowHiringSection } from '@features/jobs/components/NowHiringSection';
import type { Job } from '@features/jobs/types';
import type { Listing } from '@core/services/ListingService';

interface ListingJobsProps {
  listing: Listing;
  isEditMode?: boolean;
}

export function ListingJobs({ listing, isEditMode }: ListingJobsProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchJobs() {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/jobs/search?listing_id=${listing.id}&limit=5`,
          { credentials: 'include' }
        );

        if (!res.ok) {
          if (isMounted) setIsLoading(false);
          return;
        }

        const result = await res.json();
        const jobsArr: Job[] = result?.data?.jobs || [];

        if (isMounted) {
          setJobs(Array.isArray(jobsArr) ? jobsArr : []);
          setIsLoading(false);
        }
      } catch {
        // Silently fail
        if (isMounted) setIsLoading(false);
      }
    }

    fetchJobs();

    return () => {
      isMounted = false;
    };
  }, [listing.id]);

  // Show empty state in edit mode when no jobs
  if (isEditMode && !isLoading && jobs.length === 0) {
    return (
      <section className="bg-white rounded-lg shadow-sm p-6 border-2 border-dashed border-gray-300">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              Now Hiring
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              No job postings yet. Create and promote your open positions.
            </p>
            <Link
              href={`/dashboard/listings/${String(listing.id)}/jobs` as any}
              className="inline-flex items-center gap-2 px-4 py-2 bg-biz-navy text-white text-sm font-medium rounded-md hover:bg-biz-navy/90 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configure
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Return null in published mode when no jobs or still loading
  if (isLoading || jobs.length === 0) {
    return null;
  }

  return (
    <NowHiringSection
      listingId={listing.id}
      listingName={listing.name || ''}
      jobs={jobs}
    />
  );
}
