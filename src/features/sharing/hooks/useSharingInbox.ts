/**
 * useSharingInbox - Hook for recommendations inbox
 *
 * @tier STANDARD
 * @phase User Recommendations - Phase 3
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/userrecommendations/phases/PHASE_3_BRAIN_PLAN.md
 * @reference src/features/notifications/hooks/useNotifications.ts
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import { ErrorService } from '@core/services/ErrorService';
import type { EntityType, SharingWithPreview, InboxCounts } from '@features/contacts/types/sharing';

type InboxTab = 'all' | 'received' | 'sent' | 'saved' | 'helpful' | 'thankyous';

interface UseSharingInboxOptions {
  initialTab?: InboxTab;
  initialPage?: number;
  pageSize?: number;
}

interface UseSharingInboxReturn {
  recommendations: SharingWithPreview[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  activeTab: InboxTab;
  entityTypeFilter: EntityType | 'all';
  counts: InboxCounts | null;
  setPage: (page: number) => void;
  setTab: (tab: InboxTab) => void;
  setEntityTypeFilter: (type: EntityType | 'all') => void;
  refresh: () => Promise<void>;
  markAsViewed: (id: number) => Promise<void>;
  toggleSaved: (id: number) => Promise<void>;
  hideRecommendation: (id: number) => Promise<void>;
  // Phase 4: Feedback methods
  markHelpful: (id: number, isHelpful: boolean) => Promise<void>;
  sendThankYou: (id: number, message: string) => Promise<void>;
}

export function useSharingInbox(
  options: UseSharingInboxOptions = {}
): UseSharingInboxReturn {
  const {
    initialTab = 'received',
    initialPage = 1,
    pageSize = 20
  } = options;

  const [recommendations, setRecommendations] = useState<SharingWithPreview[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setTabState] = useState<InboxTab>(initialTab);
  const [entityTypeFilter, setEntityTypeFilterState] = useState<EntityType | 'all'>('all');
  const [counts, setCounts] = useState<InboxCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch recommendations from API
   */
  const fetchRecommendations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        per_page: pageSize.toString()
      });

      // Map tab to API type param
      if (activeTab === 'received' || activeTab === 'saved' || activeTab === 'helpful' || activeTab === 'thankyous') {
        params.set('type', 'received');
        if (activeTab === 'saved') {
          params.set('status', 'saved');
        } else if (activeTab === 'helpful') {
          params.set('status', 'helpful');
        } else if (activeTab === 'thankyous') {
          params.set('status', 'thanked');
        }
      } else if (activeTab === 'sent') {
        params.set('type', 'sent');
      }

      if (entityTypeFilter !== 'all') {
        params.set('entity_type', entityTypeFilter);
      }

      const response = await fetch(`/api/sharing/recommendations?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const result = await response.json();
      const data = result.data || result;

      setRecommendations(data.recommendations.map((r: SharingWithPreview) => ({
        ...r,
        created_at: new Date(r.created_at),
        viewed_at: r.viewed_at ? new Date(r.viewed_at) : null
      })));
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      ErrorService.capture('Failed to fetch recommendations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, activeTab, entityTypeFilter]);

  /**
   * Fetch counts for tab badges
   */
  const fetchCounts = useCallback(async () => {
    try {
      const response = await fetch('/api/sharing/recommendations/counts', {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        setCounts(result.data || result);
      }
    } catch (err) {
      ErrorService.capture('Failed to fetch recommendation counts:', err);
    }
  }, []);

  /**
   * Mark recommendation as viewed
   */
  const markAsViewed = useCallback(async (id: number) => {
    try {
      const response = await fetchWithCsrf(`/api/sharing/recommendations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'view' })
      });

      if (!response.ok) {
        throw new Error('Failed to mark as viewed');
      }

      // Optimistic update
      setRecommendations(prev =>
        prev.map(r =>
          r.id === id ? { ...r, viewed_at: new Date() } : r
        )
      );

      // Update counts
      setCounts(prev => prev ? {
        ...prev,
        unread: Math.max(0, prev.unread - 1)
      } : null);
    } catch (err) {
      ErrorService.capture('Failed to mark as viewed:', err);
      throw err;
    }
  }, []);

  /**
   * Toggle saved status
   */
  const toggleSaved = useCallback(async (id: number) => {
    try {
      const response = await fetchWithCsrf(`/api/sharing/recommendations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_saved' })
      });

      if (!response.ok) {
        throw new Error('Failed to toggle saved');
      }

      const result = await response.json();
      const newSavedState = result.data?.is_saved ?? result.is_saved;

      // Optimistic update
      setRecommendations(prev =>
        prev.map(r =>
          r.id === id ? { ...r, is_saved: newSavedState } : r
        )
      );

      // Update counts
      setCounts(prev => prev ? {
        ...prev,
        saved: newSavedState ? prev.saved + 1 : Math.max(0, prev.saved - 1)
      } : null);

      // If in saved tab and unsaved, remove from list
      if (activeTab === 'saved' && !newSavedState) {
        setRecommendations(prev => prev.filter(r => r.id !== id));
        setTotal(prev => prev - 1);
      }
    } catch (err) {
      ErrorService.capture('Failed to toggle saved:', err);
      throw err;
    }
  }, [activeTab]);

  /**
   * Hide recommendation (soft delete)
   */
  const hideRecommendation = useCallback(async (id: number) => {
    try {
      const response = await fetchWithCsrf(`/api/sharing/recommendations/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to hide recommendation');
      }

      // Optimistic update
      setRecommendations(prev => prev.filter(r => r.id !== id));
      setTotal(prev => prev - 1);

      // Refresh counts
      await fetchCounts();
    } catch (err) {
      ErrorService.capture('Failed to hide recommendation:', err);
      throw err;
    }
  }, [fetchCounts]);

  /**
   * Set tab and reset page
   */
  const setTab = useCallback((tab: InboxTab) => {
    setTabState(tab);
    setPage(1);
  }, []);

  /**
   * Set entity type filter and reset page
   */
  const setEntityTypeFilter = useCallback((type: EntityType | 'all') => {
    setEntityTypeFilterState(type);
    setPage(1);
  }, []);

  /**
   * Refresh current data
   */
  const refresh = useCallback(async () => {
    await Promise.all([fetchRecommendations(), fetchCounts()]);
  }, [fetchRecommendations, fetchCounts]);

  /**
   * Mark recommendation as helpful or not helpful
   * Phase 4: Feedback loop
   */
  const markHelpful = useCallback(async (id: number, isHelpful: boolean) => {
    try {
      const response = await fetchWithCsrf(`/api/sharing/recommendations/${id}/helpful`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_helpful: isHelpful })
      });

      if (!response.ok) {
        throw new Error('Failed to mark as helpful');
      }

      // Optimistic update
      setRecommendations(prev =>
        prev.map(r =>
          r.id === id ? { ...r, is_helpful: isHelpful } : r
        )
      );
    } catch (err) {
      ErrorService.capture('Failed to mark as helpful:', err);
      throw err;
    }
  }, []);

  /**
   * Send thank you message
   * Phase 4: Feedback loop
   */
  const sendThankYou = useCallback(async (id: number, message: string) => {
    try {
      const response = await fetchWithCsrf(`/api/sharing/recommendations/${id}/thank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        throw new Error('Failed to send thank you');
      }

      // Optimistic update
      setRecommendations(prev =>
        prev.map(r =>
          r.id === id ? { ...r, thanked_at: new Date() } : r
        )
      );
    } catch (err) {
      ErrorService.capture('Failed to send thank you:', err);
      throw err;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    void fetchRecommendations();
  }, [fetchRecommendations]);

  // Fetch counts on mount
  useEffect(() => {
    void fetchCounts();
  }, [fetchCounts]);

  return {
    recommendations,
    total,
    page,
    pageSize,
    totalPages,
    isLoading,
    error,
    activeTab,
    entityTypeFilter,
    counts,
    setPage,
    setTab,
    setEntityTypeFilter,
    refresh,
    markAsViewed,
    toggleSaved,
    hideRecommendation,
    // Phase 4: Feedback methods
    markHelpful,
    sendThankYou
  };
}
