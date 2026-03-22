/**
 * ListingManagerDashboard - Listing Manager Landing Page
 *
 * @description Main dashboard for users managing their business listings
 * @component Client Component
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Phase 6 - Listing Manager Dashboard
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_6_BRAIN_PLAN.md
 * @reference src/features/dashboard/components/DashboardOverview.tsx
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use ErrorBoundary (ADVANCED tier requirement)
 * - Orange theme (#ed6437) consistent with listing manager routes
 * - Uses ListingContext for selectedListing state
 * - credentials: 'include' for authenticated requests
 * - useCallback for handlers, useMemo for computed values
 *
 * USAGE:
 * Primary component rendered at /dashboard/listings for listing-centric dashboard.
 */
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { Route } from 'next';
import { Eye, Star, MessageSquare, Users, Tag, Building2, AlertCircle, BadgeCheck, Link2, FileText, MousePointerClick, ChevronDown } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useListingData } from '../hooks/useListingData';
import { ListingStats, ListingActivityItem } from '../types';
import { ListingStatCard, KpiColorMode } from './ListingStatCard';
import { ListingCompletionProgress } from './ListingCompletionProgress';
import { ListingQuickActions } from './ListingQuickActions';
import { ListingActivityFeed } from './ListingActivityFeed';

// Phase 3B: Dynamic imports for engagement components
const MilestoneCelebrationToast = dynamic(
  () => import('./managers/MilestoneCelebrationToast').then(m => ({ default: m.MilestoneCelebrationToast })),
  { ssr: false }
);
const ShareReminderBanner = dynamic(
  () => import('./managers/ShareReminderBanner').then(m => ({ default: m.ShareReminderBanner })),
  { ssr: false }
);

// Phase 5A: Cross-feature completeness
const CrossFeatureCompletenessCard = dynamic(
  () => import('./CrossFeatureCompletenessCard').then(m => ({ default: m.CrossFeatureCompletenessCard })),
  { ssr: false }
);

// Phase 4A: Dynamic imports for lifecycle components
const PauseResumeToggle = dynamic(
  () => import('./managers/PauseResumeToggle').then(m => ({ default: m.PauseResumeToggle })),
  { ssr: false }
);
const DuplicateListingButton = dynamic(
  () => import('./managers/DuplicateListingButton').then(m => ({ default: m.DuplicateListingButton })),
  { ssr: false }
);
const PublishDraftButton = dynamic(
  () => import('./managers/PublishDraftButton').then(m => ({ default: m.PublishDraftButton })),
  { ssr: false }
);

/**
 * No-Listing State Component
 *
 * Displayed when user has no listing selected.
 */
function NoListingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="bg-gray-100 rounded-full p-6 mb-6">
        <Building2 className="w-16 h-16 text-gray-400" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">No Listing Selected</h2>
      <p className="text-gray-600 mb-6 max-w-md">
        Please select a listing from the dropdown above to view its dashboard and statistics.
      </p>
    </div>
  );
}

/**
 * Loading skeleton for stats grid
 */
function StatsLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 animate-pulse">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-36 bg-gray-100 rounded-xl" />
      ))}
    </div>
  );
}

/**
 * ListingManagerDashboard component content
 */
