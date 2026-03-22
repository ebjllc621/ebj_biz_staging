/**
 * MilestoneCelebrationToast - Celebration banner for listing milestones
 *
 * Self-fetching component that checks for unnotified milestones and displays
 * a celebration banner. Auto-hides after 10 seconds.
 *
 * @tier SIMPLE
 * @phase Phase 3B
 * @authority docs/pages/layouts/listings/features/phases/PHASE_3B_BRAIN_PLAN.md
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Trophy } from 'lucide-react';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { Milestone } from '@core/services/MilestoneNotificationService';

// ============================================================================
// Props
// ============================================================================

interface MilestoneCelebrationToastProps {
  listingId: number;
}

// ============================================================================
// MilestoneCelebrationToast Component
// ============================================================================

export function MilestoneCelebrationToast({ listingId }: MilestoneCelebrationToastProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  useEffect(() => {
    const fetchMilestones = async () => {
      try {
        const res = await fetch(`/api/notifications/milestones/${listingId}`, {
          credentials: 'include'
        });
        if (!res.ok) return;
        const data = await res.json();
        const unnotified: Milestone[] = data.data?.milestones ?? [];
        if (unnotified.length > 0) {
          setMilestones(unnotified);
          setIsVisible(true);
        }
      } catch {
        // Silent failure — non-critical UI
      }
    };

    void fetchMilestones();
  }, [listingId]);

  // Auto-hide after 10 seconds
  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => {
      handleDismiss();
    }, 10000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, currentIndex]);

  const handleDismiss = useCallback(async () => {
    const current = milestones[currentIndex];
    if (!current) return;

    setIsDismissing(true);

    try {
      await fetchWithCsrf(`/api/notifications/milestones/${listingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneId: current.id })
      });
    } catch {
      // Non-blocking
    }

    // Show next milestone or hide entirely
    if (currentIndex < milestones.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsDismissing(false);
    } else {
      setIsVisible(false);
    }
  }, [milestones, currentIndex, listingId]);

  if (!isVisible || milestones.length === 0) return null;

  const current = milestones[currentIndex];
  if (!current) return null;

  const message = getMilestoneMessage(current.milestone_type, current.threshold);

  return (
    <div
      className={`relative bg-gradient-to-r from-[#002641] to-[#ed6437] text-white rounded-xl p-4
                  transition-opacity duration-300 ${isDismissing ? 'opacity-0' : 'opacity-100'}`}
      role="alert"
    >
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 text-3xl" aria-hidden="true">
          🎉
        </div>
        <div className="flex-1 flex items-center gap-3">
          <Trophy className="w-5 h-5 text-yellow-300 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">Milestone Achieved!</p>
            <p className="text-sm text-white/90">{message}</p>
          </div>
        </div>
        {milestones.length > 1 && (
          <span className="text-xs text-white/70">
            {currentIndex + 1} of {milestones.length}
          </span>
        )}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 hover:bg-white/20 rounded-lg transition-colors"
          aria-label="Dismiss milestone celebration"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function getMilestoneMessage(milestoneType: string, threshold: number): string {
  const messages: Record<string, Record<number, string>> = {
    views: {
      10: 'Your listing reached 10 views!',
      25: 'Your listing reached 25 views!',
      50: 'Your listing reached 50 views!',
      100: 'Your listing reached 100 views!',
      250: 'Your listing reached 250 views!',
      500: 'Your listing reached 500 views!',
      1000: 'Your listing reached 1,000 views!'
    },
    reviews: {
      1: 'You received your first review!',
      5: 'You received your 5th review!',
      10: '10 reviews — your reputation is growing!',
      25: 'Amazing — 25 reviews and counting!',
      50: '50 reviews! Your business is thriving!'
    },
    shares: {
      5: 'Your listing has been shared 5 times!',
      10: '10 shares — your listing is spreading!',
      25: '25 shares! Great reach!',
      50: '50 shares! Your listing is going viral!',
      100: '100 shares! Incredible reach!'
    },
    leads: {
      5: 'Your listing generated 5 leads!',
      10: '10 leads — your listing is converting!',
      25: '25 leads! Great engagement!',
      50: '50 leads! Your business is booming!',
      100: '100 leads! Outstanding performance!'
    },
    followers: {
      5: 'You have 5 followers!',
      10: '10 followers and growing!',
      25: '25 followers — your community is building!',
      50: '50 followers! Strong community!',
      100: '100 followers! You have a real audience!'
    }
  };

  return messages[milestoneType]?.[threshold]
    ?? `Your listing reached ${threshold} ${milestoneType}!`;
}

export default MilestoneCelebrationToast;
