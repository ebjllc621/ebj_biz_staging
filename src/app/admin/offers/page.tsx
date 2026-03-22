/**
 * Admin Offer Manager Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Authority: docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 * - Template: AdminTableTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: OfferService via API routes
 * - Credentials: 'include' for all fetch requests
 * - Complexity: STANDARD tier
 *
 * Canonical Features:
 * - Page header with "+ New" and "Import/Export" buttons
 * - Statistics panel with offer metrics
 * - Search bar with mode detection
 * - Advanced filters panel
 * - Pagination controls in table header
 * - Icon-only action buttons with canonical colors
 * - Server-side sorting
 *
 * @authority docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 * @component
 * @returns {JSX.Element} Admin offers manager
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Eye, Edit2, Star, PauseCircle, CheckCircle, Trash2 } from 'lucide-react';
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
import { OfferFormModal } from '@features/dashboard/components/managers/offers/OfferFormModal';
import { fetchWithCsrf } from '@core/utils/csrf';

interface Offer {
  id: number;
  title: string;
  slug?: string;
  offer_type: string;
  start_date: string;
  end_date: string;
  status: string;
  is_featured: boolean;
  quantity_remaining: number | null;
  listing_id: number;
  listing_name?: string;
}

interface OfferStats {
  total: number;
  active: number;
  draft: number;
  paused: number;
  expired: number;
  featured: number;
  byType: Record<string, number>;
}

interface OfferFilters {
  [key: string]: string;
  id: string;
  title: string;
  status: string;
  offer_type: string;
  is_featured: string;
}

const defaultFilters: OfferFilters = {
  id: '',
  title: '',
  status: '',
  offer_type: '',
  is_featured: ''
};

const offerFilterFields: FilterField[] = [
  { key: 'id', label: 'Offer ID', type: 'number', placeholder: 'e.g., 123' },
  { key: 'title', label: 'Title', type: 'text', placeholder: 'e.g., Summer Sale' },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'draft', label: 'Draft' },
      { value: 'paused', label: 'Paused' },
      { value: 'expired', label: 'Expired' },
      { value: 'sold_out', label: 'Sold Out' }
    ]
  },
  {
    key: 'offer_type',
    label: 'Offer Type',
    type: 'select',
    options: [
      { value: 'discount', label: 'Discount' },
      { value: 'deal', label: 'Deal' },
      { value: 'promotion', label: 'Promotion' },
      { value: 'coupon', label: 'Coupon' }
    ]
  },
  {
    key: 'is_featured',
    label: 'Featured',
    type: 'select',
    options: [
      { value: 'true', label: 'Featured Only' },
      { value: 'false', label: 'Not Featured' }
    ]
  }
];

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  draft: 'bg-gray-100 text-gray-800',
  paused: 'bg-yellow-100 text-yellow-800',
  expired: 'bg-red-100 text-red-800',
  sold_out: 'bg-purple-100 text-purple-800'
};

export default function AdminOffersPage() {
  const { user } = useAuth();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [stats, setStats] = useState<OfferStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortColumn, setSortColumn] = useState<string>('start_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('all');
  const [filters, setFilters] = useState<OfferFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [matchMode, setMatchMode] = useState<MatchMode>('all');

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: string; offers: Offer[] } | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [editOfferFullData, setEditOfferFullData] = useState<Record<string, unknown> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOffers = useCallback(async () => {
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

      const response = await fetch(`/api/admin/offers?${params}`, { credentials: 'include' });
      const result = await response.json();

      if (result.success) {
        setOffers(result.data?.offers || []);
        setPagination(prev => ({ ...prev, total: result.data?.pagination?.total || 0 }));
      }
    } catch (error) {
      console.error('Failed to fetch offers:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, sortColumn, sortDirection, searchQuery, searchMode, filters, matchMode]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await fetch('/api/admin/offers/stats', { credentials: 'include' });
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
      fetchOffers();
      fetchStats();
    }
  }, [user, fetchOffers, fetchStats]);

  const handleSearch = useCallback((query: string, mode: SearchMode) => {
    setSearchQuery(query);
    setSearchMode(mode);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleFiltersChange = useCallback((newFilters: OfferFilters) => {
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

  const handleFeatureToggle = useCallback(async (offer: Offer) => {
    try {
      await fetch(`/api/admin/offers/${offer.id}/feature`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_featured: !offer.is_featured })
      });
      fetchOffers();
      fetchStats();
    } catch (error) {
      console.error('Failed to toggle feature:', error);
    }
  }, [fetchOffers, fetchStats]);

  const handleStatusChange = useCallback(async (offer: Offer, newStatus: string) => {
    try {
      await fetch(`/api/admin/offers/${offer.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });
      fetchOffers();
      fetchStats();
    } catch (error) {
      console.error('Failed to change status:', error);
    }
  }, [fetchOffers, fetchStats]);

  const handleBulkDelete = useCallback((selectedOffers: Offer[]) => {
    setPendingAction({ type: 'delete', offers: selectedOffers });
    setShowPasswordModal(true);
  }, []);

  const handlePasswordVerified = useCallback(async () => {
    if (!pendingAction) return;
    setShowPasswordModal(false);

    try {
      const ids = pendingAction.offers.map(o => o.id);
      await fetch('/api/admin/offers/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'delete', offerIds: ids })
      });
      fetchOffers();
      fetchStats();
    } catch (error) {
      console.error('Failed to delete offers:', error);
    }
    setPendingAction(null);
  }, [pendingAction, fetchOffers, fetchStats]);

  const handleEditClick = useCallback(async (offer: Offer) => {
    try {
      // Fetch full offer data — use listingId filter then find by id
      // because /api/offers/[id] has no GET endpoint
      const response = await fetch(`/api/offers?listingId=${offer.listing_id}&limit=100`, {
        credentials: 'include'
      });
      const result = await response.json();
      if (!result.success) {
        console.error('Failed to fetch offer data for edit');
        return;
      }
      // result.data is PaginatedResult: { data: Offer[], pagination: {...} }
      const offersList: Record<string, unknown>[] = result.data?.data || [];
      const fullOffer = offersList.find((o) => (o as { id: number }).id === offer.id);
      if (!fullOffer) {
        console.error('Offer not found in listing offers');
        return;
      }
      const initialData: Record<string, unknown> = {
        title: fullOffer.title || '',
        description: (fullOffer.description as string) || '',
        offer_type: fullOffer.offer_type || '',
        original_price: fullOffer.original_price != null ? String(fullOffer.original_price) : '',
        discounted_price: fullOffer.sale_price != null ? String(fullOffer.sale_price) : '',
        discount_percentage: fullOffer.discount_percentage != null ? String(fullOffer.discount_percentage) : '',
        quantity_total: fullOffer.quantity_total != null ? String(fullOffer.quantity_total) : '',
        start_date: fullOffer.start_date ? new Date(fullOffer.start_date as string).toISOString().split('T')[0] : '',
        end_date: fullOffer.end_date ? new Date(fullOffer.end_date as string).toISOString().split('T')[0] : '',
        terms_conditions: (fullOffer.terms_conditions as string) || '',
        redemption_instructions: (fullOffer.redemption_instructions as string) || '',
        status: (fullOffer.status as string) === 'sold_out' ? 'active' : ((fullOffer.status as string) || 'active'),
        is_featured: Boolean(fullOffer.is_featured)
      };
      setEditingOffer(offer);
      setEditOfferFullData(initialData);
    } catch (err) {
      console.error('Failed to fetch offer for edit:', err);
    }
  }, []);

  const handleCreate = useCallback(async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    // Discard pending media in admin context
    const apiData = { ...data };
    delete apiData._pendingMedia;
    try {
      const response = await fetchWithCsrf('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData)
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to create offer');
      }
      await fetchOffers();
      fetchStats();
      setShowCreateModal(false);
    } catch (err) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchOffers, fetchStats]);

  const handleUpdate = useCallback(async (data: Record<string, unknown>) => {
    if (!editingOffer) return;
    setIsSubmitting(true);
    try {
      const response = await fetchWithCsrf(`/api/offers/${editingOffer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to update offer');
      }
      await fetchOffers();
      fetchStats();
      setEditingOffer(null);
      setEditOfferFullData(null);
    } catch (err) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [editingOffer, fetchOffers, fetchStats]);

  const statsSections: StatSection[] = useMemo(() => {
    if (!stats) return [];
    return [
      {
        title: 'Totals',
        items: [
          { label: 'Total Offers', value: stats.total, bold: true },
          { label: 'Active', value: stats.active },
          { label: 'Featured', value: stats.featured }
        ]
      },
      {
        title: 'By Status',
        items: [
          { label: 'Active', value: stats.active },
          { label: 'Paused', value: stats.paused },
          { label: 'Expired', value: stats.expired }
        ]
      },
      {
        title: 'By Type',
        items: Object.entries(stats.byType || {}).slice(0, 3).map(([k, v]) => ({ label: k, value: v }))
      }
    ];
  }, [stats]);

  const columns: TableColumn<Offer>[] = useMemo(() => [
    { key: 'id', header: 'ID', accessor: (row) => row.id, sortable: true },
    { key: 'title', header: 'Title', accessor: (row) => row.title, sortable: true },
    { key: 'offer_type', header: 'Type', accessor: (row) => row.offer_type, sortable: true },
    { key: 'start_date', header: 'Start', accessor: (o) => new Date(o.start_date).toLocaleDateString(), sortable: true },
    { key: 'end_date', header: 'End', accessor: (o) => new Date(o.end_date).toLocaleDateString() },
    {
      key: 'status',
      header: 'Status',
      accessor: (o) => (
        <span className={`px-2 py-1 rounded text-xs ${statusColors[o.status] || 'bg-gray-100 text-gray-800'}`}>
          {o.status}
        </span>
      )
    },
    { key: 'quantity_remaining', header: 'Qty Left', accessor: (o) => o.quantity_remaining !== null ? o.quantity_remaining : 'Unlimited' },
    {
      key: 'is_featured',
      header: 'Featured',
      accessor: (o) => o.is_featured ? <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> : <span className="text-gray-400">-</span>
    }
  ], []);

  const actions: TableAction<Offer>[] = useMemo(() => [
    { label: 'View', icon: <Eye className="w-4 h-4" />, iconOnly: true, onClick: (o) => window.open(`/offers/${o.slug || o.id}`, '_blank'), variant: 'primary' },
    { label: 'Edit', icon: <Edit2 className="w-4 h-4" />, iconOnly: true, onClick: (o) => handleEditClick(o), variant: 'primary' },
    { label: 'Feature', icon: <Star className="w-4 h-4" />, iconOnly: true, onClick: handleFeatureToggle, variant: 'primary' },
    { label: 'Activate', icon: <CheckCircle className="w-4 h-4" />, iconOnly: true, onClick: (o) => handleStatusChange(o, 'active'), isHidden: (o) => o.status === 'active', variant: 'primary' },
    { label: 'Pause', icon: <PauseCircle className="w-4 h-4" />, iconOnly: true, onClick: (o) => handleStatusChange(o, 'paused'), isHidden: (o) => o.status === 'paused', variant: 'warning' },
    {
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      iconOnly: true,
      onClick: (o) => {
        setPendingAction({ type: 'delete', offers: [o] });
        setShowPasswordModal(true);
      },
      variant: 'danger'
    }
  ], [handleFeatureToggle, handleStatusChange, handleEditClick]);

  const bulkActions: BulkAction<Offer>[] = useMemo(() => [
    { label: 'Delete Selected', onClick: handleBulkDelete }
  ], [handleBulkDelete]);

  if (!user) return <div className="flex items-center justify-center min-h-[400px]"><div className="text-gray-500">Loading...</div></div>;
  if (user.role !== 'admin') return <div className="flex items-center justify-center min-h-[400px]"><div className="text-red-600 font-medium">Access Denied</div></div>;

  return (
    <div className="p-6">
      <AdminPageHeader title="Offers Manager" onCreateNew={() => setShowCreateModal(true)} onImportExport={() => {}} />
      <AdminStatsPanel title="Offer Statistics" sections={statsSections} loading={statsLoading} />

      <div className="flex items-center gap-4 mb-4">
        <AdminSearchBar placeholder="Search by title, #ID..." onSearch={handleSearch} />
        <AdminAdvancedFilterPanel isOpen={filtersOpen} filters={filters} onChange={handleFiltersChange} onClear={handleClearFilters} onToggle={() => setFiltersOpen(p => !p)} activeFilterCount={activeFilterCount} fields={offerFilterFields} matchMode={matchMode} onMatchModeChange={setMatchMode} />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <AdminPaginationControls title="Offers" page={pagination.page} pageSize={pagination.pageSize} total={pagination.total} loading={loading} onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))} onPageSizeChange={(s) => setPagination(prev => ({ ...prev, pageSize: s, page: 1 }))} onRefresh={fetchOffers} />
        <AdminTableTemplate<Offer> title="" data={offers} columns={columns} rowKey={(row) => row.id} loading={loading} actions={actions} bulkActions={bulkActions} tableId="admin-offers" onSort={handleColumnSort} sortState={{ column: sortColumn, direction: sortDirection }} />
      </div>

      {/* Create Offer Modal */}
      <OfferFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
        listingCoordinates={null}
        canUseGeoFence={false}
        listingTier="premium"
      />

      {/* Edit Offer Modal */}
      {editingOffer && editOfferFullData && (
        <OfferFormModal
          isOpen={true}
          onClose={() => { setEditingOffer(null); setEditOfferFullData(null); }}
          onSubmit={handleUpdate}
          isSubmitting={isSubmitting}
          listingCoordinates={null}
          canUseGeoFence={true}
          offerId={editingOffer.id}
          listingTier="premium"
          initialData={editOfferFullData}
        />
      )}

      <AdminPasswordModal isOpen={showPasswordModal} onClose={() => { setShowPasswordModal(false); setPendingAction(null); }} onVerified={handlePasswordVerified} operationDescription={`delete ${pendingAction?.offers.length || 0} offer(s)`} />
    </div>
  );
}
