/**
 * Dashboard Recommendations Activity Log Page
 *
 * Unified view of recommendation activity: sent, received, points earned.
 * Includes points breakdown ledger and impact summary.
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Activity, Send, Inbox, Coins, ChevronLeft, ChevronRight,
  Loader2, ArrowUpRight, ArrowDownLeft, Star,
  ThumbsUp, Heart, Eye, Download, Award
} from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { BizModal, BizModalButton } from '@/components/BizModal';
import { ENTITY_TYPE_REGISTRY } from '@features/contacts/config/entity-registry';
import { getAvatarInitials } from '@core/utils/avatar';
import { BadgeDisplay } from '@features/contacts/components/BadgeDisplay';
import { BADGE_DEFINITIONS } from '@features/contacts/types/reward';
import type { BadgeWithStatus } from '@features/contacts/types/reward';
import type { ActivityLogItem, PointsLedger, SenderImpactStats } from '@features/contacts/types/sharing';

// ============================================================================
// TYPES
// ============================================================================

type FilterType = 'all' | 'sent' | 'received' | 'points';

interface ActivityResponse {
  activity: ActivityLogItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  points_ledger?: PointsLedger;
  impact_stats?: SenderImpactStats;
}

// ============================================================================
// FILTER TABS
// ============================================================================

const FILTER_TABS: { key: FilterType; label: string; icon: typeof Activity }[] = [
  { key: 'all', label: 'All Activity', icon: Activity },
  { key: 'sent', label: 'Sent', icon: Send },
  { key: 'received', label: 'Received', icon: Inbox },
  { key: 'points', label: 'Points', icon: Coins }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ActivityLogContent() {
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);

  const fetchActivity = useCallback(async (p: number, f: FilterType) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: String(p),
        per_page: '15',
        filter: f,
        include_points: p === 1 ? 'true' : 'false'
      });

      const response = await fetch(`/api/sharing/recommendations/activity?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      const result = await response.json();
      if (result.success === false) throw new Error(result.error?.message || 'API returned error');
      const responseData = result.data || result;

      setData(prev => ({
        ...responseData,
        // Keep points_ledger and impact_stats from first load
        points_ledger: responseData.points_ledger || prev?.points_ledger,
        impact_stats: responseData.impact_stats || prev?.impact_stats
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to fetch activity:', msg, err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity(page, filter);
  }, [page, filter, fetchActivity]);

  const handleFilterChange = useCallback((f: FilterType) => {
    setFilter(f);
    setPage(1);
  }, []);

  const [showExportModal, setShowExportModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Points & Rewards</h1>
            <p className="text-gray-600">Track your points, badges, and recommendation impact</p>
          </div>
        </div>
        <button
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Download Report</span>
        </button>
      </div>

      {/* Export Modal */}
      <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} />

      {/* Points Summary Cards */}
      {data?.points_ledger && (
        <PointsSummary ledger={data.points_ledger} stats={data.impact_stats} />
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {FILTER_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleFilterChange(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <Activity className="w-12 h-12 text-red-300 mx-auto mb-3" />
            <p className="text-red-600 font-medium">Failed to load activity</p>
            <p className="text-red-400 text-sm mt-1">{error}</p>
            <button
              onClick={() => fetchActivity(page, filter)}
              className="mt-3 text-sm text-orange-600 hover:text-orange-700 underline"
            >
              Try again
            </button>
          </div>
        ) : data?.activity && data.activity.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {data.activity.map((item) => (
              <ActivityItem key={`${item.activity_type}-${item.id}`} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No activity found</p>
            <p className="text-gray-400 text-sm mt-1">
              Start recommending to see your activity here
            </p>
          </div>
        )}

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <span className="text-sm text-gray-600">
              Page {data.page} of {data.total_pages} ({data.total} total)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={data.page <= 1}
                className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(data.total_pages, p + 1))}
                disabled={data.page >= data.total_pages}
                className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Points Breakdown */}
      {data?.points_ledger && filter !== 'received' && (
        <PointsBreakdown ledger={data.points_ledger} />
      )}

      {/* Badges Earned */}
      {data?.points_ledger?.badges_earned && data.points_ledger.badges_earned.length > 0 && (
        <BadgesEarned badges={data.points_ledger.badges_earned} />
      )}
    </div>
  );
}

