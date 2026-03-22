/**
 * Admin Newsletter Manager Page
 * /admin/newsletters
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
 * - Newsletter list with enrichment (category, listing, subscribers, recommends)
 * - Statistics panel (newsletters, subscribers, delivery)
 * - Search and status filter
 * - Feature toggle, status cycle, delete actions
 * - Newsletter preview modal
 * - Server-side pagination
 *
 * @authority CLAUDE.md - Admin Development
 * @phase Tier 2 Content Types - Phase N6
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
import { NewsletterFormModal } from '@features/dashboard/components/managers/newsletter/NewsletterFormModal';
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

interface NewsletterItem {
  id: number;
  title: string;
  slug: string | null;
  issue_number: number | null;
  status: string;
  is_featured: boolean | number;
  reading_time: number | null;
  view_count: number;
  open_count: number;
  click_count: number;
  bookmark_count: number;
  share_count: number;
  subscriber_count_at_send: number;
  category_name?: string;
  listing_name?: string;
  recommendation_count?: number;
  subscriber_count?: number;
  sent_at: string | null;
  published_at: string | null;
  created_at: string;
}

interface NewsletterStats {
  newsletters: {
    total: number;
    draft: number;
    scheduled: number;
    published: number;
    archived: number;
    featured: number;
  };
  subscribers: {
    total: number;
    active: number;
    pending: number;
    unsubscribed: number;
    bounced: number;
  };
  delivery: {
    total_sent: number;
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

const STATUS_CYCLE: Record<string, string> = {
  draft: 'scheduled',
  scheduled: 'published',
  published: 'archived',
  archived: 'draft',
};

// ============================================================================
// INNER PAGE COMPONENT
// ============================================================================

function AdminNewsletterPageInner() {
  const { user } = useAuth();

  const [items, setItems] = useState<NewsletterItem[]>([]);
  const [stats, setStats] = useState<NewsletterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<NewsletterItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Create / edit modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<NewsletterItem | null>(null);
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
      if (searchQuery) params.set('q', searchQuery);

      const res = await fetch(`/api/admin/newsletters?${params.toString()}`, {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        const payload = data.data ?? data;
        setItems(payload.newsletters ?? []);
        setTotal(payload.pagination?.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/newsletters/statistics', {
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
  }, [user, page, searchQuery, statusFilter, fetchItems]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchStats();
    }
  }, [user, fetchStats]);

  // Reset page on filter/search changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchQuery]);

  // --------------------------------------------------------------------------
  // Create / Edit handlers (before auth guards — hooks rule)
  // --------------------------------------------------------------------------

  const handleEditClick = useCallback(async (item: NewsletterItem) => {
    try {
      const response = await fetch(`/api/admin/newsletters/${item.id}`, {
        credentials: 'include',
      });
      if (!response.ok) return;
      const result = await response.json();
      const data = result.data?.newsletter ?? result.data ?? {};
      setEditingItem(item);
      setEditItemFullData({
        title: data.title ?? '',
        excerpt: data.excerpt ?? '',
        web_content: data.web_content ?? '',
        featured_image: data.featured_image ?? '',
        category_id: data.category_id ? String(data.category_id) : '',
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags ?? ''),
        reading_time: data.reading_time != null ? String(data.reading_time) : '',
        issue_number: data.issue_number != null ? String(data.issue_number) : '',
      });
    } catch (error) {
      console.error('Failed to fetch newsletter for editing:', error);
    }
  }, []);

  const handleCreate = useCallback(async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    const apiData = { ...data };
    delete apiData._pendingMedia;
    const listingId = typeof apiData.listing_id === 'number' ? apiData.listing_id : 0;
    try {
      const response = await fetchWithCsrf(`/api/dashboard/listings/${listingId}/newsletters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to create newsletter');
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
      const response = await fetchWithCsrf(`/api/admin/newsletters/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to update newsletter');
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

  const handleToggleFeature = async (item: NewsletterItem) => {
    await fetchWithCsrf(`/api/admin/newsletters/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_featured: !item.is_featured }),
    });
    fetchItems();
  };

  const handleCycleStatus = async (item: NewsletterItem) => {
    const nextStatus = STATUS_CYCLE[item.status] ?? 'draft';
    await fetchWithCsrf(`/api/admin/newsletters/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    fetchItems();
  };

  const handleDelete = async (item: NewsletterItem) => {
    if (!confirm(`Delete newsletter "${item.title}"? This action cannot be undone.`)) return;
    await fetchWithCsrf(`/api/admin/newsletters/${item.id}`, {
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

  const statsSections: StatSection[] = stats
    ? [
        {
          title: 'Newsletters',
          items: [
            { label: 'Total', value: stats.newsletters.total, bold: true },
            { label: 'Published', value: stats.newsletters.published },
            { label: 'Scheduled', value: stats.newsletters.scheduled },
            { label: 'Draft', value: stats.newsletters.draft },
            { label: 'Archived', value: stats.newsletters.archived },
            { label: 'Featured', value: stats.newsletters.featured },
          ],
        },
        {
          title: 'Subscribers',
          items: [
            { label: 'Total', value: stats.subscribers.total, bold: true },
            { label: 'Active', value: stats.subscribers.active },
            { label: 'Pending', value: stats.subscribers.pending },
            { label: 'Unsubscribed', value: stats.subscribers.unsubscribed },
          ],
        },
        {
          title: 'Delivery',
          items: [
            { label: 'Total Sent', value: stats.delivery.total_sent },
          ],
        },
      ]
    : [];

  // --------------------------------------------------------------------------
  // Column Definitions
  // --------------------------------------------------------------------------

  const columns: TableColumn<NewsletterItem>[] = [
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
      key: 'issue_number',
      header: 'Issue #',
      accessor: (row) => (row.issue_number != null ? `#${row.issue_number}` : '—'),
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
      key: 'reading_time',
      header: 'Read Time',
      accessor: (row) => (row.reading_time ? `${row.reading_time} min` : '—'),
    },
    {
      key: 'view_count',
      header: 'Views',
      accessor: (row) => row.view_count,
      sortable: true,
      sortValue: (row) => row.view_count,
    },
    {
      key: 'subscriber_count',
      header: 'Subscribers',
      accessor: (row) => row.subscriber_count ?? 0,
    },
    {
      key: 'open_count',
      header: 'Opens',
      accessor: (row) => row.open_count,
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

  const tableActions: TableAction<NewsletterItem>[] = [
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
  // Render
  // --------------------------------------------------------------------------

  return (
    <>
      {/* Header */}
      <AdminPageHeader
        title="Newsletter Manager"
        onCreateNew={() => setShowCreateModal(true)}
        onImportExport={() => setImportExportOpen(true)}
      />

      {/* Stats Panel */}
      <div className="mb-6">
        <AdminStatsPanel
          title="Newsletter Statistics"
          sections={statsSections}
          loading={statsLoading}
        />
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
              placeholder="Search newsletters..."
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
      </div>

      {/* Table */}
      <AdminTableTemplate<NewsletterItem>
        title={`Newsletters (${total})`}
        data={items}
        columns={columns}
        rowKey={(row) => row.id}
        actions={tableActions}
        loading={loading}
        emptyMessage="No newsletters found"
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total,
          onPageChange: setPage,
        }}
        tableId="admin-newsletters"
      />

      {/* Create Newsletter Modal */}
      <NewsletterFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />

      {/* Edit Newsletter Modal */}
      {editingItem && editItemFullData && (
        <NewsletterFormModal
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
        entityType="newsletters"
        entityLabel="Newsletters"
        exportEndpoint="/api/admin/newsletters?limit=10000"
        exportDataKey="newsletters"
        onImportComplete={fetchItems}
      />

      {/* Preview Modal */}
      <BizModal
        isOpen={previewOpen}
        onClose={() => { setPreviewOpen(false); setSelectedItem(null); }}
        title="Newsletter Preview"
        size="large"
      >
        {selectedItem && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b">
              <div>
                <h3 className="text-lg font-semibold">{selectedItem.title}</h3>
                <div className="text-sm text-gray-400 mt-0.5">{selectedItem.slug ?? '—'}</div>
              </div>
              <StatusBadge status={selectedItem.status} />
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-gray-700">Issue Number: </span>
                <span className="text-gray-600">
                  {selectedItem.issue_number != null ? `#${selectedItem.issue_number}` : '—'}
                </span>
              </div>
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
                <span className="font-medium text-gray-700">Reading Time: </span>
                <span className="text-gray-600">
                  {selectedItem.reading_time ? `${selectedItem.reading_time} min` : '—'}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Views: </span>
                <span className="text-gray-600">{selectedItem.view_count}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Opens: </span>
                <span className="text-gray-600">{selectedItem.open_count}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Clicks: </span>
                <span className="text-gray-600">{selectedItem.click_count}</span>
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
                <span className="font-medium text-gray-700">Subscribers at Send: </span>
                <span className="text-gray-600">{selectedItem.subscriber_count_at_send}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Active Subscribers: </span>
                <span className="text-gray-600">{selectedItem.subscriber_count ?? 0}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Recommendations: </span>
                <span className="text-gray-600">{selectedItem.recommendation_count ?? 0}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Sent: </span>
                <span className="text-gray-600">{formatRelativeDate(selectedItem.sent_at)}</span>
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

export default function AdminNewsletterPage() {
  return (
    <ErrorBoundary fallback={<ErrorFallback title="Newsletter Manager Error" />}>
      <AdminNewsletterPageInner />
    </ErrorBoundary>
  );
}
