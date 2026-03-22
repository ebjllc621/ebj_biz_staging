/**
 * AuthenticatedHomeView - Personalized Homepage for Authenticated Users
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 * @authority docs/pages/layouts/home/user/phases/PHASE_3_BRAIN_PLAN.md
 *
 * Phase 3 Enhancement:
 * - New PersonalizedSearchHero with Dashboard/Profile action buttons
 * - Notification badge integration via /api/dashboard/notifications/summary
 * - Simplified single-column layout mirroring PublicHomeView
 * - Featured/Latest content section organization
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { LayoutGrid, Star, Sparkles, Gift, Calendar } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

import { ContentSlider } from './ContentSlider';
import { CategoryIcon } from './CategoryIcon';
import { ListingCard } from './ListingCard';
import { OfferCard } from './OfferCard';
import { EventCard } from './EventCard';
import { PersonalizedSearchHero } from './PersonalizedSearchHero';
import { TopRecommendersScroller } from './TopRecommendersScroller';
import { HomepageRecommendationsSlider } from '@features/connections/components/HomepageRecommendationsSlider';
import { AuthenticatedHomeData } from '../types';
import { ErrorService } from '@core/services/ErrorService';

const FlashOffersSection = dynamic(
  () => import('@/features/offers/components/FlashOffersSection').then(m => ({ default: m.FlashOffersSection })),
  { ssr: false, loading: () => null }
);

const WhosHiringSection = dynamic(
  () => import('@features/jobs/components/WhosHiringSection').then(m => ({ default: m.WhosHiringSection })),
  { ssr: false, loading: () => null }
);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AuthenticatedHomeViewProps {
  /** User information */
  user: {
    id: string;
    name: string | null;
    email: string;
    username?: string;
  };
  /** Initial data from server (for hydration) */
  initialData?: AuthenticatedHomeData | null;
}

interface NotificationSummary {
  total_unread: number;
  by_type: {
    connection_request: number;
    message: number;
    review: number;
    mention: number;
    system: number;
  };
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

/**
 * Loading skeleton for content sections
 */
function SectionSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-72 h-48 bg-gray-200 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// AUTHENTICATEDHOMEVIEW COMPONENT
// ============================================================================

/**
 * AuthenticatedHomeView component
 * Displays personalized homepage content for logged-in users
 */
export function AuthenticatedHomeView({ user, initialData }: AuthenticatedHomeViewProps) {
  // Homepage data state
  const [data, setData] = useState<AuthenticatedHomeData | null>(initialData ?? null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  // Notification state for hero badges
  const [dashboardNotifications, setDashboardNotifications] = useState(0);
  const [profileNotifications, setProfileNotifications] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  /**
   * Fetch homepage data
   */
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/homepage/authenticated', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load homepage data');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch notification summary for hero badges
   */
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoadingNotifications(true);

      const response = await fetch('/api/dashboard/notifications/summary', {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        const summary: NotificationSummary = result.data;

        // Dashboard notifications = total unread
        setDashboardNotifications(summary.total_unread);

        // Profile notifications = connection requests + mentions (profile-relevant)
        setProfileNotifications(
          (summary.by_type?.connection_request ?? 0) +
          (summary.by_type?.mention ?? 0)
        );
      }
    } catch (err) {
      // Silently fail - badges will show 0
      ErrorService.capture('Failed to load notification summary:', err);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, []);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    if (!initialData) {
      fetchData();
    }
    // Always fetch notifications for badges
    fetchNotifications();
  }, [initialData, fetchData, fetchNotifications]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <ErrorBoundary componentName="AuthenticatedHomeView">
      <div className="min-h-screen bg-gray-50">
        {/* Personalized Hero Section with Dashboard/Profile Buttons */}
        <PersonalizedSearchHero
          user={user}
          dashboardNotifications={dashboardNotifications}
          profileNotifications={profileNotifications}
          isLoadingNotifications={isLoadingNotifications}
        />

        {/* Flash Offers Section */}
        <FlashOffersSection maxOffers={6} />

        {/* Main Content - Single Column Layout (mirrors PublicHomeView) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-center">
              {error}
              <button onClick={fetchData} className="ml-2 underline">
                Try again
              </button>
            </div>
          )}

          {/* Categories Section */}
          {isLoading ? (
            <SectionSkeleton />
          ) : data?.categories && data.categories.length > 0 ? (
            <ContentSlider title="Browse by Category" icon={LayoutGrid} moreLink="/categories" moreLinkText="See All">
              {data.categories.map((category, index) => (
                <CategoryIcon key={category.id} category={category} index={index} />
              ))}
            </ContentSlider>
          ) : null}

          {/* People You May Know Section - directly below categories */}
          <HomepageRecommendationsSlider />

          {/* Featured Listings Section */}
          {isLoading ? (
            <SectionSkeleton />
          ) : data?.featured_listings && data.featured_listings.length > 0 ? (
            <ContentSlider title="Featured Listings" icon={Star} moreLink="/listings?featured=true">
              {data.featured_listings.map((listing, index) => (
                <ListingCard key={listing.id} listing={listing} index={index} />
              ))}
            </ContentSlider>
          ) : null}

          {/* Personalized/Latest Listings Section */}
          {isLoading ? (
            <SectionSkeleton />
          ) : data?.personalized_listings && data.personalized_listings.length > 0 ? (
            <ContentSlider title="Recommended for You" icon={Sparkles} moreLink="/listings">
              {data.personalized_listings.map((listing, index) => (
                <ListingCard key={listing.id} listing={listing} index={index} />
              ))}
            </ContentSlider>
          ) : null}

          {/* Featured Offers Section */}
          {isLoading ? (
            <SectionSkeleton />
          ) : data?.active_offers && data.active_offers.length > 0 ? (
            <ContentSlider title="Special Offers" icon={Gift} moreLink="/offers">
              {data.active_offers.map((offer) => (
                <OfferCard key={offer.id} offer={offer} />
              ))}
            </ContentSlider>
          ) : null}

          {/* Personalized Offers Section */}
          {isLoading ? (
            <SectionSkeleton />
          ) : data?.personalized_offers && data.personalized_offers.length > 0 ? (
            <ContentSlider title="Offers for You" icon={Gift} moreLink="/offers">
              {data.personalized_offers.map((offer) => (
                <OfferCard key={offer.id} offer={offer} />
              ))}
            </ContentSlider>
          ) : null}

          {/* Top Recommenders Section - Community's Most Helpful Sharers */}
          <TopRecommendersScroller limit={10} />

          {/* Upcoming Events Section */}
          {isLoading ? (
            <SectionSkeleton />
          ) : data?.upcoming_events && data.upcoming_events.length > 0 ? (
            <ContentSlider title="Upcoming Events" icon={Calendar} moreLink="/events">
              {data.upcoming_events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </ContentSlider>
          ) : null}
        </div>

        {/* Who's Hiring Section */}
        <WhosHiringSection maxJobs={4} />
      </div>
    </ErrorBoundary>
  );
}

export default AuthenticatedHomeView;
