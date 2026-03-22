/**
 * Admin TD Phase 5 Test Dashboard
 *
 * GOVERNANCE COMPLIANCE:
 * - Component tier: ADVANCED (multiple data displays, ErrorBoundary required)
 * - Client Component: 'use client'
 * - credentials: 'include' on all fetch
 * - Admin authentication required
 * - NO direct database access
 *
 * Features:
 * - View all TD Phase 5 test files organized by category
 * - Run individual test files or full test suites
 * - Display test results in real-time
 * - Test status tracking (passed/failed/pending)
 *
 * @tier ADVANCED
 * @phase Technical Debt Remediation - Phase 5
 * @authority docs/components/connections/userrecommendations/phases/TD_PHASE_5_BRAIN_PLAN.md
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
  Beaker,
  Server,
  Component,
  Globe,
  Layers
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
    id: 'p1-services',
    name: 'P1: Service Tests',
    description: 'RecommendationService business logic tests (108 tests)',
    icon: Server,
    expanded: true,
    files: [
      {
        id: 'service-skills-goals',
        name: 'RecommendationService.skills-goals.test.ts',
        path: 'src/features/connections/services/__tests__/RecommendationService.skills-goals.test.ts',
        testCount: 36,
        status: 'idle'
      },
      {
        id: 'service-interests-hobbies',
        name: 'RecommendationService.interests-hobbies.test.ts',
        path: 'src/features/connections/services/__tests__/RecommendationService.interests-hobbies.test.ts',
        testCount: 36,
        status: 'idle'
      },
      {
        id: 'service-education-hometown',
        name: 'RecommendationService.education-hometown-groups.test.ts',
        path: 'src/features/connections/services/__tests__/RecommendationService.education-hometown-groups.test.ts',
        testCount: 36,
        status: 'idle'
      }
    ]
  },
  {
    id: 'p2-hooks',
    name: 'P2: Hook Tests',
    description: 'Custom React hooks for sharing functionality (59 tests)',
    icon: Layers,
    expanded: true,
    files: [
      {
        id: 'hook-inbox',
        name: 'useSharingInbox.test.ts',
        path: 'src/features/sharing/hooks/__tests__/useSharingInbox.test.ts',
        testCount: 35,
        status: 'idle'
      },
      {
        id: 'hook-offline',
        name: 'useOfflineRecommendationQueue.test.ts',
        path: 'src/features/sharing/hooks/__tests__/useOfflineRecommendationQueue.test.ts',
        testCount: 24,
        status: 'idle'
      }
    ]
  },
  {
    id: 'p3-components',
    name: 'P3: Component Tests',
    description: 'UI component rendering and interaction tests (290 tests)',
    icon: Component,
    expanded: false,
    files: [
      {
        id: 'comp-share-button',
        name: 'ShareEntityButton.test.tsx',
        path: 'src/features/sharing/components/__tests__/ShareEntityButton.test.tsx',
        testCount: 15,
        status: 'idle'
      },
      {
        id: 'comp-entity-preview',
        name: 'EntityPreviewCard.test.tsx',
        path: 'src/features/sharing/components/__tests__/EntityPreviewCard.test.tsx',
        testCount: 15,
        status: 'idle'
      },
      {
        id: 'comp-helpful-rating',
        name: 'HelpfulRatingButtons.test.tsx',
        path: 'src/features/sharing/components/__tests__/HelpfulRatingButtons.test.tsx',
        testCount: 15,
        status: 'idle'
      },
      {
        id: 'comp-inbox-filters',
        name: 'RecommendationInboxFilters.test.tsx',
        path: 'src/features/sharing/components/__tests__/RecommendationInboxFilters.test.tsx',
        testCount: 15,
        status: 'idle'
      },
      {
        id: 'comp-inbox-pagination',
        name: 'RecommendationInboxPagination.test.tsx',
        path: 'src/features/sharing/components/__tests__/RecommendationInboxPagination.test.tsx',
        testCount: 15,
        status: 'idle'
      },
      {
        id: 'comp-thank-you',
        name: 'ThankYouModal.test.tsx',
        path: 'src/features/sharing/components/__tests__/ThankYouModal.test.tsx',
        testCount: 15,
        status: 'idle'
      },
      {
        id: 'comp-sender-impact',
        name: 'SenderImpactCard.test.tsx',
        path: 'src/features/sharing/components/__tests__/SenderImpactCard.test.tsx',
        testCount: 15,
        status: 'idle'
      },
      {
        id: 'comp-gamification',
        name: 'UnifiedGamificationCard.test.tsx',
        path: 'src/features/sharing/components/__tests__/UnifiedGamificationCard.test.tsx',
        testCount: 15,
        status: 'idle'
      },
      {
        id: 'comp-content-share',
        name: 'ContentShareButton.test.tsx',
        path: 'src/features/sharing/components/__tests__/ContentShareButton.test.tsx',
        testCount: 15,
        status: 'idle'
      },
      {
        id: 'comp-mobile-filters',
        name: 'MobileInboxFilters.test.tsx',
        path: 'src/features/sharing/components/__tests__/MobileInboxFilters.test.tsx',
        testCount: 15,
        status: 'idle'
      },
      {
        id: 'comp-inbox-list',
        name: 'RecommendationInboxList.test.tsx',
        path: 'src/features/sharing/components/__tests__/RecommendationInboxList.test.tsx',
        testCount: 15,
        status: 'idle'
      },
      {
        id: 'comp-share-modal',
        name: 'ShareEntityModal.test.tsx',
        path: 'src/features/sharing/components/__tests__/ShareEntityModal.test.tsx',
        testCount: 15,
        status: 'idle'
      },
      {
        id: 'comp-inbox-item',
        name: 'RecommendationInboxItem.test.tsx',
        path: 'src/features/sharing/components/__tests__/RecommendationInboxItem.test.tsx',
        testCount: 15,
        status: 'idle'
      },
      {
        id: 'comp-recipient-selector',
        name: 'RecommendationRecipientSelector.test.tsx',
        path: 'src/features/sharing/components/__tests__/RecommendationRecipientSelector.test.tsx',
        testCount: 15,
        status: 'idle'
      },
      {
        id: 'comp-creator-impact',
        name: 'ContentCreatorImpactCard.test.tsx',
        path: 'src/features/sharing/components/__tests__/ContentCreatorImpactCard.test.tsx',
        testCount: 20,
        status: 'idle'
      },
      {
        id: 'comp-mobile-share',
        name: 'MobileShareSheet.test.tsx',
        path: 'src/features/sharing/components/__tests__/MobileShareSheet.test.tsx',
        testCount: 15,
        status: 'idle'
      },
      {
        id: 'comp-swipeable',
        name: 'SwipeableRecommendationCard.test.tsx',
        path: 'src/features/sharing/components/__tests__/SwipeableRecommendationCard.test.tsx',
        testCount: 15,
        status: 'idle'
      },
      {
        id: 'comp-mobile-inbox',
        name: 'MobileRecommendationInbox.test.tsx',
        path: 'src/features/sharing/components/__tests__/MobileRecommendationInbox.test.tsx',
        testCount: 15,
        status: 'idle'
      },
      {
        id: 'comp-mobile-recipient',
        name: 'MobileRecipientSelector.test.tsx',
        path: 'src/features/sharing/components/__tests__/MobileRecipientSelector.test.tsx',
        testCount: 15,
        status: 'idle'
      }
    ]
  },
  {
    id: 'p4-api',
    name: 'P4: API Integration Tests',
    description: 'API route behavior simulation tests (45 tests)',
    icon: Server,
    expanded: true,
    files: [
      {
        id: 'api-recommendations',
        name: 'recommendations.test.ts',
        path: 'src/app/api/sharing/__tests__/recommendations.test.ts',
        testCount: 16,
        status: 'idle'
      },
      {
        id: 'api-entity-preview',
        name: 'entity-preview.test.ts',
        path: 'src/app/api/sharing/__tests__/entity-preview.test.ts',
        testCount: 8,
        status: 'idle'
      },
      {
        id: 'api-helpful',
        name: 'helpful.test.ts',
        path: 'src/app/api/sharing/__tests__/helpful.test.ts',
        testCount: 6,
        status: 'idle'
      },
      {
        id: 'api-thank',
        name: 'thank.test.ts',
        path: 'src/app/api/sharing/__tests__/thank.test.ts',
        testCount: 6,
        status: 'idle'
      },
      {
        id: 'api-counts',
        name: 'counts.test.ts',
        path: 'src/app/api/sharing/__tests__/counts.test.ts',
        testCount: 4,
        status: 'idle'
      },
      {
        id: 'api-impact',
        name: 'impact.test.ts',
        path: 'src/app/api/sharing/__tests__/impact.test.ts',
        testCount: 5,
        status: 'idle'
      }
    ]
  },
  {
    id: 'p5-e2e',
    name: 'P5: E2E Tests',
    description: 'End-to-end user journey tests with Playwright (13 scenarios)',
    icon: Globe,
    expanded: true,
    files: [
      {
        id: 'e2e-recommendation-flow',
        name: 'recommendation-flow.spec.ts',
        path: 'e2e/sharing/recommendation-flow.spec.ts',
        testCount: 13,
        status: 'idle'
      },
      {
        id: 'e2e-claim-listing',
        name: 'claim-listing.spec.ts',
        path: 'e2e/listings/claim-listing.spec.ts',
        testCount: 6,
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

function Phase5TestDashboardContent() {
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
    setTestOutput('[Starting] Running all TD Phase 5 tests...\n');

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
              <Beaker className="w-6 h-6 text-[#ed6437]" />
              Recommendations System
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
            Test implementation follows the TD Phase 5 Brain Plan specification.
          </p>
          <p className="text-xs text-blue-600 mt-2 font-mono">
            docs/components/connections/userrecommendations/phases/TD_PHASE_5_BRAIN_PLAN.md
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Page Export
// =============================================================================

export default function Phase5TestDashboardPage() {
  return (
    <ErrorBoundary componentName="Phase5TestDashboard">
      <Phase5TestDashboardContent />
    </ErrorBoundary>
  );
}
