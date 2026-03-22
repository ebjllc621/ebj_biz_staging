/**
 * Admin SEO Dashboard Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: AdminDashboardTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: NO direct database access (API routes only)
 * - Credentials: 'include' for all fetch requests
 * - Complexity: STANDARD tier (Chart.js integration)
 *
 * Features:
 * - SEO health scores overview
 * - Grade distribution chart (Pie)
 * - Entity health table with badges
 * - Missing meta tags report
 * - Sitemap status and regeneration
 *
 * @authority PHASE_6.3_BRAIN_PLAN.md - Section 3.5
 * @component
 * @returns {JSX.Element} Admin SEO dashboard
 */

'use client';


// Force dynamic rendering (required for useAuth() - React Context cannot be used in SSG)
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { AdminDashboardTemplate } from '@/components/admin/templates/AdminDashboardTemplate';
import { useAuth } from '@core/hooks/useAuth';
import { Bar, Pie } from 'react-chartjs-2';
import { fetchWithCsrf } from '@core/utils/csrf';
import { BarChart3, Star, AlertTriangle, Map, Trash2 } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register Chart.js components (same pattern as performance page)
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface SEOHealthData {
  totalEntities: number;
  averageScore: number;
  gradeDistribution: Array<{ grade: string; count: number }>;
  entitiesWithoutMetadata: number;
  orphanedMetadataCount: number;
  sitemapLastGenerated: string | null;
  sitemapUrlCount: number;
  entityHealth: Array<{
    entityType: string;
    entityId: number;
    name: string;
    score: number;
    grade: string;
    issues: string[];
  }>;
}

