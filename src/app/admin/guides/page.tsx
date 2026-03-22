/**
 * Admin Guide Manager Page
 * /admin/guides
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: AdminTableTemplate (ADVANCED tier, ErrorBoundary required)
 * - Authentication: Admin-only access required
 * - Service Boundary: NO direct database access (API routes only)
 * - Credentials: 'include' for all fetch requests
 * - CSRF: fetchWithCsrf for state-changing requests (PATCH, DELETE)
 * - Modals: BizModal MANDATORY
 *
 * Features:
 * - Guide list with enrichment (category, listing, sections, recommendations)
 * - Statistics panel (guides, difficulty, engagement)
 * - Search, status filter, difficulty filter
 * - Feature toggle, status cycle, delete actions
 * - Guide preview modal with section list
 * - Server-side pagination
 *
 * @authority CLAUDE.md - Admin Development
 * @phase Tier 2 Content Types - Phase G7
 * @tier ADVANCED
 */

'use client';

// Force dynamic rendering (required for useAuth() - React Context cannot be used in SSG)
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { AdminTableTemplate, TableColumn, TableAction } from '@/components/admin/templates/AdminTableTemplate';
import { AdminStatsPanel, StatSection } from '@/components/admin/shared/AdminStatsPanel';
import { AdminPageHeader, AdminImportExportModal } from '@/components/admin/shared';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { useAuth } from '@core/hooks/useAuth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorFallback } from '@/components/common/ErrorFallback';
import { fetchWithCsrf } from '@core/utils/csrf';
import { GuideFormModal } from '@features/dashboard/components/managers/guide/GuideFormModal';
import {
  Eye,
  Star,
  Trash2,
  ToggleLeft,
  Search,
  Pencil,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface GuideItem {
  id: number;
  title: string;
  slug: string | null;
  subtitle: string | null;
  status: string;
  is_featured: boolean | number;
  difficulty_level: string;
  estimated_time: number | null;
  word_count: number;
  view_count: number;
  bookmark_count: number;
  share_count: number;
  completion_count: number;
  category_name?: string;
  listing_name?: string;
  recommendation_count?: number;
  section_count?: number;
  sections?: Array<{
    id: number;
    title: string;
    section_number: number;
    estimated_time: number | null;
  }>;
  published_at: string | null;
  created_at: string;
}

interface GuideStats {
  guides: {
    total: number;
    draft: number;
    scheduled: number;
    published: number;
    archived: number;
    featured: number;
  };
  difficulty: {
    beginner: number;
    intermediate: number;
    advanced: number;
  };
  engagement: {
    total_views: number;
    total_completions: number;
    total_sections: number;
    users_in_progress: number;
    users_completed: number;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    scheduled: 'bg-blue-100 text-blue-700',
    published: 'bg-green-100 text-green-800',
    archived: 'bg-red-100 text-red-700',
  };
  const cls = colorMap[status] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function DifficultyBadge({ level }: { level: string }) {
  const colorMap: Record<string, string> = {
    beginner: 'bg-emerald-100 text-emerald-700',
    intermediate: 'bg-yellow-100 text-yellow-700',
    advanced: 'bg-red-100 text-red-700',
  };
  const cls = colorMap[level] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}

const STATUS_CYCLE: Record<string, string> = {
  draft: 'scheduled',
  scheduled: 'published',
  published: 'archived',
  archived: 'draft',
};

// ============================================================================
// INNER PAGE COMPONENT
// ============================================================================

function AdminGuidePageInner() {
  const { user } = useAuth();

  const [items, setItems] = useState<GuideItem[]>([]);
  const [stats, setStats] = useState<GuideStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<GuideItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Create / edit modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<GuideItem | null>(null);
  const [editItemFullData, setEditItemFullData] = useState<Record<string, unknown> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importExportOpen, setImportExportOpen] = useState(false);

  const PAGE_SIZE = 20;

  // --------------------------------------------------------------------------
  // Data Fetching
  // --------------------------------------------------------------------------

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (difficultyFilter !== 'all') params.set('difficulty_level', difficultyFilter);
      if (searchQuery) params.set('q', searchQuery);

      const res = await fetch(`/api/admin/guides?${params.toString()}`, {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        const payload = data.data ?? data;
        setItems(payload.guides ?? []);
        setTotal(payload.pagination?.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter, difficultyFilter]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/guides/statistics', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        const payload = data.data ?? data;
        setStats(payload.statistics ?? null);
      }
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchItems();
    }
  }, [user, page, searchQuery, statusFilter, difficultyFilter, fetchItems]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchStats();
    }
  }, [user, fetchStats]);

  // Reset page on filter/search changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter, difficultyFilter, searchQuery]);

  // --------------------------------------------------------------------------
  // Create / Edit handlers (before auth guards — hooks rule)
  // --------------------------------------------------------------------------

  const handleEditClick = useCallback(async (item: GuideItem) => {
    try {
      const response = await fetch(`/api/admin/guides/${item.id}`, {
        credentials: 'include',
      });
      if (!response.ok) return;
      const result = await response.json();
      const data = result.data?.guide ?? result.data ?? {};
      setEditingItem(item);
      setEditItemFullData({
        title: data.title ?? '',
        subtitle: data.subtitle ?? '',
        excerpt: data.excerpt ?? '',
        overview: data.overview ?? '',
        prerequisites: data.prerequisites ?? '',
        difficulty_level: data.difficulty_level ?? 'beginner',
        estimated_time: data.estimated_time != null ? String(data.estimated_time) : '',
        featured_image: data.featured_image ?? '',
        category_id: data.category_id ? String(data.category_id) : '',
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags ?? ''),
        version: data.version ?? '',
        sections: Array.isArray(data.sections) ? data.sections : [],
      });
    } catch (error) {
      console.error('Failed to fetch guide for editing:', error);
    }
  }, []);

  const handleCreate = useCallback(async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    const apiData = { ...data };
    delete apiData._pendingMedia;
    const listingId = typeof apiData.listing_id === 'number' ? apiData.listing_id : 0;
    try {
      const response = await fetchWithCsrf(`/api/dashboard/listings/${listingId}/guides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to create guide');
      }
      await fetchItems();
      setShowCreateModal(false);
    } catch (err) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchItems]);

  const handleUpdate = useCallback(async (data: Record<string, unknown>) => {
    if (!editingItem) return;
    setIsSubmitting(true);
    try {
      const response = await fetchWithCsrf(`/api/admin/guides/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to update guide');
      }
      await fetchItems();
      setEditingItem(null);
      setEditItemFullData(null);
    } catch (err) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [editingItem, fetchItems]);

  // --------------------------------------------------------------------------
  // Auth guards (after all hooks)
  // --------------------------------------------------------------------------

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

  // --------------------------------------------------------------------------
  // Action Handlers
  // --------------------------------------------------------------------------

  const handleToggleFeature = async (item: GuideItem) => {
    await fetchWithCsrf(`/api/admin/guides/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_featured: !item.is_featured }),
    });
    fetchItems();
  };

  const handleCycleStatus = async (item: GuideItem) => {
    const nextStatus = STATUS_CYCLE[item.status] ?? 'draft';
    await fetchWithCsrf(`/api/admin/guides/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    fetchItems();
    fetchStats();
  };

  const handleDelete = async (item: GuideItem) => {
    if (!confirm(`Delete guide "${item.title}"? This action cannot be undone.`)) return;
    await fetchWithCsrf(`/api/admin/guides/${item.id}`, {
      method: 'DELETE',
    });
    fetchItems();
    fetchStats();
  };

  const handlePreview = async (item: GuideItem) => {
    setSelectedItem(item);
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/admin/guides/${item.id}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        const payload = data.data ?? data;
        if (payload.guide) {
          setSelectedItem(payload.guide as GuideItem);
        }
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  // --------------------------------------------------------------------------
  // Stats Panel
  // --------------------------------------------------------------------------

  const statsSections: StatSection[] = stats
    ? [
        {
          title: 'Guides',
          items: [
            { label: 'Total', value: stats.guides.total, bold: true },
            { label: 'Published', value: stats.guides.published },
            { label: 'Scheduled', value: stats.guides.scheduled },
            { label: 'Draft', value: stats.guides.draft },
            { label: 'Archived', value: stats.guides.archived },
            { label: 'Featured', value: stats.guides.featured },
          ],
        },
        {
          title: 'Difficulty',
          items: [
            { label: 'Beginner', value: stats.difficulty.beginner },
            { label: 'Intermediate', value: stats.difficulty.intermediate },
            { label: 'Advanced', value: stats.difficulty.advanced },
          ],
        },
        {
          title: 'Engagement',
          items: [
            { label: 'Total Views', value: stats.engagement.total_views, bold: true },
            { label: 'Total Completions', value: stats.engagement.total_completions },
            { label: 'Total Sections', value: stats.engagement.total_sections },
            { label: 'In Progress', value: stats.engagement.users_in_progress },
            { label: 'Completed', value: stats.engagement.users_completed },
          ],
        },
      ]
    : [];

  // --------------------------------------------------------------------------
  // Column Definitions
  // --------------------------------------------------------------------------

  const columns: TableColumn<GuideItem>[] = [
    {
      key: 'title',
      header: 'Title',
      accessor: (row) => (
        <div>
          <div className="font-medium truncate max-w-xs" title={row.title}>
            {row.title.length > 50 ? row.title.slice(0, 50) + '...' : row.title}
          </div>
          <div className="text-xs text-gray-400 truncate max-w-xs">{row.slug ?? '—'}</div>
        </div>
      ),
    },
    {
      key: 'listing_name',
      header: 'Listing',
      accessor: (row) => row.listing_name ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'is_featured',
      header: 'Featured',
      accessor: (row) => (
        <Star
          size={16}
          className={row.is_featured ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
        />
      ),
    },
    {
      key: 'difficulty_level',
      header: 'Difficulty',
      accessor: (row) => <DifficultyBadge level={row.difficulty_level} />,
    },
    {
      key: 'estimated_time',
      header: 'Est. Time',
      accessor: (row) => (row.estimated_time ? `${row.estimated_time} min` : '—'),
    },
    {
      key: 'section_count',
      header: 'Sections',
      accessor: (row) => row.section_count ?? 0,
      sortable: true,
      sortValue: (row) => row.section_count ?? 0,
    },
    {
      key: 'view_count',
      header: 'Views',
      accessor: (row) => row.view_count,
      sortable: true,
      sortValue: (row) => row.view_count,
    },
    {
      key: 'completion_count',
      header: 'Completions',
      accessor: (row) => row.completion_count,
      sortable: true,
      sortValue: (row) => row.completion_count,
    },
    {
      key: 'word_count',
      header: 'Words',
      accessor: (row) => row.word_count,
    },
    {
      key: 'recommendation_count',
      header: 'Recommends',
      accessor: (row) => row.recommendation_count ?? 0,
    },
    {
      key: 'published_at',
      header: 'Published',
      accessor: (row) => formatRelativeDate(row.published_at),
    },
  ];

  // --------------------------------------------------------------------------
  // Table Actions
  // --------------------------------------------------------------------------

  const tableActions: TableAction<GuideItem>[] = [
    {
      label: 'Edit',
      icon: <Pencil size={14} />,
      iconOnly: true,
      variant: 'primary',
      onClick: handleEditClick,
    },
    {
      label: 'View',
      icon: <Eye size={14} />,
      iconOnly: true,
      variant: 'secondary',
      onClick: handlePreview,
    },
    {
      label: 'Toggle Feature',
      icon: <Star size={14} />,
      iconOnly: true,
      variant: 'secondary',
      onClick: handleToggleFeature,
    },
    {
      label: 'Cycle Status',
      icon: <ToggleLeft size={14} />,
      iconOnly: true,
      variant: 'secondary',
      onClick: handleCycleStatus,
    },
    {
      label: 'Delete',
      icon: <Trash2 size={14} />,
      iconOnly: true,
      variant: 'danger',
      onClick: handleDelete,
    },
  ];

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <>
      {/* Header */}
      <AdminPageHeader
        title="Guide Manager"
        onCreateNew={() => setShowCreateModal(true)}
        onImportExport={() => setImportExportOpen(true)}
      />

      {/* Stats Panel */}
      <div className="mb-6">
        <AdminStatsPanel
          title="Guide Statistics"
          sections={statsSections}
          loading={statsLoading}
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search guides..."
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore="true"
              className="pl-8 pr-3 py-1.5 border rounded text-sm w-56"
            />
          </div>
          <button type="submit" className="px-3 py-1.5 bg-[#ed6437] text-white rounded text-sm hover:bg-[#d55a2f]">
            Search
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setSearchInput(''); }}
              className="px-3 py-1.5 border rounded text-sm text-gray-600 hover:bg-gray-50"
            >
              Clear
            </button>
          )}
        </form>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 border rounded text-sm"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>

        {/* Difficulty Filter */}
        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          className="px-3 py-1.5 border rounded text-sm"
        >
          <option value="all">All Difficulty</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {/* Table */}
      <AdminTableTemplate<GuideItem>
        title={`Guides (${total})`}
        data={items}
        columns={columns}
        rowKey={(row) => row.id}
        actions={tableActions}
        loading={loading}
        emptyMessage="No guides found"
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total,
          onPageChange: setPage,
        }}
        tableId="admin-guides"
      />

      {/* Create Guide Modal */}
      <GuideFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />

      {/* Edit Guide Modal */}
      {editingItem && editItemFullData && (
        <GuideFormModal
          isOpen={true}
          onClose={() => { setEditingItem(null); setEditItemFullData(null); }}
          onSubmit={handleUpdate}
          isSubmitting={isSubmitting}
          initialData={editItemFullData as Parameters<typeof GuideFormModal>[0]['initialData']}
        />
      )}

      {/* Import / Export Modal */}
      <AdminImportExportModal
        isOpen={importExportOpen}
        onClose={() => setImportExportOpen(false)}
        entityType="guides"
        entityLabel="Guides"
        exportEndpoint="/api/admin/guides?limit=10000"
        exportDataKey="guides"
        onImportComplete={fetchItems}
      />

      {/* Preview Modal */}
      <BizModal
        isOpen={previewOpen}
        onClose={() => { setPreviewOpen(false); setSelectedItem(null); }}
        title="Guide Preview"
        size="large"
      >
        {selectedItem && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b">
              <div>
                <h3 className="text-lg font-semibold">{selectedItem.title}</h3>
                {selectedItem.subtitle && (
                  <div className="text-sm text-gray-500 mt-0.5">{selectedItem.subtitle}</div>
                )}
                <div className="text-xs text-gray-400 mt-0.5">{selectedItem.slug ?? '—'}</div>
              </div>
              <div className="flex items-center gap-2">
                <DifficultyBadge level={selectedItem.difficulty_level} />
                <StatusBadge status={selectedItem.status} />
              </div>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">Listing: </span>
                <span className="text-gray-600">{selectedItem.listing_name ?? '—'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Category: </span>
                <span className="text-gray-600">{selectedItem.category_name ?? '—'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Featured: </span>
                <span className="text-gray-600">{selectedItem.is_featured ? 'Yes' : 'No'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Est. Time: </span>
                <span className="text-gray-600">
                  {selectedItem.estimated_time ? `${selectedItem.estimated_time} min` : '—'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Word Count: </span>
                <span className="text-gray-600">{selectedItem.word_count}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Views: </span>
                <span className="text-gray-600">{selectedItem.view_count}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Completions: </span>
                <span className="text-gray-600">{selectedItem.completion_count}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Bookmarks: </span>
                <span className="text-gray-600">{selectedItem.bookmark_count}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Shares: </span>
                <span className="text-gray-600">{selectedItem.share_count}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Recommendations: </span>
                <span className="text-gray-600">{selectedItem.recommendation_count ?? 0}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Published: </span>
                <span className="text-gray-600">{formatRelativeDate(selectedItem.published_at)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Created: </span>
                <span className="text-gray-600">{formatRelativeDate(selectedItem.created_at)}</span>
              </div>
            </div>

            {/* Sections */}
            {previewLoading ? (
              <div className="text-sm text-gray-400 py-2">Loading sections...</div>
            ) : selectedItem.sections && selectedItem.sections.length > 0 ? (
              <div className="pt-2">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Sections ({selectedItem.sections.length})
                </div>
                <div className="space-y-1">
                  {selectedItem.sections.map((section) => (
                    <div
                      key={section.id}
                      className="flex items-center justify-between text-sm py-1.5 px-3 bg-gray-50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs font-mono w-5 text-right">
                          {section.section_number}.
                        </span>
                        <span className="text-gray-700">{section.title}</span>
                      </div>
                      {section.estimated_time != null && (
                        <span className="text-gray-400 text-xs">{section.estimated_time} min</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-400 py-2">No sections</div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <BizModalButton
                variant="secondary"
                onClick={() => { setPreviewOpen(false); setSelectedItem(null); }}
              >
                Close
              </BizModalButton>
            </div>
          </div>
        )}
      </BizModal>
    </>
  );
}

// ============================================================================
// EXPORTED PAGE — wrapped in ErrorBoundary
// ============================================================================

export default function AdminGuidePage() {
  return (
    <ErrorBoundary fallback={<ErrorFallback title="Guide Manager Error" />}>
      <AdminGuidePageInner />
    </ErrorBoundary>
  );
}
