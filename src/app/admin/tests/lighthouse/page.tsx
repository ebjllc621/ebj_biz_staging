/**
 * Admin Lighthouse Testing Dashboard
 *
 * GOVERNANCE COMPLIANCE:
 * - Component tier: ADVANCED (multiple data displays, ErrorBoundary required)
 * - Client Component: 'use client'
 * - credentials: 'include' on all fetch
 * - Admin authentication required
 * - NO direct database access
 *
 * Features:
 * - Test individual pages or full categories
 * - Custom URL input for testing any page
 * - Load cached results from CLI runs
 * - Real-time test status tracking
 * - Score visualization (Performance, Accessibility, SEO, Best Practices)
 *
 * @tier ADVANCED
 * @phase Performance Testing Infrastructure
 * @authority tests/pagePerformance/LIGHTHOUSE_PERFORMANCE_BRAIN_PLAN.md
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@core/hooks/useAuth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Gauge,
  Globe,
  LayoutDashboard,
  Shield,
  Search,
  ExternalLink,
  Loader2,
  FileText
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface LighthouseResult {
  url: string;
  scores: {
    performance: number;
    accessibility: number;
    seo: number;
    bestPractices: number;
  };
  metrics: {
    lcp: number;
    fid: number;
    cls: number;
    fcp: number;
    tbt: number;
    ttfb: number;
  };
  timestamp: string;
}

interface PageConfig {
  path: string;
  name: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

interface TestCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  pages: PageConfig[];
  expanded: boolean;
  status: 'idle' | 'loading' | 'loaded' | 'running' | 'error';
  results: LighthouseResult[];
  lastLoaded?: string;
  error?: string;
}

// =============================================================================
// Page Configuration Data
// =============================================================================

const getInitialTestCategories = (): TestCategory[] => [
  {
    id: 'public',
    name: 'Public Pages',
    description: 'Customer-facing pages - Home, Listings, Events, Offers (5 pages)',
    icon: Globe,
    expanded: true,
    status: 'idle',
    results: [],
    pages: [
      { path: '/', name: 'Home', priority: 'CRITICAL' },
      { path: '/listings', name: 'Listings Directory', priority: 'CRITICAL' },
      { path: '/events', name: 'Events Directory', priority: 'HIGH' },
      { path: '/offers', name: 'Offers Directory', priority: 'HIGH' },
      { path: '/content', name: 'Content', priority: 'MEDIUM' },
    ],
  },
  {
    id: 'dashboard',
    name: 'User Dashboard',
    description: 'Authenticated user pages - Dashboard, Bookmarks, Messages (18 pages)',
    icon: LayoutDashboard,
    expanded: false,
    status: 'idle',
    results: [],
    pages: [
      { path: '/dashboard', name: 'Dashboard', priority: 'CRITICAL' },
      { path: '/dashboard/bookmarks', name: 'Bookmarks', priority: 'HIGH' },
      { path: '/dashboard/reviews', name: 'Reviews', priority: 'HIGH' },
      { path: '/dashboard/appointments', name: 'Appointments', priority: 'HIGH' },
      { path: '/dashboard/events', name: 'Events', priority: 'HIGH' },
      { path: '/dashboard/messages', name: 'Messages', priority: 'HIGH' },
      { path: '/dashboard/notifications', name: 'Notifications', priority: 'HIGH' },
      { path: '/dashboard/activity', name: 'Activity', priority: 'MEDIUM' },
      { path: '/dashboard/purchases', name: 'Purchases', priority: 'MEDIUM' },
      { path: '/dashboard/saved-searches', name: 'Saved Searches', priority: 'MEDIUM' },
      { path: '/dashboard/quotes', name: 'Quotes', priority: 'MEDIUM' },
      { path: '/dashboard/leads', name: 'Leads', priority: 'MEDIUM' },
      { path: '/dashboard/calendar', name: 'Calendar', priority: 'MEDIUM' },
      { path: '/dashboard/contacts', name: 'Contacts', priority: 'LOW' },
      { path: '/dashboard/followers', name: 'Followers', priority: 'LOW' },
      { path: '/dashboard/following', name: 'Following', priority: 'LOW' },
      { path: '/dashboard/connections', name: 'Connections', priority: 'LOW' },
      { path: '/dashboard/subscription', name: 'Subscription', priority: 'LOW' },
    ],
  },
  {
    id: 'admin',
    name: 'Admin Panel',
    description: 'Admin management pages - Users, Listings, Analytics (25 pages)',
    icon: Shield,
    expanded: false,
    status: 'idle',
    results: [],
    pages: [
      { path: '/admin', name: 'Admin Dashboard', priority: 'CRITICAL' },
      { path: '/admin/users', name: 'User Management', priority: 'CRITICAL' },
      { path: '/admin/listings', name: 'Listings', priority: 'CRITICAL' },
      { path: '/admin/analytics', name: 'Analytics', priority: 'HIGH' },
      { path: '/admin/performance', name: 'Performance', priority: 'HIGH' },
      { path: '/admin/categories', name: 'Categories', priority: 'HIGH' },
      { path: '/admin/events', name: 'Events', priority: 'HIGH' },
      { path: '/admin/reviews', name: 'Reviews', priority: 'HIGH' },
      { path: '/admin/media', name: 'Media', priority: 'HIGH' },
      { path: '/admin/settings', name: 'Settings', priority: 'MEDIUM' },
      { path: '/admin/appointments', name: 'Appointments', priority: 'MEDIUM' },
      { path: '/admin/campaigns', name: 'Campaigns', priority: 'MEDIUM' },
      { path: '/admin/discounts', name: 'Discounts', priority: 'MEDIUM' },
      { path: '/admin/offers', name: 'Offers', priority: 'MEDIUM' },
      { path: '/admin/moderation', name: 'Moderation', priority: 'MEDIUM' },
      { path: '/admin/menus', name: 'Menus', priority: 'LOW' },
      { path: '/admin/types', name: 'Types', priority: 'LOW' },
      { path: '/admin/seo', name: 'SEO', priority: 'LOW' },
      { path: '/admin/email-templates', name: 'Email Templates', priority: 'LOW' },
      { path: '/admin/notification-manager', name: 'Notifications', priority: 'LOW' },
      { path: '/admin/feature-flags', name: 'Feature Flags', priority: 'LOW' },
      { path: '/admin/database-manager', name: 'Database', priority: 'LOW' },
      { path: '/admin/reports/users', name: 'User Reports', priority: 'LOW' },
      { path: '/admin/claims', name: 'Claims', priority: 'LOW' },
      { path: '/admin/listings-basic', name: 'Listings Basic', priority: 'LOW' },
    ],
  },
];

// =============================================================================
// Score Badge Component
// =============================================================================

function ScoreBadge({ score, label }: { score: number; label: string }) {
  const displayScore = Math.round(score * 100);
  const colorClass =
    displayScore >= 90 ? 'bg-green-100 text-green-800 border-green-200' :
    displayScore >= 50 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
    'bg-red-100 text-red-800 border-red-200';

  return (
    <div className="text-center">
      <span className={`inline-block px-2 py-1 rounded text-sm font-semibold border ${colorClass}`}>
        {displayScore}
      </span>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

// =============================================================================
// Priority Badge Component
// =============================================================================

function PriorityBadge({ priority }: { priority: PageConfig['priority'] }) {
  const colorClass =
    priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
    priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
    priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
    'bg-gray-100 text-gray-700';

  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${colorClass}`}>
      {priority}
    </span>
  );
}

// =============================================================================
// Status Badge Component
// =============================================================================

function StatusBadge({ status }: { status: TestCategory['status'] }) {
  switch (status) {
    case 'loading':
    case 'running':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <RefreshCw className="w-3 h-3 animate-spin" />
          {status === 'loading' ? 'Loading' : 'Running'}
        </span>
      );
    case 'loaded':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle2 className="w-3 h-3" />
          Loaded
        </span>
      );
    case 'error':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3" />
          Error
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          <Clock className="w-3 h-3" />
          Idle
        </span>
      );
  }
}

// =============================================================================
// Results Table Component
// =============================================================================

function ResultsTable({ results }: { results: LighthouseResult[] }) {
  if (results.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Perf</th>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">A11y</th>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">SEO</th>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">BP</th>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">LCP</th>
            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">TBT</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {results.map((result, idx) => {
            const perfScore = Math.round(result.scores.performance * 100);
            const a11yScore = Math.round(result.scores.accessibility * 100);
            const seoScore = Math.round(result.scores.seo * 100);
            const bpScore = Math.round(result.scores.bestPractices * 100);

            const getScoreColor = (score: number) =>
              score >= 90 ? 'text-green-600 font-semibold' :
              score >= 50 ? 'text-yellow-600 font-medium' :
              'text-red-600 font-semibold';

            return (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-sm text-gray-900">{result.url}</td>
                <td className={`px-4 py-2 text-center text-sm ${getScoreColor(perfScore)}`}>{perfScore}</td>
                <td className={`px-4 py-2 text-center text-sm ${getScoreColor(a11yScore)}`}>{a11yScore}</td>
                <td className={`px-4 py-2 text-center text-sm ${getScoreColor(seoScore)}`}>{seoScore}</td>
                <td className={`px-4 py-2 text-center text-sm ${getScoreColor(bpScore)}`}>{bpScore}</td>
                <td className="px-4 py-2 text-center text-sm text-gray-600">{Math.round(result.metrics.lcp)}ms</td>
                <td className="px-4 py-2 text-center text-sm text-gray-600">{Math.round(result.metrics.tbt)}ms</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// =============================================================================
// Test Category Section Component
// =============================================================================

function TestCategorySection({
  category,
  onToggle,
  onLoadResults,
  onRunTests
}: {
  category: TestCategory;
  onToggle: () => void;
  onLoadResults: () => void;
  onRunTests: () => void;
}) {
  const Icon = category.icon;
  const totalPages = category.pages.length;
  const resultsCount = category.results.length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Category Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <button className="p-1">
            {category.expanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
          <Icon className="w-5 h-5 text-[#ed6437]" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{category.name}</h3>
            <p className="text-xs text-gray-500">{category.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">{totalPages} pages</span>
            {resultsCount > 0 && (
              <span className="text-green-600">{resultsCount} results</span>
            )}
          </div>
          <StatusBadge status={category.status} />
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLoadResults();
              }}
              disabled={category.status === 'loading' || category.status === 'running'}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FileText className="w-3 h-3" />
              Load
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRunTests();
              }}
              disabled={category.status === 'loading' || category.status === 'running'}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#ed6437] border border-[#ed6437] rounded-md hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-3 h-3" />
              Run All
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {category.expanded && (
        <div className="p-4 space-y-4">
          {/* Pages List */}
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-48 overflow-y-auto">
              {category.pages.map((page) => (
                <div
                  key={page.path}
                  className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-900">{page.name}</span>
                    <PriorityBadge priority={page.priority} />
                  </div>
                  <span className="text-xs text-gray-500 font-mono">{page.path}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Error Display */}
          {category.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{category.error}</p>
            </div>
          )}

          {/* Results Table */}
          {category.results.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Results {category.lastLoaded && <span className="text-gray-400 font-normal">from {category.lastLoaded}</span>}
              </h4>
              <ResultsTable results={category.results} />
            </div>
          )}

          {/* CLI Hint */}
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded">
            <span>CLI:</span>
            <code className="bg-gray-200 px-2 py-0.5 rounded font-mono">npm run lighthouse:{category.id}</code>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Custom URL Test Section Component
