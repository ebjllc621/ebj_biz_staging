/**
 * TopRecommendersScroller - Horizontal Scroller for Top Recommenders
 *
 * Displays users with the best recommendation metrics in a horizontal scroller format.
 * Metrics: Number of recommendations, satisfaction rate (helpful %), and recency.
 *
 * @tier STANDARD
 * @phase Homepage Top Recommenders Integration
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component ('use client' directive)
 * - ErrorBoundary wrapper (STANDARD tier requirement)
 * - Path aliases (@features/, @components/, @core/)
 * - Lucide React icons only
 * - Uses ContentSlider wrapper
 * - Returns null if no data (no empty panel)
 *
 * @reference src/features/homepage/components/ContentSlider.tsx - Scroller wrapper
 * @reference src/features/homepage/components/HomepageLeaderboard.tsx - API fetching pattern
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { Users, ThumbsUp, BadgeCheck, HelpCircle } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ContentSlider } from './ContentSlider';
import { getAvatarInitials } from '@core/utils/avatar';
import { GamificationInfoModal } from './GamificationInfoModal';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface TopRecommender {
  user_id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  recommendations_sent: number;
  helpful_rate: number;
  thanks_received: number;
  last_recommendation_at: string | null;
}

interface ApiResponse {
  success: boolean;
  data: {
    recommenders: TopRecommender[];
    total: number;
  };
}

export interface TopRecommendersScrollerProps {
  /** Maximum number of recommenders to display */
  limit?: number;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// RECOMMENDER CARD COMPONENT
// ============================================================================

interface RecommenderCardProps {
  recommender: TopRecommender;
  rank: number;
}

function RecommenderCard({ recommender }: RecommenderCardProps) {
  const displayName = recommender.display_name || recommender.username;
  const initials = getAvatarInitials(displayName);

  // Format recency
  const formatRecency = (dateStr: string | null): string => {
    if (!dateStr) return 'No activity';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Active today';
    if (diffDays === 1) return 'Active yesterday';
    if (diffDays < 7) return `Active ${diffDays}d ago`;
    if (diffDays < 30) return `Active ${Math.floor(diffDays / 7)}w ago`;
    return `Active ${Math.floor(diffDays / 30)}mo ago`;
  };

  return (
    <div className="flex-shrink-0 w-56 snap-start">
      <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-orange-200 transition-all group">
        {/* User Avatar & Name */}
        <Link
          href={`/profile/${recommender.username}` as Route}
          className="flex items-center gap-3 mb-3"
        >
          {recommender.avatar_url ? (
            <img
              src={recommender.avatar_url}
              alt={displayName}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100 group-hover:ring-orange-200 transition-all"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#022641] to-[#ed6437] flex items-center justify-center text-white font-medium text-sm ring-2 ring-gray-100 group-hover:ring-orange-200 transition-all">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-[#ed6437] transition-colors">
              {displayName}
            </p>
            <p className="text-xs text-gray-500 truncate">
              @{recommender.username}
            </p>
          </div>
        </Link>

        {/* Stats */}
        <div className="space-y-2">
          {/* Recommendations Count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-gray-600">
              <BadgeCheck className="w-3.5 h-3.5" />
              <span className="text-xs">Recommendations</span>
            </div>
            <span className="text-sm font-semibold text-[#022641]">
              {recommender.recommendations_sent}
            </span>
          </div>

          {/* Helpful Rate */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-gray-600">
              <ThumbsUp className="w-3.5 h-3.5" />
              <span className="text-xs">Helpful</span>
            </div>
            <span className={`text-sm font-semibold ${
              recommender.helpful_rate >= 80 ? 'text-green-600' :
              recommender.helpful_rate >= 50 ? 'text-yellow-600' :
              'text-gray-600'
            }`}>
              {recommender.helpful_rate > 0 ? `${recommender.helpful_rate}%` : 'N/A'}
            </span>
          </div>

          {/* Thanks Received */}
          {recommender.thanks_received > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-gray-600">
                <span className="text-xs">Thanks</span>
              </div>
              <span className="text-sm font-semibold text-pink-600">
                {recommender.thanks_received}
              </span>
            </div>
          )}
        </div>

        {/* Recency */}
        <div className="mt-3 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            {formatRecency(recommender.last_recommendation_at)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function ScrollerSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-56">
            <div className="bg-gray-100 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT (Uses ContentSlider with custom header)
// ============================================================================

function TopRecommendersScrollerWithHeader({
  limit = 10,
  className = ''
}: TopRecommendersScrollerProps) {
  const [recommenders, setRecommenders] = useState<TopRecommender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Fetch top recommenders
  const fetchRecommenders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/public/top-recommenders?limit=${limit}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch top recommenders');
      }

      const result = await response.json() as ApiResponse;

      if (result.success && result.data) {
        setRecommenders(result.data.recommenders);
      } else {
        setRecommenders([]);
      }
    } catch {
      setError('Failed to load top recommenders');
      setRecommenders([]);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchRecommenders();
  }, [fetchRecommenders]);

  // Loading state
  if (isLoading) {
    return (
      <section className={className}>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-[#ed6437]" />
          <h2 className="text-lg font-semibold text-biz-navy">Top Recommenders</h2>
          <span className="text-sm text-gray-500 ml-2">
            Most helpful sharers in our community
          </span>
        </div>
        <ScrollerSkeleton />
      </section>
    );
  }

  // Don't render if no recommenders or error
  if (error || recommenders.length === 0) {
    return null;
  }

  return (
    <section className={className}>
      {/* Header with icon */}
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-[#ed6437]" />
        <h2 className="text-lg font-semibold text-biz-navy">Top Recommenders</h2>
        <span className="text-sm text-gray-500 ml-2">
          Most helpful sharers in our community
        </span>
        <div className="ml-auto flex items-center" style={{ gap: '20px' }}>
          <button
            onClick={() => setShowInfoModal(true)}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#ed6437] transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            How does earning & sharing work?
          </button>
          <Link
            href={'/dashboard/recommendations/leaderboard' as Route}
            className="text-biz-orange text-sm font-medium hover:underline"
          >
            See Scoreboard
          </Link>
        </div>
      </div>

      {/* Use ContentSlider without title (we provide our own) */}
      <ContentSlider title="">
        {recommenders.map((recommender, index) => (
          <RecommenderCard
            key={recommender.user_id}
            recommender={recommender}
            rank={index + 1}
          />
        ))}
      </ContentSlider>

      {/* Gamification Info Modal */}
      <GamificationInfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
      />
    </section>
  );
}

// ============================================================================
// EXPORTED COMPONENT (WITH ERRORBOUNDARY)
// ============================================================================

/**
 * TopRecommendersScroller - Wrapped with ErrorBoundary (STANDARD tier requirement)
 *
 * Displays users with the best recommendation metrics:
 * - Number of recommendations sent
 * - Helpful rate (satisfaction percentage)
 * - Recent activity
 *
 * @example
 * ```tsx
 * <TopRecommendersScroller limit={10} />
 * ```
 */
export function TopRecommendersScroller(props: TopRecommendersScrollerProps) {
  return (
    <ErrorBoundary componentName="TopRecommendersScroller">
      <TopRecommendersScrollerWithHeader {...props} />
    </ErrorBoundary>
  );
}

export default TopRecommendersScroller;
