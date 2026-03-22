/**
 * Admin Dashboard Landing Page
 *
 * @authority PHASE_5_DASHBOARD_ENHANCEMENT_BRAIN_PLAN.md
 * @tier ADVANCED
 *
 * Features:
 * - 8 KPI cards: Users, Listings, Reviews, Events, Visitors, Sessions, Offers, Claims
 * - 8 Quick action cards (4 per row) for common admin tasks
 * - Side-by-side panels: Page Views Analytics + Real-time Activity Log
 *
 * SHELL INTEGRATION NOTE:
 * This page renders inside AdminShell which provides p-6 padding.
 * Uses fragment wrapper instead of div.p-6 to avoid double padding.
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@core/hooks/useAuth';
import Link from 'next/link';
import type { Route } from 'next';
import {
  Users,
  FileText,
  Star,
  Calendar,
  Settings,
  BarChart3,
  Eye,
  Activity,
  Tag,
  ClipboardCheck,
  CheckCircle,
  FileCheck,
  LogOut
} from 'lucide-react';
import { ErrorService } from '@core/services/ErrorService';
import { getAvatarInitials, getAvatarBgColor } from '@core/utils/avatar';
import { fetchWithCsrf } from '@core/utils/csrf';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface DashboardStats {
  totalUsers: number;
  totalListings: number;
  pendingReviews: number;
  upcomingEvents: number;
  uniqueVisitors: number;
  activeSessions: number;
  activeOffers: number;
  pendingClaims: number;
  pendingListings: number;
  pendingEvents: number;
  pendingContent: number;
  newUsers: number;
}

interface PageViewStat {
  page_type: string;
  view_count: number;
  percentage: number;
}

interface TopUrlStat {
  url: string;
  title: string | null;
  view_count: number;
  percentage: number;
}

interface PageViewStats {
  totalViews: number;
  byType: PageViewStat[];
  topUrls: TopUrlStat[];
  timeRangeHours: number;
}

interface ActivityLogEntry {
  id: number;
  user_id: number | null;
  user_name: string;
  action: string;
  action_type: string;
  description: string;
  ip_display: string | null;
  location: string | null;
  device_type: string | null;
  created_at: string;
}

interface AdminActivityEntry {
  id: number;
  admin_user_id: number;
  admin_name: string;
  action_type: string;
  action_category: string;
  action_description: string;
  target_entity_type: string;
  target_entity_id: number | null;
  severity: string;
  created_at: string;
}

interface LoggedInUserEntry {
  session_id: string;
  user_id: number;
  user_name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  avatar_bg_color: string | null;
  last_activity: string;
  created_at: string;
  expires_at: string;
  ip_coarse: string | null;
}

interface DashboardData {
  stats: DashboardStats;
  pageViewStats: PageViewStats;
  recentActivity: ActivityLogEntry[];
  adminActivities: AdminActivityEntry[];
  loggedInUsers: LoggedInUserEntry[];
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatCard({
  title,
  value,
  icon: Icon,
  href
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
}) {
  const content = (
    <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow h-full">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-500 truncate">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {value.toLocaleString()}
          </p>
        </div>
        <div className="p-2 bg-[#e6edf3] border border-[#002641] rounded-full flex-shrink-0 ml-2">
          <Icon className="w-5 h-5 text-[#002641]" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href as Route}>{content}</Link>;
  }

  return content;
}

function QuickActionCard({
  title,
  description,
  icon: Icon,
  href,
  badge
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
}) {
  return (
    <Link href={href as Route}>
      <div className="relative bg-white p-4 rounded-lg shadow hover:shadow-md hover:bg-gray-50 transition-all cursor-pointer h-full">
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold px-1.5 shadow-sm">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#fde8e0] border border-[#ed6437] rounded-lg flex-shrink-0">
            <Icon className="w-5 h-5 text-[#ed6437]" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
            <p className="text-xs text-gray-500 truncate">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Page Views Analytics Panel
function PageViewsPanel({
  pageViewStats,
  timeRange,
  onTimeRangeChange
}: {
  pageViewStats: PageViewStats;
  timeRange: number;
  onTimeRangeChange: (_hours: number) => void;
}) {
  const [viewMode, setViewMode] = useState<'category' | 'url'>('category');

  // Color palette for page types
  const getColor = (index: number) => {
    const colors = [
      'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500',
      'bg-pink-500', 'bg-cyan-500', 'bg-amber-500', 'bg-indigo-500',
      'bg-rose-500', 'bg-teal-500', 'bg-lime-500', 'bg-red-500'
    ];
    return colors[index % colors.length];
  };

  // Format URL for display - extract meaningful name from path
  const formatUrlForDisplay = (url: string, title: string | null) => {
    if (title) {
      // Remove site name suffix like "| Bizconekt" or "- Bizconekt"
      return title.replace(/\s*[|-]\s*Bizconekt$/i, '').trim();
    }
    // Fallback: format the URL path
    if (url === '/') return 'Home';
    return url.split('/').filter(Boolean).slice(-1)[0] || url;
  };

  return (
    <div className="bg-white rounded-lg shadow h-full flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Page Views</h2>
          <p className="text-xs text-gray-500">Last {timeRange === 168 ? '7 days' : `${timeRange}h`}</p>
        </div>
        <div className="flex gap-1">
          {[24, 48, 168].map(hours => (
            <button
              key={hours}
              onClick={() => onTimeRangeChange(hours)}
              className={`px-2 py-1 text-xs rounded transition ${
                timeRange === hours
                  ? 'bg-[#002641] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {hours === 24 ? '24h' : hours === 48 ? '48h' : '7d'}
            </button>
          ))}
        </div>
      </div>

      {/* Total Views + View Mode Toggle */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Total views</span>
          <span className="text-xl font-bold text-gray-900">
            {pageViewStats.totalViews.toLocaleString()}
          </span>
        </div>
        <div className="flex gap-1 bg-gray-100 p-0.5 rounded">
          <button
            onClick={() => setViewMode('category')}
            className={`px-2 py-1 text-xs rounded transition ${
              viewMode === 'category'
                ? 'bg-white shadow text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            By Category
          </button>
          <button
            onClick={() => setViewMode('url')}
            className={`px-2 py-1 text-xs rounded transition ${
              viewMode === 'url'
                ? 'bg-white shadow text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            By URL
          </button>
        </div>
      </div>

      {/* Page Type Breakdown or URL Breakdown */}
      <div className="flex-1 overflow-y-auto p-4">
        {viewMode === 'category' ? (
          // Category View
          pageViewStats.byType.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No page views in this period</div>
          ) : (
            <div className="space-y-3">
              {pageViewStats.byType.map((item, index) => (
                <div key={item.page_type} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{item.page_type}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 font-semibold">
                        {item.view_count.toLocaleString()}
                      </span>
                      <span className="text-emerald-600 text-xs font-medium">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getColor(index)} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(item.percentage, 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // URL View - Granular page-level analytics
          !pageViewStats.topUrls || pageViewStats.topUrls.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No page views in this period</div>
          ) : (
            <div className="space-y-2">
              {pageViewStats.topUrls.map((item, index) => (
                <div key={item.url} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="min-w-0 flex-1 mr-2">
                      <span className="font-medium text-gray-700 block truncate" title={item.url}>
                        {formatUrlForDisplay(item.url, item.title)}
                      </span>
                      <span className="text-xs text-gray-400 block truncate" title={item.url}>
                        {item.url}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-gray-900 font-semibold">
                        {item.view_count.toLocaleString()}
                      </span>
                      <span className="text-emerald-600 text-xs font-medium w-8 text-right">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getColor(index)} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(item.percentage, 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// Activity Log Panel (Real-time user activity - ALL types)
function ActivityLogPanel({ activities }: { activities: ActivityLogEntry[] }) {
  const getActionTypeColor = (actionType: string) => {
    const colors: Record<string, string> = {
      auth: 'bg-blue-100 text-blue-800',
      registration: 'bg-emerald-100 text-emerald-800',
      verification: 'bg-cyan-100 text-cyan-800',
      password: 'bg-orange-100 text-orange-800',
      account: 'bg-purple-100 text-purple-800',
      session: 'bg-indigo-100 text-indigo-800',
      listing_create: 'bg-green-100 text-green-800',
      admin_action: 'bg-red-100 text-red-800',
      login: 'bg-blue-100 text-blue-800',
      password_reset: 'bg-amber-100 text-amber-800',
      create: 'bg-green-100 text-green-800',
      update: 'bg-amber-100 text-amber-800',
      delete: 'bg-red-100 text-red-800',
      view: 'bg-purple-100 text-purple-800',
      system: 'bg-gray-100 text-gray-800'
    };
    return colors[actionType] || 'bg-gray-100 text-gray-800';
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Format location for display
  const formatLocation = (location: string | null) => {
    if (!location) return null;
    // Clean up "Local, Local" to just "Local"
    if (location === 'Local, Local') return 'Local';
    return location;
  };

  return (
    <div className="bg-white rounded-lg shadow h-full flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <span className="flex items-center gap-1 text-xs text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live
          </span>
        </div>
        <span className="text-xs text-gray-500">{activities.length} entries</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">No recent activity</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activities.map((activity) => (
              <div key={activity.id} className="px-4 py-2.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${getActionTypeColor(activity.action_type)}`}>
                    {activity.action_type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.user_name}
                      </p>
                      {/* IP and Location display */}
                      {(activity.ip_display || activity.location) && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          {activity.ip_display && (
                            <span className="font-mono bg-gray-100 px-1 rounded">
                              {activity.ip_display}
                            </span>
                          )}
                          {formatLocation(activity.location) && (
                            <span>• {formatLocation(activity.location)}</span>
                          )}
                        </span>
                      )}
                      {activity.device_type && (
                        <span className="text-[10px] text-gray-400">• {activity.device_type}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {activity.description}
                    </p>
                  </div>
                  <time className="text-[10px] text-gray-400 flex-shrink-0 whitespace-nowrap">
                    {formatTime(activity.created_at)}
                  </time>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Admin Activity Panel (Admin actions log with time filtering)
function AdminActivityPanel({
  activities,
  timeRange,
  onTimeRangeChange
}: {
  activities: AdminActivityEntry[];
  timeRange: number;
  onTimeRangeChange: (_hours: number) => void;
}) {
  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      normal: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      deletion: 'bg-red-100 text-red-800',
      batch_deletion: 'bg-red-200 text-red-900',
      moderation: 'bg-amber-100 text-amber-800',
      update: 'bg-blue-100 text-blue-800',
      creation: 'bg-green-100 text-green-800',
      import: 'bg-purple-100 text-purple-800',
      export: 'bg-indigo-100 text-indigo-800',
      configuration: 'bg-cyan-100 text-cyan-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-lg shadow h-full flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Admin Activity</h2>
          <span className="flex items-center gap-1 text-xs text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live
          </span>
        </div>
        <div className="flex gap-1">
          {[24, 48, 168].map(hours => (
            <button
              key={hours}
              onClick={() => onTimeRangeChange(hours)}
              className={`px-2 py-1 text-xs rounded transition ${
                timeRange === hours
                  ? 'bg-[#002641] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {hours === 24 ? '24h' : hours === 48 ? '48h' : '7d'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">No admin activity in this period</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activities.map((activity) => (
              <div key={activity.id} className="px-4 py-2.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${getCategoryColor(activity.action_category)}`}>
                    {activity.action_category}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.admin_name}
                      </p>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getSeverityColor(activity.severity)}`}>
                        {activity.severity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {activity.action_description}
                    </p>
                    {activity.target_entity_type && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Target: {activity.target_entity_type}
                        {activity.target_entity_id && ` #${activity.target_entity_id}`}
                      </p>
                    )}
                  </div>
                  <time className="text-[10px] text-gray-400 flex-shrink-0 whitespace-nowrap">
                    {formatTime(activity.created_at)}
                  </time>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Logged In Users Panel (Active sessions with time filtering)
function LoggedInUsersPanel({
  users,
  timeRange,
  onTimeRangeChange,
  currentAdminId,
  onForceLogout
}: {
  users: LoggedInUserEntry[];
  timeRange: number;
  onTimeRangeChange: (_hours: number) => void;
  currentAdminId: string;
  onForceLogout: (_userId: number, _userName: string) => void;
}) {
  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      listing_member: 'bg-purple-100 text-purple-800',
      general: 'bg-blue-100 text-blue-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatExpiresIn = (expiresAt: string) => {
    const date = new Date(expiresAt);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);

    if (diffMs < 0) return 'Expired';
    if (diffHours > 24) return `${Math.floor(diffHours / 24)}d`;
    if (diffHours > 0) return `${diffHours}h ${diffMins}m`;
    return `${diffMins}m`;
  };

  return (
    <div className="bg-white rounded-lg shadow h-full flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Logged In Users</h2>
          <span className="flex items-center gap-1 text-xs text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Live
          </span>
        </div>
        <div className="flex gap-1">
          {[24, 48, 168].map(hours => (
            <button
              key={hours}
              onClick={() => onTimeRangeChange(hours)}
              className={`px-2 py-1 text-xs rounded transition ${
                timeRange === hours
                  ? 'bg-[#002641] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {hours === 24 ? '24h' : hours === 48 ? '48h' : '7d'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
        <span className="text-sm text-gray-600">Active sessions: </span>
        <span className="text-sm font-bold text-gray-900">{users.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {users.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">No active sessions in this period</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {users.map((sessionUser) => {
              const initials = getAvatarInitials(sessionUser.user_name, null);
              const bgColor = getAvatarBgColor(sessionUser.avatar_bg_color);
              const isSelf = sessionUser.user_id === Number(currentAdminId);

              return (
                <div key={sessionUser.session_id} className="px-4 py-2.5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-2">
                    {/* Avatar - real image or initials fallback */}
                    {sessionUser.avatar_url ? (
                      <img
                        src={sessionUser.avatar_url}
                        alt={sessionUser.user_name}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        onError={(e) => {
                          // Fallback to initials on image load error
                          const target = e.currentTarget;
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback = document.createElement('div');
                            fallback.className = 'w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-medium flex-shrink-0';
                            fallback.style.backgroundColor = bgColor;
                            fallback.textContent = initials;
                            parent.replaceChild(fallback, target);
                          }
                        }}
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-medium flex-shrink-0"
                        style={{ backgroundColor: bgColor }}
                      >
                        {initials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900">
                          {sessionUser.user_name}
                          {isSelf && <span className="text-[10px] text-gray-400 ml-1">(you)</span>}
                        </p>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getRoleColor(sessionUser.role)}`}>
                          {sessionUser.role}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {sessionUser.email}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                        {sessionUser.ip_coarse && (
                          <span className="font-mono bg-gray-100 px-1 rounded">
                            {sessionUser.ip_coarse}
                          </span>
                        )}
                        <span>Expires: {formatExpiresIn(sessionUser.expires_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-[10px] text-gray-400 whitespace-nowrap">
                          Last active
                        </div>
                        <time className="text-xs text-gray-600 font-medium">
                          {formatTime(sessionUser.last_activity)}
                        </time>
                      </div>
                      {/* Force logout button - hidden for self */}
                      {!isSelf && (
                        <button
                          onClick={() => onForceLogout(sessionUser.user_id, sessionUser.user_name)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title={`Force logout ${sessionUser.user_name}`}
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdminDashboardPage() {
  // All hooks must be at the top before any conditional returns
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [timeRange, setTimeRange] = useState(24); // Default 24 hours
  const [loggingOutUserId, setLoggingOutUserId] = useState<number | null>(null);

  const fetchDashboardData = useCallback(async (hours: number = timeRange) => {
    try {
      const response = await fetch(`/api/admin/dashboard?hours=${hours}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data.data);
      }
    } catch (error) {
      ErrorService.capture(error, { component: 'AdminDashboardPage', action: 'fetchDashboardData' });
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    // Only fetch if user is admin - conditional logic INSIDE the hook
    if (user?.role === 'admin') {
      fetchDashboardData();

      // Auto-refresh every 30 seconds for real-time data
      const interval = setInterval(() => {
        fetchDashboardData();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [user, fetchDashboardData]);

  const handleTimeRangeChange = (hours: number) => {
    setTimeRange(hours);
    fetchDashboardData(hours);
  };

  const handleForceLogout = useCallback(async (userId: number, userName: string) => {
    if (loggingOutUserId) return; // Prevent double-click
    if (!confirm(`Are you sure you want to force logout ${userName}? Their active sessions will be revoked.`)) return;

    setLoggingOutUserId(userId);
    try {
      const response = await fetchWithCsrf(`/api/admin/users/${userId}/force-logout`, {
        method: 'POST'
      });

      if (response.ok) {
        // Refresh dashboard to reflect the change
        fetchDashboardData(timeRange);
      } else {
        const data = await response.json();
        alert(data.error?.message || 'Failed to force logout user');
      }
    } catch (error) {
      ErrorService.capture(error, { component: 'AdminDashboardPage', action: 'handleForceLogout' });
      alert('Failed to force logout user. Please try again.');
    } finally {
      setLoggingOutUserId(null);
    }
  }, [loggingOutUserId, fetchDashboardData, timeRange]);

  // Auth checks AFTER all hooks
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600 font-medium">Access Denied: Admin privileges required</div>
      </div>
    );
  }

  if (loading || !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  const { stats, pageViewStats, recentActivity, adminActivities, loggedInUsers } = dashboardData;

  return (
    <>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here&apos;s an overview of your platform.</p>
        </div>

        {/* KPI Stats Cards - 8 cards in single row */}
        <section aria-labelledby="admin-stats-heading">
          <h2 id="admin-stats-heading" className="sr-only">Platform Statistics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
            <StatCard
              title="Total Users"
              value={stats.totalUsers}
              icon={Users}
              href="/admin/users"
            />
            <StatCard
              title="Total Listings"
              value={stats.totalListings}
              icon={FileText}
              href="/admin/listings"
            />
            <StatCard
              title="Pending Reviews"
              value={stats.pendingReviews}
              icon={Star}
              href="/admin/reviews"
            />
            <StatCard
              title="Upcoming Events"
              value={stats.upcomingEvents}
              icon={Calendar}
              href="/admin/events"
            />
            <StatCard
              title="Unique Visitors"
              value={stats.uniqueVisitors}
              icon={Eye}
            />
            <StatCard
              title="Active Sessions"
              value={stats.activeSessions}
              icon={Activity}
            />
            <StatCard
              title="Active Offers"
              value={stats.activeOffers}
              icon={Tag}
              href="/admin/offers"
            />
            <StatCard
              title="Pending Claims"
              value={stats.pendingClaims}
              icon={ClipboardCheck}
              href="/admin/claims"
            />
          </div>
        </section>

        {/* Quick Actions - 4 per row */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <QuickActionCard
              title="Manage Listings"
              description="Review and moderate listings"
              icon={FileText}
              href="/admin/listings"
              badge={stats.pendingListings}
            />
            <QuickActionCard
              title="View Users"
              description="Manage user accounts"
              icon={Users}
              href="/admin/users"
              badge={stats.newUsers}
            />
            <QuickActionCard
              title="Moderate Reviews"
              description="Review pending reviews"
              icon={Star}
              href="/admin/reviews"
              badge={stats.pendingReviews}
            />
            <QuickActionCard
              title="Approve Listings"
              description="Approve pending listings"
              icon={CheckCircle}
              href="/admin/moderation?tab=listings"
              badge={stats.pendingListings}
            />
            <QuickActionCard
              title="View Events"
              description="Manage platform events"
              icon={Calendar}
              href="/admin/events"
              badge={stats.pendingEvents}
            />
            <QuickActionCard
              title="Site Settings"
              description="Configure platform settings"
              icon={Settings}
              href="/admin/settings"
            />
            <QuickActionCard
              title="View Analytics"
              description="Platform statistics"
              icon={BarChart3}
              href="/admin/analytics"
            />
            <QuickActionCard
              title="Approve Content"
              description="Review pending content"
              icon={FileCheck}
              href="/admin/moderation?tab=content"
              badge={stats.pendingContent}
            />
          </div>
        </div>

        {/* Side-by-side panels: Page Views + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Page Views Analytics Panel - Left */}
          <div className="h-[500px]">
            <PageViewsPanel
              pageViewStats={pageViewStats}
              timeRange={timeRange}
              onTimeRangeChange={handleTimeRangeChange}
            />
          </div>

          {/* Recent Activity Log Panel - Right */}
          <div className="h-[500px]">
            <ActivityLogPanel activities={recentActivity} />
          </div>
        </div>

        {/* Side-by-side panels: Admin Activity + Logged In Users */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Admin Activity Panel - Left */}
          <div className="h-[500px]">
            <AdminActivityPanel
              activities={adminActivities}
              timeRange={timeRange}
              onTimeRangeChange={handleTimeRangeChange}
            />
          </div>

          {/* Logged In Users Panel - Right */}
          <div className="h-[500px]">
            <LoggedInUsersPanel
              users={loggedInUsers}
              timeRange={timeRange}
              onTimeRangeChange={handleTimeRangeChange}
              currentAdminId={user.id}
              onForceLogout={handleForceLogout}
            />
          </div>
        </div>
      </div>
    </>
  );
}