// =============================================================================

function CustomUrlTestSection({
  onTest,
  isRunning,
  result,
  error
}: {
  onTest: (url: string) => void;
  isRunning: boolean;
  result: LighthouseResult | null;
  error: string | null;
}) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onTest(url.trim());
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Search className="w-4 h-4 text-[#ed6437]" />
        Test Custom URL
      </h3>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter page path (e.g., /listings/my-business) or full URL"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
            disabled={isRunning}
          />
        </div>
        <button
          type="submit"
          disabled={isRunning || !url.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg text-sm font-medium hover:bg-[#d55730] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Test
            </>
          )}
        </button>
      </form>

      {/* CLI Instructions or Error Display */}
      {error && (
        <div className={`mt-3 p-3 rounded-lg ${error.startsWith('CLI Required:') ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'}`}>
          {error.startsWith('CLI Required:') ? (
            <div>
              <p className="text-sm font-medium text-blue-800 mb-1">Run via CLI for reliable results:</p>
              <code className="block text-xs bg-blue-100 px-2 py-1 rounded font-mono text-blue-900">
                {error.replace('CLI Required: ', '')}
              </code>
            </div>
          ) : (
            <p className="text-sm text-red-800">{error}</p>
          )}
        </div>
      )}

      {/* Single Result Display */}
      {result && !error && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
              Results for: <span className="font-mono text-[#ed6437]">{result.url}</span>
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </h4>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
            <ScoreBadge score={result.scores.performance} label="Performance" />
            <ScoreBadge score={result.scores.accessibility} label="Accessibility" />
            <ScoreBadge score={result.scores.seo} label="SEO" />
            <ScoreBadge score={result.scores.bestPractices} label="Best Practices" />
            <div className="text-center">
              <span className="inline-block px-2 py-1 rounded text-sm font-semibold bg-gray-100 text-gray-800 border border-gray-200">
                {Math.round(result.metrics.lcp)}ms
              </span>
              <p className="text-xs text-gray-500 mt-1">LCP</p>
            </div>
            <div className="text-center">
              <span className="inline-block px-2 py-1 rounded text-sm font-semibold bg-gray-100 text-gray-800 border border-gray-200">
                {Math.round(result.metrics.tbt)}ms
              </span>
              <p className="text-xs text-gray-500 mt-1">TBT</p>
            </div>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-500">
        Tests take 30-60 seconds per page. For reliable bulk testing, use the CLI commands.
      </p>
    </div>
  );
}

