'use client';

/**
 * useSocialAccounts Hook
 *
 * @description Manages social media connection display (with token expiry status),
 *   platform connect/disconnect actions, and paginated post history for the
 *   Social Accounts settings page.
 * @phase Tier 5A Social Media Manager - Phase 8
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier5A_Phases/PHASE_8_SOCIAL_ACCOUNTS_SETTINGS_POST_HISTORY.md
 */

import { useState, useCallback } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import type {
  SocialConnection,
  SocialPlatform,
  SocialPost,
  SocialPostStatus,
  SocialConnectionStatus,
  AvailablePlatform,
} from '@core/types/social-media';

// ============================================================================
// CONSTANTS
// ============================================================================

const SUPPORTED_PLATFORMS: { platform: SocialPlatform; displayName: string }[] = [
  { platform: 'facebook', displayName: 'Facebook' },
  { platform: 'twitter', displayName: 'Twitter / X' },
  { platform: 'instagram', displayName: 'Instagram' },
  { platform: 'linkedin', displayName: 'LinkedIn' },
  { platform: 'tiktok', displayName: 'TikTok' },
  { platform: 'pinterest', displayName: 'Pinterest' },
];

// ============================================================================
// TYPES
// ============================================================================

interface PostFilters {
  status?: SocialPostStatus;
  platform?: SocialPlatform;
  dateFrom?: string;
  dateTo?: string;
}

interface PostPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface UseSocialAccountsOptions {
  listingId: number | null;
}

interface UseSocialAccountsReturn {
  // Connection state
  connections: SocialConnectionStatus[];
  availablePlatforms: AvailablePlatform[];
  isLoadingConnections: boolean;

  // Post history state
  posts: SocialPost[];
  pagination: PostPagination;
  postFilters: PostFilters;
  isLoadingPosts: boolean;

  // Action state
  isConnecting: SocialPlatform | null;
  isDisconnecting: number | null;
  error: string | null;

  // Methods
  fetchConnections: () => Promise<void>;
  fetchPosts: (page?: number, filters?: PostFilters) => Promise<void>;
  connectPlatform: (platform: SocialPlatform) => Promise<void>;
  disconnectPlatform: (connectionId: number) => Promise<void>;
  setPostFilters: (filters: PostFilters) => void;
  setPage: (page: number) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function getTokenStatus(connection: SocialConnection): { tokenStatus: SocialConnectionStatus['tokenStatus']; daysUntilExpiry: number | null } {
  if (!connection.token_expires_at) {
    return { tokenStatus: 'unknown', daysUntilExpiry: null };
  }

  const now = new Date();
  const expiresAt = new Date(connection.token_expires_at);
  const diffMs = expiresAt.getTime() - now.getTime();
  const daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry <= 0) {
    return { tokenStatus: 'expired', daysUntilExpiry: 0 };
  }
  if (daysUntilExpiry <= 7) {
    return { tokenStatus: 'expiring_soon', daysUntilExpiry };
  }
  return { tokenStatus: 'valid', daysUntilExpiry };
}

// ============================================================================
// HOOK
// ============================================================================

