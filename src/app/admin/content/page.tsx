/**
 * Admin Content Manager Page
 * /admin/content
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
 * - Tabbed interface (Articles | Podcasts | Videos)
 * - Statistics panel per tab
 * - Search and status filter
 * - Feature toggle, status cycle, delete actions
 * - Content preview modal
 * - Server-side pagination
 *
 * @authority CLAUDE.md - Admin Development
 * @phase Content Phase 4A
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
import { ArticleFormModal } from '@features/dashboard/components/managers/content/ArticleFormModal';
import { PodcastFormModal } from '@features/dashboard/components/managers/content/PodcastFormModal';
import { VideoFormModal } from '@features/dashboard/components/managers/content/VideoFormModal';
import {
  FileText,
  Headphones,
  Play,
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

type ContentTab = 'articles' | 'podcasts' | 'videos';

interface ContentItem {
  id: number;
  title: string;
  slug: string;
  status: string;
  is_featured: boolean | number;
  is_sponsored: boolean | number;
  view_count: number;
  bookmark_count: number;
  category_name?: string;
  listing_name?: string;
  recommendation_count?: number;
  published_at: string | null;
  created_at: string;
  // Article-specific
  reading_time?: number;
  // Podcast-specific
  episode_number?: number;
  season_number?: number;
  duration?: number;
  // Video-specific
  video_type?: string;
}

interface ContentStats {
  articles: {
    total: number;
    draft: number;
    pending: number;
    published: number;
    archived: number;
    featured: number;
    sponsored: number;
  };
  podcasts: {
    total: number;
    draft: number;
    pending: number;
    published: number;
    archived: number;
    featured: number;
    sponsored: number;
  };
  videos: {
    total: number;
    draft: number;
    pending: number;
    published: number;
    archived: number;
    featured: number;
    sponsored: number;
  };
  comments: { total: number; active: number; hidden: number; deleted: number };
  reports: { total: number; pending: number };
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDuration(seconds: number | undefined): string {
  if (!seconds) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

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
    pending: 'bg-yellow-100 text-yellow-800',
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

const STATUS_CYCLE: Record<string, string> = {
  draft: 'pending',
  pending: 'published',
  published: 'archived',
  archived: 'draft',
};

// ============================================================================
// INNER PAGE COMPONENT
// ============================================================================

function AdminContentPageInner() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<ContentTab>('articles');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Create / edit modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
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
        type: activeTab,
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery) params.set('q', searchQuery);

      const res = await fetch(`/api/admin/content?${params.toString()}`, {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        const payload = data.data ?? data;
        setItems(payload[activeTab] ?? []);
        setTotal(payload.pagination?.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, searchQuery, statusFilter]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/content/statistics', {
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
  }, [user, activeTab, page, searchQuery, statusFilter, fetchItems]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchStats();
    }
  }, [user, fetchStats]);

  // Reset page on tab/filter/search changes
  useEffect(() => {
    setPage(1);
  }, [activeTab, statusFilter, searchQuery]);

  // --------------------------------------------------------------------------
  // Create / Edit handlers (before auth guards — hooks rule)
  // --------------------------------------------------------------------------

  const handleEditClick = useCallback(async (item: ContentItem) => {
    const singularType = activeTab === 'articles' ? 'article' : activeTab === 'podcasts' ? 'podcast' : 'video';
    try {
      const response = await fetch(`/api/admin/content/${singularType}/${item.id}`, {
        credentials: 'include',
      });
      if (!response.ok) return;
      const result = await response.json();
      const data = result.data?.[singularType] ?? result.data ?? {};
      setEditingItem(item);
      if (activeTab === 'articles') {
        setEditItemFullData({
          title: data.title ?? '',
          excerpt: data.excerpt ?? '',
          content: data.content ?? '',
          featured_image: data.featured_image ?? '',
          category_id: data.category_id ? String(data.category_id) : '',
          tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags ?? ''),
          reading_time: data.reading_time != null ? String(data.reading_time) : '',
        });
      } else if (activeTab === 'podcasts') {
        setEditItemFullData({
          title: data.title ?? '',
          audio_url: data.audio_url ?? '',
          description: data.description ?? '',
          thumbnail: data.thumbnail ?? '',
          season_number: data.season_number != null ? String(data.season_number) : '',
          episode_number: data.episode_number != null ? String(data.episode_number) : '',
          duration: data.duration != null ? String(data.duration) : '',
          category_id: data.category_id ? String(data.category_id) : '',
          tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags ?? ''),
        });
      } else {
        setEditItemFullData({
          title: data.title ?? '',
          video_url: data.video_url ?? '',
          video_type: data.video_type ?? 'youtube',
          description: data.description ?? '',
          thumbnail: data.thumbnail ?? '',
          duration: data.duration != null ? String(data.duration) : '',
          category_id: data.category_id ? String(data.category_id) : '',
          tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags ?? ''),
        });
      }
    } catch (error) {
      console.error('Failed to fetch content for editing:', error);
    }
  }, [activeTab]);

  const handleCreate = useCallback(async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    const singularType = activeTab === 'articles' ? 'article' : activeTab === 'podcasts' ? 'podcast' : 'video';
    const apiData: Record<string, unknown> = { ...data, type: singularType };
    delete apiData._pendingMedia;
    const listingId = typeof apiData.listing_id === 'number' ? apiData.listing_id : 0;
    try {
      const response = await fetchWithCsrf(`/api/dashboard/listings/${listingId}/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to create content');
      }
      await fetchItems();
      setShowCreateModal(false);
    } catch (err) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [activeTab, fetchItems]);

  const handleUpdate = useCallback(async (data: Record<string, unknown>) => {
    if (!editingItem) return;
    setIsSubmitting(true);
    const singularType = activeTab === 'articles' ? 'article' : activeTab === 'podcasts' ? 'podcast' : 'video';
    try {
      const response = await fetchWithCsrf(`/api/admin/content/${singularType}/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to update content');
      }
      await fetchItems();
      setEditingItem(null);
      setEditItemFullData(null);
    } catch (err) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [editingItem, activeTab, fetchItems]);

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

  const handleToggleFeature = async (item: ContentItem) => {
    const singularType = activeTab === 'articles' ? 'article' : activeTab === 'podcasts' ? 'podcast' : 'video';
    await fetchWithCsrf(`/api/admin/content/${singularType}/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_featured: !item.is_featured }),
    });
    fetchItems();
  };

  const handleCycleStatus = async (item: ContentItem) => {
    const nextStatus = STATUS_CYCLE[item.status] ?? 'draft';
    const singularType = activeTab === 'articles' ? 'article' : activeTab === 'podcasts' ? 'podcast' : 'video';
    await fetchWithCsrf(`/api/admin/content/${singularType}/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    fetchItems();
  };

  const handleDelete = async (item: ContentItem) => {
    if (!confirm(`Archive "${item.title}"? This will set the status to archived.`)) return;
    const singularType = activeTab === 'articles' ? 'article' : activeTab === 'podcasts' ? 'podcast' : 'video';
    await fetchWithCsrf(`/api/admin/content/${singularType}/${item.id}`, {
      method: 'DELETE',
    });
    fetchItems();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  // --------------------------------------------------------------------------
  // Stats Panel
  // --------------------------------------------------------------------------

  const tabStats = stats ? stats[activeTab] : null;

  const statsSections: StatSection[] = tabStats
    ? [
        {
          title: 'Status',
          items: [
            { label: 'Total', value: tabStats.total, bold: true },
            { label: 'Published', value: tabStats.published },
            { label: 'Pending', value: tabStats.pending },
            { label: 'Draft', value: tabStats.draft },
            { label: 'Archived', value: tabStats.archived },
          ],
        },
        {
          title: 'Promotion',
          items: [
            { label: 'Featured', value: tabStats.featured },
            { label: 'Sponsored', value: tabStats.sponsored },
          ],
        },
        {
          title: 'Engagement',
          items: stats
            ? [
                { label: 'Comments', value: stats.comments.total },
                { label: 'Active Comments', value: stats.comments.active },
                { label: 'Reports', value: stats.reports.pending, bold: stats.reports.pending > 0 },
              ]
            : [],
        },
      ]
    : [];

  // --------------------------------------------------------------------------
  // Column Definitions
  // --------------------------------------------------------------------------

  const baseColumns: TableColumn<ContentItem>[] = [
    {
      key: 'title',
      header: 'Title',
      accessor: (row) => (
        <div>
          <div className="font-medium truncate max-w-xs" title={row.title}>
            {row.title.length > 50 ? row.title.slice(0, 50) + '…' : row.title}
          </div>
          <div className="text-xs text-gray-400 truncate max-w-xs">{row.slug}</div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      accessor: (row) => row.category_name ?? '—',
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
      key: 'view_count',
      header: 'Views',
      accessor: (row) => row.view_count,
      sortable: true,
      sortValue: (row) => row.view_count,
    },
    {
      key: 'bookmark_count',
      header: 'Bookmarks',
      accessor: (row) => row.bookmark_count,
      sortable: true,
      sortValue: (row) => row.bookmark_count,
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

  const podcastExtraColumns: TableColumn<ContentItem>[] = [
    {
      key: 'episode',
      header: 'Episode',
      accessor: (row) =>
        row.season_number != null && row.episode_number != null
          ? `S${row.season_number}E${row.episode_number}`
          : '—',
    },
    {
      key: 'duration',
      header: 'Duration',
      accessor: (row) => formatDuration(row.duration),
    },
  ];

  const videoExtraColumns: TableColumn<ContentItem>[] = [
    {
      key: 'video_type',
      header: 'Type',
      accessor: (row) =>
        row.video_type ? (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
            {row.video_type.toUpperCase()}
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'duration',
      header: 'Duration',
      accessor: (row) => formatDuration(row.duration),
    },
  ];

  const articleExtraColumns: TableColumn<ContentItem>[] = [
    {
      key: 'reading_time',
      header: 'Read Time',
      accessor: (row) => (row.reading_time ? `${row.reading_time} min` : '—'),
    },
  ];

  let columns: TableColumn<ContentItem>[] = [...baseColumns];
  if (activeTab === 'articles') {
    columns = [...baseColumns.slice(0, 2), ...articleExtraColumns, ...baseColumns.slice(2)];
  } else if (activeTab === 'podcasts') {
    columns = [...baseColumns.slice(0, 2), ...podcastExtraColumns, ...baseColumns.slice(2)];
  } else if (activeTab === 'videos') {
    columns = [...baseColumns.slice(0, 2), ...videoExtraColumns, ...baseColumns.slice(2)];
  }

  // --------------------------------------------------------------------------
  // Table Actions
  // --------------------------------------------------------------------------

  const tableActions: TableAction<ContentItem>[] = [
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
      onClick: (row) => {
        setSelectedItem(row);
        setPreviewOpen(true);
      },
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
  // Tabs
  // --------------------------------------------------------------------------

  const tabs: { key: ContentTab; label: string; icon: typeof FileText }[] = [
    { key: 'articles', label: 'Articles', icon: FileText },
    { key: 'podcasts', label: 'Podcasts', icon: Headphones },
    { key: 'videos', label: 'Videos', icon: Play },
  ];

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <>
      {/* Header */}
      <AdminPageHeader
        title="Content Manager"
        onCreateNew={() => setShowCreateModal(true)}
        onImportExport={() => setImportExportOpen(true)}
      />

      {/* Stats Panel */}
      <div className="mb-6">
        <AdminStatsPanel
          title="Content Statistics"
          sections={statsSections}
          loading={statsLoading}
        />
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-[#ed6437] text-[#ed6437]'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search..."
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
          <option value="pending">Pending</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Table */}
      <AdminTableTemplate<ContentItem>
        title={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} (${total})`}
        data={items}
        columns={columns}
        rowKey={(row) => row.id}
        actions={tableActions}
        loading={loading}
        emptyMessage={`No ${activeTab} found`}
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total,
          onPageChange: setPage,
        }}
        tableId={`admin-content-${activeTab}`}
      />

      {/* Create Content Modal - conditional on active tab */}
      {activeTab === 'articles' && (
        <ArticleFormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
          isSubmitting={isSubmitting}
        />
      )}
      {activeTab === 'podcasts' && (
        <PodcastFormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
          isSubmitting={isSubmitting}
        />
      )}
      {activeTab === 'videos' && (
        <VideoFormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Edit Content Modal - conditional on active tab */}
      {editingItem && editItemFullData && activeTab === 'articles' && (
        <ArticleFormModal
          isOpen={true}
          onClose={() => { setEditingItem(null); setEditItemFullData(null); }}
          onSubmit={handleUpdate}
          isSubmitting={isSubmitting}
          initialData={editItemFullData}
        />
      )}
      {editingItem && editItemFullData && activeTab === 'podcasts' && (
        <PodcastFormModal
          isOpen={true}
          onClose={() => { setEditingItem(null); setEditItemFullData(null); }}
          onSubmit={handleUpdate}
          isSubmitting={isSubmitting}
          initialData={editItemFullData}
        />
      )}
      {editingItem && editItemFullData && activeTab === 'videos' && (
        <VideoFormModal
          isOpen={true}
          onClose={() => { setEditingItem(null); setEditItemFullData(null); }}
          onSubmit={handleUpdate}
          isSubmitting={isSubmitting}
          initialData={editItemFullData}
        />
      )}

      {/* Import / Export Modal */}
      <AdminImportExportModal
        isOpen={importExportOpen}
        onClose={() => setImportExportOpen(false)}
        entityType={activeTab}
        entityLabel={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
        exportEndpoint={`/api/admin/content?type=${activeTab}&limit=10000`}
        exportDataKey={activeTab}
        onImportComplete={fetchItems}
      />

      {/* Preview Modal */}
      <BizModal
        isOpen={previewOpen}
        onClose={() => { setPreviewOpen(false); setSelectedItem(null); }}
        title="Content Preview"
        size="large"
      >
        {selectedItem && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b">
              <div>
                <h3 className="text-lg font-semibold">{selectedItem.title}</h3>
                <div className="text-sm text-gray-400 mt-0.5">{selectedItem.slug}</div>
              </div>
              <StatusBadge status={selectedItem.status} />
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">Category: </span>
                <span className="text-gray-600">{selectedItem.category_name ?? '—'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Listing: </span>
                <span className="text-gray-600">{selectedItem.listing_name ?? '—'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Featured: </span>
                <span className="text-gray-600">{selectedItem.is_featured ? 'Yes' : 'No'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Sponsored: </span>
                <span className="text-gray-600">{selectedItem.is_sponsored ? 'Yes' : 'No'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Views: </span>
                <span className="text-gray-600">{selectedItem.view_count}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Bookmarks: </span>
                <span className="text-gray-600">{selectedItem.bookmark_count}</span>
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
              {activeTab === 'articles' && selectedItem.reading_time != null && (
                <div>
                  <span className="font-medium text-gray-700">Reading Time: </span>
                  <span className="text-gray-600">{selectedItem.reading_time} min</span>
                </div>
              )}
              {activeTab === 'podcasts' && selectedItem.episode_number != null && (
                <div>
                  <span className="font-medium text-gray-700">Episode: </span>
                  <span className="text-gray-600">
                    S{selectedItem.season_number}E{selectedItem.episode_number}
                  </span>
                </div>
              )}
              {activeTab === 'videos' && selectedItem.video_type && (
                <div>
                  <span className="font-medium text-gray-700">Video Type: </span>
                  <span className="text-gray-600">{selectedItem.video_type.toUpperCase()}</span>
                </div>
              )}
              {selectedItem.duration != null && (
                <div>
                  <span className="font-medium text-gray-700">Duration: </span>
                  <span className="text-gray-600">{formatDuration(selectedItem.duration)}</span>
                </div>
              )}
            </div>

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

export default function AdminContentPage() {
  return (
    <ErrorBoundary fallback={<ErrorFallback title="Content Manager Error" />}>
      <AdminContentPageInner />
    </ErrorBoundary>
  );
}
