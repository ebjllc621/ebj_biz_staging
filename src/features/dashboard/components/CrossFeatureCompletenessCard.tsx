/**
 * CrossFeatureCompletenessCard - Cross-Feature Completeness Suggestions
 *
 * @description Shows listing completeness enhanced with cross-feature bonuses
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 5A - Cross-Feature Integration
 * @authority docs/pages/layouts/listings/features/phases/PHASE_5A_BRAIN_PLAN.md
 * @reference src/features/dashboard/components/ListingCompletionProgress.tsx
 *
 * Rendered in ListingManagerDashboard hero section to show cross-feature suggestions.
 * Replaces ListingCompletionProgress in the hero section.
 */
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { Calendar, Briefcase, Tag, Star, ChevronRight, Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

// ============================================================================
// Types
// ============================================================================

interface CrossFeatureSuggestion {
  type: string;
  message: string;
  href: string;
  boostPercent: number;
}

interface CrossFeatureCompletenessData {
  subEntityCounts: { jobCount: number; eventCount: number; offerCount: number };
  bonusPoints: number;
  maxBonusPoints: number;
  suggestions: CrossFeatureSuggestion[];
}

export interface CrossFeatureCompletenessCardProps {
  /** Listing ID for fetching cross-feature data */
  listingId: number;
  /** Base completeness percentage (0-100) from calculateListingCompleteness */
  baseCompleteness: number;
}

// ============================================================================
// Constants
// ============================================================================

const TYPE_ICONS: Record<string, typeof Calendar> = {
  event: Calendar,
  job: Briefcase,
  offer: Tag,
  review: Star,
};

// ============================================================================
// Content Component
// ============================================================================

function CrossFeatureCompletenessCardContent({
  listingId,
  baseCompleteness
}: CrossFeatureCompletenessCardProps) {
  const [data, setData] = useState<CrossFeatureCompletenessData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCompleteness = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/listings/${listingId}/cross-feature-completeness`, {
        credentials: 'include',
      });
      if (res.ok) {
        const result = await res.json();
        setData(result.data ?? null);
      }
    } catch {
      // Silently fail — card degrades to showing base completeness only
    } finally {
      setIsLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    void fetchCompleteness();
  }, [fetchCompleteness]);

  const totalCompleteness = data
    ? Math.min(100, baseCompleteness + data.bonusPoints)
    : baseCompleteness;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-white/70">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading completeness...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-white/90">Profile Completeness</span>
          <span className="text-sm font-bold text-white">{totalCompleteness}%</span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-2.5">
          <div
            className="bg-[#ed6437] h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${totalCompleteness}%` }}
          />
        </div>
        {data && data.bonusPoints > 0 && (
          <p className="text-xs text-white/60 mt-1">
            +{data.bonusPoints}% from cross-feature activity
          </p>
        )}
      </div>

      {/* Suggestions */}
      {data && data.suggestions.length > 0 && (
        <div className="space-y-2">
          {data.suggestions.slice(0, 3).map((suggestion) => {
            const Icon = TYPE_ICONS[suggestion.type] ?? Star;
            const href = suggestion.href.replace('[listingId]', String(listingId));
            return (
              <Link
                key={suggestion.type}
                href={href as Route}
                className="flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2 transition-colors group"
              >
                <Icon className="w-4 h-4 text-white/70 flex-shrink-0" />
                <span className="text-sm text-white/90 flex-1">{suggestion.message}</span>
                <ChevronRight className="w-4 h-4 text-white/50 group-hover:text-white/80 transition-colors" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Exported Component (ErrorBoundary wrapped — SIMPLE tier)
// ============================================================================

export function CrossFeatureCompletenessCard(props: CrossFeatureCompletenessCardProps) {
  return (
    <ErrorBoundary componentName="CrossFeatureCompletenessCard">
      <CrossFeatureCompletenessCardContent {...props} />
    </ErrorBoundary>
  );
}

export default CrossFeatureCompletenessCard;
