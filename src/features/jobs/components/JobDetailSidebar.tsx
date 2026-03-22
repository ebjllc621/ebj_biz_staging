/**
 * JobDetailSidebar - Business Information Sidebar for Job Detail Page
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Jobs Phase R2 - Detail Page Remediation
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features per Spec Section 5.1:
 * - Business logo and name header
 * - Star rating and review count
 * - Quick contact card
 * - Location with map embed and Get Directions
 * - Business hours
 * - Other open positions at this business
 * - Follow Business button
 *
 * @see docs/pages/layouts/job_ops/build/3-4-26/phases/PHASE_R2_BRAIN_PLAN.md
 */
'use client';

import { useEffect, useState } from 'react';
import type { JobWithCoordinates } from '@features/jobs/types';
import type { Listing } from '@core/services/ListingService';

// Reusable sidebar components from listings
import { SidebarLocationCard } from '@features/listings/components/details/SidebarLocationCard';
import { SidebarHoursCard } from '@features/listings/components/details/SidebarHoursCard';
import { SidebarSocialCard } from '@features/listings/components/details/SidebarSocialCard';

// Job-specific sidebar components
import { JobSidebarBusinessHeader } from './JobSidebarBusinessHeader';
import { JobSidebarOtherJobs } from './JobSidebarOtherJobs';
import { JobSidebarFollowButton } from './JobSidebarFollowButton';
import { JobSidebarQuickContact } from './JobSidebarQuickContact';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

interface JobDetailSidebarProps {
  /** Job data */
  job: JobWithCoordinates;
  /** Parent listing data (for business info) */
  listing: Listing | null;
}

function JobDetailSidebarContent({ job, listing }: JobDetailSidebarProps) {
  const [isSticky, setIsSticky] = useState(false);

  // Handle sticky positioning on scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // If no listing data, show minimal sidebar
  if (!listing) {
    return (
      <aside
        className={`
          ${isSticky ? 'sticky top-4' : ''}
          max-h-[calc(100vh-2rem)]
          overflow-y-auto
          scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent
        `}
      >
        <div className="space-y-4">
          {/* Minimal business header from job data */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 text-lg">
              {job.listing_name || 'Business'}
            </h3>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`
        ${isSticky ? 'sticky top-4' : ''}
        max-h-[calc(100vh-2rem)]
        overflow-y-auto
        scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent
      `}
    >
      <div className="space-y-4">
        {/* Business Header (logo, name, rating) */}
        <JobSidebarBusinessHeader listing={listing} />

        {/* Quick Contact Card */}
        <JobSidebarQuickContact listing={listing} jobId={job.id} />

        {/* Location with Map & Get Directions */}
        <SidebarLocationCard listing={listing} />

        {/* Business Hours */}
        <SidebarHoursCard listing={listing} />

        {/* Social Links */}
        <SidebarSocialCard listing={listing} />

        {/* Other Open Positions at This Business */}
        <JobSidebarOtherJobs
          listingId={listing.id}
          currentJobId={job.id}
        />

        {/* Follow Business Button */}
        <JobSidebarFollowButton listing={listing} />
      </div>
    </aside>
  );
}

export function JobDetailSidebar(props: JobDetailSidebarProps) {
  return (
    <ErrorBoundary componentName="JobDetailSidebar">
      <JobDetailSidebarContent {...props} />
    </ErrorBoundary>
  );
}

export default JobDetailSidebar;
