/**
 * Offers Phase 4 Test Dashboard
 *
 * GOVERNANCE COMPLIANCE:
 * - Component tier: ADVANCED (multiple data displays, ErrorBoundary required)
 * - Client Component: 'use client'
 * - credentials: 'include' on all fetch
 * - Admin authentication required
 * - NO direct database access
 *
 * Features:
 * - View all Phase 4 test files organized by 10 categories
 * - Run individual test files or full test suites
 * - Display test results in real-time
 * - Test status tracking (passed/failed/pending)
 * - ~95 tests across 10 feature areas
 *
 * @tier ADVANCED
 * @phase Offers Phase 4.5.4
 * @authority docs/pages/layouts/offers/build/phases/PHASE_4_5_4_TESTING_ADMIN_BRAIN_PLAN.md
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
  Tag,
  Zap,
  FileText,
  TrendingUp,
  Heart,
  Package,
  Star,
  FlaskConical,
  MapPin,
  WifiOff,
  Globe
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
    id: 'p1-flash',
    name: 'P1: Flash Offers',
    description: 'Flash offer creation, countdown, filtering, and display tests (~15 tests)',
    icon: Zap,
    expanded: true,
    files: [
      {
        id: 'comp-flash-badge',
        name: 'FlashOfferBadge.test.tsx',
        path: 'src/features/offers/components/__tests__/FlashOfferBadge.test.tsx',
        testCount: 3,
        status: 'idle'
      },
      {
        id: 'comp-flash-countdown',
        name: 'FlashOfferCountdown.test.tsx',
        path: 'src/features/offers/components/__tests__/FlashOfferCountdown.test.tsx',
        testCount: 4,
        status: 'idle'
      },
      {
        id: 'comp-flash-card',
        name: 'FlashOfferCard.test.tsx',
        path: 'src/features/offers/components/__tests__/FlashOfferCard.test.tsx',
        testCount: 3,
        status: 'idle'
      },
      {
        id: 'comp-flash-section',
        name: 'FlashOffersSection.test.tsx',
        path: 'src/features/offers/components/__tests__/FlashOffersSection.test.tsx',
        testCount: 3,
        status: 'idle'
      },
      {
        id: 'hook-flash-offers',
        name: 'useFlashOffers.test.ts',
        path: 'src/features/offers/hooks/__tests__/useFlashOffers.test.ts',
        testCount: 4,
        status: 'idle'
      },
      {
        id: 'hook-flash-countdown',
        name: 'useFlashCountdown.test.ts',
        path: 'src/features/offers/hooks/__tests__/useFlashCountdown.test.ts',
        testCount: 3,
        status: 'idle'
      }
    ]
  },
  {
    id: 'p2-templates',
    name: 'P2: Templates',
    description: 'Template save/load/schedule and recurrence config tests (~12 tests)',
    icon: FileText,
    expanded: true,
    files: [
      {
        id: 'comp-template-selector',
        name: 'TemplateSelector.test.tsx',
        path: 'src/features/dashboard/components/managers/offers/templates/__tests__/TemplateSelector.test.tsx',
        testCount: 3,
        status: 'idle'
      },
      {
        id: 'comp-template-list',
        name: 'TemplateListPanel.test.tsx',
        path: 'src/features/dashboard/components/managers/offers/templates/__tests__/TemplateListPanel.test.tsx',
        testCount: 4,
        status: 'idle'
      },
      {
        id: 'comp-recurrence-config',
        name: 'RecurrenceConfig.test.tsx',
        path: 'src/features/dashboard/components/managers/offers/templates/__tests__/RecurrenceConfig.test.tsx',
        testCount: 3,
        status: 'idle'
      },
      {
        id: 'hook-templates',
        name: 'useOfferTemplates.test.ts',
        path: 'src/features/offers/hooks/__tests__/useOfferTemplates.test.ts',
        testCount: 4,
        status: 'idle'
      }
    ]
  },
  {
    id: 'p3-social-proof',
    name: 'P3: Social Proof',
    description: 'Badge display, trending calculation, and claims indicator tests (~10 tests)',
    icon: TrendingUp,
    expanded: true,
    files: [
      {
        id: 'comp-social-badge',
        name: 'SocialProofBadge.test.tsx',
        path: 'src/features/offers/components/__tests__/SocialProofBadge.test.tsx',
        testCount: 3,
        status: 'idle'
      },
      {
        id: 'comp-trending-badge',
        name: 'TrendingBadge.test.tsx',
        path: 'src/features/offers/components/__tests__/TrendingBadge.test.tsx',
        testCount: 3,
        status: 'idle'
      },
      {
        id: 'comp-connection-badge',
        name: 'ConnectionClaimsBadge.test.tsx',
        path: 'src/features/offers/components/__tests__/ConnectionClaimsBadge.test.tsx',
        testCount: 2,
        status: 'idle'
      },
      {
        id: 'hook-social-proof',
        name: 'useSocialProof.test.ts',
        path: 'src/features/offers/hooks/__tests__/useSocialProof.test.ts',
        testCount: 4,
        status: 'idle'
      }
    ]
  },
  {
    id: 'p4-loyalty',
    name: 'P4: Loyalty',
    description: 'Tier calculation, panel display, and customer tracking tests (~8 tests)',
    icon: Heart,
    expanded: false,
    files: [
      {
        id: 'comp-loyalty-badge',
        name: 'LoyaltyTierBadge.test.tsx',
        path: 'src/features/offers/components/__tests__/LoyaltyTierBadge.test.tsx',
        testCount: 2,
        status: 'idle'
      },
      {
        id: 'comp-loyalty-progress',
        name: 'LoyaltyProgressBar.test.tsx',
        path: 'src/features/offers/components/__tests__/LoyaltyProgressBar.test.tsx',
        testCount: 2,
        status: 'idle'
      },
      {
        id: 'hook-loyal-customers',
        name: 'useLoyalCustomers.test.ts',
        path: 'src/features/offers/hooks/__tests__/useLoyalCustomers.test.ts',
        testCount: 3,
        status: 'idle'
      },
      {
        id: 'hook-loyalty-status',
        name: 'useLoyaltyStatus.test.ts',
        path: 'src/features/offers/hooks/__tests__/useLoyaltyStatus.test.ts',
        testCount: 3,
        status: 'idle'
      }
    ]
  },
  {
    id: 'p5-bundles',
    name: 'P5: Bundles',
    description: 'Bundle creation, claiming, and display tests (~12 tests)',
    icon: Package,
    expanded: false,
    files: [
      {
        id: 'comp-bundle-card',
        name: 'BundleCard.test.tsx',
        path: 'src/features/offers/components/__tests__/BundleCard.test.tsx',
        testCount: 3,
        status: 'idle'
      },
      {
        id: 'comp-bundle-claim',
        name: 'BundleClaimButton.test.tsx',
        path: 'src/features/offers/components/__tests__/BundleClaimButton.test.tsx',
        testCount: 3,
        status: 'idle'
      },
      {
        id: 'comp-bundle-creator',
        name: 'BundleCreatorModal.test.tsx',
        path: 'src/features/dashboard/components/managers/offers/__tests__/BundleCreatorModal.test.tsx',
        testCount: 4,
        status: 'idle'
      },
      {
        id: 'hook-bundle',
        name: 'useOfferBundle.test.ts',
        path: 'src/features/offers/hooks/__tests__/useOfferBundle.test.ts',
        testCount: 3,
        status: 'idle'
      },
      {
        id: 'hook-bundles',
        name: 'useOfferBundles.test.ts',
        path: 'src/features/offers/hooks/__tests__/useOfferBundles.test.ts',
        testCount: 3,
        status: 'idle'
      }
    ]
  },
  {
    id: 'p6-reviews',
    name: 'P6: Reviews',
    description: 'Post-redemption prompt, submission, and display tests (~8 tests)',
    icon: Star,
    expanded: false,
    files: [
      {
        id: 'comp-review-form',
        name: 'OfferReviewForm.test.tsx',
        path: 'src/features/offers/components/__tests__/OfferReviewForm.test.tsx',
        testCount: 3,
        status: 'idle'
      },
      {
        id: 'comp-review-prompt',
        name: 'OfferReviewPrompt.test.tsx',
        path: 'src/features/offers/components/__tests__/OfferReviewPrompt.test.tsx',
        testCount: 2,
        status: 'idle'
      },
      {
        id: 'comp-review-list',
        name: 'OfferReviewsList.test.tsx',
        path: 'src/features/offers/components/__tests__/OfferReviewsList.test.tsx',
        testCount: 2,
        status: 'idle'
      },
      {
        id: 'hook-reviews',
        name: 'useOfferReviews.test.ts',
        path: 'src/features/offers/hooks/__tests__/useOfferReviews.test.ts',
        testCount: 3,
        status: 'idle'
      }
    ]
  },
  {
    id: 'p7-ab-testing',
    name: 'P7: A/B Testing',
    description: 'Variant creation, tracking, and results display tests (~10 tests)',
    icon: FlaskConical,
    expanded: false,
    files: [
      {
        id: 'comp-ab-setup',
        name: 'ABTestSetupModal.test.tsx',
        path: 'src/features/dashboard/components/managers/offers/__tests__/ABTestSetupModal.test.tsx',
        testCount: 4,
        status: 'idle'
      },
      {
        id: 'comp-ab-results',
        name: 'ABTestResultsPanel.test.tsx',
        path: 'src/features/dashboard/components/managers/offers/__tests__/ABTestResultsPanel.test.tsx',
        testCount: 3,
        status: 'idle'
      },
      {
        id: 'comp-ab-preview',
        name: 'ABTestVariantPreview.test.tsx',
        path: 'src/features/dashboard/components/managers/offers/__tests__/ABTestVariantPreview.test.tsx',
        testCount: 2,
        status: 'idle'
      },
      {
        id: 'hook-ab-test',
        name: 'useABTest.test.ts',
        path: 'src/features/offers/hooks/__tests__/useABTest.test.ts',
        testCount: 4,
        status: 'idle'
      }
    ]
  },
  {
    id: 'p8-geo-fence',
    name: 'P8: Geo-Fence',
    description: 'Trigger setup, notification, and nearby offers tests (~8 tests)',
    icon: MapPin,
    expanded: false,
    files: [
      {
        id: 'comp-geo-config',
        name: 'GeoFenceConfig.test.tsx',
        path: 'src/features/dashboard/components/managers/offers/__tests__/GeoFenceConfig.test.tsx',
        testCount: 3,
        status: 'idle'
      },
      {
        id: 'comp-geo-list',
        name: 'GeoFenceList.test.tsx',
        path: 'src/features/dashboard/components/managers/offers/__tests__/GeoFenceList.test.tsx',
        testCount: 2,
        status: 'idle'
      },
      {
        id: 'hook-geo-fence',
        name: 'useGeoFence.test.ts',
        path: 'src/features/offers/hooks/__tests__/useGeoFence.test.ts',
        testCount: 3,
        status: 'idle'
      },
      {
        id: 'hook-nearby',
        name: 'useNearbyOffers.test.ts',
        path: 'src/features/offers/hooks/__tests__/useNearbyOffers.test.ts',
        testCount: 3,
        status: 'idle'
      }
    ]
  },
  {
    id: 'p9-offline',
    name: 'P9: Offline',
    description: 'Cache button, validation, and offline redemption tests (~6 tests)',
    icon: WifiOff,
    expanded: false,
    files: [
      {
        id: 'comp-offline-cache',
        name: 'OfflineCacheButton.test.tsx',
        path: 'src/features/offers/components/__tests__/OfflineCacheButton.test.tsx',
        testCount: 2,
        status: 'idle'
      },
      {
        id: 'comp-offline-indicator',
        name: 'OfflineIndicator.test.tsx',
        path: 'src/features/offers/components/__tests__/OfflineIndicator.test.tsx',
        testCount: 2,
        status: 'idle'
      },
      {
        id: 'hook-offline-cache',
        name: 'useOfflineCache.test.ts',
        path: 'src/features/offers/hooks/__tests__/useOfflineCache.test.ts',
        testCount: 3,
        status: 'idle'
      }
    ]
  },
  {
    id: 'p10-navigation',
    name: 'P10: Navigation Accessibility',
    description: 'All pages accessible via menu click tests (~6 tests)',
    icon: Globe,
    expanded: true,
    files: [
      {
        id: 'nav-admin-offers',
        name: 'admin-offers-navigation.test.ts',
        path: 'src/app/admin/offers/__tests__/navigation.test.ts',
        testCount: 2,
        status: 'idle'
      },
      {
        id: 'nav-dashboard-offers',
        name: 'dashboard-offers-navigation.test.ts',
        path: 'src/features/dashboard/components/managers/__tests__/offers-navigation.test.ts',
        testCount: 2,
        status: 'idle'
      },
      {
        id: 'nav-public-offers',
        name: 'public-offers-navigation.test.ts',
        path: 'src/app/offers/__tests__/navigation.test.ts',
        testCount: 2,
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

function OffersPhase4TestDashboardContent() {
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
    setTestOutput('[Starting] Running all Offers Phase 4 tests...\n');

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
              <Tag className="w-6 h-6 text-[#ed6437]" />
              Offers Phase 4 Features
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
            Test implementation follows the Offers Phase 4 Brain Plan specification.
          </p>
          <p className="text-xs text-blue-600 mt-2 font-mono">
            docs/pages/layouts/offers/build/phases/PHASE_4_5_4_TESTING_ADMIN_BRAIN_PLAN.md
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Page Export
// =============================================================================

export default function OffersPhase4TestDashboardPage() {
  return (
    <ErrorBoundary componentName="OffersPhase4TestDashboard">
      <OffersPhase4TestDashboardContent />
    </ErrorBoundary>
  );
}
