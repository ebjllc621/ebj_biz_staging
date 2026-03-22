/**
 * JobDetailClient - Client Component for Job Detail Page
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Jobs Share & Recommend Integration
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Client component for job details page interactivity.
 * Receives initial data from server component for optimal LCP.
 *
 * @see docs/pages/layouts/job_ops/build/3-5-26/JOB_SHARE_RECOMMEND_BRAIN_PLAN.md
 */
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@core/hooks/useAuth';
import { JobDetailHero } from '@features/jobs/components/JobDetailHero';

const BusinessEventsPreview = dynamic(
  () => import('@features/events/components/BusinessEventsPreview').then(m => ({ default: m.BusinessEventsPreview })),
  { ssr: false }
);

const BusinessOffersPreview = dynamic(
  () => import('@features/offers/components/BusinessOffersPreview').then(m => ({ default: m.BusinessOffersPreview })),
  { ssr: false }
);

const JobReferralBadge = dynamic(
  () => import('@features/jobs/components/JobReferralBadge').then(m => ({ default: m.JobReferralBadge })),
  { ssr: false }
);
import { JobDetailContent } from '@features/jobs/components/JobDetailContent';
import { JobMediaGallery } from '@features/jobs/components/JobMediaGallery';
import { JobDetailSidebar } from '@features/jobs/components/JobDetailSidebar';
import { JobShareModal } from '@features/jobs/components/JobShareModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import type { JobWithCoordinates } from '@features/jobs/types';
import type { Listing } from '@core/services/ListingService';

interface JobDetailClientProps {
  /** URL slug for the job */
  slug: string;
  /** Initial job data from server (for optimal LCP) */
  initialJob: JobWithCoordinates | null;
  /** Initial listing data from server (for sidebar) */
  initialListing: Listing | null;
}

/**
 * JobDetailClientInternal component
 * Handles rendering of job details with 2-column layout
 */