export function useSocialAccounts({ listingId }: UseSocialAccountsOptions): UseSocialAccountsReturn {
  const [connections, setConnections] = useState<SocialConnectionStatus[]>([]);
  const [availablePlatforms, setAvailablePlatforms] = useState<AvailablePlatform[]>([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [pagination, setPagination] = useState<PostPagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [postFilters, setPostFiltersState] = useState<PostFilters>({});
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);

  const [isConnecting, setIsConnecting] = useState<SocialPlatform | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // fetchConnections
  // --------------------------------------------------------------------------
  const fetchConnections = useCallback(async () => {
    if (!listingId) return;

    setIsLoadingConnections(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/social/connections?listing_id=${listingId}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to load social connections');
      }

      const result = await response.json();
      const fetched: SocialConnection[] = result.data?.connections ?? [];

      // Build connection statuses
      const statuses: SocialConnectionStatus[] = fetched.map(conn => {
        const { tokenStatus, daysUntilExpiry } = getTokenStatus(conn);
        return { connection: conn, tokenStatus, daysUntilExpiry };
      });
      setConnections(statuses);

      // Build available platforms list
      const connectedPlatforms = new Set(fetched.map(c => c.platform));
      const platforms: AvailablePlatform[] = SUPPORTED_PLATFORMS.map(sp => ({
        platform: sp.platform,
        displayName: sp.displayName,
        isConnected: connectedPlatforms.has(sp.platform),
        connection: fetched.find(c => c.platform === sp.platform),
      }));
      setAvailablePlatforms(platforms);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connections');
    } finally {
      setIsLoadingConnections(false);
    }
  }, [listingId]);

  // --------------------------------------------------------------------------
  // fetchPosts
  // --------------------------------------------------------------------------
  const fetchPosts = useCallback(async (page: number = 1, filters?: PostFilters) => {
    if (!listingId) return;

    setIsLoadingPosts(true);

    try {
      const params = new URLSearchParams({ listing_id: String(listingId), page: String(page), limit: '20' });

      const activeFilters = filters ?? postFilters;
      if (activeFilters.status) params.set('status', activeFilters.status);
      if (activeFilters.platform) params.set('platform', activeFilters.platform);
      if (activeFilters.dateFrom) params.set('date_from', activeFilters.dateFrom);
      if (activeFilters.dateTo) params.set('date_to', activeFilters.dateTo);

      const response = await fetch(`/api/social/posts?${params.toString()}`, { credentials: 'include' });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to load post history');
      }

      const result = await response.json();
      setPosts(result.data?.posts ?? []);
      setPagination(result.data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setIsLoadingPosts(false);
    }
  }, [listingId, postFilters]);

  // --------------------------------------------------------------------------
  // connectPlatform
  // --------------------------------------------------------------------------
  const connectPlatform = useCallback(async (platform: SocialPlatform) => {
    if (!listingId) return;

    setIsConnecting(platform);
    setError(null);

    try {
      const response = await fetchWithCsrf('/api/social/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, listing_id: listingId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to initiate connection');
      }

      const authorizationUrl = result.data?.authorization_url;
      if (authorizationUrl) {
        window.open(authorizationUrl, '_blank', 'noopener,noreferrer');
      }

      // Fire-and-forget analytics
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          eventName: 'social_account_connected',
          eventData: { platform, listingId },
        }),
      }).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect platform');
    } finally {
      setIsConnecting(null);
    }
  }, [listingId]);

  // --------------------------------------------------------------------------
  // disconnectPlatform
  // --------------------------------------------------------------------------
  const disconnectPlatform = useCallback(async (connectionId: number) => {
    setIsDisconnecting(connectionId);
    setError(null);

    try {
      const response = await fetchWithCsrf('/api/social/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_id: connectionId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to disconnect');
      }

      // Remove from local state
      setConnections(prev => prev.filter(cs => cs.connection.id !== connectionId));
      setAvailablePlatforms(prev =>
        prev.map(ap =>
          ap.connection?.id === connectionId
            ? { ...ap, isConnected: false, connection: undefined }
            : ap
        )
      );

      // Fire-and-forget analytics
      const disconnectedConn = connections.find(cs => cs.connection.id === connectionId);
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          eventName: 'social_account_disconnected',
          eventData: {
            platform: disconnectedConn?.connection.platform,
            listingId,
            connectionId,
          },
        }),
      }).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setIsDisconnecting(null);
    }
  }, [connections, listingId]);

  // --------------------------------------------------------------------------
  // Filter + pagination helpers
  // --------------------------------------------------------------------------
  const setPostFilters = useCallback((filters: PostFilters) => {
    setPostFiltersState(filters);
    fetchPosts(1, filters);
  }, [fetchPosts]);

  const setPage = useCallback((page: number) => {
    fetchPosts(page);
  }, [fetchPosts]);

  return {
    connections,
    availablePlatforms,
    isLoadingConnections,
    posts,
    pagination,
    postFilters,
    isLoadingPosts,
    isConnecting,
    isDisconnecting,
    error,
    fetchConnections,
    fetchPosts,
    connectPlatform,
    disconnectPlatform,
    setPostFilters,
    setPage,
  };
}