// ============================================================================
// POINTS SUMMARY CARDS
// ============================================================================

function PointsSummary({ ledger, stats }: { ledger: PointsLedger; stats?: SenderImpactStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <SummaryCard
        label="Total Points"
        value={ledger.total_points}
        icon={Coins}
        color="orange"
      />
      <SummaryCard
        label="Sent"
        value={stats?.total_sent || 0}
        icon={Send}
        color="blue"
      />
      <SummaryCard
        label="Helpful"
        value={stats?.total_helpful || 0}
        suffix={stats?.helpful_rate ? `${stats.helpful_rate}%` : undefined}
        icon={ThumbsUp}
        color="green"
      />
      <SummaryCard
        label="Thank Yous"
        value={stats?.total_thanked || 0}
        icon={Heart}
        color="pink"
      />
    </div>
  );
}

function SummaryCard({ label, value, suffix, icon: Icon, color }: {
  label: string;
  value: number;
  suffix?: string;
  icon: typeof Coins;
  color: 'orange' | 'blue' | 'green' | 'pink';
}) {
  const colorMap = {
    orange: 'bg-orange-50 text-orange-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    pink: 'bg-pink-50 text-pink-600'
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color].split(' ')[0]}`}>
          <Icon className={`w-4 h-4 ${colorMap[color].split(' ')[1]}`} />
        </div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</span>
        {suffix && <span className="text-sm text-gray-500">{suffix}</span>}
      </div>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

// ============================================================================
// ACTIVITY ITEM
// ============================================================================

function ActivityItem({ item }: { item: ActivityLogItem }) {
  const entityConfig = item.entity_type in ENTITY_TYPE_REGISTRY
    ? ENTITY_TYPE_REGISTRY[item.entity_type as keyof typeof ENTITY_TYPE_REGISTRY]
    : null;

  const getActivityIcon = () => {
    switch (item.activity_type) {
      case 'sent':
        return <ArrowUpRight className="w-4 h-4 text-blue-600" />;
      case 'received':
        return <ArrowDownLeft className="w-4 h-4 text-green-600" />;
      case 'points':
        return <Star className="w-4 h-4 text-orange-500" />;
    }
  };

  const getActivityBg = () => {
    switch (item.activity_type) {
      case 'sent': return 'bg-blue-50';
      case 'received': return 'bg-green-50';
      case 'points': return 'bg-orange-50';
    }
  };

  const getActivityLabel = () => {
    if (item.activity_type === 'sent') {
      const typeName = entityConfig?.displayName || item.entity_type;
      return (
        <span>
          Recommended <span className="font-medium">{item.entity_title || typeName}</span>
          {item.other_user_name && (
            <> to <span className="font-medium">{item.other_user_name}</span></>
          )}
        </span>
      );
    }
    if (item.activity_type === 'received') {
      const typeName = entityConfig?.displayName || item.entity_type;
      return (
        <span>
          {item.other_user_name && (
            <><span className="font-medium">{item.other_user_name}</span> recommended </>
          )}
          <span className="font-medium">{item.entity_title || typeName}</span>
          {!item.other_user_name && <> was recommended to you</>}
        </span>
      );
    }
    // Points event
    const rewardLabels: Record<string, string> = {
      recommendation_sent: 'Points earned for sending recommendation',
      recommendation_viewed: 'Recommendation was viewed',
      recommendation_saved: 'Recommendation was saved',
      recommendation_helpful: 'Marked as helpful',
      recommendation_thanked: 'Received a thank you',
      referral_sent: 'Points earned for sending referral',
      referral_registered: 'Referral signed up',
      referral_connected: 'Referral connected',
      badge_earned: 'Badge earned',
      milestone_reached: 'Milestone reached'
    };
    return <span>{rewardLabels[item.entity_type] || item.message || 'Points earned'}</span>;
  };

  const formatDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex items-start gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">
      {/* Activity Icon */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${getActivityBg()}`}>
        {getActivityIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 leading-snug">
          {getActivityLabel()}
        </p>

        {/* Status badges */}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs text-gray-400">{formatDate(item.created_at)}</span>

          {item.activity_type === 'sent' && item.points_earned > 0 && (
            <span className="inline-flex items-center gap-0.5 text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
              <Coins className="w-3 h-3" />
              +{item.points_earned}
            </span>
          )}

          {item.activity_type === 'points' && item.points_earned > 0 && (
            <span className="inline-flex items-center gap-0.5 text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
              <Coins className="w-3 h-3" />
              +{item.points_earned}
            </span>
          )}

          {item.viewed_at && item.activity_type === 'sent' && (
            <span className="inline-flex items-center gap-0.5 text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">
              <Eye className="w-3 h-3" />
              Viewed
            </span>
          )}

          {item.is_helpful === true && (
            <span className="inline-flex items-center gap-0.5 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
              <ThumbsUp className="w-3 h-3" />
              Helpful
            </span>
          )}

          {item.thanked_at && (
            <span className="inline-flex items-center gap-0.5 text-xs text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded-full">
              <Heart className="w-3 h-3" />
              Thanked
            </span>
          )}

          {entityConfig && item.activity_type !== 'points' && (
            <span className="text-xs text-gray-400">
              {entityConfig.displayName}
            </span>
          )}
        </div>

        {/* Message */}
        {item.message && item.activity_type !== 'points' && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-1 italic">
            &quot;{item.message}&quot;
          </p>
        )}
      </div>

      {/* Avatar of other user */}
      {item.other_user_avatar ? (
        <img
          src={item.other_user_avatar}
          alt={item.other_user_name || ''}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        />
      ) : item.other_user_name ? (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium flex-shrink-0">
          {getAvatarInitials(item.other_user_name)}
        </div>
      ) : null}
    </div>
  );
}

