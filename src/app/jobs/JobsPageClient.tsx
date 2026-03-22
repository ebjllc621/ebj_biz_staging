/**
 * JobsPageClient - Client implementation for Jobs directory
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Jobs Phase R1 - Remediation
 * @governance Build Map v2.1 ENHANCED
 *
 * Client component with state management, URL sync, side-by-side map layout,
 * and dynamic map import following ListingsPageClient pattern.
 *
 * @see docs/pages/layouts/job_ops/build/3-4-26/phases/PHASE_R1_BRAIN_PLAN.md
 * @see src/app/listings/ListingsPageClient.tsx - Pattern reference
 */
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AlertCircle } from 'lucide-react';
import { JobCard } from '@features/jobs/components/JobCard';
import { JobCardHorizontal } from '@features/jobs/components/JobCardHorizontal';
import { JobsFilterBar } from '@features/jobs/components/JobsFilterBar';
import { JobDisplayMode } from '@features/jobs/types';
import type { DisplayMode } from '@/features/listings/types';
import type { JobWithCoordinates } from '@features/jobs/types';

// Dynamic import for JobsMap with loading state
const JobsMap = dynamic(
  () => import('@features/jobs/components/JobsMap').then((mod) => mod.JobsMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-gray-500">Loading map...</span>
      </div>
    ),
  }
);

/**
 * Loading skeleton for jobs grid
 */
function JobsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse bg-white rounded-xl overflow-hidden shadow-sm"
        >
          <div className="h-48 bg-gray-200" />
          <div className="p-4 space-y-3">
            <div className="h-3 bg-gray-200 rounded w-1/4" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Loading skeleton for list view
 */
function JobsListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse bg-white rounded-xl overflow-hidden shadow-sm flex flex-col sm:flex-row"
        >
          <div className="w-full sm:w-48 h-40 sm:h-auto sm:min-h-[160px] bg-gray-200" />
          <div className="flex-1 p-4 space-y-3">
            <div className="h-3 bg-gray-200 rounded w-1/6" />
            <div className="h-5 bg-gray-200 rounded w-1/2" />
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function JobsPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // State
  const [jobs, setJobs] = useState<JobWithCoordinates[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMapVisible, setIsMapVisible] = useState(true);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('grid');
  const [highlightedJobId, setHighlightedJobId] = useState<number | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [workLocationType, setWorkLocationType] = useState('');

  // Initialize filters from URL
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const empType = searchParams.get('employment_type') || '';
    const workType = searchParams.get('work_location_type') || '';
    const view = searchParams.get('view') || 'grid';

    setSearchQuery(q);
    setEmploymentType(empType);
    setWorkLocationType(workType);
    setDisplayMode(view as DisplayMode);
  }, [searchParams]);

  // GOVERNANCE: useCallback for fetchJobs to prevent re-renders
  const fetchJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (employmentType) params.set('employment_type', employmentType);
      if (workLocationType) params.set('work_location_type', workLocationType);

      const response = await fetch(`/api/jobs?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const data = await response.json();
      // GOVERNANCE: API uses createSuccessResponse which wraps data in { success, data: {...} }
      setJobs(data.data?.jobs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, employmentType, workLocationType]);

  // Fetch jobs when filters change
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Track impressions for displayed jobs (fire once per job per session)
  const trackedImpressions = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (jobs.length === 0 || isLoading) return;

    // Filter to only track new impressions
    const newJobs = jobs.filter(job => !trackedImpressions.current.has(job.id));
    if (newJobs.length === 0) return;

    // Mark as tracked immediately to prevent duplicates
    newJobs.forEach(job => trackedImpressions.current.add(job.id));

    // Fire impression events (fire-and-forget, batched)
    // GOVERNANCE: source must be valid ENUM value from job_analytics table
    // Valid sources: 'search' | 'notification' | 'direct' | 'social' | 'listing' | 'homepage'
    newJobs.forEach(job => {
      fetch(`/api/jobs/${job.id}/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          event_type: 'impression',
          source: 'search' // User found job via search/directory listing
        })
      }).catch(() => {
        // Silent fail for analytics - don't impact user experience
      });
    });
  }, [jobs, isLoading]);

  // Update URL when filters change
  const updateURL = (updates: Record<string, string>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        current.set(key, value);
      } else {
        current.delete(key);
      }
    });

    const search = current.toString();
    const query = search ? `?${search}` : '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push(`${pathname}${query}` as any, { scroll: false });
  };

  // Handler functions
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    updateURL({ q: query, employment_type: employmentType, work_location_type: workLocationType, view: displayMode });
  };

  const handleDisplayModeChange = (mode: DisplayMode) => {
    setDisplayMode(mode);
    updateURL({
      view: mode,
      q: searchQuery,
      employment_type: employmentType,
      work_location_type: workLocationType,
    });
  };

  const handleEmploymentTypeChange = (type: string) => {
    setEmploymentType(type);
    updateURL({ employment_type: type, q: searchQuery, work_location_type: workLocationType, view: displayMode });
  };

  const handleWorkLocationTypeChange = (type: string) => {
    setWorkLocationType(type);
    updateURL({ work_location_type: type, q: searchQuery, employment_type: employmentType, view: displayMode });
  };

  // Jobs with coordinates for map
  const jobsWithCoords = useMemo(
    () => jobs.filter((job) => job.latitude && job.longitude),
    [jobs]
  );

  /**
   * Handle marker click from map
   * Scrolls to job card in grid and highlights it
   */
  const handleMarkerClick = useCallback((jobId: number) => {
    // Scroll to job card in grid
    const element = document.getElementById(`job-${jobId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Brief highlight effect
      element.classList.add('ring-2', 'ring-biz-orange');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-biz-orange');
      }, 2000);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-biz-navy to-blue-900 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">Find Your Next Job</h1>
          <p className="text-blue-100">
            Browse {jobs.length} job{jobs.length !== 1 ? 's' : ''} from local businesses and the community
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Filter Bar */}
        <JobsFilterBar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          displayMode={displayMode === 'grid' ? JobDisplayMode.GRID : JobDisplayMode.LIST}
          onDisplayModeChange={(mode) => handleDisplayModeChange(mode === JobDisplayMode.GRID ? 'grid' : 'list')}
          employmentType={employmentType}
          onEmploymentTypeChange={handleEmploymentTypeChange}
          workLocationType={workLocationType}
          onWorkLocationTypeChange={handleWorkLocationTypeChange}
          isMapVisible={isMapVisible}
          onMapToggle={() => setIsMapVisible((prev) => !prev)}
          className="mb-6"
        />

        {/* Main Content Area - Side by Side Layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Map Container */}
          {isMapVisible && (
            <div className="hidden lg:block lg:w-1/2 xl:w-2/5">
              <div className="sticky top-4">
                <JobsMap
                  jobs={jobsWithCoords}
                  onMarkerClick={handleMarkerClick}
                  onMarkerHover={setHighlightedJobId}
                  highlightedJobId={highlightedJobId}
                  className="h-[600px] rounded-lg overflow-hidden shadow-sm"
                />
              </div>
            </div>
          )}

          {/* Jobs Grid/List */}
          <div className="flex-1">
            {/* Loading State */}
            {isLoading && (displayMode === 'grid' ? <JobsSkeleton /> : <JobsListSkeleton />)}

            {/* Error State */}
            {error && !isLoading && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-800 font-medium mb-2">Error loading jobs</p>
                <p className="text-red-700 text-sm mb-4">{error}</p>
                <button
                  onClick={fetchJobs}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && jobs.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No jobs found</p>
                <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
              </div>
            )}

            {/* Jobs Display */}
            {!isLoading && !error && jobs.length > 0 && (
              displayMode === 'grid' ? (
                <section aria-labelledby="jobs-heading">
                  <h2 id="jobs-heading" className="sr-only">
                    Job Listings Results
                  </h2>
                  <div
                    className={`grid gap-6 ${
                      isMapVisible
                        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3'
                        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                    }`}
                  >
                    {jobs.map((job, index) => (
                      <div
                        key={job.id}
                        id={`job-${job.id}`}
                        onMouseEnter={() => setHighlightedJobId(job.id)}
                        onMouseLeave={() => setHighlightedJobId(null)}
                      >
                        <JobCard job={job} index={index} />
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                <section aria-labelledby="jobs-list-heading">
                  <h2 id="jobs-list-heading" className="sr-only">
                    Job Listings List View
                  </h2>
                  <div className="space-y-4">
                    {jobs.map((job) => (
                      <div
                        key={job.id}
                        id={`job-${job.id}`}
                        onMouseEnter={() => setHighlightedJobId(job.id)}
                        onMouseLeave={() => setHighlightedJobId(null)}
                      >
                        <JobCardHorizontal job={job} />
                      </div>
                    ))}
                  </div>
                </section>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