function ListingManagerDashboardContent() {
  const { selectedListing, selectedListingId, isLoading: isLoadingContext } = useListingContext();
  const { listing: fullListing } = useListingData(selectedListingId);

  const [stats, setStats] = useState<ListingStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Activity feed state
  const [activities, setActivities] = useState<ListingActivityItem[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  // KPI card color mode (persisted to localStorage)
  const [kpiColorMode, setKpiColorMode] = useState<KpiColorMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('bk_kpi_color_mode') as KpiColorMode) || 'default';
    }
    return 'default';
  });
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);

  const handleKpiColorModeChange = useCallback((mode: KpiColorMode) => {
    setKpiColorMode(mode);
    localStorage.setItem('bk_kpi_color_mode', mode);
  }, []);

  // Phase 4A: Local status override for optimistic pause/resume UI
  const [localStatus, setLocalStatus] = useState<string | null>(null);

  // Reset local status when selected listing changes
  const effectiveStatus = localStatus ?? selectedListing?.status ?? 'active';

  // Get cover image from full listing data (falls back to null if not available)
  const coverImageUrl = fullListing?.cover_image_url || null;

  // Fetch listing stats
  const fetchStats = useCallback(async () => {
    if (!selectedListingId) {
      setStats(null);
      return;
    }

    try {
      setIsLoadingStats(true);
      setError(null);

      const response = await fetch(`/api/listings/${selectedListingId}/stats`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load listing statistics');
      }

      const result = await response.json();
      setStats(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoadingStats(false);
    }
  }, [selectedListingId]);

  // Fetch recent activity for this listing
  const fetchActivities = useCallback(async () => {
    if (!selectedListingId) {
      setActivities([]);
      return;
    }

    try {
      setIsLoadingActivities(true);
      setActivityError(null);

      const response = await fetch(`/api/listings/${selectedListingId}/activity?limit=8`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load activity');
      }

      const result = await response.json();
      setActivities(result.data?.activities ?? []);
    } catch (err) {
      setActivityError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setIsLoadingActivities(false);
    }
  }, [selectedListingId]);

  // Fetch stats and activity when selectedListingId changes
  useEffect(() => {
    void fetchStats();
    void fetchActivities();
  }, [fetchStats, fetchActivities]);

  // Reset local status when listing changes
  useEffect(() => {
    setLocalStatus(null);
  }, [selectedListingId]);

  // Show loading while context initializes
  if (isLoadingContext) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ed6437]" />
      </div>
    );
  }

  // Show no-listing state if no listing selected
  if (!selectedListingId || !selectedListing) {
    return <NoListingState />;
  }

  return (
    <div className="space-y-6">
      {/* Hero Section with Listing Card */}
      <div
        className="relative text-white rounded-2xl p-8 overflow-hidden"
        style={{
          background: coverImageUrl
            ? undefined
            : 'linear-gradient(to bottom right, #002641, #003a5c, #004d7a)'
        }}
      >
        {/* Cover Image Background */}
        {coverImageUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              aria-hidden="true"
            />
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/40" />
          </>
        )}

        {/* Content positioned above background */}
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-6 flex-1">
              {/* Listing Logo */}
              {selectedListing.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedListing.logo_url}
                  alt={`${selectedListing.name} logo`}
                  className="w-24 h-24 rounded-xl object-cover bg-white"
                />
              ) : (
                <div className="w-24 h-24 rounded-xl bg-white/20 flex items-center justify-center">
                  <Building2 className="w-12 h-12 text-white/60" />
                </div>
              )}

              {/* Listing Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{selectedListing.name}</h1>
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                    {selectedListing.tier}
                  </span>
                  {/* Phase 4A: Status badges */}
                  {effectiveStatus === 'active' && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-100">
                      Active
                    </span>
                  )}
                  {effectiveStatus === 'paused' && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-500/30 text-gray-200">
                      Paused
                    </span>
                  )}
                  {effectiveStatus === 'draft' && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium border border-orange-400/50 text-orange-200 bg-orange-500/10">
                      Draft
                    </span>
                  )}
                  {effectiveStatus !== 'active' && effectiveStatus !== 'paused' && effectiveStatus !== 'draft' && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-500/20 text-yellow-100">
                      {effectiveStatus}
                    </span>
                  )}
                </div>

                {/* Phase 4A: Lifecycle action buttons */}
                <div className="flex items-center gap-3 flex-wrap mb-4">
                  {effectiveStatus === 'draft' && (
                    <PublishDraftButton
                      listingId={selectedListingId}
                      onStatusChange={(newStatus) => setLocalStatus(newStatus)}
                    />
                  )}
                  {(effectiveStatus === 'active' || effectiveStatus === 'paused') && (
                    <PauseResumeToggle
                      listingId={selectedListingId}
                      currentStatus={effectiveStatus}
                      onStatusChange={(newStatus) => setLocalStatus(newStatus)}
                    />
                  )}
                  <DuplicateListingButton
                    listingId={selectedListingId}
                    listingName={selectedListing.name}
                    listingSlug={selectedListing.slug}
                  />
                </div>

                {/* Phase 5A: Cross-Feature Completion Progress */}
                {stats && selectedListingId && (
                  <div className="max-w-md">
                    <CrossFeatureCompletenessCard
                      listingId={selectedListingId}
                      baseCompleteness={stats.completeness.percentage}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* View Public Page Button */}
            <Link
              href={`/listings/${selectedListing.slug}` as Route}
              target="_blank"
              className="px-6 py-2 bg-white text-[#002641] rounded-lg hover:bg-gray-100 transition-colors font-medium whitespace-nowrap"
            >
              View Public Page
            </Link>
          </div>
        </div>
      </div>

      {/* Phase 3B: Milestone Celebrations & Share Reminders */}
      {selectedListingId && (
        <>
          <MilestoneCelebrationToast listingId={selectedListingId} />
          <ShareReminderBanner listingId={selectedListingId} listingName={selectedListing?.name || ''} />
        </>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchStats()}
            className="ml-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Grid */}
      {isLoadingStats ? (
        <StatsLoadingSkeleton />
      ) : stats ? (
        <section aria-labelledby="listing-stats-heading">
          <div className="flex items-center justify-between mb-4">
            <h2 id="listing-stats-heading" className="text-lg font-semibold text-gray-900">Statistics</h2>
            {/* View Options Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)}
                onBlur={() => setTimeout(() => setIsViewDropdownOpen(false), 150)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                View: {kpiColorMode === 'default' ? 'Medley' : kpiColorMode === 'option1' ? 'BizSlate' : kpiColorMode === 'option2' ? 'BizNavy' : kpiColorMode === 'option3' ? 'BizOrange' : 'Bizconekt'}
                <ChevronDown className={`w-4 h-4 transition-transform ${isViewDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isViewDropdownOpen && (
                <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <button
                    onClick={() => { handleKpiColorModeChange('default'); setIsViewDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm rounded-t-lg transition-colors ${kpiColorMode === 'default' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    Medley
                  </button>
                  <button
                    onClick={() => { handleKpiColorModeChange('option1'); setIsViewDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${kpiColorMode === 'option1' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    BizSlate
                  </button>
                  <button
                    onClick={() => { handleKpiColorModeChange('option2'); setIsViewDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${kpiColorMode === 'option2' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    BizNavy
                  </button>
                  <button
                    onClick={() => { handleKpiColorModeChange('option3'); setIsViewDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${kpiColorMode === 'option3' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    BizOrange
                  </button>
                  <button
                    onClick={() => { handleKpiColorModeChange('option4'); setIsViewDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm rounded-b-lg transition-colors ${kpiColorMode === 'option4' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    Bizconekt
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <ListingStatCard
              title="Views"
              value={stats.views.last30Days}
              icon={Eye}
              variant="blue"
              subtitle="last 30 days"
              change={stats.views.trendPercent !== 0 ? `${stats.views.trendPercent > 0 ? '+' : ''}${stats.views.trendPercent}%` : undefined}
              changeDirection={stats.views.trend}
              colorMode={kpiColorMode}
            />
            <ListingStatCard
              title="Average Rating"
              value={stats.reviews.averageRating}
              icon={Star}
              variant="yellow"
              subtitle={`from ${stats.reviews.total} reviews`}
              decimals={1}
              colorMode={kpiColorMode}
            />
            <ListingStatCard
              title="Total Reviews"
              value={stats.reviews.total}
              icon={MessageSquare}
              variant="purple"
              subtitle={stats.reviews.pending > 0 ? `${stats.reviews.pending} pending` : 'all approved'}
              colorMode={kpiColorMode}
            />
            <ListingStatCard
              title="Followers"
              value={stats.followers}
              icon={Users}
              variant="green"
              subtitle="users following"
              colorMode={kpiColorMode}
            />
            <ListingStatCard
              title="Messages"
              value={stats.messages.unread}
              icon={MessageSquare}
              variant="orange"
              subtitle={`of ${stats.messages.total} total`}
              colorMode={kpiColorMode}
            />
            <ListingStatCard
              title="Active Offers"
              value={stats.offers.active}
              icon={Tag}
              variant="red"
              subtitle={`of ${stats.offers.total} total`}
              colorMode={kpiColorMode}
            />
            <ListingStatCard
              title="Recommendations"
              value={stats.recommendations}
              icon={BadgeCheck}
              variant="blue"
              subtitle="received"
              colorMode={kpiColorMode}
            />
            <ListingStatCard
              title="Affiliated Listings"
              value={stats.affiliatedListings}
              icon={Link2}
              variant="green"
              subtitle="via connection groups"
              colorMode={kpiColorMode}
            />
            <ListingStatCard
              title="Quotes Received"
              value={stats.quotesReceived}
              icon={FileText}
              variant="purple"
              subtitle="quote requests"
              colorMode={kpiColorMode}
            />
            <ListingStatCard
              title="Engagements"
              value={stats.pageClicks}
              icon={MousePointerClick}
              variant="orange"
              subtitle="total interactions"
              colorMode={kpiColorMode}
            />
          </div>
        </section>
      ) : null}

      {/* Quick Actions */}
      <ListingQuickActions />

      {/* Activity Feed */}
      <ListingActivityFeed
        activities={activities}
        isLoading={isLoadingActivities}
        error={activityError}
        maxItems={8}
      />
    </div>
  );
}

/**
 * ListingManagerDashboard - Wrapped with ErrorBoundary (ADVANCED tier requirement)
 */
export function ListingManagerDashboard() {
  return (
    <ErrorBoundary componentName="ListingManagerDashboard">
      <ListingManagerDashboardContent />
    </ErrorBoundary>
  );
}

export default ListingManagerDashboard;
