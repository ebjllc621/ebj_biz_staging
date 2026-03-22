/**
 * Admin Layout Enhancement Test Dashboard
 *
 * GOVERNANCE COMPLIANCE:
 * - Component tier: ADVANCED (multiple data displays, ErrorBoundary required)
 * - Client Component: 'use client'
 * - credentials: 'include' on all fetch
 * - Admin authentication required
 * - NO direct database access
 *
 * Features:
 * - View all Layout Enhancement test files organized by category
 * - Run individual test files or full test suites
 * - Display test results in real-time
 * - Test status tracking (passed/failed/pending)
 *
 * @tier ADVANCED
 * @phase Phase R8 - Test Infrastructure Alignment & E2E Coverage
 * @authority docs/pages/layouts/listings/details/detailspageenhance/phases/PHASE_R8_BRAIN_PLAN.md
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
  LayoutGrid,
  Server,
  Component,
  Globe,
  Smartphone,
  Move,
  Settings
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
    id: 'unit-layout-types',
    name: 'Unit Tests: Layout Type Utilities',
    description: 'Tests for listing-section-layout.ts exports - v2 FeatureIds (45 test cases)',
    icon: LayoutGrid,
    expanded: true,
    files: [
      {
        id: 'listing-section-layout',
        name: 'listing-section-layout.test.ts',
        path: 'src/features/listings/types/__tests__/listing-section-layout.test.ts',
        testCount: 45,
        status: 'idle'
      }
    ]
  },
  {
    id: 'unit-migration',
    name: 'Unit Tests: Layout Migration',
    description: 'Tests for layoutMigration.ts - version upgrades and schema repairs',
    icon: Settings,
    expanded: true,
    files: [
      {
        id: 'layout-migration',
        name: 'layoutMigration.test.ts',
        path: 'src/features/listings/utils/__tests__/layoutMigration.test.ts',
        testCount: 20,
        status: 'idle'
      }
    ]
  },
  {
    id: 'unit-tier-enforcer',
    name: 'Unit Tests: Tier Enforcement',
    description: 'Tests for ListingTierEnforcer.ts - tier validation and upgrade paths',
    icon: Component,
    expanded: true,
    files: [
      {
        id: 'listing-tier-enforcer',
        name: 'ListingTierEnforcer.test.ts',
        path: 'src/features/listings/utils/__tests__/ListingTierEnforcer.test.ts',
        testCount: 25,
        status: 'idle'
      }
    ]
  },
  {
    id: 'e2e-edit-mode',
    name: 'E2E Tests: Layout Edit Mode',
    description: 'Edit/published view toggle, section management bar, visibility toggles, WantMoreFeaturesBox (x5 browsers)',
    icon: Globe,
    expanded: true,
    files: [
      {
        id: 'layout-edit-mode',
        name: 'layout-edit-mode.spec.ts',
        path: 'e2e/listings/layout-edit-mode.spec.ts',
        testCount: 14,
        status: 'idle'
      }
    ]
  },
  {
    id: 'e2e-dnd',
    name: 'E2E Tests: Drag-and-Drop',
    description: 'Section and feature reordering with @dnd-kit, visual feedback, persistence (x5 browsers)',
    icon: Move,
    expanded: true,
    files: [
      {
        id: 'layout-drag-drop',
        name: 'layout-drag-drop.spec.ts',
        path: 'e2e/listings/layout-drag-drop.spec.ts',
        testCount: 15,
        status: 'idle'
      }
    ]
  },
  {
    id: 'e2e-mobile',
    name: 'E2E Tests: Mobile Touch',
    description: 'Mobile viewport, touch gestures, FAB interactions, 44px touch targets (Mobile Chrome + Mobile Safari)',
    icon: Smartphone,
    expanded: true,
    files: [
      {
        id: 'layout-mobile-touch',
        name: 'layout-mobile-touch.spec.ts',
        path: 'e2e/listings/layout-mobile-touch.spec.ts',
        testCount: 17,
        status: 'idle'
      }
    ]
  },
  {
    id: 'e2e-dashboard-sync',
    name: 'E2E Tests: Dashboard Synchronization',
    description: 'Bi-directional sync between listing page and dashboard, visibility banners, tier lock indicators (x3 desktop browsers)',
    icon: Server,
    expanded: true,
    files: [
      {
        id: 'layout-sync',
        name: 'layout-sync.spec.ts',
        path: 'e2e/dashboard/layout-sync.spec.ts',
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
        E2E tests run on 5 browser projects. Total test executions:
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
// Coverage Summary Component
// =============================================================================

function CoverageSummary() {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-green-900 mb-2">E2E Test Coverage Summary (Phase R8)</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <p className="font-medium text-green-800">Edit Mode</p>
          <p className="text-green-600">14 tests, 5 browsers = 70 runs</p>
        </div>
        <div>
          <p className="font-medium text-green-800">Drag-and-Drop</p>
          <p className="text-green-600">15 tests, 5 browsers = 75 runs</p>
        </div>
        <div>
          <p className="font-medium text-green-800">Mobile Touch</p>
          <p className="text-green-600">17 tests, 2 mobile = 34 runs</p>
        </div>
        <div>
          <p className="font-medium text-green-800">Dashboard Sync</p>
          <p className="text-green-600">17 tests, 3 desktop = 51 runs</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-green-700">
        Total: 63 unique tests, 230 browser executions | Cross-browser patterns from MEMORY.md
      </p>
    </div>
  );
}

// =============================================================================
// Main Dashboard Content
// =============================================================================

function LayoutEnhancementTestDashboardContent() {
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
    setTestOutput('[Starting] Running all Layout Enhancement tests...\n');

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

  // E2E tests run on 5 browsers
  const e2eTests = categories
    .filter(c => c.id.startsWith('e2e'))
    .reduce((sum, c) => sum + c.files.reduce((s, f) => s + f.testCount, 0), 0);
  const unitTests = categories
    .filter(c => c.id.startsWith('unit'))
    .reduce((sum, c) => sum + c.files.reduce((s, f) => s + f.testCount, 0), 0);
  const integrationTests = categories
    .filter(c => c.id.startsWith('integration'))
    .reduce((sum, c) => sum + c.files.reduce((s, f) => s + f.testCount, 0), 0);
  const totalExecutions = (e2eTests * 5) + unitTests + integrationTests;

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
              <LayoutGrid className="w-6 h-6 text-[#ed6437]" />
              Layout Enhancement E2E Tests
            </h1>
            <p className="text-sm text-gray-600">
              Phase R8 - Test Infrastructure Alignment & E2E Coverage (v2 FeatureIds, 5 Browser Projects)
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
            <p className="text-xs text-purple-400">E2E x5 browsers</p>
          </div>
          <div className="bg-white rounded-lg border border-blue-200 p-4">
            <p className="text-xs font-medium text-blue-600 uppercase">Unit</p>
            <p className="text-2xl font-bold text-blue-600">{unitTests}</p>
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

        {/* Coverage Summary */}
        <CoverageSummary />

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
            {testOutput || '// Test output will appear here...\n// Click "Run" on any test file to see results.\n\n// Unit tests use Vitest\n// E2E tests use Playwright (5 browser projects)'}
          </pre>
        </div>

        {/* Documentation Link */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-1">Documentation</h3>
          <p className="text-sm text-blue-700">
            Tests follow the Phase R8 Brain Plan specification and use cross-browser patterns from MEMORY.md.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <p className="text-xs text-blue-600 font-mono">
              docs/pages/layouts/listings/details/detailspageenhance/phases/PHASE_R8_BRAIN_PLAN.md
            </p>
            <span className="hidden sm:inline text-blue-400">|</span>
            <p className="text-xs text-blue-600 font-mono">
              MEMORY.md (Playwright E2E Testing patterns)
            </p>
          </div>
        </div>

        {/* Command Line Reference */}
        <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Command Line Reference</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs text-gray-700">
            <div className="bg-white rounded px-3 py-2">
              <span className="text-gray-500"># All unit tests</span>
              <p>npm run test src/features/listings</p>
            </div>
            <div className="bg-white rounded px-3 py-2">
              <span className="text-gray-500"># Layout E2E tests (all)</span>
              <p>npx playwright test e2e/listings/layout-*.spec.ts e2e/dashboard/layout-sync.spec.ts</p>
            </div>
            <div className="bg-white rounded px-3 py-2">
              <span className="text-gray-500"># Desktop browsers only</span>
              <p>npx playwright test --project=chromium --project=firefox --project=webkit</p>
            </div>
            <div className="bg-white rounded px-3 py-2">
              <span className="text-gray-500"># Mobile browsers only</span>
              <p>npx playwright test --project=&quot;Mobile Chrome&quot; --project=&quot;Mobile Safari&quot;</p>
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

export default function LayoutEnhancementTestDashboardPage() {
  return (
    <ErrorBoundary componentName="LayoutEnhancementTestDashboard">
      <LayoutEnhancementTestDashboardContent />
    </ErrorBoundary>
  );
}
