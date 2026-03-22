/**
 * PlatformConnectionManager - Platform OAuth Connection Management Panel
 *
 * @description Connect/disconnect YouTube, Instagram, TikTok for creator profiles.
 *   Shows connected status, follower counts, last sync time. Triggers manual syncs.
 * @component Client Component
 * @tier ADVANCED
 * @phase Tier 3 Creator Profiles - Phase 9B-2
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier3_Phases/PHASE_9B_INTERNET_PERSONALITY_PLATFORM_SYNC.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use ErrorBoundary (ADVANCED tier requirement)
 * - Orange theme (#ed6437)
 * - fetchWithCsrf for all mutations
 * - credentials: 'include' for fetch calls
 * - Follows ProfileAnalyticsPanel pattern exactly
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle, RefreshCw, Link2, Link2Off, CheckCircle } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { PlatformConnection, PlatformMetricsSnapshot, SyncPlatform } from '@core/types/platform-sync';

// ============================================================================
// Types
// ============================================================================

export interface PlatformConnectionManagerProps {
  profileType: 'affiliate_marketer' | 'internet_personality';
  profileId: number;
}

interface PlatformStatus {
  connections: PlatformConnection[];
  latestMetrics: Record<string, PlatformMetricsSnapshot | null>;
}

interface PlatformCardConfig {
  platform: SyncPlatform;
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  headerBg: string;
}

const PLATFORM_CARDS: PlatformCardConfig[] = [
  {
    platform: 'youtube',
    label: 'YouTube',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    headerBg: 'bg-red-600',
  },
  {
    platform: 'instagram',
    label: 'Instagram',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-700',
    borderColor: 'border-pink-200',
    headerBg: 'bg-gradient-to-r from-purple-600 to-pink-600',
  },
  {
    platform: 'tiktok',
    label: 'TikTok',
    bgColor: 'bg-gray-900',
    textColor: 'text-white',
    borderColor: 'border-gray-700',
    headerBg: 'bg-gray-900',
  },
];

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return n.toLocaleString();
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return 'Never';
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ============================================================================
// Inner Panel Content
// ============================================================================

function PlatformConnectionManagerContent({ profileType, profileId }: PlatformConnectionManagerProps) {
  const { selectedListingId } = useListingContext();
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState<SyncPlatform | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState<SyncPlatform | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!selectedListingId) return;

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/dashboard/listings/${selectedListingId}/creator-profiles/platform/status?profile_type=${profileType}&profile_id=${profileId}`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error(`Failed to fetch platform status (${res.status})`);
      const data = await res.json() as { data: PlatformStatus };
      setStatus(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load platform status');
    } finally {
      setIsLoading(false);
    }
  }, [selectedListingId, profileType, profileId]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const handleConnect = useCallback(async (platform: SyncPlatform) => {
    setIsConnecting(platform);
    setActionError(null);
    try {
      const res = await fetchWithCsrf('/api/auth/platform/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, profile_type: profileType, profile_id: profileId }),
        credentials: 'include',
      });
      if (!res.ok) {
        const errData = await res.json() as { error?: string };
        throw new Error(errData.error || 'Failed to initiate connection');
      }
      const data = await res.json() as { data: { authorization_url: string } };
      window.location.href = data.data.authorization_url;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnecting(null);
    }
  }, [profileType, profileId]);

  const handleDisconnect = useCallback(async (platform: SyncPlatform) => {
    if (!selectedListingId) return;
    if (!window.confirm(`Disconnect ${platform}? Your metrics history will be preserved.`)) return;

    setIsDisconnecting(platform);
    setActionError(null);
    try {
      const res = await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/creator-profiles/platform/disconnect`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform, profile_type: profileType, profile_id: profileId }),
          credentials: 'include',
        }
      );
      if (!res.ok) throw new Error('Failed to disconnect platform');
      await fetchStatus();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Disconnect failed');
    } finally {
      setIsDisconnecting(null);
    }
  }, [selectedListingId, profileType, profileId, fetchStatus]);

  const handleSyncAll = useCallback(async () => {
    if (!selectedListingId) return;

    setIsSyncing(true);
    setActionError(null);
    try {
      const res = await fetchWithCsrf(
        `/api/dashboard/listings/${selectedListingId}/creator-profiles/platform/sync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_type: profileType, profile_id: profileId }),
          credentials: 'include',
        }
      );
      if (!res.ok) {
        const errData = await res.json() as { error?: string };
        throw new Error(errData.error || 'Sync failed');
      }
      await fetchStatus();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, [selectedListingId, profileType, profileId, fetchStatus]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <AlertCircle className="w-10 h-10 text-red-500" />
        <p className="text-gray-700 text-sm">{error}</p>
        <button
          onClick={() => void fetchStatus()}
          className="px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  const connections = status?.connections ?? [];
  const latestMetrics = status?.latestMetrics ?? {};

  // Compute totals for summary
  let totalReach = 0;
  let totalEngagement = 0;
  let engagementCount = 0;
  let lastSync: Date | null = null;

  for (const conn of connections) {
    if (!conn.is_active) continue;
    const metrics = latestMetrics[conn.platform];
    if (metrics) {
      totalReach += metrics.follower_count + metrics.subscriber_count;
      if (metrics.avg_engagement_rate !== null) {
        totalEngagement += metrics.avg_engagement_rate;
        engagementCount++;
      }
    }
    if (conn.last_synced_at) {
      const syncDate = new Date(conn.last_synced_at);
      if (!lastSync || syncDate > lastSync) lastSync = syncDate;
    }
  }

  const avgEngagement = engagementCount > 0 ? (totalEngagement / engagementCount).toFixed(1) : null;
  const connectedCount = connections.filter(c => c.is_active).length;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h3 className="font-semibold text-gray-900">Connected Platforms</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {connectedCount} of {PLATFORM_CARDS.length} connected
          </p>
        </div>
        <button
          onClick={() => void handleSyncAll()}
          disabled={isSyncing || connectedCount === 0}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync All'}
        </button>
      </div>

      {/* Action Error */}
      {actionError && (
        <div className="mx-6 mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {actionError}
          <button
            onClick={() => setActionError(null)}
            className="ml-auto text-red-500 hover:text-red-700 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Platform Cards */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PLATFORM_CARDS.map((card) => {
          const connection = connections.find(c => c.platform === card.platform && c.is_active);
          const metrics = latestMetrics[card.platform];
          const isDisconnectingThis = isDisconnecting === card.platform;
          const isConnectingThis = isConnecting === card.platform;

          if (connection) {
            // Connected state
            const reachCount = metrics
              ? (card.platform === 'youtube' ? metrics.subscriber_count : metrics.follower_count)
              : 0;
            const reachLabel = card.platform === 'youtube' ? 'subscribers' : 'followers';

            return (
              <div
                key={card.platform}
                className={`border ${card.borderColor} rounded-lg overflow-hidden`}
              >
                {/* Platform header */}
                <div className={`${card.headerBg} px-4 py-2 flex items-center gap-2`}>
                  <CheckCircle className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-semibold">{card.label}</span>
                </div>
                {/* Content */}
                <div className={`${card.bgColor} p-4`}>
                  {connection.platform_username && (
                    <p className={`text-sm font-medium ${card.textColor} truncate`}>
                      @{connection.platform_username}
                    </p>
                  )}
                  {reachCount > 0 && (
                    <p className="text-gray-700 text-sm mt-1">
                      {formatCount(reachCount)} {reachLabel}
                    </p>
                  )}
                  <p className="text-gray-500 text-xs mt-1">
                    Last sync: {formatRelativeTime(connection.last_synced_at)}
                  </p>
                  {connection.last_sync_status === 'failure' && connection.last_sync_error && (
                    <p className="text-red-600 text-xs mt-1 truncate" title={connection.last_sync_error}>
                      Error: {connection.last_sync_error}
                    </p>
                  )}
                  <button
                    onClick={() => void handleDisconnect(card.platform)}
                    disabled={isDisconnectingThis}
                    className="mt-3 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50"
                  >
                    {isDisconnectingThis ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Link2Off className="w-3 h-3" />
                    )}
                    Disconnect
                  </button>
                </div>
              </div>
            );
          }

          // Not connected state
          return (
            <div
              key={card.platform}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <div className={`${card.headerBg} px-4 py-2`}>
                <span className="text-white text-sm font-semibold">{card.label}</span>
              </div>
              <div className="bg-gray-50 p-4">
                <p className="text-gray-500 text-sm">Not connected</p>
                <p className="text-gray-400 text-xs mt-1">
                  Connect to sync {card.platform === 'youtube' ? 'subscribers' : 'followers'} automatically
                </p>
                <button
                  onClick={() => void handleConnect(card.platform)}
                  disabled={isConnectingThis}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors text-xs font-medium disabled:opacity-50"
                >
                  {isConnectingThis ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Link2 className="w-3 h-3" />
                  )}
                  Connect {card.label}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Metrics Summary */}
      {connectedCount > 0 && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Platform Metrics Summary
          </p>
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-lg font-bold text-gray-900">{formatCount(totalReach)}</p>
              <p className="text-xs text-gray-500">Total Reach</p>
            </div>
            {avgEngagement && (
              <div>
                <p className="text-lg font-bold text-gray-900">{avgEngagement}%</p>
                <p className="text-xs text-gray-500">Avg Engagement</p>
              </div>
            )}
            {lastSync && (
              <div>
                <p className="text-lg font-bold text-gray-900">{formatRelativeTime(lastSync)}</p>
                <p className="text-xs text-gray-500">Last Full Sync</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Exported component with ErrorBoundary (ADVANCED tier requirement)
// ============================================================================

export function PlatformConnectionManager(props: PlatformConnectionManagerProps) {
  return (
    <ErrorBoundary
      componentName="PlatformConnectionManager"
      fallback={
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">Failed to load platform connections. Please refresh the page.</p>
        </div>
      }
    >
      <PlatformConnectionManagerContent {...props} />
    </ErrorBoundary>
  );
}
