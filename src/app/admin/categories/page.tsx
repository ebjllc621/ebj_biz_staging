/**
 * Admin Category Management Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: Custom hierarchical tree view (JUSTIFIED - AdminTableTemplate doesn't support tree structures)
 * - Authentication: Admin-only access required
 * - Service Boundary: NO direct database access (API routes only)
 * - Credentials: 'include' for all fetch requests
 * - Complexity: ADVANCED tier (error boundaries required)
 *
 * Features:
 * - Hierarchical tree view (2,328 categories)
 * - Expand/collapse category nodes
 * - CRUD operations: Create, Edit, Delete
 * - Orphan handling on delete (reassign or delete children)
 * - Search by name and slug
 * - Category statistics (total, root, max depth)
 *
 * @authority PHASE_5.1_BRAIN_PLAN.md - Section 3.2
 * @component
 * @returns {JSX.Element} Admin category management interface
 */

/**
 * Admin Category Management Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: Custom hierarchical tree view (JUSTIFIED - AdminTableTemplate doesn't support tree structures)
 * - Authentication: Admin-only access required
 * - Service Boundary: NO direct database access (API routes only)
 * - Credentials: 'include' for all fetch requests
 * - Complexity: ADVANCED tier (error boundaries required)
 * - Phase R4.1: useMemo + useCallback optimizations for 2,328 categories
 *
 * @authority docs/codeReview/12-8-25/phases/R4_BRAIN_PLAN.md
 * @phase Phase R4.1 - React Component Optimization
 */

'use client';

