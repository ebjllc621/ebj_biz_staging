/**
 * Admin Media System Test Reference Dashboard
 *
 * GOVERNANCE COMPLIANCE:
 * - Component tier: STANDARD (static reference display)
 * - Client Component: 'use client'
 * - Admin authentication required
 * - NO direct database access
 * - NO synthetic implementations: all test counts verified against vitest output
 *
 * Purpose:
 * - Reference page showing all Media System test files and their verified test counts
 * - Provides CLI commands for running tests via terminal (vitest)
 * - Test counts verified 2026-03-08 against `npm run test src/features/media/` (229 total)
 *
 * @tier STANDARD
 * @phase Phase 7 - UI Testing Integration (remediated Phase 8)
 * @authority docs/media/galleryformat/phases/PHASE_7_UI_TESTING_INTEGRATION_BRAIN_PLAN.md
 * @generated ComponentBuilder (remediated manually)
 * @dna-version 11.4.0
 */

'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@core/hooks/useAuth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import {
  FileCode2,
  ChevronDown,
  ChevronRight,
  Image,
  Upload,
  Layers,
  FolderTree,
  Copy,
  CheckCircle2,
  Terminal
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface TestFileInfo {
  id: string;
  name: string;
  path: string;
  testCount: number;
  cliCommand: string;
}

interface TestCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  files: TestFileInfo[];
  expanded: boolean;
}

// =============================================================================
// Test Data — Verified against vitest output 2026-03-08
// Total: 9 files, 229 tests, 229 passing
// =============================================================================

const getTestCategories = (): TestCategory[] => [
  {
    id: 'upload-components',
    name: 'Upload Components',
    icon: Upload,
    expanded: false,
    files: [
      {
        id: 'upload-dropzone',
        name: 'UploadDropZone',
        path: 'src/features/media/upload/components/__tests__/UploadDropZone.test.tsx',
        testCount: 32,
        cliCommand: 'npm run test src/features/media/upload/components/__tests__/UploadDropZone.test.tsx'
      },
      {
        id: 'seo-filename',
        name: 'SEO Filename Utility',
        path: 'src/features/media/upload/utils/__tests__/seo-filename.test.ts',
        testCount: 44,
        cliCommand: 'npm run test src/features/media/upload/utils/__tests__/seo-filename.test.ts'
      },
      {
        id: 'use-media-upload-modal',
        name: 'useMediaUploadModal Hook',
        path: 'src/features/media/upload/hooks/__tests__/useMediaUploadModal.test.ts',
        testCount: 31,
        cliCommand: 'npm run test src/features/media/upload/hooks/__tests__/useMediaUploadModal.test.ts'
      }
    ]
  },
  {
    id: 'lite-components',
    name: 'Media Manager Lite',
    icon: Layers,
    expanded: false,
    files: [
      {
        id: 'feature-card',
        name: 'FeatureCard',
        path: 'src/features/media/lite/components/__tests__/FeatureCard.test.tsx',
        testCount: 27,
        cliCommand: 'npm run test src/features/media/lite/components/__tests__/FeatureCard.test.tsx'
      },
      {
        id: 'feature-selector-grid',
        name: 'FeatureSelectorGrid',
        path: 'src/features/media/lite/components/__tests__/FeatureSelectorGrid.test.tsx',
        testCount: 12,
        cliCommand: 'npm run test src/features/media/lite/components/__tests__/FeatureSelectorGrid.test.tsx'
      },
      {
        id: 'image-seo-edit-modal',
        name: 'ImageSEOEditModal',
        path: 'src/features/media/lite/components/__tests__/ImageSEOEditModal.test.tsx',
        testCount: 22,
        cliCommand: 'npm run test src/features/media/lite/components/__tests__/ImageSEOEditModal.test.tsx'
      }
    ]
  },
  {
    id: 'admin-components',
    name: 'Admin Components',
    icon: FolderTree,
    expanded: false,
    files: [
      {
        id: 'directory-breadcrumb',
        name: 'DirectoryBreadcrumb',
        path: 'src/features/media/admin/components/__tests__/DirectoryBreadcrumb.test.tsx',
        testCount: 15,
        cliCommand: 'npm run test src/features/media/admin/components/__tests__/DirectoryBreadcrumb.test.tsx'
      },
      {
        id: 'seo-health-badge',
        name: 'SEOHealthBadge',
        path: 'src/features/media/admin/components/__tests__/SEOHealthBadge.test.tsx',
        testCount: 22,
        cliCommand: 'npm run test src/features/media/admin/components/__tests__/SEOHealthBadge.test.tsx'
      },
      {
        id: 'confirm-delete-modal',
        name: 'ConfirmDeleteModal',
        path: 'src/features/media/admin/components/__tests__/ConfirmDeleteModal.test.tsx',
        testCount: 24,
        cliCommand: 'npm run test src/features/media/admin/components/__tests__/ConfirmDeleteModal.test.tsx'
      }
    ]
  }
];