function JobDetailClientInternal({
  slug,
  initialJob,
  initialListing
}: JobDetailClientProps) {
  const router = useRouter();
  const { user: currentUser } = useAuth();

  // Use initial data from server
  const [job, setJob] = useState<JobWithCoordinates | null>(initialJob);
  const [listing, setListing] = useState<Listing | null>(initialListing);
  const [isLoading, setIsLoading] = useState(!initialJob);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Track which jobs have already had page_view tracked (prevents duplicates from StrictMode/re-renders)
  const trackedPageViews = useRef<Set<number>>(new Set());

  // Fetch job if not provided by server (fallback)
  useEffect(() => {
    if (!initialJob && slug) {
      fetchJob();
    }
  }, [slug, initialJob]);

  // Track page_view analytics when job is loaded (fire once per job per session)
  // GOVERNANCE: source must be valid ENUM value from job_analytics table
  // Valid sources: 'search' | 'notification' | 'direct' | 'social' | 'listing' | 'homepage'
  useEffect(() => {
    if (!job?.id) return;

    // Prevent duplicate tracking (StrictMode fires effects twice, also prevents re-render duplicates)
    if (trackedPageViews.current.has(job.id)) {
      return;
    }

    // Mark as tracked BEFORE firing to prevent race conditions
    trackedPageViews.current.add(job.id);

    // Fire-and-forget page view tracking
    fetch(`/api/jobs/${job.id}/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        event_type: 'page_view',
        source: 'direct', // User directly viewing job detail page
        referrer: typeof document !== 'undefined' ? document.referrer : undefined
      })
    }).catch((err) => {
      console.error('Failed to track page view:', err);
    });
  }, [job?.id]);

  // Check if user has saved this job
  useEffect(() => {
    if (!job?.id) return;

    fetch(`/api/jobs/${job.id}/save`, {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        // API returns { success, data: { is_saved } }
        setIsSaved(data.data?.is_saved || false);
      })
      .catch(() => {
        // Not logged in or error - default to not saved
        setIsSaved(false);
      });
  }, [job?.id]);

  const fetchJob = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/jobs/${slug}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Job not found');
        }
        throw new Error('Failed to fetch job');
      }

      const data = await response.json();
      const jobData = data.data?.job;
      setJob(jobData);

      // Fetch listing if job has business_id
      if (jobData?.business_id) {
        const listingRes = await fetch(`/api/listings/${jobData.business_id}`, {
          credentials: 'include'
        });
        if (listingRes.ok) {
          const listingData = await listingRes.json();
          setListing(listingData.data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyClick = useCallback(async () => {
    if (!job) return;

    // Track analytics
    // GOVERNANCE: source must be valid ENUM: 'search' | 'notification' | 'direct' | 'social' | 'listing' | 'homepage'
    try {
      await fetch(`/api/jobs/${job.id}/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          event_type: 'apply_click',
          source: 'direct' // User applying from job detail page
        })
      });
    } catch (err) {
      console.error('Failed to track analytics:', err);
    }

    // Redirect to application
    if (job.application_method === 'external' && job.external_application_url) {
      window.open(job.external_application_url, '_blank');
    } else {
      // Native application (future phase)
      alert('Native application system coming soon');
    }
  }, [job]);

  const handleSaveClick = useCallback(async () => {
    if (!job) return;

    try {
      if (isSaved) {
        await fetch(`/api/jobs/${job.id}/save`, {
          method: 'DELETE',
          credentials: 'include'
        });
        setIsSaved(false);
      } else {
        await fetch(`/api/jobs/${job.id}/save`, {
          method: 'POST',
          credentials: 'include'
        });
        setIsSaved(true);
      }
    } catch (err) {
      console.error('Failed to save job:', err);
      alert('Please sign in to save jobs');
    }
  }, [job, isSaved]);

  const handleShareClick = useCallback(() => {
    setIsShareModalOpen(true);
  }, []);

  const handleRecommendSuccess = useCallback(() => {
    // Could show a toast or update UI state here
    console.log('Job recommended successfully');
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse">
          {/* Back Button Skeleton */}
          <div className="bg-white border-b border-gray-200">
            <div className="container mx-auto px-4 py-4">
              <div className="h-6 w-20 bg-gray-200 rounded" />
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-gray-200 rounded-lg" />
                <div className="h-48 bg-gray-200 rounded-lg" />
              </div>
              {/* Sidebar */}
              <div className="space-y-4">
                <div className="h-32 bg-gray-200 rounded-lg" />
                <div className="h-48 bg-gray-200 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg font-medium">{error || 'Job not found'}</p>
          <button
            onClick={() => router.push('/jobs')}
            className="mt-4 text-biz-orange hover:text-orange-600 font-medium"
          >
            Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-biz-navy transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>
      </div>

      {/* Main Content Area - 2-COLUMN LAYOUT */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content (col-span-2) */}
          <div className="lg:col-span-2 space-y-6">
            <JobDetailHero
              job={job}
              listingName={job.listing_name}
              listingLogo={job.listing_logo}
              onApplyClick={handleApplyClick}
              onSaveClick={handleSaveClick}
              onShareClick={handleShareClick}
              isSaved={isSaved}
              onRecommendSuccess={handleRecommendSuccess}
            />

            {/* Job Media Gallery - renders only if media exists */}
            <JobMediaGallery jobId={job.id} />

            <JobDetailContent job={job} />

            {job.business_id && (
              <BusinessEventsPreview
                listingId={job.business_id}
                listingName={job.listing_name ?? null}
                listingSlug={job.listing_slug ?? null}
              />
            )}

            {job.business_id && (
              <BusinessOffersPreview
                listingId={job.business_id}
                listingName={job.listing_name ?? null}
                listingSlug={job.listing_slug ?? null}
              />
            )}
          </div>

          {/* Sidebar - BUSINESS INFORMATION (Spec Section 5.1) */}
          <div className="hidden lg:block space-y-6">
            <JobDetailSidebar
              job={job}
              listing={listing}
            />

            {/* Referral Badge - authenticated users only */}
            {currentUser?.id && (
              <JobReferralBadge userId={parseInt(String(currentUser.id), 10)} compact={true} />
            )}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <JobShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        job={job}
        listingName={job.listing_name}
        listingLogo={job.listing_logo}
      />
    </div>
  );
}

/**
 * JobDetailClient with ErrorBoundary wrapper
 * @tier ADVANCED - Requires ErrorBoundary per Build Map v2.1
 */
export function JobDetailClient(props: JobDetailClientProps) {
  return (
    <ErrorBoundary
      componentName="JobDetailClient"
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-red-800 mb-4">
              Something went wrong
            </h2>
            <p className="text-red-700 mb-6">
              We encountered an error loading this job. Please try again.
            </p>
            <a
              href="/jobs"
              className="inline-block px-6 py-3 bg-biz-navy text-white rounded-md hover:bg-biz-navy/90 transition-colors"
            >
              Browse All Jobs
            </a>
          </div>
        </div>
      }
    >
      <JobDetailClientInternal {...props} />
    </ErrorBoundary>
  );
}
