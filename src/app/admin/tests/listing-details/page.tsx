/**
 * Admin Listing Details E2E Test Dashboard
 *
 * GOVERNANCE COMPLIANCE:
 * - Component tier: ADVANCED (multiple data displays, ErrorBoundary required)
 * - Client Component: 'use client'
 * - credentials: 'include' on all fetch
 * - Admin authentication required
 * - NO direct database access
 *
 * Features:
 * - View all Listing Details Page Enhancement test files organized by category
 * - Run individual test files or full test suites
 * - Display test results in real-time
 * - Test status tracking (passed/failed/pending)
 *
 * @tier ADVANCED
 * @phase Phase 5 - Verification & Testing (Listing Details Enhancement)
 * @authority docs/pages/layouts/listings/details/detailspageenhance/3-1-26/phases/PHASE_5_BRAIN_PLAN.md
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
  LayoutList,
  Shield,
  Eye,
  Layers,
  Save
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
// Test Data Configuration - Phase 5 E2E Tests
// =============================================================================

const getInitialTestCategories = (): TestCategory[] => [
  {
    id: 'e2e-layout-persistence',
    name: 'E2E Tests: Layout Persistence',
    description: 'Tests that layout order and visibility changes persist across page reloads and users (x5 browsers)',
    icon: Save,
    expanded: true,
    files: [
      {
        id: 'listing-layout-persistence',
        name: 'listing-layout-persistence.spec.ts',
        path: 'e2e/listings/listing-layout-persistence.spec.ts',
        testCount: 14,
        status: 'idle'
      }
    ]
  },
  {
    id: 'e2e-tier-enforcement',
    name: 'E2E Tests: Tier Enforcement',
    description: 'Tests that tier restrictions are properly enforced - social links, website, offers/events, dashboard-only features (x5 browsers)',
    icon: Shield,
    expanded: true,
    files: [
      {
        id: 'listing-tier-enforcement',
        name: 'listing-tier-enforcement.spec.ts',
        path: 'e2e/listings/listing-tier-enforcement.spec.ts',
        testCount: 14,
        status: 'idle'
      }
    ]
  },
  {
    id: 'e2e-edit-published-mode',
    name: 'E2E Tests: Edit vs Published Mode',
    description: 'Tests view mode toggle, edit controls visibility, published mode clean layout, mode transitions (x5 browsers)',
    icon: Eye,
    expanded: true,
    files: [
      {
        id: 'listing-edit-published-mode',
        name: 'listing-edit-published-mode.spec.ts',
        path: 'e2e/listings/listing-edit-published-mode.spec.ts',
        testCount: 16,
        status: 'idle'
      }
    ]
  },
  {
    id: 'related-e2e',
    name: 'Related E2E Tests (Prior Phases)',
    description: 'Existing listing E2E tests from prior phases - view listing, layout edit mode, drag-and-drop, mobile touch',
    icon: Layers,
    expanded: false,
    files: [
      {
        id: 'view-listing',
        name: 'view-listing.spec.ts',
        path: 'e2e/listings/view-listing.spec.ts',
        testCount: 12,
        status: 'idle'
      },
      {
        id: 'layout-edit-mode',
        name: 'layout-edit-mode.spec.ts',
        path: 'e2e/listings/layout-edit-mode.spec.ts',
        testCount: 14,
        status: 'idle'
      },
      {
        id: 'layout-drag-drop',
        name: 'layout-drag-drop.spec.ts',
        path: 'e2e/listings/layout-drag-drop.spec.ts',
        testCount: 15,
        status: 'idle'
      },
      {
        id: 'layout-mobile-touch',
        name: 'layout-mobile-touch.spec.ts',
        path: 'e2e/listings/layout-mobile-touch.spec.ts',
        testCount: 17,
        status: 'idle'
      }
    ]
  }
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
        {file.duration && (
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {(file.duration / 1000).toFixed(1)}s
          </span>
        )}
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
// Browser Projects Info Component
// =============================================================================

function BrowserProjectsInfo() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-blue-900 mb-2">Playwright Browser Projects</h3>
      <p className="text-xs text-blue-700 mb-2">
        E2E tests run on 5 browser projects. Total test executions = tests × 5 browsers:
      </p>
      <div className="grid grid-cols-5 gap-2 text-xs">
        <div className="bg-white rounded px-2 py-1 text-center">
          <p className="font-medium text-gray-900">Chromium</p>
          <p className="text-gray-500">Desktop</p>
        </div>
        <div className="bg-white rounded px-2 py-1 text-center">
          <p className="font-medium text-gray-900">Firefox</p>
          <p className="text-gray-500">Desktop</p>
        </div>
        <div className="bg-white rounded px-2 py-1 text-center">
          <p className="font-medium text-gray-900">WebKit</p>
          <p className="text-gray-500">Desktop</p>
        </div>
        <div className="bg-white rounded px-2 py-1 text-center">
          <p className="font-medium text-gray-900">Mobile Chrome</p>
          <p className="text-gray-500">Pixel 5</p>
        </div>
        <div className="bg-white rounded px-2 py-1 text-center">
          <p className="font-medium text-gray-900">Mobile Safari</p>
          <p className="text-gray-500">iPhone 12</p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Phase 5 Coverage Summary Component
// =============================================================================

function Phase5CoverageSummary() {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-green-900 mb-2">Phase 5 Test Coverage Summary</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <p className="font-medium text-green-800">Layout Persistence</p>
          <p className="text-green-600">14 tests × 5 browsers = 70 runs</p>
        </div>
        <div>
          <p className="font-medium text-green-800">Tier Enforcement</p>
          <p className="text-green-600">14 tests × 5 browsers = 70 runs</p>
        </div>
        <div>
          <p className="font-medium text-green-800">Edit/Published Mode</p>
          <p className="text-green-600">16 tests × 5 browsers = 80 runs</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-green-700">
        <strong>Phase 5 Total:</strong> 44 unique tests, 220 browser executions |
        Cross-browser patterns from MEMORY.md (waitForPageReady, state:attached, WebKit handling)
      </p>
    </div>
  );
}

// =============================================================================
// Issues Resolved Summary Component
// =============================================================================

function IssuesResolvedSummary() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-amber-900 mb-2">23 Issues Resolved (Phases 1-4)</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <p className="font-medium text-amber-800">Phase 1</p>
          <p className="text-amber-600">SectionLayoutManager fix</p>
          <p className="text-amber-600">4x DOM reduction</p>
        </div>
        <div>
          <p className="font-medium text-amber-800">Phase 2</p>
          <p className="text-amber-600">Tier enforcement</p>
          <p className="text-amber-600">ErrorBoundary added</p>
        </div>
        <div>
          <p className="font-medium text-amber-800">Phase 3</p>
          <p className="text-amber-600">4 sidebar features</p>
          <p className="text-amber-600">DnD integration</p>
        </div>
        <div>
          <p className="font-medium text-amber-800">Phase 4</p>
          <p className="text-amber-600">6 new components</p>
          <p className="text-amber-600">API routes added</p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Dashboard Content
// =============================================================================

function ListingDetailsTestDashboardContent() {
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
                        status: result.success ? ('passed' as const) : ('failed' as const),
                        lastRun: new Date().toISOString(),
                        duration: result.duration
                      }
                    : f
                )
              }
            : cat
        )
      );

      setTestOutput(prev => `${prev}${result.output || result.message}\n`);
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
    setTestOutput('[Starting] Running all Listing Details Enhancement tests...\n');

    for (const category of categories) {
      for (const file of category.files) {
        await runTest(file, category.id);
      }
    }

    setIsRunningAll(false);
    setTestOutput(prev => `${prev}\n[Complete] All tests finished.\n`);
  }, [categories, runTest]);

  const runPhase5Tests = useCallback(async () => {
    setIsRunningAll(true);
    setTestOutput('[Starting] Running Phase 5 tests only (layout-persistence, tier-enforcement, edit-published-mode)...\n');

    const phase5Categories = categories.filter(c => c.id.startsWith('e2e-') && !c.id.includes('related'));
    for (const category of phase5Categories) {
      for (const file of category.files) {
        await runTest(file, category.id);
      }
    }

    setIsRunningAll(false);
    setTestOutput(prev => `${prev}\n[Complete] Phase 5 tests finished.\n`);
  }, [categories, runTest]);

  const clearOutput = useCallback(() => {
    setTestOutput('');
  }, []);

  // Calculate totals
  const phase5Categories = categories.filter(c => c.id.startsWith('e2e-') && !c.id.includes('related'));
  const phase5Tests = phase5Categories.reduce(
    (sum, c) => sum + c.files.reduce((s, f) => s + f.testCount, 0),
    0
  );
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

  // All E2E tests run on 5 browsers
  const totalExecutions = totalTests * 5;
  const phase5Executions = phase5Tests * 5;

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
              <LayoutList className="w-6 h-6 text-[#ed6437]" />
              Listing Details Page Enhancement Tests
            </h1>
            <p className="text-sm text-gray-600">
              Phase 5 - Verification & Testing | 44 new E2E tests across 3 test files
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={runPhase5Tests}
              disabled={isRunningAll}
              className="flex items-center gap-2 px-4 py-2 bg-[#022641] text-white rounded-lg text-sm font-medium hover:bg-[#033562] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRunningAll ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Run Phase 5 Tests
            </button>
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
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Total Files</p>
            <p className="text-2xl font-bold text-gray-900">{totalFiles}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Unique Tests</p>
            <p className="text-2xl font-bold text-gray-900">{totalTests}</p>
          </div>
          <div className="bg-white rounded-lg border border-purple-200 p-4">
            <p className="text-xs font-medium text-purple-600 uppercase">Total Runs</p>
            <p className="text-2xl font-bold text-purple-600">{totalExecutions}</p>
            <p className="text-xs text-purple-400">×5 browsers</p>
          </div>
          <div className="bg-white rounded-lg border border-blue-200 p-4">
            <p className="text-xs font-medium text-blue-600 uppercase">Phase 5</p>
            <p className="text-2xl font-bold text-blue-600">{phase5Tests}</p>
            <p className="text-xs text-blue-400">{phase5Executions} runs</p>
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

        {/* Phase 5 Coverage Summary */}
        <Phase5CoverageSummary />

        {/* Issues Resolved Summary */}
        <IssuesResolvedSummary />

        {/* Browser Projects Info */}
        <BrowserProjectsInfo />

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
            {testOutput || `// Test output will appear here...
// Click "Run" on any test file to see results.

// Tests use Playwright (5 browser projects)
// Test slug: daddys-sugar-shack

// Patterns from MEMORY.md:
// - Use state:'attached' (not 'visible') for h1
// - Use waitUntil:'load' (NEVER 'networkidle')
// - Accept BODY for WebKit Tab focus
// - Budget: 15s dev, 5s CI`}
          </pre>
        </div>

        {/* Documentation Link */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-1">Documentation</h3>
          <p className="text-sm text-blue-700">
            Tests follow the Phase 5 Brain Plan specification and use cross-browser patterns from MEMORY.md.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <p className="text-xs text-blue-600 font-mono">
              docs/pages/layouts/listings/details/detailspageenhance/3-1-26/phases/PHASE_5_BRAIN_PLAN.md
            </p>
            <span className="hidden sm:inline text-blue-400">|</span>
            <p className="text-xs text-blue-600 font-mono">
              docs/pages/layouts/listings/details/detailspageenhance/3-1-26/README.md
            </p>
          </div>
        </div>

        {/* Command Line Reference */}
        <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Command Line Reference</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs text-gray-700">
            <div className="bg-white rounded px-3 py-2">
              <span className="text-gray-500"># Phase 5 tests only</span>
              <p>npx playwright test e2e/listings/listing-*.spec.ts</p>
            </div>
            <div className="bg-white rounded px-3 py-2">
              <span className="text-gray-500"># All listing tests</span>
              <p>npx playwright test e2e/listings/</p>
            </div>
            <div className="bg-white rounded px-3 py-2">
              <span className="text-gray-500"># Chromium only</span>
              <p>npx playwright test e2e/listings/listing-*.spec.ts --project=chromium</p>
            </div>
            <div className="bg-white rounded px-3 py-2">
              <span className="text-gray-500"># View HTML report</span>
              <p>npx playwright show-report</p>
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

export default function ListingDetailsTestDashboardPage() {
  return (
    <ErrorBoundary componentName="ListingDetailsTestDashboard">
      <ListingDetailsTestDashboardContent />
    </ErrorBoundary>
  );
}
