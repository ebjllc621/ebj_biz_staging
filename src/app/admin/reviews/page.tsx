/**
 * Admin Review Moderation Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Authority: docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 * - Template: AdminTableTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: ReviewService via API routes
 * - Credentials: 'include' for all fetch requests
 * - Complexity: STANDARD tier
 *
 * Canonical Features:
 * - Page header with "Import/Export" button
 * - Statistics panel with review metrics
 * - Search bar with mode detection
 * - Advanced filters panel
 * - Pagination controls in table header
 * - Icon-only action buttons with canonical colors
 * - Server-side sorting
 * - Bulk actions for moderation
 *
 * @authority docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 * @component
 * @returns {JSX.Element} Admin review moderation
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Eye, CheckCircle, XCircle, Star, Trash2 } from 'lucide-react';
import { AdminTableTemplate, TableColumn, TableAction, BulkAction } from '@/components/admin/templates/AdminTableTemplate';
import {
  AdminPageHeader,
  AdminStatsPanel,
  AdminSearchBar,
  AdminAdvancedFilterPanel,
  AdminPaginationControls,
  AdminPasswordModal,
  type StatSection,
  type FilterField,
  type MatchMode,
  type SearchMode
} from '@/components/admin/shared';
import { useAuth } from '@core/hooks/useAuth';

interface Review {
  id: number;
  listing_id: number;
  listing_name?: string;
  user_id: number;
  user_name?: string;
  rating: number;
  comment: string;
  status: string;
  highlighted_as_testimonial: boolean;
  created_at: string;
  entity_type?: string;
}

interface ReviewStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  testimonials: number;
  avgRating: number;
  byRating: Record<number, number>;
}

interface ReviewFilters {
  [key: string]: string;
  id: string;
  listing_id: string;
  status: string;
  rating: string;
  highlighted_as_testimonial: string;
  entity_type: string;
}

const defaultFilters: ReviewFilters = {
  id: '',
  listing_id: '',
  status: '',
  rating: '',
  highlighted_as_testimonial: '',
  entity_type: ''
};

const reviewFilterFields: FilterField[] = [
  { key: 'id', label: 'Review ID', type: 'number', placeholder: 'e.g., 123' },
  { key: 'listing_id', label: 'Listing ID', type: 'number', placeholder: 'e.g., 456' },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'approved', label: 'Approved' },
      { value: 'pending', label: 'Pending' },
      { value: 'rejected', label: 'Rejected' },
      { value: 'flagged', label: 'Flagged' }
    ]
  },
  {
    key: 'rating',
    label: 'Rating',
    type: 'select',
    options: [
      { value: '5', label: '5 Stars' },
      { value: '4', label: '4 Stars' },
      { value: '3', label: '3 Stars' },
      { value: '2', label: '2 Stars' },
      { value: '1', label: '1 Star' }
    ]
  },
  {
    key: 'highlighted_as_testimonial',
    label: 'Testimonial',
    type: 'select',
    options: [
      { value: 'true', label: 'Testimonials Only' },
      { value: 'false', label: 'Not Testimonials' }
    ]
  },
  {
    key: 'entity_type',
    label: 'Entity Type',
    type: 'select',
    options: [
      { value: 'listing', label: 'Listings' },
      { value: 'event', label: 'Events' },
      { value: 'offer', label: 'Offers' },
      { value: 'content', label: 'Content (Articles, Guides, Videos, Podcasts)' },
      { value: 'creator', label: 'Creator Profiles' },
      { value: 'all', label: 'All Types' }
    ]
  }
];

const statusColors: Record<string, string> = {
  approved: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  rejected: 'bg-red-100 text-red-800',
  flagged: 'bg-orange-100 text-orange-800'
};

const entityTypeColors: Record<string, string> = {
  listing: 'bg-blue-100 text-blue-800',
  event: 'bg-purple-100 text-purple-800',
  offer: 'bg-orange-100 text-orange-800',
  content_article: 'bg-emerald-100 text-emerald-800',
  content_guide: 'bg-emerald-100 text-emerald-800',
  content_video: 'bg-sky-100 text-sky-800',
  content_podcast: 'bg-pink-100 text-pink-800',
  creator_am: 'bg-teal-100 text-teal-800',
  creator_ip: 'bg-teal-100 text-teal-800',
  creator_pod: 'bg-teal-100 text-teal-800'
};

export default function AdminReviewsPage() {
  const { user } = useAuth();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('all');
  const [filters, setFilters] = useState<ReviewFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [matchMode, setMatchMode] = useState<MatchMode>('all');

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: string; reviews: Review[] } | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        pageSize: String(pagination.pageSize),
        sortColumn,
        sortDirection,
        search: searchQuery,
        searchMode,
        matchMode,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      });

      const response = await fetch(`/api/admin/reviews?${params}`, { credentials: 'include' });
      const result = await response.json();

      if (result.success) {
        setReviews(result.data?.reviews || result.reviews || []);
        setPagination(prev => ({ ...prev, total: result.data?.pagination?.total || result.pagination?.total || 0 }));
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, sortColumn, sortDirection, searchQuery, searchMode, filters, matchMode]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await fetch('/api/admin/reviews/stats', { credentials: 'include' });
      const result = await response.json();
      if (result.success) setStats(result.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchReviews();
      fetchStats();
    }
  }, [user, fetchReviews, fetchStats]);

  const handleSearch = useCallback((query: string, mode: SearchMode) => {
    setSearchQuery(query);
    setSearchMode(mode);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleFiltersChange = useCallback((newFilters: ReviewFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(defaultFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const activeFilterCount = useMemo(() => Object.values(filters).filter(v => v !== '').length, [filters]);

  const handleColumnSort = useCallback((columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [sortColumn]);

  const handleStatusChange = useCallback(async (review: Review, newStatus: string) => {
    try {
      await fetch(`/api/admin/reviews/${review.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });
      fetchReviews();
      fetchStats();
    } catch (error) {
      console.error('Failed to change status:', error);
    }
  }, [fetchReviews, fetchStats]);

  const handleTestimonialToggle = useCallback(async (review: Review) => {
    try {
      await fetch(`/api/admin/reviews/${review.id}/testimonial`, {
        method: 'PATCH',
        credentials: 'include'
      });
      fetchReviews();
      fetchStats();
    } catch (error) {
      console.error('Failed to toggle testimonial:', error);
    }
  }, [fetchReviews, fetchStats]);

  const handleBulkApprove = useCallback(async (selectedReviews: Review[]) => {
    const ids = selectedReviews.filter(r => r.status === 'pending').map(r => r.id);
    if (ids.length === 0) return;

    try {
      await fetch('/api/admin/reviews/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'approve', reviewIds: ids })
      });
      fetchReviews();
      fetchStats();
    } catch (error) {
      console.error('Failed to approve reviews:', error);
    }
  }, [fetchReviews, fetchStats]);

  const handleBulkReject = useCallback(async (selectedReviews: Review[]) => {
    const ids = selectedReviews.filter(r => r.status === 'pending').map(r => r.id);
    if (ids.length === 0) return;

    try {
      await fetch('/api/admin/reviews/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'reject', reviewIds: ids })
      });
      fetchReviews();
      fetchStats();
    } catch (error) {
      console.error('Failed to reject reviews:', error);
    }
  }, [fetchReviews, fetchStats]);

  const handleBulkDelete = useCallback((selectedReviews: Review[]) => {
    setPendingAction({ type: 'delete', reviews: selectedReviews });
    setShowPasswordModal(true);
  }, []);

  const handlePasswordVerified = useCallback(async () => {
    if (!pendingAction) return;
    setShowPasswordModal(false);

    try {
      const ids = pendingAction.reviews.map(r => r.id);
      await fetch('/api/admin/reviews/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'delete', reviewIds: ids })
      });
      fetchReviews();
      fetchStats();
    } catch (error) {
      console.error('Failed to delete reviews:', error);
    }
    setPendingAction(null);
  }, [pendingAction, fetchReviews, fetchStats]);

  const statsSections: StatSection[] = useMemo(() => {
    if (!stats) return [];
    return [
      {
        title: 'Totals',
        items: [
          { label: 'Total Reviews', value: stats.total, bold: true },
          { label: 'Avg Rating', value: stats.avgRating?.toFixed(1) || '0' },
          { label: 'Testimonials', value: stats.testimonials }
        ]
      },
      {
        title: 'By Status',
        items: [
          { label: 'Approved', value: stats.approved },
          { label: 'Pending', value: stats.pending },
          { label: 'Rejected', value: stats.rejected }
        ]
      },
      {
        title: 'By Rating',
        items: [5, 4, 3].map(r => ({ label: `${r} Stars`, value: stats.byRating?.[r] || 0 }))
      }
    ];
  }, [stats]);

  const columns: TableColumn<Review>[] = useMemo(() => [
    { key: 'id', header: 'ID', accessor: (row) => row.id, sortable: true },
    { key: 'listing_id', header: 'Entity ID', accessor: (r) => r.listing_id, sortable: true },
    { key: 'listing_name', header: 'Entity Name', accessor: (r) => r.listing_name || '-', sortable: true },
    {
      key: 'entity_type',
      header: 'Type',
      sortable: true,
      accessor: (r) => {
        const type = r.entity_type || 'listing';
        const labels: Record<string, string> = {
          listing: 'Listing',
          event: 'Event',
          offer: 'Offer',
          content_article: 'Article',
          content_guide: 'Guide',
          content_video: 'Video',
          content_podcast: 'Podcast',
          creator_am: 'Affiliate',
          creator_ip: 'Personality',
          creator_pod: 'Podcaster'
        };
        return (
          <span className={`px-2 py-1 rounded text-xs ${entityTypeColors[type] || 'bg-gray-100 text-gray-800'}`}>
            {labels[type] || type}
          </span>
        );
      }
    },
    { key: 'user_id', header: 'User', accessor: (r) => r.user_name || `#${r.user_id}`, sortable: true },
    {
      key: 'rating',
      header: 'Rating',
      accessor: (r) => (
        <div className="flex items-center">
          {Array.from({ length: r.rating }).map((_, i) => (
            <Star key={i} className="w-4 h-4 text-amber-500 fill-amber-500" />
          ))}
        </div>
      ),
      sortable: true
    },
    {
      key: 'comment',
      header: 'Comment',
      sortable: true,
      accessor: (r) => (
        <div className="max-w-xs truncate" title={r.comment}>{r.comment}</div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      accessor: (r) => (
        <span className={`px-2 py-1 rounded text-xs ${statusColors[r.status] || 'bg-gray-100 text-gray-800'}`}>
          {r.status}
        </span>
      )
    },
    { key: 'created_at', header: 'Date', accessor: (r) => new Date(r.created_at).toLocaleDateString(), sortable: true }
  ], []);

  const actions: TableAction<Review>[] = useMemo(() => [
    { label: 'View', icon: <Eye className="w-4 h-4" />, iconOnly: true, onClick: (r) => window.open(`/admin/reviews/${r.id}`, '_blank'), variant: 'primary' },
    { label: 'Approve', icon: <CheckCircle className="w-4 h-4" />, iconOnly: true, onClick: (r) => handleStatusChange(r, 'approved'), isHidden: (r) => r.status !== 'pending', variant: 'primary' },
    { label: 'Reject', icon: <XCircle className="w-4 h-4" />, iconOnly: true, onClick: (r) => handleStatusChange(r, 'rejected'), isHidden: (r) => r.status !== 'pending', variant: 'danger' },
    { label: 'Toggle Testimonial', icon: <Star className="w-4 h-4" />, iconOnly: true, onClick: handleTestimonialToggle, variant: 'primary' },
    {
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      iconOnly: true,
      onClick: (r) => {
        setPendingAction({ type: 'delete', reviews: [r] });
        setShowPasswordModal(true);
      },
      variant: 'danger'
    }
  ], [handleStatusChange, handleTestimonialToggle]);

  const bulkActions: BulkAction<Review>[] = useMemo(() => [
    { label: 'Approve Selected', onClick: handleBulkApprove },
    { label: 'Reject Selected', onClick: handleBulkReject },
    { label: 'Delete Selected', onClick: handleBulkDelete }
  ], [handleBulkApprove, handleBulkReject, handleBulkDelete]);

  if (!user) return <div className="flex items-center justify-center min-h-[400px]"><div className="text-gray-500">Loading...</div></div>;
  if (user.role !== 'admin') return <div className="flex items-center justify-center min-h-[400px]"><div className="text-red-600 font-medium">Access Denied</div></div>;

  return (
    <div className="p-6">
      <AdminPageHeader title="Reviews Manager" onImportExport={() => {}} />
      <AdminStatsPanel title="Review Statistics" sections={statsSections} loading={statsLoading} />

      <div className="flex items-center gap-4 mb-4">
        <AdminSearchBar placeholder="Search by comment, #ID..." onSearch={handleSearch} />
        <AdminAdvancedFilterPanel isOpen={filtersOpen} filters={filters} onChange={handleFiltersChange} onClear={handleClearFilters} onToggle={() => setFiltersOpen(p => !p)} activeFilterCount={activeFilterCount} fields={reviewFilterFields} matchMode={matchMode} onMatchModeChange={setMatchMode} />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <AdminPaginationControls title="Reviews" page={pagination.page} pageSize={pagination.pageSize} total={pagination.total} loading={loading} onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))} onPageSizeChange={(s) => setPagination(prev => ({ ...prev, pageSize: s, page: 1 }))} onRefresh={fetchReviews} />
        <AdminTableTemplate<Review> title="" data={reviews} columns={columns} rowKey={(row) => row.id} loading={loading} actions={actions} bulkActions={bulkActions} tableId="admin-reviews" onSort={handleColumnSort} sortState={{ column: sortColumn, direction: sortDirection }} />
      </div>

      <AdminPasswordModal isOpen={showPasswordModal} onClose={() => { setShowPasswordModal(false); setPendingAction(null); }} onVerified={handlePasswordVerified} operationDescription={`delete ${pendingAction?.reviews.length || 0} review(s)`} />
    </div>
  );
}