// =============================================================================
// Main Dashboard Content
// =============================================================================

function LighthouseTestDashboardContent() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<TestCategory[]>(getInitialTestCategories);
  const [testOutput, setTestOutput] = useState<string>('');
  const [customResult, setCustomResult] = useState<LighthouseResult | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);
  const [isCustomRunning, setIsCustomRunning] = useState(false);

  const toggleCategory = useCallback((categoryId: string) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId ? { ...cat, expanded: !cat.expanded } : cat
      )
    );
  }, []);

  const loadCategoryResults = useCallback(async (categoryId: string) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId ? { ...cat, status: 'loading', error: undefined } : cat
      )
    );
    setTestOutput(prev => `${prev}\n[Loading] Fetching cached results for ${categoryId}...\n`);

    try {
      const response = await fetch(`/api/admin/lighthouse/reports?category=${categoryId}`, {
        credentials: 'include',
      });
      const data = await response.json();

      if (response.ok && data.results && data.results.length > 0) {
        setCategories(prev =>
          prev.map(cat =>
            cat.id === categoryId
              ? {
                  ...cat,
                  status: 'loaded',
                  results: data.results,
                  lastLoaded: data.date,
                  error: undefined
                }
              : cat
          )
        );
        setTestOutput(prev => `${prev}[Success] Loaded ${data.results.length} results from ${data.date}\n`);
      } else {
        setCategories(prev =>
          prev.map(cat =>
            cat.id === categoryId
              ? {
                  ...cat,
                  status: 'error',
                  error: data.message || `No cached results. Run: npm run lighthouse:${categoryId}`
                }
              : cat
          )
        );
        setTestOutput(prev => `${prev}[Info] ${data.message || 'No cached results found'}\n`);
      }
    } catch (err: any) {
      setCategories(prev =>
        prev.map(cat =>
          cat.id === categoryId
            ? { ...cat, status: 'error', error: err.message || 'Failed to load results' }
            : cat
        )
      );
      setTestOutput(prev => `${prev}[Error] ${err.message}\n`);
    }
  }, []);

  const runCategoryTests = useCallback(async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId ? { ...cat, status: 'running', error: undefined } : cat
      )
    );
    setTestOutput(prev => `${prev}\n[Info] Checking test requirements for ${category.name}...\n`);

    try {
      const response = await fetch('/api/admin/lighthouse/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          category: categoryId,
          pages: category.pages.map(p => p.path),
        }),
      });

      const data = await response.json();

      // Handle CLI instruction response (canRunInApi: false)
      if (response.ok && data.canRunInApi === false) {
        const cliMessage = `Run via CLI: ${data.cliCommand || `npm run lighthouse:${categoryId}`}`;
        setCategories(prev =>
          prev.map(cat =>
            cat.id === categoryId
              ? { ...cat, status: 'idle', error: cliMessage }
              : cat
          )
        );
        setTestOutput(prev => `${prev}[CLI Required] ${data.message}\n`);
        setTestOutput(prev => `${prev}[Command] ${data.cliCommand}\n`);
        if (data.instructions) {
          data.instructions.forEach((inst: string) => {
            setTestOutput(prev => `${prev}  ${inst}\n`);
          });
        }
        return;
      }

      if (response.ok && data.results) {
        setCategories(prev =>
          prev.map(cat =>
            cat.id === categoryId
              ? {
                  ...cat,
                  status: 'loaded',
                  results: data.results,
                  lastLoaded: new Date().toISOString().split('T')[0],
                  error: undefined
                }
              : cat
          )
        );
        setTestOutput(prev => `${prev}[Success] Completed ${data.results.length} tests\n`);
      } else {
        const errorMsg = typeof data.error === 'string' ? data.error : data.error?.message || data.message || 'Test execution failed';
        setCategories(prev =>
          prev.map(cat =>
            cat.id === categoryId
              ? { ...cat, status: 'idle', error: errorMsg }
              : cat
          )
        );
        setTestOutput(prev => `${prev}[Info] ${errorMsg}\n`);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to run tests';
      setCategories(prev =>
        prev.map(cat =>
          cat.id === categoryId
            ? { ...cat, status: 'error', error: errorMsg }
            : cat
        )
      );
      setTestOutput(prev => `${prev}[Error] ${errorMsg}\n`);
    }
  }, [categories]);

  const runCustomTest = useCallback(async (inputUrl: string) => {
    setIsCustomRunning(true);
    setCustomResult(null);
    setCustomError(null);
    setTestOutput(prev => `${prev}\n[Info] Checking test requirements for: ${inputUrl}...\n`);

    // Determine the category
    let category = 'public';
    if (inputUrl.includes('/admin')) {
      category = 'admin';
    } else if (inputUrl.includes('/dashboard')) {
      category = 'dashboard';
    }

    try {
      const response = await fetch('/api/admin/lighthouse/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url: inputUrl, category }),
      });

      const data = await response.json();

      // Handle CLI instruction response (canRunInApi: false)
      if (response.ok && data.canRunInApi === false) {
        setTestOutput(prev => `${prev}[CLI Required] ${data.message}\n`);
        setTestOutput(prev => `${prev}[Command] ${data.cliCommand}\n`);
        if (data.instructions) {
          data.instructions.forEach((inst: string) => {
            setTestOutput(prev => `${prev}  ${inst}\n`);
          });
        }
        // Set a helpful message instead of error
        setCustomError(`CLI Required: ${data.cliCommand}`);
        return;
      }

      if (response.ok && data.result) {
        setCustomResult(data.result);
        setTestOutput(prev => `${prev}[Success] Test completed for ${inputUrl}\n`);
      } else {
        const errorMsg = typeof data.error === 'string' ? data.error : data.message || 'Test failed';
        setCustomError(errorMsg);
        setTestOutput(prev => `${prev}[Info] ${errorMsg}\n`);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to run test';
      setCustomError(errorMsg);
      setTestOutput(prev => `${prev}[Error] ${errorMsg}\n`);
    } finally {
      setIsCustomRunning(false);
    }
  }, []);

  const clearOutput = useCallback(() => {
    setTestOutput('');
  }, []);

  // Calculate totals
  const totalPages = categories.reduce((sum, c) => sum + c.pages.length, 0);
  const totalResults = categories.reduce((sum, c) => sum + c.results.length, 0);
  const loadedCategories = categories.filter(c => c.status === 'loaded').length;

  // Admin check
  if (user?.role !== 'admin') {
    return (
      <div className="p-8 text-center text-gray-600">
        Access denied. Admin privileges required.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Gauge className="w-6 h-6 text-[#ed6437]" />
              Lighthouse Testing
            </h1>
            <p className="text-sm text-gray-600">
              Performance, Accessibility, SEO, and Best Practices Testing
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Categories</p>
            <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Total Pages</p>
            <p className="text-2xl font-bold text-gray-900">{totalPages}</p>
          </div>
          <div className="bg-white rounded-lg border border-green-200 p-4">
            <p className="text-xs font-medium text-green-600 uppercase">Results Loaded</p>
            <p className="text-2xl font-bold text-green-600">{totalResults}</p>
          </div>
          <div className="bg-white rounded-lg border border-blue-200 p-4">
            <p className="text-xs font-medium text-blue-600 uppercase">Categories Ready</p>
            <p className="text-2xl font-bold text-blue-600">{loadedCategories}/{categories.length}</p>
          </div>
        </div>

        {/* Custom URL Test Section */}
        <CustomUrlTestSection
          onTest={runCustomTest}
          isRunning={isCustomRunning}
          result={customResult}
          error={customError}
        />

        {/* Test Categories */}
        <div className="space-y-4">
          {categories.map(category => (
            <TestCategorySection
              key={category.id}
              category={category}
              onToggle={() => toggleCategory(category.id)}
              onLoadResults={() => loadCategoryResults(category.id)}
              onRunTests={() => runCategoryTests(category.id)}
            />
          ))}
        </div>

        {/* Test Output Console */}
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
            <span className="text-sm font-medium text-gray-300">Test Output</span>
            <button
              onClick={clearOutput}
              className="text-xs text-gray-400 hover:text-white"
            >
              Clear
            </button>
          </div>
          <pre className="p-4 text-sm text-green-400 font-mono h-48 overflow-auto">
            {testOutput || '// Test output will appear here...\n// Click "Load" to fetch cached CLI results\n// Click "Run All" to execute tests via API (slower)\n// Use Custom URL to test any specific page'}
          </pre>
        </div>

        {/* Score Guidelines */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-2">Score Guidelines</h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-green-500"></span>
              <span className="text-gray-700">90-100: Excellent</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-yellow-500"></span>
              <span className="text-gray-700">50-89: Needs Improvement</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-red-500"></span>
              <span className="text-gray-700">0-49: Poor</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-gray-400"></span>
              <span className="text-gray-700">N/A: Not Tested</span>
            </div>
          </div>
        </div>

        {/* CLI Reference */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">CLI Commands (Recommended)</h3>
          <p className="text-xs text-blue-700 mb-3">
            Web-based tests may timeout. For reliable results, run tests via CLI:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-xs">
            <div className="bg-white rounded px-3 py-2 border border-blue-200">
              <span className="text-blue-500"># Public pages</span>
              <p className="text-blue-900">npm run lighthouse:public</p>
            </div>
            <div className="bg-white rounded px-3 py-2 border border-blue-200">
              <span className="text-blue-500"># Dashboard pages</span>
              <p className="text-blue-900">npm run lighthouse:dashboard</p>
            </div>
            <div className="bg-white rounded px-3 py-2 border border-blue-200">
              <span className="text-blue-500"># Admin pages</span>
              <p className="text-blue-900">npm run lighthouse:admin</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Page Export
// =============================================================================

export default function LighthouseTestDashboardPage() {
  return (
    <ErrorBoundary componentName="LighthouseTestDashboard">
      <LighthouseTestDashboardContent />
    </ErrorBoundary>
  );
}