// ============================================================================
// POINTS BREAKDOWN
// ============================================================================

function PointsBreakdown({ ledger }: { ledger: PointsLedger }) {
  const entityEntries = Object.entries(ledger.by_entity_type).filter(
    ([, v]) => v.count > 0
  );

  if (entityEntries.length === 0 && ledger.bonus_points.helpful.count === 0 && ledger.bonus_points.thank_you.count === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Coins className="w-5 h-5 text-orange-500" />
        <h2 className="text-lg font-semibold text-gray-900">Points Breakdown</h2>
      </div>

      <div className="space-y-2">
        {/* Entity type points */}
        {entityEntries.map(([entityType, data]) => {
          const config = entityType in ENTITY_TYPE_REGISTRY
            ? ENTITY_TYPE_REGISTRY[entityType as keyof typeof ENTITY_TYPE_REGISTRY]
            : null;
          return (
            <div key={entityType} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-700">
                  {config?.displayNamePlural || entityType}
                </span>
                <span className="text-xs text-gray-400">
                  {data.count} {data.count === 1 ? 'recommendation' : 'recommendations'}
                </span>
              </div>
              <span className="text-sm font-semibold text-orange-600">
                +{data.points} pts
              </span>
            </div>
          );
        })}

        {/* Bonus points */}
        {ledger.bonus_points.helpful.count > 0 && (
          <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">Helpful Feedback Bonus</span>
              <span className="text-xs text-gray-400">
                {ledger.bonus_points.helpful.count} {ledger.bonus_points.helpful.count === 1 ? 'time' : 'times'}
              </span>
            </div>
            <span className="text-sm font-semibold text-green-600">
              +{ledger.bonus_points.helpful.points} pts
            </span>
          </div>
        )}

        {ledger.bonus_points.thank_you.count > 0 && (
          <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">Thank You Bonus</span>
              <span className="text-xs text-gray-400">
                {ledger.bonus_points.thank_you.count} {ledger.bonus_points.thank_you.count === 1 ? 'time' : 'times'}
              </span>
            </div>
            <span className="text-sm font-semibold text-pink-600">
              +{ledger.bonus_points.thank_you.points} pts
            </span>
          </div>
        )}

        {/* Referral points */}
        {ledger.referral_points && Object.entries(ledger.referral_points).map(([key, data]) => {
          if (data.count === 0) return null;
          const labels: Record<string, string> = {
            referral_sent: 'Referrals Sent',
            referral_registered: 'Referral Sign-ups',
            referral_connected: 'Referral Connections'
          };
          return (
            <div key={key} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-700">{labels[key] || key}</span>
                <span className="text-xs text-gray-400">
                  {data.count} {data.count === 1 ? 'referral' : 'referrals'}
                </span>
              </div>
              <span className="text-sm font-semibold text-indigo-600">
                +{data.points} pts
              </span>
            </div>
          );
        })}

        {/* Badge points - only show if badges actually award points */}
        {ledger.badge_points?.points > 0 && (
          <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">Badges Earned</span>
              <span className="text-xs text-gray-400">
                {ledger.badge_points.count} {ledger.badge_points.count === 1 ? 'badge' : 'badges'}
              </span>
            </div>
            <span className="text-sm font-semibold text-yellow-600">
              +{ledger.badge_points.points} pts
            </span>
          </div>
        )}

        {/* Milestone points - only show if milestones award points */}
        {ledger.milestone_points?.points > 0 && (
          <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">Milestones Reached</span>
              <span className="text-xs text-gray-400">
                {ledger.milestone_points.count} {ledger.milestone_points.count === 1 ? 'milestone' : 'milestones'}
              </span>
            </div>
            <span className="text-sm font-semibold text-purple-600">
              +{ledger.milestone_points.points} pts
            </span>
          </div>
        )}

        {/* Total */}
        <div className="flex items-center justify-between py-3 px-3 mt-2 border-t border-gray-200">
          <span className="text-sm font-semibold text-gray-900">Total Points</span>
          <span className="text-lg font-bold text-orange-600">
            {ledger.total_points.toLocaleString()} pts
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// BADGES EARNED
// ============================================================================

function BadgesEarned({ badges }: { badges: { badge_id: string; description: string; earned_at: Date }[] }) {
  // Map ledger badge data to BadgeWithStatus using BADGE_DEFINITIONS
  const badgeStatuses: BadgeWithStatus[] = badges.map(badge => {
    const def = BADGE_DEFINITIONS[badge.badge_id as keyof typeof BADGE_DEFINITIONS];
    return {
      id: badge.badge_id,
      name: def?.name || badge.description.replace('Earned badge: ', ''),
      icon: def?.icon || '🏅',
      description: def?.description || badge.description,
      category: def?.category || 'special',
      earned: true,
      earned_at: new Date(badge.earned_at),
      requirement: def?.requirement || { type: 'unknown', count: 1 }
    };
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Award className="w-5 h-5 text-yellow-500" />
        <h2 className="text-lg font-semibold text-gray-900">Badges Earned</h2>
        <span className="text-sm text-gray-500">({badges.length})</span>
      </div>
      <div className="flex flex-wrap gap-6">
        {badgeStatuses.map(badge => (
          <BadgeDisplay
            key={badge.id}
            badge={badge}
            size="small"
            showProgress={false}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// EXPORT MODAL
// ============================================================================

function ExportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [exportFilter, setExportFilter] = useState<FilterType>('all');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        filter: exportFilter
      });

      const response = await fetch(`/api/sharing/recommendations/activity/export?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recommendation-activity-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Download Activity Report"
      subtitle="Export your recommendation activity as a CSV file"
      maxWidth="sm"
      footer={
        <div className="flex justify-end gap-2">
          <BizModalButton variant="secondary" onClick={onClose}>Cancel</BizModalButton>
          <BizModalButton onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Download className="w-4 h-4" />
                Download CSV
              </span>
            )}
          </BizModalButton>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={today}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Activity Type</label>
          <select
            value={exportFilter}
            onChange={(e) => setExportFilter(e.target.value as FilterType)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="all">All Activity</option>
            <option value="sent">Sent Only</option>
            <option value="received">Received Only</option>
            <option value="points">Points Only</option>
          </select>
        </div>
      </div>
    </BizModal>
  );
}

// ============================================================================
// EXPORT WITH ERROR BOUNDARY
// ============================================================================

export default function RecommendationActivityPage() {
  return (
    <ErrorBoundary componentName="RecommendationActivityPage">
      <ActivityLogContent />
    </ErrorBoundary>
  );
}
