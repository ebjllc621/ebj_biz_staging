/**
 * WhosHiringSection Component
 *
 * Homepage featured jobs grid displaying up to 8 active job postings
 *
 * GOVERNANCE COMPLIANCE:
 * - 'use client' directive for client component
 * - Import aliases: @core/, @features/, @components/
 * - Performance: useLCPImagePriority for first N images
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @tier STANDARD
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 * @reference src/features/listings/components/FeaturedListings.tsx - Featured grid pattern
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { JobCard } from './JobCard';
import type { Job } from '@features/jobs/types';

interface WhosHiringSectionProps {
  maxJobs?: number;
}

export function WhosHiringSection({ maxJobs = 8 }: WhosHiringSectionProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFeaturedJobs() {
      try {
        const response = await fetch(`/api/homepage/whos-hiring?limit=${maxJobs}`);
        if (!response.ok) {
          throw new Error('Failed to load featured jobs');
        }
        const result = await response.json();
        const rawJobs = result.data?.jobs || [];
        // Map API field names to Job type field names
        setJobs(rawJobs.map((j: Record<string, unknown>) => ({
          ...j,
          listing_logo: j.listing_logo_url || j.listing_logo,
        })));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Failed to fetch featured jobs:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchFeaturedJobs();
  }, [maxJobs]);

  if (error) {
    return (
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center text-red-600">
            Unable to load featured jobs at this time.
          </div>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Who's Hiring?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: maxJobs }).map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-64"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (jobs.length === 0) {
    return null; // Don't show section if no jobs
  }

  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Who's Hiring?
            </h2>
            <p className="text-gray-600">
              Discover exciting job opportunities from local businesses
            </p>
          </div>
          <Link
            href="/jobs"
            className="text-primary hover:underline font-semibold flex items-center"
          >
            View All Jobs
            <svg
              className="w-5 h-5 ml-1"
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
          </Link>
        </div>

        {/* Jobs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {jobs.map((job, index) => (
            <JobCard
              key={job.id}
              job={job}
              index={index} // LCP optimization for first 4 cards
            />
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-12 text-center">
          <Link
            href="/jobs"
            className="inline-flex items-center px-8 py-3 bg-primary text-white rounded-lg text-lg font-semibold hover:bg-primary-dark transition-colors shadow-lg"
          >
            Explore All Opportunities
          </Link>
        </div>
      </div>
    </section>
  );
}
