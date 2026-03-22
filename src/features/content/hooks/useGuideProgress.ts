/**
 * useGuideProgress — Client hook for guide progress tracking
 *
 * Fetches and manages user's progress on a guide.
 * Only active when user is authenticated. Returns no-op functions
 * and empty state when unauthenticated.
 *
 * @tier STANDARD
 * @phase Phase G4 - Progress Tracking
 * @reference src/features/content/components/shared/useContentBookmark.ts
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@core/hooks/useAuth';
import type { GuideProgress } from '@core/types/guide';

interface UseGuideProgressReturn {
  /** User's progress data (null if not started or not authenticated) */
  progress: GuideProgress | null;
  /** Whether progress is being loaded */
  isLoading: boolean;
  /** Whether user is authenticated (progress features available) */
  isAuthenticated: boolean;
  /** Set of completed section IDs for quick lookup */
  completedSectionIds: Set<number>;
  /** Percentage complete (0-100) */
  percentComplete: number;
  /** Toggle section completion (mark/unmark) */
  toggleSectionComplete: (sectionId: number) => void;
  /** Update last accessed section (fire-and-forget for resume) */
  updateLastAccessed: (sectionId: number) => void;
  /** The section_id to resume from (null if not started) */
  resumeSectionId: number | null;
}

export function useGuideProgress(
  guideSlug: string | null,
  totalSections: number
): UseGuideProgressReturn {
  const { user } = useAuth();
  const [progress, setProgress] = useState<GuideProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const lastAccessedRef = useRef<number | null>(null);

  const isAuthenticated = !!user;

  // Fetch progress on mount (only when authenticated)
  useEffect(() => {
    if (!isAuthenticated || !guideSlug) return;

    let cancelled = false;

    const fetchProgress = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/content/guides/${guideSlug}/progress`, {
          credentials: 'include'
        });

        if (!response.ok) return; // Silent fail

        const data = await response.json();
        if (!cancelled && data.data?.progress) {
          setProgress(data.data.progress);
        }
      } catch {
        // Silent fail — progress should never break the page
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchProgress();
    return () => { cancelled = true; };
  }, [isAuthenticated, guideSlug]);

  // Computed: completed section IDs as Set
  const completedSectionIds = new Set(progress?.completed_sections || []);

  // Computed: percent complete
  const percentComplete = totalSections > 0
    ? Math.round((completedSectionIds.size / totalSections) * 100)
    : 0;

  // Toggle section completion (optimistic update)
  const toggleSectionComplete = useCallback((sectionId: number) => {
    if (!isAuthenticated || !guideSlug) return;

    const isCurrentlyCompleted = completedSectionIds.has(sectionId);
    const action = isCurrentlyCompleted ? 'unmark_section' : 'mark_section';

    // Optimistic update
    setProgress(prev => {
      if (!prev) {
        // First interaction — create progress
        return {
          id: 0,
          guide_id: 0,
          user_id: parseInt(user!.id, 10),
          section_id: sectionId,
          completed_sections: [sectionId],
          is_completed: totalSections === 1,
          started_at: new Date(),
          completed_at: totalSections === 1 ? new Date() : null,
          last_accessed_at: new Date()
        };
      }

      const newCompleted = isCurrentlyCompleted
        ? prev.completed_sections.filter(id => id !== sectionId)
        : [...prev.completed_sections, sectionId];

      return {
        ...prev,
        completed_sections: newCompleted,
        is_completed: newCompleted.length >= totalSections && totalSections > 0,
        section_id: sectionId,
        last_accessed_at: new Date()
      };
    });

    // Persist to server (silent fail)
    fetch(`/api/content/guides/${guideSlug}/progress`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, section_id: sectionId })
    }).then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        if (data.data?.progress) {
          setProgress(data.data.progress);
        }
      }
    }).catch(() => { /* silent fail */ });
  }, [isAuthenticated, guideSlug, completedSectionIds, user, totalSections]);

  // Update last accessed section (debounced fire-and-forget)
  const updateLastAccessed = useCallback((sectionId: number) => {
    if (!isAuthenticated || !guideSlug) return;

    // Skip if same section
    if (lastAccessedRef.current === sectionId) return;
    lastAccessedRef.current = sectionId;

    fetch(`/api/content/guides/${guideSlug}/progress`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_last_accessed', section_id: sectionId })
    }).catch(() => { /* silent fail */ });
  }, [isAuthenticated, guideSlug]);

  // Resume section ID
  const resumeSectionId = progress?.section_id ?? null;

  return {
    progress,
    isLoading,
    isAuthenticated,
    completedSectionIds,
    percentComplete,
    toggleSectionComplete,
    updateLastAccessed,
    resumeSectionId
  };
}
