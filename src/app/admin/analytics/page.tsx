/**
 * Admin Analytics Dashboard Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Layout: AdminShell (provided by admin layout.tsx)
 * - Authentication: Admin-only access required
 * - Service Boundary: NO direct database access (API routes only)
 * - Credentials: 'include' for all fetch requests
 * - Complexity: ADVANCED tier (Chart.js integration)
 *
 * Features:
 * - Platform statistics cards (users, listings, revenue, subscriptions)
 * - Real-time metrics (active users/sessions with 30s refresh)
 * - Date range selector (7d, 30d, 90d, 1y)
 * - User growth chart (Line)
 * - Listing growth chart (Line)
 * - Monthly revenue chart (Bar)
 * - Tier distribution chart (Pie)
 * - Top categories, listings, users lists
 *
 * @authority PHASE_5.3_BRAIN_PLAN.md - Section 3.1
 * @component
 * @returns {JSX.Element} Admin analytics dashboard
 */

'use client';


// Force dynamic rendering (required for useAuth() - React Context cannot be used in SSG)
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { useAuth } from '@core/hooks/useAuth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorFallback } from '@/components/common/ErrorFallback';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { ErrorService } from '@core/services/ErrorService';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import {
  Users,
  Building2,
  DollarSign,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Download,
  Eye,
  Puzzle,
  type LucideIcon
} from 'lucide-react';
import { downloadFile, generateTimestampedFilename } from '@core/utils/export';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ComparisonData {
  current: number;
  previous: number;
  change: number | null;
}

interface PlatformStatistics {
  totalUsers: number;
  totalListings: number;
  totalRevenue: number;
  activeSubscriptions: number;
  totalEvents: number;
  totalReviews: number;
  userGrowth: Array<{ date: string; count: number }>;
  listingGrowth: Array<{ date: string; count: number }>;
  revenueByMonth: Array<{ month: string; revenue: number }>;
  topCategories: Array<{ name: string; count: number }>;
  topListings: Array<{ id: number; name: string; slug: string; views: number }>;
  topUsers: Array<{ id: number; name: string; username: string; listingCount: number }>;
  tierDistribution: Array<{ tier: string; count: number }>;
  activeUsers: number;
  activeSessions: number;
  // New KPIs
  uniqueVisitors: number;
  totalAddons: number;
  addonDistribution: Array<{ suiteName: string; displayName: string; count: number }>;
  comparison: {
    users: ComparisonData;
    listings: ComparisonData;
    revenue: ComparisonData;
  };
}

function AdminAnalyticsPageContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PlatformStatistics | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  // GOVERNANCE FIX: useEffect MUST be called before any early returns
  // React Rules of Hooks: Hooks must be called in the same order on every render
  useEffect(() => {
    // Only fetch if user is admin - conditional logic INSIDE the hook
    if (user?.role === 'admin') {
      fetchStatistics();

      // Real-time metrics refresh every 30 seconds
      const interval = setInterval(() => {
        fetchRealTimeMetrics();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [user, dateRange]);

  // Conditional returns AFTER all hooks
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600 font-medium">Access Denied: Admin privileges required</div>
      </div>
    );
  }

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics/overview?range=${dateRange}`, {
        credentials: 'include'
      });
      const result = await response.json();
      // GOVERNANCE: Navigate apiHandler envelope correctly
      // Response format: { success, data: { statistics }, meta }
      if (result.success && result.data?.statistics) {
        setStats(result.data.statistics);
      } else {
        ErrorService.capture('Failed to load analytics:', result.error);
      }
    } catch (error) {
      ErrorService.capture('Analytics fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRealTimeMetrics = async () => {
    try {
      const response = await fetch('/api/admin/analytics/realtime', {
        credentials: 'include'
      });
      const result = await response.json();
      // GOVERNANCE: Navigate apiHandler envelope correctly
      // Response format: { success, data: { activeUsers, activeSessions }, meta }
      if (result.success && result.data) {
        setStats(prev => prev ? {
          ...prev,
          activeUsers: result.data.activeUsers,
          activeSessions: result.data.activeSessions
        } : null);
      }
    } catch (error) {
      ErrorService.capture('Real-time metrics fetch error:', error);
    }
  };

  const handleExportCSV = () => {
    if (!stats) return;

    // Generate CSV content
    const rows: string[] = [];

    // Header
    rows.push('Analytics Report - ' + new Date().toLocaleDateString());
    rows.push('Date Range: ' + dateRange);
    rows.push('');

    // Summary metrics
    rows.push('SUMMARY METRICS');
    rows.push('Metric,Value,Previous Period,Change %');
    rows.push(`Unique Visitors,${stats.uniqueVisitors},,`);
    rows.push(`Total Users,${stats.totalUsers},,`);
    rows.push(`Total Listings,${stats.totalListings},,`);
    rows.push(`Total Add-ons,${stats.totalAddons},,`);
    rows.push(`Total Revenue,$${stats.totalRevenue},,`);
    rows.push(`Active Subscriptions,${stats.activeSubscriptions},,`);
    rows.push(`New Users (Period),${stats.comparison.users.current},${stats.comparison.users.previous},${stats.comparison.users.change ?? 'N/A'}%`);
    rows.push(`New Listings (Period),${stats.comparison.listings.current},${stats.comparison.listings.previous},${stats.comparison.listings.change ?? 'N/A'}%`);
    rows.push(`Revenue (Period),$${stats.comparison.revenue.current},$${stats.comparison.revenue.previous},${stats.comparison.revenue.change ?? 'N/A'}%`);
    rows.push('');

    // User growth
    rows.push('USER GROWTH');
    rows.push('Date,New Users');
    stats.userGrowth.forEach(d => rows.push(`${d.date},${d.count}`));
    rows.push('');

    // Listing growth
    rows.push('LISTING GROWTH');
    rows.push('Date,New Listings');
    stats.listingGrowth.forEach(d => rows.push(`${d.date},${d.count}`));
    rows.push('');

    // Revenue by month
    rows.push('REVENUE BY MONTH');
    rows.push('Month,Revenue');
    stats.revenueByMonth.forEach(d => rows.push(`${d.month},$${d.revenue}`));
    rows.push('');

    // Top categories
    rows.push('TOP CATEGORIES');
    rows.push('Category,Listings');
    stats.topCategories.forEach(c => rows.push(`"${c.name}",${c.count}`));
    rows.push('');

    // Top listings
    rows.push('TOP LISTINGS');
    rows.push('Name,Views,URL');
    stats.topListings.forEach(l => rows.push(`"${l.name}",${l.views},/listings/${l.slug}`));
    rows.push('');

    // Top users
    rows.push('TOP USERS');
    rows.push('Name,Listings');
    stats.topUsers.forEach(u => rows.push(`"${u.name}",${u.listingCount}`));
    rows.push('');

    // Tier distribution
    rows.push('TIER DISTRIBUTION');
    rows.push('Tier,Count');
    stats.tierDistribution.forEach(t => rows.push(`${t.tier},${t.count}`));
    rows.push('');

    // Add-on distribution
    rows.push('ADD-ON DISTRIBUTION');
    rows.push('Suite,Count');
    stats.addonDistribution.forEach(a => rows.push(`"${a.displayName}",${a.count}`));

    const csvContent = '\uFEFF' + rows.join('\r\n'); // UTF-8 BOM for Excel
    const filename = generateTimestampedFilename('analytics-report', 'csv');
    downloadFile(csvContent, filename, 'text/csv;charset=utf-8');
  };

  if (loading || !stats) {
    return (
      <AnalyticsLoadingSkeleton />
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics Dashboard</h1>
      <div className="space-y-6">
        {/* Date Range Selector & Export */}
        <div className="flex justify-between items-center">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <div className="flex gap-2">
            {(['7d', '30d', '90d', '1y'] as const).map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded transition ${
                  dateRange === range
                    ? 'bg-[#ed6437] text-white'
                    : 'bg-white border hover:bg-gray-50'
                }`}
              >
                {range === '7d' && 'Last 7 Days'}
                {range === '30d' && 'Last 30 Days'}
                {range === '90d' && 'Last 90 Days'}
                {range === '1y' && 'Last Year'}
              </button>
            ))}
          </div>
        </div>

        {/* Top Statistics Cards - 6 KPIs in 2 rows */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Unique Visitors"
            value={stats.uniqueVisitors.toLocaleString()}
            icon={Eye}
            color="cyan"
          />
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={Users}
            color="blue"
            comparison={stats.comparison.users}
          />
          <StatCard
            title="Total Listings"
            value={stats.totalListings}
            icon={Building2}
            color="green"
            comparison={stats.comparison.listings}
          />
          <StatCard
            title="Total Add-ons"
            value={stats.totalAddons}
            icon={Puzzle}
            color="pink"
          />
          <StatCard
            title="Total Revenue"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            icon={DollarSign}
            color="purple"
            comparison={stats.comparison.revenue}
          />
          <StatCard
            title="Active Subscriptions"
            value={stats.activeSubscriptions}
            icon={CreditCard}
            color="orange"
          />
        </div>

        {/* Real-Time Metrics */}
        <div className="bg-white p-6 rounded shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Real-Time Metrics</h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Last 5 minutes</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Active Visitors</div>
              <div className="text-3xl font-bold text-green-600">{stats.activeUsers}</div>
              <div className="text-xs text-gray-400">All visitors (auth + anonymous)</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Logged-In Users</div>
              <div className="text-3xl font-bold text-blue-600">{stats.activeSessions}</div>
              <div className="text-xs text-gray-400">Authenticated only</div>
            </div>
          </div>
        </div>

        {/* Charts Row 1: User & Listing Growth */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="User Growth">
            <Line
              data={{
                labels: stats.userGrowth?.map(d => d.date) || [],
                datasets: [{
                  label: 'New Users',
                  data: stats.userGrowth?.map(d => d.count) || [],
                  borderColor: 'rgb(59, 130, 246)',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  tension: 0.4
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: true, position: 'top' }
                }
              }}
            />
          </ChartCard>

          <ChartCard title="Listing Growth">
            <Line
              data={{
                labels: stats.listingGrowth?.map(d => d.date) || [],
                datasets: [{
                  label: 'New Listings',
                  data: stats.listingGrowth?.map(d => d.count) || [],
                  borderColor: 'rgb(34, 197, 94)',
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  tension: 0.4
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: true, position: 'top' }
                }
              }}
            />
          </ChartCard>
        </div>

        {/* Charts Row 2: Revenue & Tier Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Monthly Revenue">
            <Bar
              data={{
                labels: stats.revenueByMonth?.map(d => d.month) || [],
                datasets: [{
                  label: 'Revenue ($)',
                  data: stats.revenueByMonth?.map(d => d.revenue) || [],
                  backgroundColor: 'rgba(147, 51, 234, 0.6)',
                  borderColor: 'rgb(147, 51, 234)',
                  borderWidth: 1
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: true, position: 'top' }
                }
              }}
            />
          </ChartCard>

          {/* Subscription & Add-on Distribution - Dual Chart Panel */}
          <div className="bg-white p-6 rounded shadow">
            <h3 className="text-lg font-medium mb-4">Subscription & Add-on Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Subscription Tiers */}
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-3 text-center">Subscription Tiers</h4>
                <div style={{ height: '250px' }} className="flex items-center justify-center">
                  {hasPieData(stats.tierDistribution) ? (
                    <Pie
                      data={{
                        labels: stats.tierDistribution?.map(d => d.tier.charAt(0).toUpperCase() + d.tier.slice(1)) || [],
                        datasets: [{
                          data: stats.tierDistribution?.map(d => d.count) || [],
                          backgroundColor: stats.tierDistribution?.map(d => getTierColor(d.tier, 0.7)) || [],
                          borderColor: stats.tierDistribution?.map(d => getTierColor(d.tier, 1)) || [],
                          borderWidth: 1
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: true, position: 'bottom' }
                        }
                      }}
                    />
                  ) : (
                    <EmptyChartState message="No active subscriptions" />
                  )}
                </div>
              </div>
              {/* Add-on Suites */}
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-3 text-center">Add-on Suites</h4>
                <div style={{ height: '250px' }} className="flex items-center justify-center">
                  {hasPieData(stats.addonDistribution) ? (
                    <Pie
                      data={{
                        labels: stats.addonDistribution?.map(d => d.displayName) || [],
                        datasets: [{
                          data: stats.addonDistribution?.map(d => d.count) || [],
                          backgroundColor: stats.addonDistribution?.map(d => getAddonColor(d.suiteName, 0.7)) || [],
                          borderColor: stats.addonDistribution?.map(d => getAddonColor(d.suiteName, 1)) || [],
                          borderWidth: 1
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: true, position: 'bottom' }
                        }
                      }}
                    />
                  ) : (
                    <EmptyChartState message="No active add-ons" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Lists Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TopListCard
            title="Top Categories"
            items={(stats.topCategories || []).map(cat => ({
              label: cat.name,
              value: `${cat.count} listings`
            }))}
          />

          <TopListCard
            title="Top Listings"
            items={(stats.topListings || []).map(listing => ({
              label: listing.name,
              value: `${listing.views.toLocaleString()} views`,
              link: `/listings/${listing.slug}`
            }))}
          />

          <TopListCard
            title="Top Users"
            items={(stats.topUsers || []).map(u => ({
              label: u.name,
              value: `${u.listingCount} listings`,
              link: `/profile/${u.username}`
            }))}
          />
        </div>
      </div>
    </>
  );
}

type StatCardColor = 'blue' | 'green' | 'purple' | 'orange' | 'cyan' | 'pink';

const colorStyles: Record<StatCardColor, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-500' },
  green: { bg: 'bg-green-50', text: 'text-green-500' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-500' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-500' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-500' },
  pink: { bg: 'bg-pink-50', text: 'text-pink-500' }
};

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  comparison
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: StatCardColor;
  comparison?: ComparisonData;
}) {
  const styles = colorStyles[color];

  return (
    <div className="bg-white p-6 rounded shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-600">{title}</div>
        <div className={`p-2 rounded-lg ${styles.bg}`}>
          <Icon className={`w-5 h-5 ${styles.text}`} />
        </div>
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      {comparison && comparison.change !== null && (
        <div className={`flex items-center gap-1 text-sm ${
          comparison.change >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {comparison.change >= 0 ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span>{comparison.change >= 0 ? '+' : ''}{comparison.change}% vs prev period</span>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded shadow">
      <h3 className="text-lg font-medium mb-4">{title}</h3>
      <div style={{ height: '300px' }}>
        {children}
      </div>
    </div>
  );
}

function TopListCard({
  title,
  items
}: {
  title: string;
  items: Array<{ label: string; value: string; link?: string }>;
}) {
  return (
    <div className="bg-white p-6 rounded shadow">
      <h3 className="text-lg font-medium mb-4">{title}</h3>
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center">
            {item.link ? (
              <Link
                href={item.link as Route}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-medium">{item.label}</span>
            )}
            <span className="text-sm text-gray-600">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Check if pie chart data has any non-zero values
 * Chart.js Pie charts don't render when all values are 0 or array is empty
 */
function hasPieData(data: Array<{ count: number }> | undefined): boolean {
  if (!data || data.length === 0) return false;
  return data.some(item => item.count > 0);
}

/**
 * Get tier color matching TierBadge component colors
 * @see src/features/admin/components/packages/TierBadge.tsx
 *
 * Colors match Tailwind classes:
 * - essentials: gray-400 (neutral, free tier)
 * - plus: blue-500 (professional)
 * - preferred: purple-500 (premium)
 * - premium: amber-500 (gold/top tier)
 */
function getTierColor(tier: string, alpha: number = 1): string {
  const tierLower = tier.toLowerCase();
  let r: number, g: number, b: number;

  switch (tierLower) {
    case 'essentials':
      r = 156; g = 163; b = 175; // gray-400
      break;
    case 'plus':
      r = 59; g = 130; b = 246; // blue-500
      break;
    case 'preferred':
      r = 168; g = 85; b = 247; // purple-500
      break;
    case 'premium':
      r = 245; g = 158; b = 11; // amber-500
      break;
    default:
      r = 156; g = 163; b = 175; // gray-400 fallback
  }

  return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Get add-on suite color
 * Industry-appropriate colors for each add-on type:
 * - creator: orange (creative energy)
 * - realtor: teal (professional, trustworthy)
 * - restaurant: rose (food, appetite)
 * - seo_scribe: indigo (technical, digital)
 */
function getAddonColor(suiteName: string, alpha: number = 1): string {
  const nameLower = suiteName.toLowerCase();
  let r: number, g: number, b: number;

  switch (nameLower) {
    case 'creator':
      r = 249; g = 115; b = 22; // orange-500
      break;
    case 'realtor':
      r = 20; g = 184; b = 166; // teal-500
      break;
    case 'restaurant':
      r = 244; g = 63; b = 94; // rose-500
      break;
    case 'seo_scribe':
      r = 99; g = 102; b = 241; // indigo-500
      break;
    default:
      r = 156; g = 163; b = 175; // gray-400 fallback
  }

  return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * EmptyChartState - Display when pie chart has no data
 */
function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-4">
      <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      </div>
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}

/**
 * AnalyticsLoadingSkeleton - Loading state for analytics dashboard
 * Prevents CLS and provides visual feedback during data loading
 */
function AnalyticsLoadingSkeleton() {
  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics Dashboard</h1>
      <div className="space-y-6">
        {/* Date Range Selector Skeleton */}
        <div className="flex justify-between items-center">
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>

        {/* Stat Cards Skeleton - 6 cards in 2 rows */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white p-6 rounded shadow animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-4 w-24 bg-gray-200 rounded" />
                <div className="h-10 w-10 bg-gray-200 rounded-lg" />
              </div>
              <div className="h-8 w-20 bg-gray-200 rounded mb-2" />
              <div className="h-4 w-32 bg-gray-200 rounded" />
            </div>
          ))}
        </div>

        {/* Real-Time Metrics Skeleton */}
        <div className="bg-white p-6 rounded shadow animate-pulse">
          <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
              <div className="h-10 w-16 bg-gray-200 rounded" />
            </div>
            <div>
              <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
              <div className="h-10 w-16 bg-gray-200 rounded" />
            </div>
          </div>
        </div>

        {/* Charts Row 1 Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="bg-white p-6 rounded shadow animate-pulse">
              <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
              <div className="h-[300px] bg-gray-100 rounded flex items-center justify-center">
                <div className="text-gray-400">Loading chart...</div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row 2 Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="bg-white p-6 rounded shadow animate-pulse">
              <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
              <div className="h-[300px] bg-gray-100 rounded flex items-center justify-center">
                <div className="text-gray-400">Loading chart...</div>
              </div>
            </div>
          ))}
        </div>

        {/* Top Lists Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white p-6 rounded shadow animate-pulse">
              <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(j => (
                  <div key={j} className="flex justify-between">
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                    <div className="h-4 w-16 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/**
 * AdminAnalyticsPage - Error boundary wrapper for analytics dashboard
 * @phase Phase R4.2 - Error Boundary Implementation
 */
export default function AdminAnalyticsPage() {
  return (
    <ErrorBoundary
      fallback={
        <ErrorFallback
          title="Analytics Dashboard Error"
          message="Unable to load analytics dashboard. Please try again."
        />
      }
      isolate={true}
      componentName="AdminAnalyticsPage"
    >
      <AdminAnalyticsPageContent />
    </ErrorBoundary>
  );
}
