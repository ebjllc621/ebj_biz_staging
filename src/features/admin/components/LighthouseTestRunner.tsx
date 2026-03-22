/**
 * Lighthouse Test Runner Component
 *
 * Admin UI for triggering and viewing Lighthouse performance tests.
 * Integrated into Performance page.
 *
 * @governance STANDARD tier, ErrorBoundary required, credentials: 'include'
 * @authority tests/pagePerformance/LIGHTHOUSE_PERFORMANCE_BRAIN_PLAN.md
 */

'use client';

import { useState, useEffect } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorFallback } from '@/components/common/ErrorFallback';

interface PageCategory {
  id: string;
  name: string;
  pages: { path: string; name: string; priority: string }[];
}

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

const PAGE_CATEGORIES: PageCategory[] = [
  {
    id: 'public',
    name: 'Public Pages',
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
      { path: '/dashboard/subscription/addons', name: 'Add-ons', priority: 'LOW' },
    ],
  },
  {
    id: 'admin',
    name: 'Admin Panel',
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

function LighthouseTestRunnerContent() {
  const [selectedCategory, setSelectedCategory] = useState<string>('public');
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [results, setResults] = useState<LighthouseResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [lastRunDate, setLastRunDate] = useState<string | null>(null);

  // Load existing results for the category
  const loadResults = async (categoryId: string) => {
    setIsLoadingResults(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/lighthouse/reports?category=${categoryId}`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.data?.results) {
        setResults(data.data.results);
        setLastRunDate(data.data.date || null);
      } else {
        setResults([]);
        setLastRunDate(null);
      }
    } catch {
      setResults([]);
    } finally {
      setIsLoadingResults(false);
    }
  };

  const runTests = async (pages: string[], categoryId: string) => {
    setIsRunning(true);
    setProgress({ current: 0, total: pages.length });
    setResults([]);
    setError(null);

    try {
      const response = await fetch('/api/admin/lighthouse/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          category: categoryId,
          pages: pages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle error response - ensure error is a string
        const errorMessage = typeof data.error === 'string'
          ? data.error
          : data.error?.message || data.message || 'Test execution failed';
        throw new Error(errorMessage);
      }

      setResults(data.data?.results || []);
    } catch (err: any) {
      // Ensure error is displayed as string
      const errorMsg = typeof err === 'string'
        ? err
        : err?.message || String(err);
      setError(errorMsg);
    } finally {
      setIsRunning(false);
    }
  };

  const category = PAGE_CATEGORIES.find(c => c.id === selectedCategory);

  return (
    <div className="bg-white rounded shadow p-6">
      <h3 className="text-lg font-medium mb-4">Lighthouse Performance Tests</h3>

      {/* Category Selector */}
      <div className="flex gap-2 mb-4">
        {PAGE_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => {
              setSelectedCategory(cat.id);
              setSelectedPages([]);
              setResults([]);
            }}
            className={`px-4 py-2 rounded transition ${
              selectedCategory === cat.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Page Selection */}
      <div className="border rounded p-4 mb-4 max-h-64 overflow-y-auto">
        <div className="mb-2 flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedPages.length === category?.pages.length}
            onChange={e => {
              if (e.target.checked) {
                setSelectedPages(category?.pages.map(p => p.path) || []);
              } else {
                setSelectedPages([]);
              }
            }}
            className="rounded"
          />
          <span className="font-medium">Select All</span>
        </div>
        {category?.pages.map(page => (
          <label key={page.path} className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              checked={selectedPages.includes(page.path)}
              onChange={e => {
                if (e.target.checked) {
                  setSelectedPages([...selectedPages, page.path]);
                } else {
                  setSelectedPages(selectedPages.filter(p => p !== page.path));
                }
              }}
              className="rounded"
            />
            <span>{page.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              page.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
              page.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
              page.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {page.priority}
            </span>
            <span className="text-gray-500 text-sm ml-auto">{page.path}</span>
          </label>
        ))}
      </div>

      {/* CLI Instructions */}
      <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4">
        <p className="text-sm text-amber-800">
          <strong>Run tests via CLI</strong> (recommended - tests take 30-60s per page):
        </p>
        <code className="text-xs bg-amber-100 px-2 py-1 rounded block mt-1">
          npm run lighthouse:{selectedCategory}
        </code>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => loadResults(selectedCategory)}
          disabled={isLoadingResults}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition"
        >
          {isLoadingResults ? 'Loading...' : 'Load Results'}
        </button>
        <button
          onClick={() => runTests(category?.pages.map(p => p.path) || [], selectedCategory)}
          disabled={isRunning}
          className="bg-gray-400 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-500 transition"
          title="Note: Web-based execution may fail. Use CLI for reliability."
        >
          Try Run via API
        </button>
      </div>

      {/* Progress */}
      {isRunning && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Testing in progress...</span>
            <span>{progress.current} / {progress.total}</span>
          </div>
          <div className="bg-gray-200 rounded h-2">
            <div
              className="bg-blue-500 rounded h-2 transition-all animate-pulse"
              style={{ width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%' }}
            />
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-800 font-medium">Test Execution Failed</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Performance</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Accessibility</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">SEO</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Best Practices</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">LCP</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.map((result, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-2 text-sm">{result.url}</td>
                  <td className="px-4 py-2 text-center">
                    <ScoreBadge score={result.scores.performance} />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <ScoreBadge score={result.scores.accessibility} />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <ScoreBadge score={result.scores.seo} />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <ScoreBadge score={result.scores.bestPractices} />
                  </td>
                  <td className="px-4 py-2 text-center text-sm">
                    {Math.round(result.metrics.lcp)}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const displayScore = Math.round(score * 100);
  const colorClass =
    displayScore >= 90 ? 'bg-green-100 text-green-800' :
    displayScore >= 50 ? 'bg-yellow-100 text-yellow-800' :
    'bg-red-100 text-red-800';

  return (
    <span className={`px-2 py-1 rounded text-sm font-medium ${colorClass}`}>
      {displayScore}
    </span>
  );
}

/**
 * LighthouseTestRunner - ErrorBoundary wrapper
 */
export function LighthouseTestRunner() {
  return (
    <ErrorBoundary
      fallback={
        <ErrorFallback
          title="Lighthouse Test Runner Error"
          message="Unable to load Lighthouse test runner. Please try again."
        />
      }
      isolate={true}
      componentName="LighthouseTestRunner"
    >
      <LighthouseTestRunnerContent />
    </ErrorBoundary>
  );
}
