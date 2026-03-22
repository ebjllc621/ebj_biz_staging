/**
 * Events Detail Test Dashboard
 *
 * GOVERNANCE COMPLIANCE:
 * - Component tier: ADVANCED (multiple data displays, ErrorBoundary required)
 * - Client Component: 'use client'
 * - credentials: 'include' on all fetch
 * - Admin authentication required
 * - NO direct database access
 *
 * Features:
 * - View all Phase 7 + 8D test files organized by 11 categories
 * - Run individual test files or full test suites
 * - Display test results in real-time
 * - Test status tracking (passed/failed/pending)
 * - ~114 tests across 11 feature areas
 *
 * @tier ADVANCED
 * @phase Events Phase 7
 * @authority docs/pages/layouts/events/build/phases/PHASE_7_ADMIN_TESTING.md
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
  FileCode2,
  FolderCode,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  CalendarDays,
  Image as ImageIcon,
  UserCheck,
  Ticket,
  Share2,
  PanelRight,
  Award,
  Star,
  BarChart3,
  LayoutDashboard,
  Smartphone
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface TestFile {
  id: string;
  name: string;
  path: string;
  testCount: number;
  status: 'idle' | 'running' | 'passed' | 'failed';
  lastRun?: string;
  duration?: number;
}

interface TestCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  files: TestFile[];
  expanded: boolean;
}

// =============================================================================
// Test Data Configuration
// =============================================================================

const getInitialTestCategories = (): TestCategory[] => [
  {
    id: 'e1-detail-core',
    name: 'E1: Event Detail Core',
    description: 'Page rendering, SEO metadata, JSON-LD, 2-column layout (~8 tests)',
    icon: CalendarDays,
    expanded: true,
    files: [
      { id: 'comp-event-card', name: 'EventCard.test.tsx', path: 'src/features/events/components/__tests__/EventCard.test.tsx', testCount: 20, status: 'idle' },
      { id: 'comp-event-card-horiz', name: 'EventCardHorizontal.test.tsx', path: 'src/features/events/components/__tests__/EventCardHorizontal.test.tsx', testCount: 8, status: 'idle' },
    ]
  },
  {
    id: 'e2-hero',
    name: 'E2: Hero Section',
    description: 'Banner, badges, action buttons, date/time formatting (~8 tests)',
    icon: ImageIcon,
    expanded: true,
    files: [
      { id: 'comp-hero', name: 'EventDetailHero.test.tsx', path: 'src/features/events/components/__tests__/EventDetailHero.test.tsx', testCount: 8, status: 'idle' },
    ]
  },
  {
    id: 'e3-rsvp',
    name: 'E3: RSVP & Engagement',
    description: 'RSVP button states, capacity bar, waitlist, auth check (~10 tests)',
    icon: UserCheck,
    expanded: true,
    files: [
      { id: 'comp-rsvp-btn', name: 'EventRSVPButton.test.tsx', path: 'src/features/events/components/__tests__/EventRSVPButton.test.tsx', testCount: 8, status: 'idle' },
      { id: 'comp-capacity', name: 'EventCapacityBar.test.tsx', path: 'src/features/events/components/__tests__/EventCapacityBar.test.tsx', testCount: 6, status: 'idle' },
    ]
  },
  {
    id: 'e4-tickets',
    name: 'E4: Ticket System',
    description: 'Ticket tier display, price formatting, quantity selection (~14 tests)',
    icon: Ticket,
    expanded: false,
    files: [
      { id: 'comp-ticket-selector', name: 'EventTicketSelector.test.tsx', path: 'src/features/events/components/__tests__/EventTicketSelector.test.tsx', testCount: 14, status: 'idle' },
    ]
  },
  {
    id: 'e5-sharing',
    name: 'E5: Social Sharing',
    description: 'Share modal, UTM link generation, platform buttons (~6 tests)',
    icon: Share2,
    expanded: false,
    files: [
      { id: 'comp-share', name: 'EventShareModal.test.tsx', path: 'src/features/events/components/__tests__/EventShareModal.test.tsx', testCount: 6, status: 'idle' },
    ]
  },
  {
    id: 'e6-sidebar',
    name: 'E6: Sidebar Components',
    description: 'Business header, contact, location, other events (~8 tests)',
    icon: PanelRight,
    expanded: false,
    files: [
      { id: 'comp-sidebar', name: 'EventDetailSidebar.test.tsx', path: 'src/features/events/components/__tests__/EventDetailSidebar.test.tsx', testCount: 8, status: 'idle' },
      { id: 'comp-filter-bar', name: 'EventsFilterBar.test.tsx', path: 'src/features/events/components/__tests__/EventsFilterBar.test.tsx', testCount: 6, status: 'idle' },
    ]
  },
  {
    id: 'e7-sponsors',
    name: 'E7: Sponsor System',
    description: 'Sponsor tiers, badges, section layout, click tracking, manager (~16 tests)',
    icon: Award,
    expanded: false,
    files: [
      { id: 'comp-sponsors', name: 'EventSponsorsSection.test.tsx', path: 'src/features/events/components/__tests__/EventSponsorsSection.test.tsx', testCount: 6, status: 'idle' },
      { id: 'comp-sponsor-manager', name: 'EventSponsorManager.test.tsx', path: 'src/features/events/components/__tests__/EventSponsorManager.test.tsx', testCount: 10, status: 'idle' },
    ]
  },
  {
    id: 'e8-reviews',
    name: 'E8: Reviews & Lifecycle',
    description: 'Review form, rating display, distribution, archive badge (~22 tests)',
    icon: Star,
    expanded: false,
    files: [
      { id: 'comp-reviews', name: 'EventReviews.test.tsx', path: 'src/features/events/components/__tests__/EventReviews.test.tsx', testCount: 8, status: 'idle' },
      { id: 'comp-review-form', name: 'EventReviewForm.test.tsx', path: 'src/features/events/components/__tests__/EventReviewForm.test.tsx', testCount: 14, status: 'idle' },
    ]
  },
  {
    id: 'e9-analytics',
    name: 'E9: Analytics Tracking',
    description: 'View tracking, share recording, follow system (~4 tests)',
    icon: BarChart3,
    expanded: false,
    files: [
      { id: 'hook-filters', name: 'useEventsFilters.test.ts', path: 'src/features/events/hooks/__tests__/useEventsFilters.test.ts', testCount: 4, status: 'idle' },
    ]
  },
  {
    id: 'e10-dashboard',
    name: 'E10: Dashboard Integration',
    description: 'My Events tabs, calendar view, event stats (~30 tests)',
    icon: LayoutDashboard,
    expanded: false,
    files: [
      { id: 'comp-my-events', name: 'MyEventsSection.test.tsx', path: 'src/features/events/components/__tests__/MyEventsSection.test.tsx', testCount: 18, status: 'idle' },
      { id: 'comp-calendar-view', name: 'EventCalendarView.test.tsx', path: 'src/features/events/components/__tests__/EventCalendarView.test.tsx', testCount: 12, status: 'idle' },
    ]
  },
  {
    id: 'e11-mobile',
    name: 'E11: Mobile Responsiveness',
    description: 'Viewport-specific rendering, sticky CTA, touch targets (~17 tests)',
    icon: Smartphone,
    expanded: false,
    files: [
      { id: 'comp-detail-mobile', name: 'EventDetailMobile.test.tsx', path: 'src/features/events/components/__tests__/EventDetailMobile.test.tsx', testCount: 17, status: 'idle' },
    ]
  },
];

// =============================================================================
// Status Badge Component
// =============================================================================

function StatusBadge({ status }: { status: TestFile['status'] }) {
  switch (status) {
    case 'running':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Running
        </span>
      );
    case 'passed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle2 className="w-3 h-3" />
          Passed
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3" />
          Failed
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
// Test File Row Component
// =============================================================================

function TestFileRow({
  file,
  onRun
}: {
  file: TestFile;
  onRun: (_file: TestFile) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <FileCode2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {file.name}
          </p>
          <p className="text-xs text-gray-500 truncate">{file.path}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 ml-4">
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {file.testCount} tests
        </span>
        <StatusBadge status={file.status} />
        <button
          onClick={() => onRun(file)}
          disabled={file.status === 'running'}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[#ed6437] rounded-md hover:bg-[#d55730] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Play className="w-3 h-3" />
          Run
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Test Category Section Component
// =============================================================================

function TestCategorySection({
  category,
  onToggle,
  onRunFile,
  onRunAll
}: {
  category: TestCategory;
  onToggle: () => void;
  onRunFile: (_file: TestFile) => void;
  onRunAll: () => void;
}) {
  const Icon = category.icon;
  const totalTests = category.files.reduce((sum, f) => sum + f.testCount, 0);
  const passedFiles = category.files.filter(f => f.status === 'passed').length;
  const failedFiles = category.files.filter(f => f.status === 'failed').length;
  const runningFiles = category.files.filter(f => f.status === 'running').length;

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
            <h3 className="text-sm font-semibold text-gray-900">
              {category.name}
            </h3>
            <p className="text-xs text-gray-500">{category.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Summary Stats */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">
              {category.files.length} files, {totalTests} tests
            </span>
            {passedFiles > 0 && (
              <span className="text-green-600">{passedFiles} passed</span>
            )}
            {failedFiles > 0 && (
              <span className="text-red-600">{failedFiles} failed</span>
            )}
            {runningFiles > 0 && (
              <span className="text-blue-600">{runningFiles} running</span>
            )}
          </div>
          {/* Run All Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRunAll();
            }}
            disabled={runningFiles > 0}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#ed6437] border border-[#ed6437] rounded-md hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FolderCode className="w-3 h-3" />
            Run All
          </button>
        </div>
      </div>

      {/* File List */}
      {category.expanded && (
        <div className="divide-y divide-gray-100">
          {category.files.map(file => (
            <TestFileRow key={file.id} file={file} onRun={onRunFile} />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Dashboard Content
// =============================================================================

function EventsDetailTestDashboardContent() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<TestCategory[]>(getInitialTestCategories);
  const [testOutput, setTestOutput] = useState<string>('');
  const [isRunningAll, setIsRunningAll] = useState(false);

  const toggleCategory = useCallback((categoryId: string) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId ? { ...cat, expanded: !cat.expanded } : cat
      )
    );
  }, []);

  const runTest = useCallback(async (file: TestFile, categoryId: string) => {
    // Update status to running
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId
          ? {
              ...cat,
              files: cat.files.map(f =>
                f.id === file.id ? { ...f, status: 'running' as const } : f
              )
            }
          : cat
      )
    );

    setTestOutput(prev => `${prev}\n\n[Running] ${file.path}...\n`);

    try {
      const response = await fetch('/api/admin/tests/run', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testPath: file.path })
      });

      const result = await response.json();

      // Handle API error responses (e.g., 403 Forbidden)
      if (!response.ok || result.error) {
        const errorMsg = result.error || result.message || `HTTP ${response.status}`;
        setCategories(prev =>
          prev.map(cat =>
            cat.id === categoryId
              ? {
                  ...cat,
                  files: cat.files.map(f =>
                    f.id === file.id ? { ...f, status: 'failed' as const } : f
                  )
                }
              : cat
          )
        );
        setTestOutput(prev => `${prev}[API Error] ${file.path}: ${errorMsg}\n`);
        return;
      }

      // Update status based on result
      setCategories(prev =>
        prev.map(cat =>
          cat.id === categoryId
            ? {
                ...cat,
                files: cat.files.map(f =>
                  f.id === file.id
                    ? {
                        ...f,
                        status: result.data?.success ? ('passed' as const) : ('failed' as const),
                        lastRun: new Date().toISOString(),
                        duration: result.data?.duration
                      }
                    : f
                )
              }
            : cat
        )
      );

      setTestOutput(prev => `${prev}${result.data?.output || result.data?.message || result.message}\n`);
    } catch (error) {
      setCategories(prev =>
        prev.map(cat =>
          cat.id === categoryId
            ? {
                ...cat,
                files: cat.files.map(f =>
                  f.id === file.id ? { ...f, status: 'failed' as const } : f
                )
              }
            : cat
        )
      );
      setTestOutput(prev => `${prev}[Error] Failed to run test: ${error}\n`);
    }
  }, []);

  const runAllInCategory = useCallback(async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    for (const file of category.files) {
      await runTest(file, categoryId);
    }
  }, [categories, runTest]);

  const runAllTests = useCallback(async () => {
    setIsRunningAll(true);
    setTestOutput('[Starting] Running all Events Detail tests...\n');

    for (const category of categories) {
      for (const file of category.files) {
        await runTest(file, category.id);
      }
    }

    setIsRunningAll(false);
    setTestOutput(prev => `${prev}\n[Complete] All tests finished.\n`);
  }, [categories, runTest]);

  const clearOutput = useCallback(() => {
    setTestOutput('');
  }, []);

  // Calculate totals
  const totalFiles = categories.reduce((sum, c) => sum + c.files.length, 0);
  const totalTests = categories.reduce(
    (sum, c) => sum + c.files.reduce((s, f) => s + f.testCount, 0),
    0
  );
  const passedFiles = categories.reduce(
    (sum, c) => sum + c.files.filter(f => f.status === 'passed').length,
    0
  );
  const failedFiles = categories.reduce(
    (sum, c) => sum + c.files.filter(f => f.status === 'failed').length,
    0
  );

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
              <CalendarDays className="w-6 h-6 text-[#ed6437]" />
              Events Detail Tests
            </h1>
            <p className="text-sm text-gray-600">
              Comprehensive Test Coverage Dashboard
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={runAllTests}
              disabled={isRunningAll}
              className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg text-sm font-medium hover:bg-[#d55730] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRunningAll ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Run All Tests
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Total Files</p>
            <p className="text-2xl font-bold text-gray-900">{totalFiles}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Total Tests</p>
            <p className="text-2xl font-bold text-gray-900">{totalTests}</p>
          </div>
          <div className="bg-white rounded-lg border border-green-200 p-4">
            <p className="text-xs font-medium text-green-600 uppercase">Passed</p>
            <p className="text-2xl font-bold text-green-600">{passedFiles}</p>
          </div>
          <div className="bg-white rounded-lg border border-red-200 p-4">
            <p className="text-xs font-medium text-red-600 uppercase">Failed</p>
            <p className="text-2xl font-bold text-red-600">{failedFiles}</p>
          </div>
        </div>

        {/* Test Categories */}
        <div className="space-y-4">
          {categories.map(category => (
            <TestCategorySection
              key={category.id}
              category={category}
              onToggle={() => toggleCategory(category.id)}
              onRunFile={(file) => runTest(file, category.id)}
              onRunAll={() => runAllInCategory(category.id)}
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
          <pre className="p-4 text-sm text-green-400 font-mono h-64 overflow-auto">
            {testOutput || '// Test output will appear here...\n// Click "Run" on any test file to see results.'}
          </pre>
        </div>

        {/* Documentation Link */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-1">Documentation</h3>
          <p className="text-sm text-blue-700">
            Test implementation follows the Events Phase 7 Brain Plan specification.
          </p>
          <p className="text-xs text-blue-600 mt-2 font-mono">
            docs/pages/layouts/events/build/phases/PHASE_7_ADMIN_TESTING.md
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Page Export
// =============================================================================

export default function EventsDetailTestDashboardPage() {
  return (
    <ErrorBoundary componentName="EventsDetailTestDashboard">
      <EventsDetailTestDashboardContent />
    </ErrorBoundary>
  );
}
