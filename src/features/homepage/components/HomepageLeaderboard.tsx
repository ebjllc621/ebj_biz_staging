/**
 * HomepageLeaderboard - Compact leaderboard for homepage display
 *
 * @tier STANDARD
 * @phase Homepage Leaderboard Integration
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 *
 * Features:
 * - Works for both public and authenticated users
 * - Compact horizontal display for homepage
 * - Shows top 5 sharers
 * - Link to full leaderboard for authenticated users
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Trophy, Crown, Medal, Loader2, ChevronRight, HelpCircle } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { getAvatarInitials } from '@core/utils/avatar';
import { GamificationInfoModal } from './GamificationInfoModal';

interface LeaderboardEntry {
  rank: number;
  user_name: string;
  avatar_url: string | null;
  total_points: number;
  total_referrals: number;
  total_recommendations: number;
  badges_earned: number;
  is_current_user?: boolean;
}

interface HomepageLeaderboardProps {
  /** Whether user is authenticated (affects API endpoint and "View All" link) */
  isAuthenticated?: boolean;
  /** Current user ID for highlighting (authenticated only) */
  currentUserId?: number;
  /** Additional CSS classes */
  className?: string;
}

const rankStyles: Record<number, { icon: React.ElementType; bgColor: string; textColor: string }> = {
  1: { icon: Crown, bgColor: 'bg-yellow-100', textColor: 'text-yellow-600' },
  2: { icon: Medal, bgColor: 'bg-gray-100', textColor: 'text-gray-500' },
  3: { icon: Medal, bgColor: 'bg-amber-100', textColor: 'text-amber-600' }
};

function HomepageLeaderboardContent({
  isAuthenticated = false,
  className = ''
}: HomepageLeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use authenticated API if logged in, public API otherwise
      const endpoint = isAuthenticated
        ? '/api/contacts/rewards/leaderboard?period=all_time&limit=5'
        : '/api/public/leaderboard?period=all_time&limit=5';

      const response = await fetch(endpoint, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      setEntries(data.data?.leaderboard || []);

      if (isAuthenticated && data.data?.user_rank) {
        setUserRank(data.data.user_rank);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || entries.length === 0) {
    // Don't show error/empty state on homepage - just hide the component
    return null;
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#ed6437]" />
          <h3 className="font-semibold text-gray-900">Top Sharers</h3>
        </div>
        {isAuthenticated && (
          <Link
            href="/dashboard/recommendations/leaderboard"
            className="text-sm text-[#ed6437] hover:text-[#d55830] flex items-center gap-1 transition-colors"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Leaderboard Grid */}
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {entries.map((entry) => {
            const rankStyle = rankStyles[entry.rank];
            const isCurrentUser = entry.is_current_user;

            return (
              <div
                key={`${entry.rank}-${entry.user_name}`}
                className={`
                  relative flex flex-col items-center p-4 rounded-lg transition-all
                  ${isCurrentUser
                    ? 'bg-blue-50 border-2 border-blue-200'
                    : rankStyle
                      ? `${rankStyle.bgColor} border border-gray-100`
                      : 'bg-gray-50 border border-gray-100'
                  }
                  hover:shadow-md hover:-translate-y-0.5
                `}
              >
                {/* Rank Badge */}
                <div className={`
                  absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${rankStyle
                    ? `${rankStyle.bgColor} ${rankStyle.textColor} border-2 border-white shadow-sm`
                    : 'bg-gray-200 text-gray-600 border-2 border-white shadow-sm'
                  }
                `}>
                  {rankStyle?.icon ? (
                    <rankStyle.icon className="w-3.5 h-3.5" />
                  ) : (
                    entry.rank
                  )}
                </div>

                {/* Avatar */}
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium mb-2
                  ${isCurrentUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#022641] text-white'
                  }
                `}>
                  {entry.avatar_url ? (
                    <img
                      src={entry.avatar_url}
                      alt={entry.user_name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    getAvatarInitials(entry.user_name)
                  )}
                </div>

                {/* Name */}
                <p className={`
                  text-sm font-medium truncate max-w-full text-center
                  ${isCurrentUser ? 'text-blue-700' : 'text-gray-900'}
                `}>
                  {entry.user_name.split(' ')[0]}
                  {isCurrentUser && <span className="text-xs text-blue-500 block">(You)</span>}
                </p>

                {/* Points */}
                <p className="text-[#ed6437] font-bold text-sm mt-1">
                  {entry.total_points.toLocaleString()}
                  <span className="text-xs text-gray-500 font-normal ml-1">pts</span>
                </p>

                {/* Activity Count */}
                <p className="text-xs text-gray-500 mt-0.5">
                  {entry.total_referrals + entry.total_recommendations} shares
                </p>
              </div>
            );
          })}
        </div>

        {/* Current User Rank (if not in top 5) */}
        {isAuthenticated && userRank > 5 && (
          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-600">
              Your rank: <strong className="text-[#022641]">#{userRank}</strong>
              <Link
                href="/dashboard/recommendations/leaderboard"
                className="ml-2 text-[#ed6437] hover:underline"
              >
                See how to climb
              </Link>
            </p>
          </div>
        )}

        {/* CTA for non-authenticated users */}
        {!isAuthenticated && (
          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-600">
              Join Bizconekt and share the things you love with the people who are important to you!
            </p>
            <button
              onClick={() => setShowInfoModal(true)}
              className="mt-2 inline-flex items-center gap-1 text-sm text-[#ed6437] hover:text-[#d55830] transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              Learn how it works
            </button>
          </div>
        )}

        {/* Info link for authenticated users */}
        {isAuthenticated && (
          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <button
              onClick={() => setShowInfoModal(true)}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#ed6437] transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              How does sharing & earning work?
            </button>
          </div>
        )}
      </div>

      {/* Gamification Info Modal */}
      <GamificationInfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
      />
    </div>
  );
}

export function HomepageLeaderboard(props: HomepageLeaderboardProps) {
  return (
    <ErrorBoundary componentName="HomepageLeaderboard">
      <HomepageLeaderboardContent {...props} />
    </ErrorBoundary>
  );
}

export default HomepageLeaderboard;