// =============================================================================
// Copy Button Component
// =============================================================================

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text for manual copy
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
      title="Copy CLI command"
    >
      {copied ? (
        <>
          <CheckCircle2 className="w-3 h-3 text-green-500" />
          <span className="text-green-600">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

// =============================================================================
// Test File Row Component
// =============================================================================

function TestFileRow({ file }: { file: TestFileInfo }) {
  return (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <FileCode2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {file.name}
          </p>
          <p className="text-xs text-gray-500 truncate font-mono">{file.path}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 ml-4">
        <span className="text-xs font-semibold text-gray-700 whitespace-nowrap bg-gray-100 px-2 py-0.5 rounded">
          {file.testCount} tests
        </span>
        <CopyButton text={file.cliCommand} />
      </div>
    </div>
  );
}

// =============================================================================
// Test Category Section Component
// =============================================================================

function TestCategorySection({
  category,
  onToggle
}: {
  category: TestCategory;
  onToggle: () => void;
}) {
  const Icon = category.icon;
  const totalTests = category.files.reduce((sum, f) => sum + f.testCount, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
            <p className="text-xs text-gray-500">
              {category.files.length} files, {totalTests} tests
            </p>
          </div>
        </div>
      </div>

      {category.expanded && (
        <div className="divide-y divide-gray-100">
          {category.files.map(file => (
            <TestFileRow key={file.id} file={file} />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Dashboard Content
// =============================================================================

function MediaTestDashboardContent() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<TestCategory[]>(getTestCategories);

  const toggleCategory = useCallback((categoryId: string) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId ? { ...cat, expanded: !cat.expanded } : cat
      )
    );
  }, []);

  const totalFiles = categories.reduce((sum, c) => sum + c.files.length, 0);
  const totalTests = categories.reduce(
    (sum, c) => sum + c.files.reduce((s, f) => s + f.testCount, 0),
    0
  );

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Image className="w-6 h-6 text-[#ed6437]" />
            Media System Test Reference
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Test inventory for the Media System. Run tests via CLI using the commands below.
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Test Files</p>
            <p className="text-2xl font-bold text-gray-900">{totalFiles}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase">Total Tests</p>
            <p className="text-2xl font-bold text-gray-900">{totalTests}</p>
          </div>
          <div className="bg-white rounded-lg border border-green-200 p-4 col-span-2 sm:col-span-1">
            <p className="text-xs font-medium text-green-600 uppercase">Last Verified</p>
            <p className="text-lg font-bold text-green-600">229/229 passing</p>
            <p className="text-xs text-gray-500">2026-03-08 via vitest</p>
          </div>
        </div>

        {/* Test Categories */}
        <div className="space-y-4">
          {categories.map(category => (
            <TestCategorySection
              key={category.id}
              category={category}
              onToggle={() => toggleCategory(category.id)}
            />
          ))}
        </div>

        {/* CLI Command Reference */}
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-800">
            <Terminal className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-300">CLI Commands</span>
          </div>
          <div className="p-4 space-y-3 font-mono text-sm">
            <div>
              <p className="text-gray-500"># Run all media tests (9 files, 229 tests)</p>
              <div className="flex items-center gap-2">
                <p className="text-green-400">npm run test src/features/media/</p>
                <CopyButton text="npm run test src/features/media/" />
              </div>
            </div>
            <div>
              <p className="text-gray-500"># Upload component tests (3 files, 107 tests)</p>
              <div className="flex items-center gap-2">
                <p className="text-green-400">npm run test src/features/media/upload/</p>
                <CopyButton text="npm run test src/features/media/upload/" />
              </div>
            </div>
            <div>
              <p className="text-gray-500"># Media Manager Lite tests (3 files, 61 tests)</p>
              <div className="flex items-center gap-2">
                <p className="text-green-400">npm run test src/features/media/lite/</p>
                <CopyButton text="npm run test src/features/media/lite/" />
              </div>
            </div>
            <div>
              <p className="text-gray-500"># Admin component tests (3 files, 61 tests)</p>
              <div className="flex items-center gap-2">
                <p className="text-green-400">npm run test src/features/media/admin/</p>
                <CopyButton text="npm run test src/features/media/admin/" />
              </div>
            </div>
          </div>
        </div>

        {/* Documentation Link */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-1">Documentation</h3>
          <p className="text-sm text-blue-700">
            Tests follow the Phase 7 Brain Plan specification for the Media Manager UI Testing Integration.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <p className="text-xs text-blue-600 font-mono">
              docs/media/galleryformat/phases/PHASE_7_UI_TESTING_INTEGRATION_BRAIN_PLAN.md
            </p>
            <span className="hidden sm:inline text-blue-400">|</span>
            <p className="text-xs text-blue-600 font-mono">
              docs/media/galleryformat/phases/README.md
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Page Export
// =============================================================================

export default function MediaTestsPage() {
  return (
    <ErrorBoundary componentName="MediaTestDashboard">
      <MediaTestDashboardContent />
    </ErrorBoundary>
  );
}
