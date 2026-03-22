/**
 * BadgeGallery - Comprehensive badge display with filtering
 *
 * @tier STANDARD
 * @phase Unified Leaderboard - Phase 6
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 *
 * Features:
 * - All badges display (earned and unearned)
 * - Category filtering
 * - Progress indicators for unearned
 * - Earned date display
 * - Next badge highlight
 */

'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { Trophy, Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { BadgeDisplay } from './BadgeDisplay';
import type { BadgeWithStatus, BadgeCategory } from '../types/reward';

interface BadgeGalleryProps {
  userId?: number;
  showFilters?: boolean;
  showUnearned?: boolean;
  className?: string;
}

const categoryLabels: Record<BadgeCategory, string> = {
  referral: 'Referrals',
  conversion: 'Conversions',
  points: 'Points',
  special: 'Special',
  recommendation: 'Recommendations',
  quality: 'Quality',
  category_expert: 'Category Expert',
  streak: 'Streaks',
  content: 'Content',
  review: 'Reviews'
};

function BadgeGalleryContent({
  userId,
  showFilters = true,
  showUnearned = true,
  className = ''
}: BadgeGalleryProps) {
  const [badges, setBadges] = useState<BadgeWithStatus[]>([]);
  const [category, setCategory] = useState<BadgeCategory | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBadges = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // POST first to sync/award any missing badges, then get updated list
      const syncResponse = await fetch('/api/contacts/rewards/badges', {
        method: 'POST',
        credentials: 'include'
      });

      if (syncResponse.ok) {
        const syncData = await syncResponse.json();
        setBadges(syncData.data?.badges || []);
      } else {
        // Fallback to GET if POST fails
        const response = await fetch('/api/contacts/rewards/badges', {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch badges');
        }

        const data = await response.json();
        setBadges(data.data?.badges || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load badges');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  const filteredBadges = badges.filter(badge => {
    if (category !== 'all' && badge.category !== category) return false;
    if (!showUnearned && !badge.earned) return false;
    return true;
  });

  const earnedCount = badges.filter(b => b.earned).length;

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-red-600 text-sm">{error}</p>
        <button
          onClick={fetchBadges}
          className="mt-2 text-sm text-[#ed6437] hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#ed6437]" />
            Badge Collection
            <span className="text-sm font-normal text-gray-500">
              ({earnedCount}/{badges.length} earned)
            </span>
          </h3>
        </div>

        {/* Category Filter */}
        {showFilters && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            <button
              onClick={() => setCategory('all')}
              className={`
                px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-colors
                ${category === 'all'
                  ? 'bg-[#022641] text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                }
              `}
            >
              All
            </button>
            {(Object.keys(categoryLabels) as BadgeCategory[]).map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`
                  px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-colors
                  ${category === cat
                    ? 'bg-[#022641] text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }
                `}
              >
                {categoryLabels[cat]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Badge Grid */}
      <div className="p-6">
        {filteredBadges.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Trophy className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No badges in this category yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {filteredBadges.map(badge => (
              <BadgeDisplay
                key={badge.id}
                badge={badge}
                size="medium"
                showProgress={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function BadgeGallery(props: BadgeGalleryProps) {
  return (
    <ErrorBoundary componentName="BadgeGallery">
      <BadgeGalleryContent {...props} />
    </ErrorBoundary>
  );
}

export default BadgeGallery;