// Force dynamic rendering (required for useAuth() - React Context cannot be used in SSG)
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { useAuth } from '@core/hooks/useAuth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorFallback } from '@/components/common/ErrorFallback';
import { fetchWithCsrf } from '@core/utils/csrf';
import { getCategoryPath, flattenCategoryTree } from '@core/utils/category';
import { KeywordBadges } from '@/components/admin/KeywordBadges';
import { X, Edit2, Trash2, Eye, EyeOff, Download, Upload, Search, Filter, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { generateJSONExport, generateCSVExport, generateSQLExport, downloadFile, generateTimestampedFilename } from '@core/utils/export';
import type { ExportFormat, ImportPreviewResult, ConflictResolution } from '@core/types/import-export';
import { detectSearchMode, parseIdFromQuery, parseKeywordFromQuery, type SearchMode, escapeRegex } from '@core/utils/search';
import { getSearchHistory, saveSearchToHistory, clearSearchHistory, type SearchHistoryEntry } from '@core/utils/searchHistory';
import { HighlightedText } from '@/components/common/HighlightedText';
// PHASE 7: Mobile optimization imports
import { useIsMobile } from '@core/hooks/useMediaQuery';
import { CategoryTreeSkeleton } from '@/components/common/Skeleton';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Category {
  id: number;
  name: string;
  slug: string;
  keywords: string[] | null;
  cat_description: string | null;
  description?: string;
  parent_id: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string | Date;
  updated_at: string | Date;
  children?: Category[];
}

interface CategoryFormData {
  name: string;
  slug: string;
  cat_description: string;
  keywords: string;
  parent_id: number | null;
  is_active: boolean;
}

/**
 * Advanced filter state interface (PHASE 6)
 */
interface AdvancedFilters {
  id: string;
  name: string;
  slug: string;
  keywords: string;
  isActive: 'all' | 'active' | 'inactive';
  matchMode: 'all' | 'any';
}

/**
 * Default advanced filter values (PHASE 6)
 */
const DEFAULT_ADVANCED_FILTERS: AdvancedFilters = {
  id: '',
  name: '',
  slug: '',
  keywords: '',
  isActive: 'all',
  matchMode: 'all'
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Category Statistics Component (R4.1 - memoized for performance)
 * Displays aggregate statistics about categories
 */
const CategoryStatistics = memo(function CategoryStatistics({ categories }: { categories: Category[] }) {
  /**
   * Calculate statistics (R4.1 - useMemo optimization)
   * Expensive operation with 2,328+ categories
   */
  const stats = useMemo(() => {
    let totalCategories = 0;
    let rootCategories = 0;
    let maxDepth = 0;

    const countCategories = (cats: Category[], depth = 0) => {
      cats.forEach(cat => {
        totalCategories++;
        if (depth === 0) rootCategories++;
        if (depth > maxDepth) maxDepth = depth;
        if (cat.children) {
          countCategories(cat.children, depth + 1);
        }
      });
    };

    countCategories(categories);

    return { totalCategories, rootCategories, maxDepth };
  }, [categories]);

  return (
    <div className="bg-white p-4 rounded shadow mb-4">
      <h3 className="font-medium mb-4">Category Statistics</h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Total Categories:</span>
          <span className="font-medium">{stats.totalCategories}</span>
        </div>
        <div className="flex justify-between">
          <span>Root Categories:</span>
          <span className="font-medium">{stats.rootCategories}</span>
        </div>
        <div className="flex justify-between">
          <span>Maximum Depth:</span>
          <span className="font-medium">{stats.maxDepth}</span>
        </div>
      </div>
    </div>
  );
});

/**
 * Category Search Component - PHASE 6: Enhanced with multi-mode search, debounce, history
 * (R4.1 - memoized with useCallback)
 *
 * @tier STANDARD
 * @phase Phase 6 - Enhanced Search Functionality
 */
const CategorySearch = memo(function CategorySearch({
  onSearch,
  searchHistory,
  onHistoryItemClick,
  onClearHistory,
  isDebouncing
}: {
  onSearch: (query: string, mode: SearchMode) => void;
  searchHistory: SearchHistoryEntry[];
  onHistoryItemClick: (query: string) => void;
  onClearHistory: () => void;
  isDebouncing: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Detect search mode from current query
  const searchMode = useMemo(() => detectSearchMode(searchQuery), [searchQuery]);

  /**
   * Handle search input with debounce (R4.1 - useCallback optimization)
   * Delays search execution by 300ms after typing stops
   */
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer (300ms)
    debounceTimerRef.current = setTimeout(() => {
      const mode = detectSearchMode(query);
      onSearch(query, mode);
    }, 300);
  }, [onSearch]);

  /**
   * Handle Enter key for immediate search (bypass debounce)
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Cancel debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // Immediate search
      const mode = detectSearchMode(searchQuery);
      onSearch(searchQuery, mode);
    } else if (e.key === 'Escape') {
      // Clear search on Escape
      setSearchQuery('');
      onSearch('', 'all');
    }
  }, [searchQuery, onSearch]);

  /**
   * Handle clear button click
   */
  const handleClear = useCallback(() => {
    setSearchQuery('');
    onSearch('', 'all');
  }, [onSearch]);

  /**
   * Handle history item click
   */
  const handleHistoryClick = useCallback((query: string) => {
    setSearchQuery(query);
    setIsHistoryOpen(false);
    const mode = detectSearchMode(query);
    onSearch(query, mode);
    onHistoryItemClick(query);
  }, [onSearch, onHistoryItemClick]);

  /**
   * Cleanup debounce timer on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Format relative time for history entries
   */
  const getRelativeTime = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="mb-4 relative">
      <div className="relative">
        {/* Search icon */}
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />

        {/* Search input */}
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsHistoryOpen(searchHistory.length > 0)}
          onBlur={() => setTimeout(() => setIsHistoryOpen(false), 200)} // Delay to allow history click
          placeholder="Search by name, slug, #ID, or keyword:..."
          autoComplete="off"
          data-lpignore="true"
          data-1p-ignore="true"
          className="w-full pl-10 pr-24 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          aria-label="Search categories"
        />

        {/* Search mode indicator badge */}
        {searchQuery && (
          <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {searchMode === 'id' && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                ID Search
              </span>
            )}
            {searchMode === 'keyword' && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                Keyword Search
              </span>
            )}
          </div>
        )}

        {/* Loading spinner during debounce */}
        {isDebouncing && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-orange-500 border-t-transparent rounded-full" />
          </div>
        )}

        {/* Clear button */}
        {searchQuery && !isDebouncing && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Search history dropdown */}
      {isHistoryOpen && searchHistory.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10">
          <div className="p-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Recent Searches</span>
              <button
                onClick={onClearHistory}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            </div>
            <div className="space-y-1">
              {searchHistory.map((entry, i) => (
                <button
                  key={i}
                  onClick={() => handleHistoryClick(entry.query)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left hover:bg-gray-50 rounded"
                >
                  <Clock className="w-3 h-3 text-gray-600" />
                  <span className="flex-1">{entry.query}</span>
                  <span className="text-xs text-gray-600">{getRelativeTime(entry.timestamp)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * Generate URL-safe slug from category name (client-side)
 * Replicates CategoryService.generateSlug() logic for preview
 * Note: Server-side validation still ensures uniqueness
 */
function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Category Editor Modal Component
 */
function CategoryEditorModal({
  category,
  parentCategory,
  allCategories,
  isOpen,
  onClose,
  onSave
}: {
  category?: Category | null;
  parentCategory?: Category | null;
  allCategories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: category?.name ?? '',
    slug: category?.slug ?? '',
    cat_description: category?.cat_description ?? '',
    keywords: category?.keywords?.join(', ') ?? '',
    parent_id: parentCategory?.id ?? category?.parent_id ?? null,
    is_active: category?.is_active ?? true
  });
  const [submitting, setSubmitting] = useState(false);
  const [parentSearch, setParentSearch] = useState('');
  const [showParentSuggestions, setShowParentSuggestions] = useState(false);

  // Get available parent categories (exclude self and descendants to prevent circular reference)
  const getAvailableParents = useCallback(() => {
    if (!category) return allCategories;

    // Get all descendant IDs to exclude
    const getDescendantIds = (cat: Category): number[] => {
      const ids = [cat.id];
      if (cat.children) {
        cat.children.forEach(child => {
          ids.push(...getDescendantIds(child));
        });
      }
      return ids;
    };

    const excludeIds = new Set(getDescendantIds(category));
    return allCategories.filter(c => !excludeIds.has(c.id));
  }, [category, allCategories]);

  // Filter parent suggestions based on search
  const filteredParents = useMemo(() => {
    const available = getAvailableParents();
    if (!parentSearch.trim()) return available.slice(0, 10);

    const search = parentSearch.toLowerCase();
    return available
      .filter(cat => {
        const path = getCategoryPath(cat, allCategories).toLowerCase();
        return path.includes(search) || cat.name.toLowerCase().includes(search);
      })
      .slice(0, 10);
  }, [parentSearch, getAvailableParents, allCategories]);

  // Get the currently selected parent category
  const selectedParent = useMemo(() => {
    if (!formData.parent_id) return null;
    return allCategories.find(c => c.id === formData.parent_id) ?? null;
  }, [formData.parent_id, allCategories]);

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        slug: category.slug,
        cat_description: category.cat_description ?? '',
        keywords: category.keywords?.join(', ') ?? '',
        parent_id: category.parent_id,
        is_active: category.is_active
      });
    } else if (parentCategory) {
      setFormData({
        name: '',
        slug: '',
        cat_description: '',
        keywords: '',
        parent_id: parentCategory.id,
        is_active: true
      });
    } else {
      // Reset to clean state for "+New" category (no stale edit data)
      setFormData({
        name: '',
        slug: '',
        cat_description: '',
        keywords: '',
        parent_id: null,
        is_active: true
      });
    }
    setParentSearch('');
    setShowParentSuggestions(false);
  }, [category, parentCategory]);

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.slug.trim()) {
      alert('Name and slug are required');
      return;
    }

    setSubmitting(true);
    try {
      const keywordsArray = formData.keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      const payload = {
        ...formData,
        keywords: keywordsArray
      };

      const url = category
        ? `/api/categories/${category.id}`
        : '/api/categories';

      const method = category ? 'PATCH' : 'POST';

      const response = await fetchWithCsrf(url, {
        method,
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        onSave();
        onClose();
      } else {
        const error = await response.json();
        alert(error.message ?? 'Failed to save category');
      }
    } catch (error) {
      alert('Error saving category');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={category ? `Edit Category: ${category.name}` : 'Create New Category'}
      size="medium"
      fullScreenMobile={true}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => {
              const newName = e.target.value;
              setFormData({
                ...formData,
                name: newName,
                // Auto-generate slug for NEW categories only (preserve custom slugs on edit)
                slug: !category ? generateSlugFromName(newName) : formData.slug
              });
            }}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>

        {/* Parent Category selector with autocomplete */}
        <div>
          <label className="block text-sm font-medium mb-1">Parent Category</label>
          <div className="relative">
            {/* Display selected parent or search input */}
            {selectedParent && !showParentSuggestions ? (
              <div className="flex items-center gap-2 w-full px-3 py-2 border rounded bg-gray-50">
                <span className="flex-1 text-sm text-gray-700 truncate">
                  {getCategoryPath(selectedParent, allCategories)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, parent_id: null });
                    setParentSearch('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  title="Clear selection"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <input
                type="text"
                value={parentSearch}
                onChange={(e) => {
                  setParentSearch(e.target.value);
                  setShowParentSuggestions(true);
                }}
                onFocus={() => setShowParentSuggestions(true)}
                onBlur={() => setTimeout(() => setShowParentSuggestions(false), 200)}
                placeholder="Search for parent category..."
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
                className="w-full px-3 py-2 border rounded focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200"
              />
            )}

            {/* Autocomplete suggestions dropdown */}
            {showParentSuggestions && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {/* None option for top-level */}
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, parent_id: null });
                    setParentSearch('');
                    setShowParentSuggestions(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors border-b ${
                    formData.parent_id === null ? 'bg-orange-50 text-[#ed6437] font-medium' : ''
                  }`}
                >
                  <span className="italic">None (Top-level category)</span>
                </button>

                {/* Category suggestions */}
                {filteredParents.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, parent_id: cat.id });
                      setParentSearch('');
                      setShowParentSuggestions(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors ${
                      formData.parent_id === cat.id ? 'bg-orange-50 text-[#ed6437] font-medium' : ''
                    }`}
                  >
                    {getCategoryPath(cat, allCategories)}
                  </button>
                ))}

                {filteredParents.length === 0 && parentSearch && (
                  <div className="px-3 py-2 text-sm text-gray-500 italic">
                    No matching categories found
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Select a parent to nest this category, or leave empty for top-level
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Slug *</label>
          <input
            type="text"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            className="w-full px-3 py-2 border rounded"
            required
          />
          <p className="text-xs text-gray-500 mt-1">URL-friendly identifier</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={formData.cat_description}
            onChange={(e) => setFormData({ ...formData, cat_description: e.target.value })}
            className="w-full px-3 py-2 border rounded"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Keywords (comma-separated)</label>
          <input
            type="text"
            value={formData.keywords}
            onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
            className="w-full px-3 py-2 border rounded"
            placeholder="keyword1, keyword2, keyword3"
          />
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            />
            <span className="text-sm font-medium">Active Category</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <BizModalButton variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </BizModalButton>
          <BizModalButton variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : category ? 'Update' : 'Create'}
          </BizModalButton>
        </div>
      </div>
    </BizModal>
  );
}

/**
 * Delete Confirmation Modal Component
 */
