/**
 * DashboardOverview - Main Dashboard Overview Component
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 * @reference src/features/homepage/components/AuthenticatedHomeView.tsx
 */
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Users, Eye, MessageSquare, Bookmark, Star, UserCheck, BadgeCheck, UserPlus, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useAuth } from '@/core/context/AuthContext';
import { useDashboardMode } from '../context';
import { DashboardStatCard } from './DashboardStatCard';
import { DashboardQuickActions } from './DashboardQuickActions';
import { DashboardActivityFeed } from './DashboardActivityFeed';
import { DashboardGamificationSection } from './DashboardGamificationSection';
import { DashboardStats, DashboardActivityItem } from '../types';
import { PublicProfile } from '@features/profile/types';
import { ErrorService } from '@core/services/ErrorService';
import type { KpiColorMode } from './ListingStatCard';

// Dynamic imports for heavy modal components
const UserProfileEditModal = dynamic(
  () => import('@features/profile/components/UserProfileEditModal').then(mod => mod.UserProfileEditModal),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
        </div>
      </div>
    )
  }
);

const NewListingModal = dynamic(
  () => import('@features/listings/components/NewListingModal').then(mod => mod.NewListingModal),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
        </div>
      </div>
    )
  }
);

const CommunityGigForm = dynamic(
  () => import('@features/jobs/components/CommunityGigForm').then(mod => mod.CommunityGigForm),
  { ssr: false }
);

/**
 * Loading skeleton for stats grid
 */
function StatsLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-36 bg-gray-100 rounded-xl" />
      ))}
    </div>
  );
}

/**
 * DashboardOverview component content
 */
function DashboardOverviewContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { expandSection } = useDashboardMode();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<DashboardActivityItem[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile edit modal state (for Privacy Settings quick action)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<PublicProfile | null>(null);

  // Phase 8: Listing creation modal state
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);

  // Community gig form modal state
  const [isGigFormOpen, setIsGigFormOpen] = useState(false);

  // KPI card color mode (persisted to localStorage)
  const [kpiColorMode, setKpiColorMode] = useState<KpiColorMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('bk_dash_kpi_color_mode') as KpiColorMode) || 'default';
    }
    return 'default';
  });
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);

  const handleKpiColorModeChange = useCallback((mode: KpiColorMode) => {
    setKpiColorMode(mode);
    localStorage.setItem('bk_dash_kpi_color_mode', mode);
  }, []);

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      setError(null);

      const response = await fetch('/api/dashboard/stats', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load dashboard statistics');
      }

      const result = await response.json();
      setStats(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Fetch recent activity
  const fetchActivities = useCallback(async () => {
    try {
      setIsLoadingActivities(true);

      const response = await fetch('/api/dashboard/activity?limit=6', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load activity feed');
      }

      const result = await response.json();
      setActivities(result.data.items);
    } catch (err) {
      ErrorService.capture(err, { component: 'DashboardOverview', action: 'fetchActivities' });
    } finally {
      setIsLoadingActivities(false);
    }
  }, []);

  // Fetch current user's profile for the edit modal
  const fetchUserProfile = useCallback(async () => {
    if (!user?.username) return;
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(user.username)}/profile`, {
        credentials: 'include'
      });
      if (response.ok) {
        const result = await response.json();
        setUserProfile(result.data?.profile ?? null);
      }
    } catch (err) {
      ErrorService.capture(err, { component: 'DashboardOverview', action: 'fetchUserProfile' });
    }
  }, [user?.username]);

  // Handle Privacy Settings click - opens edit modal to Settings tab
  const handlePrivacySettingsClick = useCallback(() => {
    if (!userProfile) {
      // Fetch profile first if not loaded
      fetchUserProfile().then(() => {
        setIsEditModalOpen(true);
      });
    } else {
      setIsEditModalOpen(true);
    }
  }, [userProfile, fetchUserProfile]);

  // Handle profile update from modal
  const handleProfileUpdate = useCallback(() => {
    fetchUserProfile();
    setIsEditModalOpen(false);
  }, [fetchUserProfile]);

  // Handle Manage Listings click - expand listing manager sidebar and navigate
  const handleManageListingsClick = useCallback(() => {
    expandSection('listing-manager');
    void router.push('/dashboard/listings');
  }, [expandSection, router]);

  useEffect(() => {
    fetchStats();
    fetchActivities();
    fetchUserProfile(); // Pre-fetch profile for Privacy Settings modal
  }, [fetchStats, fetchActivities, fetchUserProfile]);

  // Determine greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = user?.name ?? 'User';
  const firstName = displayName.split(' ')[0] ?? displayName;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 text-white rounded-2xl p-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {getGreeting()}, {firstName}!
          </h1>
          <p className="text-blue-100 text-lg">
            Welcome to your dashboard. Here's what's happening in your professional network.
          </p>
        </div>
      </div>

      {/* Gamification Progress Cards - Below Hero */}
      <DashboardGamificationSection />

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => {
              fetchStats();
              fetchActivities();
            }}
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
        <section aria-labelledby="dashboard-stats-heading">
          <div className="flex items-center justify-between mb-4">
            <h2 id="dashboard-stats-heading" className="text-xl font-semibold text-gray-900">Dashboard Statistics</h2>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardStatCard
            title="Connections"
            value={stats.connections}
            icon={Users}
            variant="purple"
            subtitle="total connections"
            href="/dashboard/connections"
            colorMode={kpiColorMode}
          />
          <DashboardStatCard
            title="Profile Views"
            value={stats.profile_views}
            icon={Eye}
            variant="blue"
            subtitle="last 30 days"
            colorMode={kpiColorMode}
          />
          <DashboardStatCard
            title="Messages"
            value={stats.unread_messages}
            icon={MessageSquare}
            variant="green"
            subtitle="unread messages"
            href="/dashboard/messages"
            colorMode={kpiColorMode}
          />
          <DashboardStatCard
            title="Pending Requests"
            value={stats.pending_requests}
            icon={UserCheck}
            variant="orange"
            subtitle="connection requests"
            href="/dashboard/connections?tab=incoming"
            colorMode={kpiColorMode}
          />
          <DashboardStatCard
            title="Bookmarks"
            value={stats.bookmarks_count}
            icon={Bookmark}
            variant="blue"
            subtitle="saved items"
            href="/dashboard/bookmarks"
            colorMode={kpiColorMode}
          />
          <DashboardStatCard
            title="My Reviews"
            value={stats.reviews_count}
            icon={Star}
            variant="purple"
            subtitle="reviews written"
            href="/dashboard/reviews"
            colorMode={kpiColorMode}
          />
          <DashboardStatCard
            title="My Recommendations"
            value={stats.recommendations_sent}
            icon={BadgeCheck}
            variant="green"
            subtitle="sent to others"
            href="/dashboard/recommendations"
            colorMode={kpiColorMode}
          />
          <DashboardStatCard
            title="My Referrals"
            value={stats.referrals_sent}
            icon={UserPlus}
            variant="orange"
            subtitle="contacts referred"
            href="/dashboard/connections"
            colorMode={kpiColorMode}
          />
          </div>
        </section>
      ) : null}

      {/* Quick Actions */}
      <DashboardQuickActions
        onPrivacySettingsClick={handlePrivacySettingsClick}
        onCreateListingClick={() => setIsListingModalOpen(true)}
        onManageListingsClick={handleManageListingsClick}
        onPostGigClick={() => setIsGigFormOpen(true)}
      />

      {/* Recent Activity */}
      <DashboardActivityFeed
        activities={activities}
        isLoading={isLoadingActivities}
        maxItems={6}
        showViewAll={true}
      />

      {/* Profile Edit Modal (for Privacy Settings quick action) */}
      {userProfile && (
        <UserProfileEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          profile={userProfile}
          onProfileUpdate={handleProfileUpdate}
          initialTab="settings"
        />
      )}

      {/* Phase 8: New Listing Modal */}
      <NewListingModal
        isOpen={isListingModalOpen}
        onClose={() => setIsListingModalOpen(false)}
        onSuccess={(listingId) => {
          setIsListingModalOpen(false);
          // Refresh stats to show new listing count
          fetchStats();
        }}
        userRole={user?.account_type as 'listing_member' | 'admin' | undefined}
      />

      {/* Community Gig Form Modal */}
      <CommunityGigForm
        isOpen={isGigFormOpen}
        onClose={() => setIsGigFormOpen(false)}
        onSuccess={() => setIsGigFormOpen(false)}
      />
    </div>
  );
}

/**
 * DashboardOverview - Wrapped with ErrorBoundary (STANDARD tier requirement)
 */
export function DashboardOverview() {
  return (
    <ErrorBoundary componentName="DashboardOverview">
      <DashboardOverviewContent />
    </ErrorBoundary>
  );
}

export default DashboardOverview;
