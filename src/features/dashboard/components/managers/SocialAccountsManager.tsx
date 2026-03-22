'use client';

/**
 * SocialAccountsManager - Social Accounts Settings Page
 *
 * @description Two-tab manager: Connected Accounts (connect/disconnect OAuth)
 *   and Post History (filtered, paginated post list with status badges).
 * @component Client Component
 * @tier ADVANCED
 * @phase Tier 5A Social Media Manager - Phase 8
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier5A_Phases/PHASE_8_SOCIAL_ACCOUNTS_SETTINGS_POST_HISTORY.md
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  AlertCircle,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useSocialAccounts } from '@features/dashboard/hooks/useSocialAccounts';
import { SocialAnalyticsDashboard } from '@features/dashboard/components/managers/content/SocialAnalyticsDashboard';
import type { SocialPlatform, SocialPostStatus, SocialConnectionStatus, SocialPost } from '@core/types/social-media';

// ============================================================================
// HELPERS
// ============================================================================

function getPlatformColor(platform: SocialPlatform): string {
  switch (platform) {
    case 'facebook': return '#1877F2';
    case 'twitter': return '#1DA1F2';
    case 'instagram': return '#E4405F';
    case 'linkedin': return '#0A66C2';
    case 'tiktok': return '#000000';
    case 'pinterest': return '#E60023';
    default: return '#6B7280';
  }
}

function getPlatformIcon(platform: SocialPlatform) {
  switch (platform) {
    case 'facebook': return <Facebook className="w-5 h-5" style={{ color: getPlatformColor('facebook') }} />;
    case 'twitter': return <Twitter className="w-5 h-5" style={{ color: getPlatformColor('twitter') }} />;
    case 'instagram': return <Instagram className="w-5 h-5" style={{ color: getPlatformColor('instagram') }} />;
    case 'linkedin': return <Linkedin className="w-5 h-5" style={{ color: getPlatformColor('linkedin') }} />;
    case 'tiktok': return <div className="w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold bg-black text-white">TK</div>;
    case 'pinterest': return <div className="w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold bg-[#E60023] text-white">P</div>;
    default: return null;
  }
}

function getPlatformIconGray(platform: SocialPlatform) {
  switch (platform) {
    case 'facebook': return <Facebook className="w-5 h-5 text-gray-400" />;
    case 'twitter': return <Twitter className="w-5 h-5 text-gray-400" />;
    case 'instagram': return <Instagram className="w-5 h-5 text-gray-400" />;
    case 'linkedin': return <Linkedin className="w-5 h-5 text-gray-400" />;
    case 'tiktok': return <div className="w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold bg-gray-200 text-gray-400">TK</div>;
    case 'pinterest': return <div className="w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold bg-gray-200 text-gray-400">P</div>;
    default: return null;
  }
}

const STATUS_BADGE_COLORS: Record<SocialPostStatus, string> = {
  posted: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  scheduled: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  deleted: 'bg-gray-100 text-gray-800',
};

const TOKEN_STATUS_COLORS = {
  valid: 'bg-green-100 text-green-800',
  expiring_soon: 'bg-yellow-100 text-yellow-800',
  expired: 'bg-red-100 text-red-800',
  unknown: 'bg-gray-100 text-gray-600',
} as const;

function formatDate(date: Date | string | null): string {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(date: Date | string | null): string {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ConnectedAccountCard({
  cs,
  isDisconnecting,
  onDisconnect,
}: {
  cs: SocialConnectionStatus;
  isDisconnecting: boolean;
  onDisconnect: (connectionId: number) => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const conn = cs.connection;
  const displayName = conn.platform_page_name || conn.platform_username || conn.platform;

  const handleDisconnect = () => {
    onDisconnect(conn.id);
    setShowConfirm(false);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-full shrink-0"
          style={{ backgroundColor: getPlatformColor(conn.platform) + '20' }}
        >
          {getPlatformIcon(conn.platform)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-gray-900 capitalize">{conn.platform}</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TOKEN_STATUS_COLORS[cs.tokenStatus]}`}>
              {cs.tokenStatus === 'valid' && 'Active'}
              {cs.tokenStatus === 'expiring_soon' && `Expires in ${cs.daysUntilExpiry}d`}
              {cs.tokenStatus === 'expired' && 'Expired'}
              {cs.tokenStatus === 'unknown' && 'Active'}
            </span>
          </div>
          <p className="text-sm text-gray-600 truncate">{displayName}</p>
          <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
            <span>Connected {formatDate(conn.connected_at)}</span>
            {conn.last_used_at && <span>Last used {formatDate(conn.last_used_at)}</span>}
          </div>
        </div>
        <div className="shrink-0">
          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={isDisconnecting}
              className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              Disconnect
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="px-3 py-1.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {isDisconnecting && <Loader2 className="w-3 h-3 animate-spin" />}
                Confirm
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AvailablePlatformCard({
  platform,
  displayName,
  isConnecting,
  onConnect,
}: {
  platform: SocialPlatform;
  displayName: string;
  isConnecting: boolean;
  onConnect: (platform: SocialPlatform) => void;
}) {
  return (
    <div className="border border-dashed border-gray-300 rounded-lg p-4 flex items-center gap-3">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 shrink-0">
        {getPlatformIconGray(platform)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-600">{displayName}</p>
        <p className="text-xs text-gray-400">Not connected</p>
      </div>
      <button
        onClick={() => onConnect(platform)}
        disabled={isConnecting}
        className="px-4 py-1.5 text-sm font-medium text-white bg-[#ed6437] hover:bg-[#d55a31] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
      >
        {isConnecting && <Loader2 className="w-3 h-3 animate-spin" />}
        Connect
      </button>
    </div>
  );
}

function PostCard({ post }: { post: SocialPost }) {
  const [showError, setShowError] = useState(false);
  const postText = post.post_text || '';
  const truncatedText = postText.length > 120 ? postText.slice(0, 120) + '...' : postText;

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
          style={{ backgroundColor: getPlatformColor(post.platform) + '20' }}
        >
          {getPlatformIcon(post.platform)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-medium text-gray-900 capitalize">{post.platform}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_COLORS[post.status]}`}>
              {post.status}
            </span>
          </div>
          <p className="text-sm text-gray-700 mb-2">{truncatedText || <span className="text-gray-400 italic">No text</span>}</p>

          <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
            <span>Created {formatDateTime(post.created_at)}</span>
            {post.posted_at && <span>Posted {formatDateTime(post.posted_at)}</span>}
            {post.scheduled_at && post.status === 'scheduled' && <span>Scheduled {formatDateTime(post.scheduled_at)}</span>}
          </div>

          {/* Engagement metrics for posted */}
          {post.status === 'posted' && (post.impressions > 0 || post.engagements > 0 || post.clicks > 0) && (
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span>{post.impressions.toLocaleString()} impressions</span>
              <span>{post.engagements.toLocaleString()} engagements</span>
              <span>{post.clicks.toLocaleString()} clicks</span>
            </div>
          )}

          {/* Error message for failed posts */}
          {post.status === 'failed' && post.error_message && (
            <div className="mt-2">
              <button
                onClick={() => setShowError(!showError)}
                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
              >
                {showError ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showError ? 'Hide error' : 'Show error'}
              </button>
              {showError && (
                <p className="mt-1 text-xs text-red-600 bg-red-50 p-2 rounded">{post.error_message}</p>
              )}
            </div>
          )}
        </div>

        {/* External link */}
        {post.platform_post_url && (
          <a
            href={post.platform_post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-[#ed6437] transition-colors shrink-0"
            title="View on platform"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

type TabId = 'accounts' | 'history' | 'analytics';

function SocialAccountsManagerContent() {
  const { selectedListingId } = useListingContext();
  const [activeTab, setActiveTab] = useState<TabId>('accounts');

  const {
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
  } = useSocialAccounts({ listingId: selectedListingId });

  // Local filter state for controlled inputs
  const [filterPlatform, setFilterPlatform] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Fetch connections on mount
  useEffect(() => {
    if (selectedListingId) {
      fetchConnections();
    }
  }, [selectedListingId, fetchConnections]);

  // Fetch posts when switching to history tab
  useEffect(() => {
    if (activeTab === 'history' && selectedListingId) {
      fetchPosts(1);
    }
  }, [activeTab, selectedListingId, fetchPosts]);

  const handleApplyFilters = useCallback(() => {
    setPostFilters({
      platform: filterPlatform as SocialPlatform || undefined,
      status: filterStatus as SocialPostStatus || undefined,
      dateFrom: filterDateFrom || undefined,
      dateTo: filterDateTo || undefined,
    });
  }, [filterPlatform, filterStatus, filterDateFrom, filterDateTo, setPostFilters]);

  const handleClearFilters = useCallback(() => {
    setFilterPlatform('');
    setFilterStatus('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setPostFilters({});
  }, [setPostFilters]);

  // Loading state
  if (isLoadingConnections && connections.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
      </div>
    );
  }

  const connectedAccounts = connections;
  const unconnectedPlatforms = availablePlatforms.filter(ap => !ap.isConnected);

  return (
    <div className="space-y-6">
      {/* Error display */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => fetchConnections()}
            className="ml-auto px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Tab navigation */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'accounts'
                ? 'border-[#ed6437] text-[#ed6437]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Connected Accounts
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-[#ed6437] text-[#ed6437]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Post History
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'analytics'
                ? 'border-[#ed6437] text-[#ed6437]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Analytics
          </button>
        </div>
      </div>

      {/* Tab 1: Connected Accounts */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          {/* Connected accounts */}
          {connectedAccounts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Connected</h3>
              {connectedAccounts.map(cs => (
                <ConnectedAccountCard
                  key={cs.connection.id}
                  cs={cs}
                  isDisconnecting={isDisconnecting === cs.connection.id}
                  onDisconnect={disconnectPlatform}
                />
              ))}
            </div>
          )}

          {/* Available platforms */}
          {unconnectedPlatforms.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Available to Connect</h3>
              {unconnectedPlatforms.map(ap => (
                <AvailablePlatformCard
                  key={ap.platform}
                  platform={ap.platform}
                  displayName={ap.displayName}
                  isConnecting={isConnecting === ap.platform}
                  onConnect={connectPlatform}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {connectedAccounts.length === 0 && unconnectedPlatforms.length === 0 && !isLoadingConnections && (
            <div className="text-center py-10">
              <div className="flex justify-center mb-3">
                <Facebook className="w-8 h-8 text-gray-300 mr-2" />
                <Twitter className="w-8 h-8 text-gray-300 mr-2" />
                <Instagram className="w-8 h-8 text-gray-300 mr-2" />
                <Linkedin className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-600 font-medium">No social platforms available</p>
              <p className="text-sm text-gray-400 mt-1">Social media connections are not currently available.</p>
            </div>
          )}

          {/* Refresh button */}
          {connectedAccounts.length > 0 && (
            <div className="pt-2">
              <button
                onClick={fetchConnections}
                disabled={isLoadingConnections}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#ed6437] transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingConnections ? 'animate-spin' : ''}`} />
                Refresh connections
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Post History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Platform</label>
              <select
                value={filterPlatform}
                onChange={e => setFilterPlatform(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              >
                <option value="">All Platforms</option>
                <option value="facebook">Facebook</option>
                <option value="twitter">Twitter / X</option>
                <option value="instagram">Instagram</option>
                <option value="linkedin">LinkedIn</option>
                <option value="tiktok">TikTok</option>
                <option value="pinterest">Pinterest</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="posted">Posted</option>
                <option value="failed">Failed</option>
                <option value="scheduled">Scheduled</option>
                <option value="pending">Pending</option>
                <option value="deleted">Deleted</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              />
            </div>
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 text-sm font-medium text-white bg-[#ed6437] hover:bg-[#d55a31] rounded-lg transition-colors"
            >
              Filter
            </button>
            {(filterPlatform || filterStatus || filterDateFrom || filterDateTo) && (
              <button
                onClick={handleClearFilters}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Posts list */}
          {isLoadingPosts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
            </div>
          ) : posts.length > 0 ? (
            <div className="space-y-3">
              {posts.map(post => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-600 font-medium">No posts found</p>
              <p className="text-sm text-gray-400 mt-1">
                {postFilters.status || postFilters.platform || postFilters.dateFrom || postFilters.dateTo
                  ? 'Try adjusting your filters to find posts.'
                  : 'Posts will appear here after you share content to social media.'}
              </p>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Analytics */}
      {activeTab === 'analytics' && (
        <SocialAnalyticsDashboard />
      )}
    </div>
  );
}

/**
 * SocialAccountsManager - Wrapped with ErrorBoundary
 */
export function SocialAccountsManager() {
  return (
    <ErrorBoundary componentName="SocialAccountsManager">
      <SocialAccountsManagerContent />
    </ErrorBoundary>
  );
}

export default SocialAccountsManager;