function DeleteConfirmationModal({
  category,
  isOpen,
  onClose,
  onConfirm
}: {
  category: Category;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (orphanHandling: 'delete' | 'reassign') => void;
}) {
  const [orphanHandling, setOrphanHandling] = useState<'delete' | 'reassign'>('reassign');
  const [submitting, setSubmitting] = useState(false);
  const hasChildren = category.children && category.children.length > 0;

  const handleConfirm = async () => {
    setSubmitting(true);
    onConfirm(orphanHandling);
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Deletion"
      size="small"
      fullScreenMobile={true}
    >
      <div className="space-y-4">
        <p>
          Are you sure you want to delete <strong>{category.name}</strong>?
        </p>

        {hasChildren && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">
              This category has {category.children!.length} child categories.
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="reassign"
                  checked={orphanHandling === 'reassign'}
                  onChange={() => setOrphanHandling('reassign')}
                />
                <span>Move children to parent category</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="delete"
                  checked={orphanHandling === 'delete'}
                  onChange={() => setOrphanHandling('delete')}
                />
                <span className="text-red-600">Delete all child categories (DANGEROUS)</span>
              </label>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <BizModalButton variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </BizModalButton>
          <BizModalButton variant="danger" onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Deleting...' : 'Delete'}
          </BizModalButton>
        </div>
      </div>
    </BizModal>
  );
}

/**
 * BatchHandlingBar - Floating action bar for batch operations
 * PHASE 3: NEW component for bulk actions
 * PHASE 7: Mobile-responsive with condensed layout
 * Appears at bottom when categories are selected
 */
function BatchHandlingBar({
  selectedCount,
  isMobile = false,
  onBulkEdit,
  onBulkDelete,
  onClearSelection
}: {
  selectedCount: number;
  isMobile?: boolean;
  onBulkEdit: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 transition-transform">
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${isMobile ? 'py-3' : 'py-4'}`}>
        <div className={`flex items-center ${isMobile ? 'justify-center gap-4' : 'justify-between'}`}>
          {/* Selection count - PHASE 7: Condensed on mobile */}
          <div className="flex items-center gap-4">
            <button
              onClick={onClearSelection}
              className="min-w-[44px] min-h-[44px] p-2.5 flex items-center justify-center rounded-md hover:bg-gray-100 active:scale-95 transition-all"
              aria-label="Clear selection"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-900">
              {isMobile ? selectedCount : `${selectedCount} ${selectedCount === 1 ? 'category' : 'categories'} selected`}
            </span>
          </div>

          {/* Actions - PHASE 7: Icon-only on mobile */}
          <div className="flex items-center gap-2">
            <button
              onClick={onBulkEdit}
              className={`${
                isMobile
                  ? 'min-w-[44px] min-h-[44px] p-2.5 flex items-center justify-center'
                  : 'flex items-center gap-2 px-3 py-2'
              } rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 active:scale-95 transition-all text-sm`}
              aria-label={isMobile ? 'Bulk edit' : undefined}
            >
              <Edit2 className="w-4 h-4" />
              {!isMobile && <span>Edit</span>}
            </button>

            <button
              onClick={onBulkDelete}
              className={`${
                isMobile
                  ? 'min-w-[44px] min-h-[44px] p-2.5 flex items-center justify-center'
                  : 'flex items-center gap-2 px-3 py-2'
              } rounded-md bg-red-50 hover:bg-red-100 text-red-600 active:scale-95 transition-all text-sm`}
              aria-label={isMobile ? 'Bulk delete' : undefined}
            >
              <Trash2 className="w-4 h-4" />
              {!isMobile && <span>Delete</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * BatchEditModal - Bulk edit confirmation modal
 * PHASE 3: NEW component for batch editing
 */
function BatchEditModal({
  isOpen,
  selectedCategories,
  allCategories,
  onClose,
  onExecute
}: {
  isOpen: boolean;
  selectedCategories: Category[];
  allCategories: Category[];
  onClose: () => void;
  onExecute: () => void;
}) {
  const [parentId, setParentId] = useState<number | null>(null);
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [keywordsToAdd, setKeywordsToAdd] = useState('');
  const [keywordsToRemove, setKeywordsToRemove] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleExecute = async () => {
    // Validate at least one field changed
    if (parentId === null && isActive === null && !keywordsToAdd.trim() && !keywordsToRemove.trim()) {
      alert('Please change at least one field');
      return;
    }

    setSubmitting(true);
    try {
      const updates: {
        parent_id?: number | null;
        is_active?: boolean;
        keywords_add?: string[];
        keywords_remove?: string[];
      } = {};

      if (parentId !== null) updates.parent_id = parentId;
      if (isActive !== null) updates.is_active = isActive;
      if (keywordsToAdd.trim()) {
        updates.keywords_add = keywordsToAdd.split(',').map(k => k.trim()).filter(k => k.length > 0);
      }
      if (keywordsToRemove.trim()) {
        updates.keywords_remove = keywordsToRemove.split(',').map(k => k.trim()).filter(k => k.length > 0);
      }

      const response = await fetchWithCsrf('/api/admin/categories/batch-update', {
        method: 'POST',
        body: JSON.stringify({
          categoryIds: selectedCategories.map(c => c.id),
          updates
        })
      });

      if (response.ok) {
        onExecute();
        onClose();
        // Reset form
        setParentId(null);
        setIsActive(null);
        setKeywordsToAdd('');
        setKeywordsToRemove('');
      } else {
        const error = await response.json();
        alert(error.error?.message ?? 'Failed to update categories');
      }
    } catch (error) {
      alert('Error updating categories');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Edit Categories"
      size="medium"
      fullScreenMobile={true}
    >
      <div className="space-y-4">
        {/* Selection count */}
        <div className="text-sm text-gray-700">
          This action will affect <strong>{selectedCategories.length}</strong> {selectedCategories.length === 1 ? 'category' : 'categories'}.
        </div>

        {/* Selected categories list (first 5) */}
        <div className="p-3 bg-gray-50 rounded-md">
          <p className="text-sm font-medium mb-2">Selected Categories:</p>
          <ul className="text-sm text-gray-700 list-disc list-inside">
            {selectedCategories.slice(0, 5).map(cat => (
              <li key={cat.id}>{cat.name}</li>
            ))}
            {selectedCategories.length > 5 && (
              <li className="text-gray-500">+ {selectedCategories.length - 5} more</li>
            )}
          </ul>
        </div>

        {/* Parent Category selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Parent Category (optional)
          </label>
          <select
            value={parentId ?? ''}
            onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">-- No change --</option>
            <option value="0">Root (No parent)</option>
            {allCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Active Status toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Active Status (optional)
          </label>
          <select
            value={isActive === null ? '' : isActive ? 'true' : 'false'}
            onChange={(e) => setIsActive(e.target.value === '' ? null : e.target.value === 'true')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">-- No change --</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        {/* Keywords to add */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add Keywords (comma-separated)
          </label>
          <input
            type="text"
            value={keywordsToAdd}
            onChange={(e) => setKeywordsToAdd(e.target.value)}
            placeholder="keyword1, keyword2"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Keywords to remove */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Remove Keywords (comma-separated)
          </label>
          <input
            type="text"
            value={keywordsToRemove}
            onChange={(e) => setKeywordsToRemove(e.target.value)}
            placeholder="keyword1, keyword2"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Warning */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> Only changed fields will be updated. Unchanged fields will remain as they are.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <BizModalButton variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </BizModalButton>
          <BizModalButton variant="primary" onClick={handleExecute} disabled={submitting}>
            {submitting ? 'Updating...' : 'Apply Changes'}
          </BizModalButton>
        </div>
      </div>
    </BizModal>
  );
}

/**
 * AdminPasswordModal - Admin password confirmation for destructive operations
 * PHASE 4: NEW component for password verification
 * PHASE 4.5: ENHANCED with password visibility toggle
 *
 * @tier STANDARD
 * @phase Phase 4.5 - Password Visibility Toggle Enhancement
 *
 * GOVERNANCE:
 * - BizModal wrapper MANDATORY
 * - Password never logged in plaintext
 * - Reusable for future admin operations
 * - PII-compliant error messages
 *
 * Features:
 * - Password input with autoFocus
 * - Password visibility toggle (Eye/EyeOff icons) - NEW Phase 4.5
 * - Failed attempt tracking (client-side display)
 * - Lockout countdown display
 * - Enter key submits password
 * - Clear error messaging
 *
 * @param isOpen - Modal visibility state
 * @param onClose - Close handler (cancel or X button)
 * @param onVerified - Success callback when password verified
 * @param operationDescription - Description of operation requiring password
 */
function AdminPasswordModal({
  isOpen,
  onClose,
  onVerified,
  operationDescription
}: {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  operationDescription: string;
}) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // PHASE 4.5: Password visibility toggle
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setShowPassword(false); // PHASE 4.5: Reset visibility toggle
      setError(null);
      setAttemptsRemaining(null);
      setLockedUntil(null);
    }
  }, [isOpen]);

  // Lockout countdown timer
  useEffect(() => {
    if (!lockedUntil) return;

    const interval = setInterval(() => {
      const now = new Date();
      if (now >= lockedUntil) {
        setLockedUntil(null);
        setError(null);
        setAttemptsRemaining(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockedUntil]);

  const handleVerify = async () => {
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetchWithCsrf('/api/admin/verify-password', {
        method: 'POST',
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        // Success: Password verified
        onVerified();
        onClose();
      } else {
        // Failure: Invalid password or lockout
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || 'Invalid password';
        const details = errorData.error?.details;

        setError(errorMessage);

        // Update attempts remaining if provided
        if (details?.attempts_remaining !== undefined) {
          setAttemptsRemaining(details.attempts_remaining);
        }

        // Update lockout time if provided
        if (details?.locked_until) {
          setLockedUntil(new Date(details.locked_until));
        }
      }
    } catch (error) {
      setError('Failed to verify password. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isVerifying && !lockedUntil) {
      handleVerify();
    }
  };

  const getRemainingTime = () => {
    if (!lockedUntil) return '';
    const now = new Date();
    const remainingMs = lockedUntil.getTime() - now.getTime();
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Admin Password"
      size="small"
      fullScreenMobile={true}
    >
      <div className="space-y-4">
        {/* Description */}
        <p className="text-sm text-gray-700">
          Enter your admin password to <strong>{operationDescription}</strong>.
        </p>

        {/* Password input - PHASE 4.5: Enhanced with visibility toggle */}
        {/* PASSWORD MANAGER GUARDS: Prevent autofill from interfering with admin confirmation */}
        <div data-form-type="other">
          {/* Hidden honeypot field to confuse password managers */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            style={{ display: 'none' }}
            tabIndex={-1}
            aria-hidden="true"
          />
          <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-1">
            Admin Password
          </label>
          <div className="relative">
            <input
              id="admin-password"
              name="admin-confirm-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isVerifying || !!lockedUntil}
              autoFocus
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore="true"
              data-form-type="other"
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter your password"
              aria-label="Admin password"
            />

            {/* PHASE 4.5: Password visibility toggle button */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isVerifying || !!lockedUntil}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md" role="alert" aria-live="polite">
            <p className="text-sm text-red-700">
              <strong>Error:</strong> {error}
            </p>
            {attemptsRemaining !== null && attemptsRemaining > 0 && (
              <p className="text-xs text-red-600 mt-1">
                {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
              </p>
            )}
          </div>
        )}

        {/* Lockout warning */}
        {lockedUntil && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md" role="alert" aria-live="polite">
            <p className="text-sm text-yellow-700">
              <strong>Account Locked:</strong> Too many failed attempts.
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              Try again in {getRemainingTime()}
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <BizModalButton
            variant="secondary"
            onClick={onClose}
            disabled={isVerifying}
          >
            Cancel
          </BizModalButton>
          <BizModalButton
            variant="danger"
            onClick={handleVerify}
            disabled={isVerifying || !!lockedUntil || !password.trim()}
          >
            {isVerifying ? 'Verifying...' : 'Verify Password'}
          </BizModalButton>
        </div>
      </div>
    </BizModal>
  );
}

/**
 * BatchDeleteModal - Bulk delete confirmation modal
 * PHASE 3: NEW component for batch deletion
 */
function BatchDeleteModal({
  isOpen,
  selectedCategories,
  flatCategories,
  onClose,
  onExecute
}: {
  isOpen: boolean;
  selectedCategories: Category[];
  flatCategories: Category[];
  onClose: () => void;
  onExecute: () => void;
}) {
  const [orphanHandling, setOrphanHandling] = useState<'delete' | 'reassign'>('reassign');
  const [submitting, setSubmitting] = useState(false);

  // Calculate affected children count
  const affectedChildrenCount = useMemo(() => {
    let count = 0;
    selectedCategories.forEach(cat => {
      const children = flatCategories.filter(c => c.parent_id === cat.id);
      count += children.length;
    });
    return count;
  }, [selectedCategories, flatCategories]);

  const handleExecute = async () => {
    setSubmitting(true);
    try {
      const response = await fetchWithCsrf('/api/admin/categories/batch-delete', {
        method: 'POST',
        body: JSON.stringify({
          categoryIds: selectedCategories.map(c => c.id),
          orphanHandling
        })
      });

      if (response.ok) {
        onExecute();
        onClose();
      } else {
        const error = await response.json();
        alert(error.error?.message ?? 'Failed to delete categories');
      }
    } catch (error) {
      alert('Error deleting categories');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Categories"
      size="medium"
      fullScreenMobile={true}
    >
      <div className="space-y-4">
        {/* Warning box */}
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">
            <strong>Warning:</strong> This action cannot be undone. You are about to delete {selectedCategories.length} {selectedCategories.length === 1 ? 'category' : 'categories'}.
          </p>
        </div>

        {/* Selected categories with full paths */}
        <div className="p-3 bg-gray-50 rounded-md max-h-40 overflow-y-auto">
          <p className="text-sm font-medium mb-2">Categories to Delete:</p>
          <ul className="text-sm text-gray-700 space-y-1">
            {selectedCategories.map(cat => (
              <li key={cat.id}>
                <strong>{cat.name}</strong>
                <br />
                <span className="text-xs text-gray-500">{getCategoryPath(cat as never, flatCategories as never)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Orphan handling */}
        {affectedChildrenCount > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">
              This will affect <strong>{affectedChildrenCount}</strong> child {affectedChildrenCount === 1 ? 'category' : 'categories'}.
            </p>
            <p className="text-sm text-gray-700 mb-3">What should happen to child categories?</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="reassign"
                  checked={orphanHandling === 'reassign'}
                  onChange={() => setOrphanHandling('reassign')}
                  className="text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm">
                  <strong>Reassign to grandparent</strong> (safe - moves children up one level)
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="delete"
                  checked={orphanHandling === 'delete'}
                  onChange={() => setOrphanHandling('delete')}
                  className="text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm text-red-600">
                  <strong>Delete all children</strong> (cascade delete - DANGEROUS)
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <BizModalButton variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </BizModalButton>
          <BizModalButton variant="danger" onClick={handleExecute} disabled={submitting}>
            {submitting ? 'Deleting...' : 'Delete Categories'}
          </BizModalButton>
        </div>
      </div>
    </BizModal>
  );
}

/**
 * AdvancedFilterPanel - Toggleable multi-field filter panel
 * PHASE 6: NEW component for advanced filtering
 *
 * @tier STANDARD
 * @phase Phase 6 - Enhanced Search Functionality
 */
function AdvancedFilterPanel({
  isOpen,
  filters,
  onChange,
  onClear,
  onToggle,
  activeFilterCount
}: {
  isOpen: boolean;
  filters: AdvancedFilters;
  onChange: (filters: AdvancedFilters) => void;
  onClear: () => void;
  onToggle: () => void;
  activeFilterCount: number;
}) {
  return (
    <div className="mb-4">
      {/* Toggle button with filter count badge - PHASE 7: Touch-friendly */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 min-h-[44px] px-4 py-2 bg-gray-100 hover:bg-gray-200 active:scale-95 rounded-md transition-all text-sm font-medium"
      >
        <Filter className="w-4 h-4" />
        <span>Advanced Filters</span>
        {activeFilterCount > 0 && (
          <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
            {activeFilterCount}
          </span>
        )}
        {isOpen ? (
          <ChevronUp className="w-4 h-4 ml-auto" />
        ) : (
          <ChevronDown className="w-4 h-4 ml-auto" />
        )}
      </button>

      {/* Collapsible panel */}
      {isOpen && (
        <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-md space-y-3">
          {/* Grid layout: 2 columns on desktop, 1 on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* ID filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Category ID (exact match)
              </label>
              <input
                type="number"
                value={filters.id}
                onChange={(e) => onChange({ ...filters, id: e.target.value })}
                placeholder="e.g., 123"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Name filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Name (partial match)
              </label>
              <input
                type="text"
                value={filters.name}
                onChange={(e) => onChange({ ...filters, name: e.target.value })}
                placeholder="e.g., Coffee"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Slug filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Slug (partial match)
              </label>
              <input
                type="text"
                value={filters.slug}
                onChange={(e) => onChange({ ...filters, slug: e.target.value })}
                placeholder="e.g., restaurant"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Keywords filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Keywords (partial match)
              </label>
              <input
                type="text"
                value={filters.keywords}
                onChange={(e) => onChange({ ...filters, keywords: e.target.value })}
                placeholder="e.g., food"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Active status filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Active Status
              </label>
              <select
                value={filters.isActive}
                onChange={(e) => onChange({ ...filters, isActive: e.target.value as 'all' | 'active' | 'inactive' })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {/* Match mode toggle */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Match Mode
              </label>
              <select
                value={filters.matchMode}
                onChange={(e) => onChange({ ...filters, matchMode: e.target.value as 'all' | 'any' })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">Match All (AND)</option>
                <option value="any">Match Any (OR)</option>
              </select>
            </div>
          </div>

          {/* Clear filters button */}
          <div className="flex justify-end pt-2 border-t border-gray-200">
            <button
              onClick={onClear}
              className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Category Tree Node Component - Memoized recursive component (R4.1 optimization)
 * Prevents unnecessary re-renders of tree nodes
 * PHASE 3: Enhanced with checkbox selection for batch operations
 * PHASE 6: Enhanced with search result highlighting
 */
const CategoryTreeNode = memo(function CategoryTreeNode({
  category,
  level = 0,
  expandedNodes,
  flatCategories,
  selectedIds,
  highlightQuery,
  isMobile = false,
  onToggle,
  onEdit,
  onAddChild,
  onDelete,
  onCheckboxToggle
}: {
  category: Category;
  level: number;
  expandedNodes: Set<number>;
  flatCategories: Category[];
  selectedIds: Set<number>;
  highlightQuery: string;
  isMobile?: boolean;
  onToggle: (id: number) => void;
  onEdit: (category: Category) => void;
  onAddChild: (parentCategory: Category) => void;
  onDelete: (category: Category) => void;
  onCheckboxToggle: (id: number) => void;
}) {
  const isExpanded = expandedNodes.has(category.id);
  const hasChildren = category.children && category.children.length > 0;
  const isSelected = selectedIds.has(category.id);

  // PHASE 7: Mobile-responsive indentation (10px mobile, 20px desktop)
  const indentPx = isMobile ? level * 10 : level * 20;

  return (
    <div className="border-l border-gray-300" style={{ marginLeft: `${indentPx}px` }}>
      <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center gap-2'} py-2 px-3 hover:bg-gray-50 ${isSelected ? 'bg-orange-50' : ''}`}>
        {/* PHASE 7: Mobile layout - Checkbox + Info + Actions stacked */}
        <div className={`flex items-center gap-2 ${isMobile ? 'w-full' : 'flex-1'}`}>
          {/* Checkbox for Batch Selection - PHASE 3 NEW + PHASE 7: Larger on mobile */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onCheckboxToggle(category.id)}
            onClick={(e) => e.stopPropagation()}
            className={`${isMobile ? 'w-6 h-6' : 'w-4 h-4'} rounded border-gray-300 text-orange-600 focus:ring-orange-500`}
            aria-label={`Select ${category.name}`}
          />

          {/* Category Info - ENHANCED + PHASE 7: Mobile stacked layout */}
          <div className="flex-1 flex flex-col gap-1">
            {/* Category Name, ID, and Slug - ID between name and slug */}
            <div className={`flex ${isMobile ? 'flex-col gap-1' : 'items-center gap-2'}`}>
              <span className="font-medium">
                <HighlightedText text={category.name} query={highlightQuery} />
              </span>
              <span className="text-sm text-gray-500">#{category.id}</span>
              <span className="text-sm text-gray-500">
                (<HighlightedText text={category.slug} query={highlightQuery} />)
              </span>
              {!category.is_active && (
                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                  INACTIVE
                </span>
              )}
            </div>

            {/* Description - only show if exists */}
            {(category.cat_description || category.description) && (
              <span className="text-sm text-gray-600">
                {category.cat_description || category.description}
              </span>
            )}

            {/* Keywords as Pill Badges - Light navy with navy text */}
            <KeywordBadges
              keywords={category.keywords}
              maxVisible={isMobile ? 3 : 5}
              variant="navy"
            />
          </div>
        </div>

        {/* Actions - Show/collapse button moved here, Add Child removed, simple icons */}
        <div className={`flex gap-1 ${isMobile ? 'justify-end' : ''} items-center`}>
          {/* Expand/Collapse Button - Now on right side, no arrow, gray color */}
          {hasChildren && (
            <button
              onClick={() => onToggle(category.id)}
              className={`${
                isMobile
                  ? 'min-w-[44px] min-h-[44px] px-2 py-2'
                  : 'px-3 py-1'
              } text-sm bg-gray-400 text-white rounded hover:bg-gray-500 active:scale-95 transition-transform`}
            >
              {isExpanded ? 'Collapse' : 'Show All'}
            </button>
          )}
          {/* Edit button - Navy color with icon */}
          <button
            onClick={() => onEdit(category)}
            className={`${
              isMobile
                ? 'min-w-[44px] min-h-[44px] p-2.5 flex items-center justify-center'
                : 'p-2'
            } text-[#1e3a5f] hover:bg-[#1e3a5f]/10 rounded active:scale-95 transition-all`}
            aria-label="Edit category"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {/* Delete button - Red color with icon */}
          <button
            onClick={() => onDelete(category)}
            className={`${
              isMobile
                ? 'min-w-[44px] min-h-[44px] p-2.5 flex items-center justify-center'
                : 'p-2'
            } text-red-600 hover:bg-red-50 rounded active:scale-95 transition-all`}
            aria-label="Delete category"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Render Children */}
      {isExpanded && hasChildren && (
        <div>
          {category.children!.map(child => (
            <CategoryTreeNode
              key={child.id}
              category={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              flatCategories={flatCategories}
              selectedIds={selectedIds}
              highlightQuery={highlightQuery}
              isMobile={isMobile}
              onToggle={onToggle}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onCheckboxToggle={onCheckboxToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// PHASE 5: Import/Export Modal Component
// ============================================================================

/**
 * ImportExportModal - Data portability for categories
 * PHASE 5: NEW - Import/Export functionality
 *
 * @tier ADVANCED
 * @generated DNA v11.4.0 - Phase 5
 */
function ImportExportModal({
  isOpen,
  onClose,
  categories,
  flatCategories,
  selectedIds,
  onImportComplete
}: {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  flatCategories: Category[];
  selectedIds: Set<number>;
  onImportComplete: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [exportScope, setExportScope] = useState<'all' | 'selected'>('all');
  const [isExporting, setIsExporting] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFormat, setImportFormat] = useState<ExportFormat | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreviewResult | null>(null);
  const [conflictResolution, setConflictResolution] = useState<ConflictResolution>('skip');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Export handler
  const handleExport = () => {
    setIsExporting(true);
    try {
      const categoriesToExport = exportScope === 'selected'
        ? flatCategories.filter(c => selectedIds.has(c.id))
        : flatCategories;

      if (exportScope === 'selected' && categoriesToExport.length === 0) {
        alert('No categories selected for export');
        setIsExporting(false);
        return;
      }

      let content: string;
      let contentType: string;

      switch (exportFormat) {
        case 'json':
          content = generateJSONExport(
            (exportScope === 'selected' ? categoriesToExport : categories) as never,
            exportFormat === 'json'
          );
          contentType = 'application/json';
          break;

        case 'csv':
          content = generateCSVExport(categoriesToExport as never);
          contentType = 'text/csv';
          break;

        case 'sql':
          content = generateSQLExport(categoriesToExport as never);
          contentType = 'text/plain';
          break;

        default:
          throw new Error('Invalid export format');
      }

      const filename = generateTimestampedFilename('categories-export', exportFormat);
      downloadFile(content, filename, contentType);
    } catch (error) {
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // File selection handler
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Detect format from extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !['json', 'csv', 'sql'].includes(extension)) {
      setImportError('Invalid file type. Please upload .json, .csv, or .sql file.');
      return;
    }

    setImportFile(file);
    setImportFormat(extension as ExportFormat);
    setImportError(null);

    // Read file content and trigger preview
    try {
      const content = await readFileAsText(file);
      await handleImportPreview(extension as ExportFormat, content);
    } catch (error) {
      setImportError(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Import preview handler
  const handleImportPreview = async (format: ExportFormat, content: string) => {
    setIsImporting(true);
    setImportError(null);

    try {
      const response = await fetchWithCsrf('/api/admin/categories/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, content })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Preview failed');
      }

      const data = await response.json();
      setImportPreview(data.data);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Unknown error');
      setImportPreview(null);
    } finally {
      setIsImporting(false);
    }
  };

  // Import execution handler
  const handleImportExecute = async () => {
    if (!importFile || !importFormat) {
      setImportError('No file selected');
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const content = await readFileAsText(importFile);

      const response = await fetchWithCsrf('/api/admin/categories/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: importFormat, content, conflictResolution })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Import failed');
      }

      const data = await response.json();
      const result = data.data;

      // Show success message
      alert(
        `Import complete!\n` +
        `Imported: ${result.imported}\n` +
        `Updated: ${result.updated}\n` +
        `Skipped: ${result.skipped}\n` +
        `Renamed: ${result.renamed}\n` +
        `Errors: ${result.errors.length}`
      );

      // Reset and close
      setImportFile(null);
      setImportFormat(null);
      setImportPreview(null);
      onImportComplete();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Import / Export Categories"
      size="large"
      fullScreenMobile={true}
    >
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          className={`px-4 py-2 ${activeTab === 'export' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('export')}
        >
          <Download className="w-4 h-4 inline mr-2" />
          Export
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'import' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('import')}
        >
          <Upload className="w-4 h-4 inline mr-2" />
          Import
        </button>
      </div>

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Format
            </label>
            <div className="flex gap-3">
              <button
                className={`px-4 py-2 rounded ${exportFormat === 'json' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setExportFormat('json')}
              >
                JSON
              </button>
              <button
                className={`px-4 py-2 rounded ${exportFormat === 'csv' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setExportFormat('csv')}
              >
                CSV
              </button>
              <button
                className={`px-4 py-2 rounded ${exportFormat === 'sql' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setExportFormat('sql')}
              >
                SQL
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scope
            </label>
            <div className="flex gap-3">
              <button
                className={`px-4 py-2 rounded ${exportScope === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setExportScope('all')}
              >
                All Categories ({flatCategories.length})
              </button>
              <button
                className={`px-4 py-2 rounded ${exportScope === 'selected' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setExportScope('selected')}
                disabled={selectedIds.size === 0}
              >
                Selected ({selectedIds.size})
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
            >
              {isExporting ? 'Exporting...' : 'Download'}
            </button>
          </div>
        </div>
      )}

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload File
            </label>
            <input
              type="file"
              accept=".json,.csv,.sql"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Supported formats: JSON, CSV, SQL (max 10MB)
            </p>
          </div>

          {/* Sample Formats Section */}
          <details className="border border-gray-200 rounded-md">
            <summary className="px-4 py-3 bg-gray-50 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-100 flex items-center gap-2">
              <Download className="w-4 h-4" />
              View Sample Formats & Download Templates
            </summary>
            <div className="p-4 space-y-4 text-sm">
              {/* JSON Format */}
              <div>
                <h5 className="font-medium text-gray-800 mb-2">JSON Format</h5>
                <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
{`[
  {
    "name": "Category Name",
    "slug": "category-slug",
    "cat_description": "Description text",
    "keywords": ["keyword1", "keyword2"],
    "parent_id": null,
    "is_active": true
  },
  {
    "name": "Child Category",
    "slug": "child-category",
    "cat_description": "Child description",
    "keywords": ["child", "example"],
    "parent_id": 1,
    "is_active": true
  }
]`}
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    const sample = JSON.stringify([
                      { name: "Sample Category", slug: "sample-category", cat_description: "A sample category for import", keywords: ["sample", "example"], parent_id: null, is_active: true },
                      { name: "Child Category", slug: "child-category", cat_description: "A child category example", keywords: ["child", "nested"], parent_id: 1, is_active: true }
                    ], null, 2);
                    downloadFile(sample, 'categories-sample.json', 'application/json');
                  }}
                  className="mt-2 px-3 py-1 text-xs bg-[#ed6437] text-white rounded hover:bg-[#d55a2f]"
                >
                  Download JSON Sample
                </button>
              </div>

              {/* CSV Format */}
              <div>
                <h5 className="font-medium text-gray-800 mb-2">CSV Format (Headers Required)</h5>
                <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
{`name,slug,cat_description,keywords,parent_id,is_active
"Category Name","category-slug","Description text","keyword1,keyword2",,true
"Child Category","child-category","Child description","child,example",1,true`}
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    const sample = `name,slug,cat_description,keywords,parent_id,is_active
"Sample Category","sample-category","A sample category for import","sample,example",,true
"Child Category","child-category","A child category example","child,nested",1,true`;
                    downloadFile(sample, 'categories-sample.csv', 'text/csv');
                  }}
                  className="mt-2 px-3 py-1 text-xs bg-[#ed6437] text-white rounded hover:bg-[#d55a2f]"
                >
                  Download CSV Sample
                </button>
              </div>

              {/* SQL Format */}
              <div>
                <h5 className="font-medium text-gray-800 mb-2">SQL Format (INSERT Statements)</h5>
                <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
{`INSERT INTO categories (name, slug, cat_description, keywords, parent_id, is_active)
VALUES ('Category Name', 'category-slug', 'Description', '["keyword1","keyword2"]', NULL, 1);

INSERT INTO categories (name, slug, cat_description, keywords, parent_id, is_active)
VALUES ('Child Category', 'child-category', 'Child desc', '["child","example"]', 1, 1);`}
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    const sample = `-- Categories Import SQL Template
-- Note: parent_id should reference existing category IDs or be NULL for root categories

INSERT INTO categories (name, slug, cat_description, keywords, parent_id, is_active)
VALUES ('Sample Category', 'sample-category', 'A sample category for import', '["sample","example"]', NULL, 1);

INSERT INTO categories (name, slug, cat_description, keywords, parent_id, is_active)
VALUES ('Child Category', 'child-category', 'A child category example', '["child","nested"]', 1, 1);`;
                    downloadFile(sample, 'categories-sample.sql', 'text/plain');
                  }}
                  className="mt-2 px-3 py-1 text-xs bg-[#ed6437] text-white rounded hover:bg-[#d55a2f]"
                >
                  Download SQL Sample
                </button>
              </div>

              {/* Field Descriptions */}
              <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                <h5 className="font-medium text-blue-800 mb-2">Field Requirements</h5>
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                  <li><strong>name</strong> (required): Category display name</li>
                  <li><strong>slug</strong> (required): URL-friendly identifier, must be unique</li>
                  <li><strong>cat_description</strong> (optional): Category description text</li>
                  <li><strong>keywords</strong> (optional): Array/comma-separated list of keywords</li>
                  <li><strong>parent_id</strong> (optional): ID of parent category, null for root</li>
                  <li><strong>is_active</strong> (optional): true/false or 1/0, defaults to true</li>
                </ul>
              </div>
            </div>
          </details>

          {importError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {importError}
            </div>
          )}

          {importPreview && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <h4 className="font-medium text-blue-900 mb-2">Import Preview</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <div>Total: {importPreview.total}</div>
                  <div>Valid: {importPreview.valid}</div>
                  <div>Conflicts: {importPreview.conflicts.length}</div>
                  <div>Errors: {importPreview.errors.length}</div>
                </div>
              </div>

              {importPreview.conflicts.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <h4 className="font-medium text-yellow-900 mb-2">
                    Conflict Resolution ({importPreview.conflicts.length} conflicts)
                  </h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="skip"
                        checked={conflictResolution === 'skip'}
                        onChange={(e) => setConflictResolution(e.target.value as ConflictResolution)}
                      />
                      <span className="text-sm text-yellow-700">Skip - Don't import conflicting categories</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="overwrite"
                        checked={conflictResolution === 'overwrite'}
                        onChange={(e) => setConflictResolution(e.target.value as ConflictResolution)}
                      />
                      <span className="text-sm text-yellow-700">Overwrite - Update existing categories</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="rename"
                        checked={conflictResolution === 'rename'}
                        onChange={(e) => setConflictResolution(e.target.value as ConflictResolution)}
                      />
                      <span className="text-sm text-yellow-700">Rename - Auto-generate new slugs</span>
                    </label>
                  </div>
                </div>
              )}

              {importPreview.errors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <h4 className="font-medium text-red-900 mb-2">
                    Validation Errors ({importPreview.errors.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto text-sm text-red-700 space-y-1">
                    {importPreview.errors.slice(0, 10).map((err, i) => (
                      <div key={i}>Row {err.row}: {err.field} - {err.message}</div>
                    ))}
                    {importPreview.errors.length > 10 && (
                      <div className="font-medium">... and {importPreview.errors.length - 10} more</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleImportExecute}
              disabled={!importPreview || isImporting || importPreview.errors.length > 0}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
            >
              {isImporting ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      )}
    </BizModal>
  );
}

// Helper function to read file as text
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * AdminCategoriesPage - Category management interface for platform administrators
 *
 * Provides hierarchical CRUD operations for categories.
 * Requires admin role for access.
 *
 * @component
 * @returns {JSX.Element} Admin category management interface
 */
function AdminCategoriesPageContent() {
  const { user } = useAuth();
  // PHASE 7: Mobile detection
  const isMobile = useIsMobile();

  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [flatCategories, setFlatCategories] = useState<Category[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [parentCategory, setParentCategory] = useState<Category | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // PHASE 3: Batch operations state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBatchEditModalOpen, setIsBatchEditModalOpen] = useState(false);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);

  // PHASE 4: Admin password confirmation state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // PHASE 4.5: Individual delete password confirmation state
  const [deletingIndividual, setDeletingIndividual] = useState(false);

  // PHASE 5: Import/Export functionality state
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);

  // PHASE 6: Enhanced search state
  const [searchMode, setSearchMode] = useState<SearchMode>('all');
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [highlightQuery, setHighlightQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(DEFAULT_ADVANCED_FILTERS);

  // ============================================================================
  // ALL HOOKS MUST BE DEFINED BEFORE ANY CONDITIONAL RETURNS
  // React Rules of Hooks: Hooks must be called in the same order on every render
  // ============================================================================

  const fetchCategoryTree = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/categories/hierarchy', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const hierarchy = data.data?.hierarchy ?? data.hierarchy ?? [];
        setCategories(hierarchy);
        setFlatCategories(flattenCategoryTree(hierarchy) as Category[]);
        setFilteredCategories(hierarchy);
      }
    } catch (error) {
      // Error handling
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // PHASE 6: LOAD SEARCH HISTORY ON MOUNT
  // ============================================================================

  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  // ============================================================================
  // SEARCH HANDLER (R4.1 - useCallback optimization)
  // PHASE 6: Enhanced with multi-mode search, advanced filters, highlighting
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  // ============================================================================

  /**
   * Handle search query (R4.1 - useCallback + useMemo)
   * PHASE 6: Enhanced with ID search, keyword search, advanced filters
   * Expensive operation - filters tree of 2,328 categories
   */
  const handleSearch = useCallback((query: string, mode: SearchMode) => {
    setIsDebouncing(false); // End debounce state
    setSearchMode(mode);

    // No search and no advanced filters - show all categories
    const hasActiveFilters = Object.values(advancedFilters).some((v, i) =>
      i < 4 ? v !== '' : (i === 4 ? v !== 'all' : v !== 'all')
    );

    if (!query.trim() && !hasActiveFilters) {
      setFilteredCategories(categories);
      setHighlightQuery('');
      // Clear expanded nodes when search is cleared
      setExpandedNodes(new Set());
      return;
    }

    // Save to history if query is not empty
    if (query.trim()) {
      saveSearchToHistory(query, mode);
      setSearchHistory(getSearchHistory());
    }

    let searchResults: Category[];
    const nodesToExpand = new Set<number>(); // Track nodes to auto-expand

    // ID Search Mode (exact match)
    if (mode === 'id') {
      const categoryId = parseIdFromQuery(query);
      if (categoryId !== null) {
        const found = flatCategories.find(cat => cat.id === categoryId);
        searchResults = found ? [found] : [];
      } else {
        searchResults = [];
      }
      setFilteredCategories(searchResults);
      setHighlightQuery(''); // No highlighting for ID search
      return;
    }

    // Keyword Search Mode (partial match in keywords array)
    if (mode === 'keyword') {
      const keyword = parseKeywordFromQuery(query).toLowerCase();
      const filterTree = (cats: Category[]): Category[] => {
        const results: Category[] = [];

        for (const cat of cats) {
          const keywordMatches = cat.keywords?.some(kw =>
            kw.toLowerCase().includes(keyword)
          ) ?? false;

          const filteredChildren = cat.children ? filterTree(cat.children) : [];

          if (keywordMatches || filteredChildren.length > 0) {
            // Auto-expand if has matching children
            if (filteredChildren.length > 0) {
              nodesToExpand.add(cat.id);
            }
            results.push({ ...cat, children: filteredChildren });
          }
        }

        return results;
      };

      searchResults = filterTree(categories);
      setFilteredCategories(searchResults);
      setExpandedNodes(nodesToExpand); // Auto-expand matching parents
      setHighlightQuery(keyword);
      return;
    }

    // Default Mode (name + slug search with optional advanced filters)
    const searchLower = query.toLowerCase();
    const filterTree = (cats: Category[]): Category[] => {
      const results: Category[] = [];

      for (const cat of cats) {
        // Basic search matches (name or slug)
        const basicMatches =
          cat.name.toLowerCase().includes(searchLower) ||
          cat.slug.toLowerCase().includes(searchLower);

        // Advanced filter matches
        let advancedMatches = true;
        if (hasActiveFilters) {
          const checks: boolean[] = [];

          if (advancedFilters.id) {
            checks.push(cat.id === parseInt(advancedFilters.id, 10));
          }
          if (advancedFilters.name) {
            checks.push(cat.name.toLowerCase().includes(advancedFilters.name.toLowerCase()));
          }
          if (advancedFilters.slug) {
            checks.push(cat.slug.toLowerCase().includes(advancedFilters.slug.toLowerCase()));
          }
          if (advancedFilters.keywords) {
            checks.push(cat.keywords?.some(kw =>
              kw.toLowerCase().includes(advancedFilters.keywords.toLowerCase())
            ) ?? false);
          }
          if (advancedFilters.isActive !== 'all') {
            checks.push(cat.is_active === (advancedFilters.isActive === 'active'));
          }

          // Apply match mode (AND/OR)
          advancedMatches = advancedFilters.matchMode === 'all'
            ? checks.every(c => c)
            : checks.some(c => c);
        }

        const filteredChildren = cat.children ? filterTree(cat.children) : [];

        const matches = query.trim()
          ? (basicMatches && advancedMatches)
          : advancedMatches;

        if (matches || filteredChildren.length > 0) {
          // Auto-expand if has matching children
          if (filteredChildren.length > 0) {
            nodesToExpand.add(cat.id);
          }
          results.push({ ...cat, children: filteredChildren });
        }
      }

      return results;
    };

    searchResults = filterTree(categories);
    setFilteredCategories(searchResults);
    setExpandedNodes(nodesToExpand); // Auto-expand matching parents
    setHighlightQuery(searchLower);
  }, [categories, flatCategories, advancedFilters]);

  // ============================================================================
  // ACTION HANDLERS (R4.1 - useCallback optimization)
  // ============================================================================

  /**
   * Handle tree node expand/collapse (R4.1 - useCallback)
   */
  const handleToggleNode = useCallback((id: number) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  /**
   * Handle category deletion (R4.1 - useCallback)
   */
  const handleDelete = useCallback(async (_category: Category, orphanHandling: 'delete' | 'reassign') => {
    try {
      // @governance MANDATORY - CSRF protection for DELETE requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf(`/api/categories/${_category.id}?orphanHandling=${orphanHandling}`, {method: 'DELETE'});

      if (response.ok) {
        await fetchCategoryTree();
        setDeleteModalOpen(false);
        setSelectedCategory(null);
      } else {
        const error = await response.json();
        alert(error.message ?? 'Failed to delete category');
      }
    } catch (error) {
      alert('Error deleting category');
    }
  }, [fetchCategoryTree]);

  // ============================================================================
  // PHASE 3: BATCH OPERATIONS HANDLERS
  // ============================================================================

  /**
   * Handle checkbox toggle for batch selection (R4.1 - useCallback)
   */
  const handleCheckboxToggle = useCallback((categoryId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  /**
   * Handle select all (R4.1 - useCallback)
   */
  const handleSelectAll = useCallback(() => {
    const visibleIds = flatCategories.map(cat => cat.id);
    setSelectedIds(new Set(visibleIds));
  }, [flatCategories]);

  /**
   * Handle clear selection (R4.1 - useCallback)
   */
  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  /**
   * Get selected categories (R4.1 - useMemo)
   */
  const selectedCategories = useMemo(() => {
    return flatCategories.filter(cat => selectedIds.has(cat.id));
  }, [flatCategories, selectedIds]);

  /**
   * Handle bulk edit execution
   */
  const handleBulkEditExecute = useCallback(async () => {
    await fetchCategoryTree();
    setSelectedIds(new Set());
  }, [fetchCategoryTree]);

  /**
   * Handle bulk delete execution
   */
  const handleBulkDeleteExecute = useCallback(async () => {
    await fetchCategoryTree();
    setSelectedIds(new Set());
  }, [fetchCategoryTree]);

  /**
   * Handle password verification callback - PHASE 4.5: Enhanced for individual delete support
   * Routes to either individual or batch delete confirmation modal based on deletingIndividual flag
   */
  const handlePasswordVerified = useCallback(() => {
    setIsPasswordModalOpen(false);
    if (deletingIndividual) {
      setDeleteModalOpen(true);       // Individual delete confirmation
      setDeletingIndividual(false);
    } else {
      setIsBatchDeleteModalOpen(true); // Batch delete confirmation
    }
  }, [deletingIndividual]);

  // ============================================================================
  // PHASE 6: ADVANCED FILTER HANDLERS
  // ============================================================================

  /**
   * Calculate active filter count (R4.1 - useMemo)
   */
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.id) count++;
    if (advancedFilters.name) count++;
    if (advancedFilters.slug) count++;
    if (advancedFilters.keywords) count++;
    if (advancedFilters.isActive !== 'all') count++;
    return count;
  }, [advancedFilters]);

  /**
   * Handle advanced filter change
   */
  const handleAdvancedFilterChange = useCallback((newFilters: AdvancedFilters) => {
    setAdvancedFilters(newFilters);
    // Re-run search with current query and new filters
    handleSearch('', searchMode);
  }, [handleSearch, searchMode]);

  /**
   * Handle clear advanced filters
   */
  const handleClearAdvancedFilters = useCallback(() => {
    setAdvancedFilters(DEFAULT_ADVANCED_FILTERS);
    // Re-run search with current query
    handleSearch('', searchMode);
  }, [handleSearch, searchMode]);

  /**
   * Handle toggle advanced panel
   */
  const handleToggleAdvanced = useCallback(() => {
    setIsAdvancedOpen(prev => !prev);
  }, []);

  /**
   * Handle history item click
   */
  const handleHistoryItemClick = useCallback((query: string) => {
    const mode = detectSearchMode(query);
    handleSearch(query, mode);
  }, [handleSearch]);

  /**
   * Handle clear search history
   */
  const handleClearHistory = useCallback(() => {
    clearSearchHistory();
    setSearchHistory([]);
  }, []);

  // GOVERNANCE FIX: useEffect MUST be called before any early returns
  // React Rules of Hooks: Hooks must be called in the same order on every render
  useEffect(() => {
    // Only fetch if user is admin - conditional logic INSIDE the hook
    if (user?.role === 'admin') {
      fetchCategoryTree();
    }
  }, [user, fetchCategoryTree]);

  // ============================================================================
  // CONDITIONAL RETURNS - AFTER ALL HOOKS
  // ============================================================================

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600 font-medium">Access Denied: Admin privileges required</div>
      </div>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Category Management</h1>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setSelectedCategory(null);
              setParentCategory(null);
              setEditorOpen(true);
            }}
            className="px-4 py-2 bg-[#ed6437] text-white rounded hover:bg-[#d55a31]"
          >
            + New
          </button>
          <button
            onClick={() => setIsImportExportModalOpen(true)}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Import / Export
          </button>
        </div>
      </div>

      <CategoryStatistics categories={categories} />

      <CategorySearch
        onSearch={handleSearch}
        searchHistory={searchHistory}
        onHistoryItemClick={handleHistoryItemClick}
        onClearHistory={handleClearHistory}
        isDebouncing={isDebouncing}
      />

      <AdvancedFilterPanel
        isOpen={isAdvancedOpen}
        filters={advancedFilters}
        onChange={handleAdvancedFilterChange}
        onClear={handleClearAdvancedFilters}
        onToggle={handleToggleAdvanced}
        activeFilterCount={activeFilterCount}
      />

      {/* PHASE 3: Batch selection controls */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={handleSelectAll}
          className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          disabled={flatCategories.length === 0}
        >
          Select All ({flatCategories.length})
        </button>
        {selectedIds.size > 0 && (
          <button
            onClick={handleClearSelection}
            className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Clear Selection ({selectedIds.size})
          </button>
        )}
      </div>

      <div className="bg-white rounded shadow">
        {loading ? (
          <div className="p-8">
            <CategoryTreeSkeleton rows={15} maxDepth={3} />
          </div>
        ) : (filteredCategories.length > 0 ? filteredCategories : categories).length === 0 ? (
          <div className="p-8 text-center text-gray-500">No categories found</div>
        ) : (
          <div>
            {(filteredCategories.length > 0 ? filteredCategories : categories).map(category => (
              <CategoryTreeNode
                key={category.id}
                category={category}
                level={0}
                expandedNodes={expandedNodes}
                flatCategories={flatCategories}
                isMobile={isMobile}
                selectedIds={selectedIds}
                highlightQuery={highlightQuery}
                onToggle={handleToggleNode}
                onCheckboxToggle={handleCheckboxToggle}
                onEdit={(cat) => {
                  setSelectedCategory(cat);
                  setParentCategory(null);
                  setEditorOpen(true);
                }}
                onAddChild={(cat) => {
                  setParentCategory(cat);
                  setSelectedCategory(null);
                  setEditorOpen(true);
                }}
                onDelete={(cat) => {
                  // PHASE 4.5: Individual delete now requires password confirmation
                  setSelectedCategory(cat);
                  setDeletingIndividual(true);
                  setIsPasswordModalOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <CategoryEditorModal
        category={selectedCategory}
        parentCategory={parentCategory}
        allCategories={flatCategories}
        isOpen={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setSelectedCategory(null);
          setParentCategory(null);
        }}
        onSave={fetchCategoryTree}
      />

      {selectedCategory && (
        <DeleteConfirmationModal
          category={selectedCategory}
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setSelectedCategory(null);
          }}
          onConfirm={(orphanHandling) => handleDelete(selectedCategory, orphanHandling)}
        />
      )}

      {/* PHASE 3: Batch operation modals */}
      <BatchEditModal
        isOpen={isBatchEditModalOpen}
        selectedCategories={selectedCategories}
        allCategories={flatCategories}
        onClose={() => setIsBatchEditModalOpen(false)}
        onExecute={handleBulkEditExecute}
      />

      <BatchDeleteModal
        isOpen={isBatchDeleteModalOpen}
        selectedCategories={selectedCategories}
        flatCategories={flatCategories}
        onClose={() => setIsBatchDeleteModalOpen(false)}
        onExecute={handleBulkDeleteExecute}
      />

      {/* PHASE 4.5: Admin password confirmation modal - Enhanced for individual and batch delete */}
      <AdminPasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setDeletingIndividual(false); // Reset flag on modal close
        }}
        onVerified={handlePasswordVerified}
        operationDescription={
          deletingIndividual
            ? `delete category "${selectedCategory?.name}"`
            : `batch delete ${selectedIds.size} ${selectedIds.size === 1 ? 'category' : 'categories'}`
        }
      />

      {/* PHASE 3: Batch handling bar - PHASE 7: Mobile-responsive */}
      <BatchHandlingBar
        selectedCount={selectedIds.size}
        isMobile={isMobile}
        onBulkEdit={() => setIsBatchEditModalOpen(true)}
        onBulkDelete={() => setIsPasswordModalOpen(true)}
        onClearSelection={handleClearSelection}
      />

      {/* PHASE 5: Import/Export Modal */}
      <ImportExportModal
        isOpen={isImportExportModalOpen}
        onClose={() => setIsImportExportModalOpen(false)}
        categories={categories}
        flatCategories={flatCategories}
        selectedIds={selectedIds}
        onImportComplete={() => {
          fetchCategoryTree();
          setIsImportExportModalOpen(false);
        }}
      />
    </>
  );
}

/**
 * AdminCategoriesPage - Error boundary wrapper for category management
 * @phase Phase R4.2 - Error Boundary Implementation
 */
export default function AdminCategoriesPage() {
  return (
    <ErrorBoundary
      fallback={
        <ErrorFallback
          title="Category Management Error"
          message="Unable to load category tree. Please try again."
        />
      }
      isolate={true}
      componentName="AdminCategoriesPage"
    >
      <AdminCategoriesPageContent />
    </ErrorBoundary>
  );
}