export default function AdminSEOPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState<SEOHealthData | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  // GOVERNANCE FIX: useEffect MUST be called before any early returns
  // React Rules of Hooks: Hooks must be called in the same order on every render
  useEffect(() => {
    // Only fetch if user is admin - conditional logic INSIDE the hook
    if (user?.role === 'admin') {
      fetchSEOHealth();
    }
  }, [user]);

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

  const fetchSEOHealth = async () => {
    setLoading(true);
    try {
      // GOVERNANCE: credentials: 'include' for httpOnly cookies
      const response = await fetch('/api/admin/seo/health', {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to fetch SEO health');
      const data = await response.json();
      setHealthData(data.data?.healthData || null);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const regenerateSitemap = async () => {
    setRegenerating(true);
    try {
      // @governance MANDATORY - CSRF protection for POST requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf('/api/seo/sitemap/regenerate', {method: 'POST'});

      if (!response.ok) throw new Error('Failed to regenerate sitemap');

      alert('Sitemap regenerated successfully');
      fetchSEOHealth(); // Refresh data
    } catch (error) {
      alert('Failed to regenerate sitemap');
    } finally {
      setRegenerating(false);
    }
  };

  if (loading || !healthData) {
    return (
      <div className="text-center py-12">Loading SEO health data...</div>
    );
  }

  // Chart data (same pattern as performance/analytics pages)
  const gradeChartData = {
    labels: healthData.gradeDistribution.map(g => `Grade ${g.grade}`),
    datasets: [{
      label: 'Entities',
      data: healthData.gradeDistribution.map(g => g.count),
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',   // A - green
        'rgba(59, 130, 246, 0.8)',  // B - blue
        'rgba(251, 191, 36, 0.8)',  // C - yellow
        'rgba(239, 68, 68, 0.8)'    // F - red
      ],
      borderColor: [
        'rgb(34, 197, 94)',
        'rgb(59, 130, 246)',
        'rgb(251, 191, 36)',
        'rgb(239, 68, 68)'
      ],
      borderWidth: 1
    }]
  };

  const scoreDistributionData = {
    labels: healthData.entityHealth.slice(0, 10).map(e => e.name.substring(0, 20)),
    datasets: [{
      label: 'SEO Score (0-100)',
      data: healthData.entityHealth.slice(0, 10).map(e => e.score),
      backgroundColor: healthData.entityHealth.slice(0, 10).map(e => {
        if (e.score >= 80) return 'rgba(34, 197, 94, 0.6)';
        if (e.score >= 60) return 'rgba(59, 130, 246, 0.6)';
        if (e.score >= 40) return 'rgba(251, 191, 36, 0.6)';
        return 'rgba(239, 68, 68, 0.6)';
      }),
      borderColor: healthData.entityHealth.slice(0, 10).map(e => {
        if (e.score >= 80) return 'rgb(34, 197, 94)';
        if (e.score >= 60) return 'rgb(59, 130, 246)';
        if (e.score >= 40) return 'rgb(251, 191, 36)';
        return 'rgb(239, 68, 68)';
      }),
      borderWidth: 1
    }]
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">SEO Dashboard</h1>
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Entities"
            value={healthData.totalEntities}
            icon={<BarChart3 className="w-6 h-6 text-gray-400" />}
          />
          <StatCard
            title="Average SEO Score"
            value={healthData.averageScore}
            icon={<Star className="w-6 h-6 text-yellow-400" />}
            color={healthData.averageScore >= 80 ? 'green' : healthData.averageScore >= 60 ? 'blue' : 'red'}
          />
          <StatCard
            title="Missing Metadata"
            value={healthData.entitiesWithoutMetadata}
            icon={<AlertTriangle className="w-6 h-6 text-orange-400" />}
            color="orange"
          />
          <StatCard
            title="Sitemap URLs"
            value={healthData.sitemapUrlCount}
            icon={<Map className="w-6 h-6 text-blue-400" />}
          />
        </div>

        {/* Orphaned Metadata Warning */}
        {healthData.orphanedMetadataCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded p-4 flex items-start gap-3">
            <Trash2 className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium text-amber-800">
                {healthData.orphanedMetadataCount} orphaned SEO metadata record{healthData.orphanedMetadataCount > 1 ? 's' : ''}
              </div>
              <div className="text-sm text-amber-700 mt-1">
                These seo_metadata rows reference entities that no longer exist in their source tables. They are excluded from the dashboard metrics.
              </div>
            </div>
          </div>
        )}

        {/* Sitemap Status Card */}
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-lg font-medium mb-4">Sitemap Status</h3>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-600">Last Generated</div>
              <div className="text-lg font-medium">
                {healthData.sitemapLastGenerated
                  ? new Date(healthData.sitemapLastGenerated).toLocaleString()
                  : 'Never'}
              </div>
              <div className="text-sm text-gray-600 mt-2">Total URLs: {healthData.sitemapUrlCount}</div>
            </div>
            <button
              onClick={regenerateSitemap}
              disabled={regenerating}
              className={`px-6 py-2 rounded transition ${
                regenerating
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-[#ed6437] text-white hover:bg-[#d55a2f]'
              }`}
            >
              {regenerating ? 'Regenerating...' : 'Regenerate Sitemap'}
            </button>
          </div>
        </div>

        {/* Charts Row: Grade Distribution & Score Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="SEO Grade Distribution">
            <Pie
              data={gradeChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: true, position: 'right' }
                }
              }}
            />
          </ChartCard>

          <ChartCard title="Top 10 Entities by Score">
            <Bar
              data={scoreDistributionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: true, position: 'top' }
                },
                scales: {
                  y: { beginAtZero: true, max: 100 }
                }
              }}
            />
          </ChartCard>
        </div>

        {/* Entity Health Table */}
        <div className="bg-white rounded shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-medium">Entity SEO Health</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issues
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {healthData.entityHealth.map((entity, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {entity.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entity.entityType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entity.score}/100
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${getGradeBadgeColor(entity.grade)}`}>
                        {entity.grade}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {entity.issues.length} issues
                    </td>
                  </tr>
                ))}
                {healthData.entityHealth.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500 text-sm">
                      No SEO metadata found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({
  title,
  value,
  icon,
  color = 'gray'
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'green' | 'blue' | 'orange' | 'red' | 'gray';
}) {
  const colorClasses = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
    gray: 'text-gray-900'
  };

  return (
    <div className="bg-white p-6 rounded shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-600">{title}</div>
        {icon}
      </div>
      <div className={`text-3xl font-bold mb-1 ${colorClasses[color]}`}>{value}</div>
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

function getGradeBadgeColor(grade: string): string {
  switch (grade) {
    case 'A':
      return 'bg-green-100 text-green-800';
    case 'B':
      return 'bg-blue-100 text-blue-800';
    case 'C':
      return 'bg-yellow-100 text-yellow-800';
    case 'F':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
