/**
 * Dashboard Recommendations Progress Page
 *
 * Displays user's progress toward recommendation badges and milestones
 * with category-specific tracking and overall stats.
 *
 * @authority docs/components/connections/userrecommendations/phases/PHASE_6_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @phase User Recommendations - Phase 6
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { BadgeGallery } from '@features/contacts/components/BadgeGallery';
import { CategoryBadgeProgress } from '@features/contacts/components/CategoryBadgeProgress';
import { TierProgressCard } from '@features/contacts/components/TierProgressCard';
import { StreakCard } from '@features/contacts/components/StreakCard';
import { SenderImpactCard } from '@features/sharing/components/SenderImpactCard';
import { TrendingUp, Loader2 } from 'lucide-react';
import type { TierStatus, StreakStatus } from '@features/contacts/types/reward';

// Phase 1 + Phase 8 content categories + Jobs
type CategoryType =
  | 'listing' | 'event' | 'user' | 'offer' | 'job' | 'referral'  // Phase 1 + Jobs + Referrals
  | 'article' | 'newsletter' | 'podcast' | 'video';  // Phase 8

interface CategoryProgress {
  category: CategoryType;
  count: number;
  target: number;
  badgeName: string;
  earned: boolean;
}

// Category badge thresholds - Phase 1 entities + Jobs
const PHASE1_THRESHOLDS = {
  listing: { target: 10, badgeName: 'Listing Expert' },
  event: { target: 10, badgeName: 'Event Scout' },
  user: { target: 10, badgeName: 'User Advocate' },
  offer: { target: 10, badgeName: 'Offer Finder' },
  job: { target: 10, badgeName: 'Job Scout' },
  referral: { target: 10, badgeName: 'Referral Expert' }
} as const;

// Category badge thresholds - Phase 8 content types
const CONTENT_THRESHOLDS = {
  article: { target: 10, badgeName: 'Article Curator' },
  newsletter: { target: 10, badgeName: 'Newsletter Scout' },
  podcast: { target: 10, badgeName: 'Podcast Promoter' },
  video: { target: 10, badgeName: 'Video Advocate' }
} as const;

function ProgressPageContent() {
  const [tierStatus, setTierStatus] = useState<TierStatus | null>(null);
  const [streakStatus, setStreakStatus] = useState<StreakStatus | null>(null);
  const [categoryProgress, setCategoryProgress] = useState<CategoryProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatusData = useCallback(async () => {
    try {
      // Fetch tier and streak status
      const statusResponse = await fetch('/api/contacts/rewards/streak', {
        credentials: 'include'
      });
      if (statusResponse.ok) {
        const data = await statusResponse.json();
        setTierStatus(data.data?.tier || null);
        setStreakStatus(data.data?.streak || null);
      }

      // Fetch unified stats to get entity breakdown
      const unifiedResponse = await fetch('/api/contacts/rewards/unified', {
        credentials: 'include'
      });
      if (unifiedResponse.ok) {
        const unifiedData = await unifiedResponse.json();
        const stats = unifiedData.data;

        // Build category progress from entity stats
        // Phase 1 categories (listing, event, user, offer)
        const phase1Progress: CategoryProgress[] = [
          {
            category: 'listing',
            count: stats?.listing_recommendations || 0,
            target: PHASE1_THRESHOLDS.listing.target,
            badgeName: PHASE1_THRESHOLDS.listing.badgeName,
            earned: (stats?.listing_recommendations || 0) >= PHASE1_THRESHOLDS.listing.target
          },
          {
            category: 'event',
            count: stats?.event_recommendations || 0,
            target: PHASE1_THRESHOLDS.event.target,
            badgeName: PHASE1_THRESHOLDS.event.badgeName,
            earned: (stats?.event_recommendations || 0) >= PHASE1_THRESHOLDS.event.target
          },
          {
            category: 'user',
            count: stats?.user_recommendations || 0,
            target: PHASE1_THRESHOLDS.user.target,
            badgeName: PHASE1_THRESHOLDS.user.badgeName,
            earned: (stats?.user_recommendations || 0) >= PHASE1_THRESHOLDS.user.target
          },
          {
            category: 'offer',
            count: stats?.offer_recommendations || 0,
            target: PHASE1_THRESHOLDS.offer.target,
            badgeName: PHASE1_THRESHOLDS.offer.badgeName,
            earned: (stats?.offer_recommendations || 0) >= PHASE1_THRESHOLDS.offer.target
          },
          {
            category: 'job',
            count: stats?.job_recommendations || 0,
            target: PHASE1_THRESHOLDS.job.target,
            badgeName: PHASE1_THRESHOLDS.job.badgeName,
            earned: (stats?.job_recommendations || 0) >= PHASE1_THRESHOLDS.job.target
          },
          {
            category: 'referral',
            count: stats?.referral_count || 0,
            target: PHASE1_THRESHOLDS.referral.target,
            badgeName: PHASE1_THRESHOLDS.referral.badgeName,
            earned: (stats?.referral_count || 0) >= PHASE1_THRESHOLDS.referral.target
          }
        ];

        // Phase 8 content categories (article, newsletter, podcast, video)
        const contentProgress: CategoryProgress[] = [
          {
            category: 'article',
            count: stats?.article_recommendations || 0,
            target: CONTENT_THRESHOLDS.article.target,
            badgeName: CONTENT_THRESHOLDS.article.badgeName,
            earned: (stats?.article_recommendations || 0) >= CONTENT_THRESHOLDS.article.target
          },
          {
            category: 'newsletter',
            count: stats?.newsletter_recommendations || 0,
            target: CONTENT_THRESHOLDS.newsletter.target,
            badgeName: CONTENT_THRESHOLDS.newsletter.badgeName,
            earned: (stats?.newsletter_recommendations || 0) >= CONTENT_THRESHOLDS.newsletter.target
          },
          {
            category: 'podcast',
            count: stats?.podcast_recommendations || 0,
            target: CONTENT_THRESHOLDS.podcast.target,
            badgeName: CONTENT_THRESHOLDS.podcast.badgeName,
            earned: (stats?.podcast_recommendations || 0) >= CONTENT_THRESHOLDS.podcast.target
          },
          {
            category: 'video',
            count: stats?.video_recommendations || 0,
            target: CONTENT_THRESHOLDS.video.target,
            badgeName: CONTENT_THRESHOLDS.video.badgeName,
            earned: (stats?.video_recommendations || 0) >= CONTENT_THRESHOLDS.video.target
          }
        ];

        // Combine all categories
        setCategoryProgress([...phase1Progress, ...contentProgress]);
      }
    } catch (err) {
      console.error('Failed to fetch progress data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatusData();
  }, [fetchStatusData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Progress</h1>
          <p className="text-gray-600">
            Track your recommendation milestones and badges
          </p>
        </div>
      </div>

      {/* Row 1: Your Recommendation Impact (full width) */}
      <SenderImpactCard />

      {/* Row 2: Your Tier + Recommendation Streak (side-by-side) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
        {loading ? (
          <>
            <div className="bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          </>
        ) : (
          <>
            {tierStatus && <TierProgressCard tierStatus={tierStatus} />}
            {streakStatus && <StreakCard streakStatus={streakStatus} onFreezeUsed={fetchStatusData} />}
          </>
        )}
      </div>

      {/* Category Progress - Phase 1 Entities */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Category Progress
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Earn category badges by recommending specific types of content
        </p>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : (
          <CategoryBadgeProgress progress={categoryProgress.slice(0, 6)} />
        )}
      </div>

      {/* Content Progress - Phase 8 Content Types */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Content Sharing Progress
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Earn badges by sharing articles, newsletters, podcasts, and videos
        </p>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : (
          <CategoryBadgeProgress progress={categoryProgress.slice(6, 10)} />
        )}
      </div>

      {/* Badge Gallery */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Badge Collection
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          All available badges and your progress toward earning them
        </p>
        <BadgeGallery showUnearned={true} />
      </div>
    </div>
  );
}

export default function ProgressPage() {
  return (
    <ErrorBoundary componentName="DashboardProgressPage">
      <ProgressPageContent />
    </ErrorBoundary>
  );
}
