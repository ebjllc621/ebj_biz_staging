/**
 * Admin Discount Management Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Authority: docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 * - Template: AdminTableTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: DiscountService via API routes
 * - Credentials: 'include' for all fetch requests
 * - Complexity: STANDARD tier
 *
 * Canonical Features:
 * - Page header with "+ New" and "Import/Export" buttons
 * - Statistics panel with discount metrics
 * - Search bar with mode detection
 * - Advanced filters panel
 * - Pagination controls in table header
 * - Icon-only action buttons with canonical colors
 * - Server-side sorting
 *
 * @authority docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 * @component
 * @returns {JSX.Element} Admin discount manager
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Eye, Edit2, CheckCircle, XCircle, Trash2 } from 'lucide-react';
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

interface DiscountCode {
  id: number;
  code: string;
  discount_type: string;
  discount_value: number;
  applies_to: string;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  valid_until: string | null;
  created_at: string;
}

interface DiscountStats {
  total: number;
  active: number;
  inactive: number;
  expired: number;
  totalRedemptions: number;
  byType: Record<string, number>;
}

interface DiscountFilters {
  [key: string]: string;
  code: string;
  discount_type: string;
  applies_to: string;
  is_active: string;
}

const defaultFilters: DiscountFilters = {
  code: '',
  discount_type: '',
  applies_to: '',
  is_active: ''
};

const discountFilterFields: FilterField[] = [
  { key: 'code', label: 'Code', type: 'text', placeholder: 'e.g., SAVE20' },
  {
    key: 'discount_type',
    label: 'Discount Type',
    type: 'select',
    options: [
      { value: 'percentage', label: 'Percentage' },
      { value: 'fixed', label: 'Fixed Amount' }
    ]
  },
  {
    key: 'applies_to',
    label: 'Applies To',
    type: 'select',
    options: [
      { value: 'all', label: 'All Tiers' },
      { value: 'essentials', label: 'Essentials' },
      { value: 'plus', label: 'Plus' },
      { value: 'preferred', label: 'Preferred' },
      { value: 'premium', label: 'Premium' }
    ]
  },
  {
    key: 'is_active',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'true', label: 'Active' },
      { value: 'false', label: 'Inactive' }
    ]
  }
];

export default function AdminDiscountsPage() {
  const { user } = useAuth();

  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [stats, setStats] = useState<DiscountStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('all');
  const [filters, setFilters] = useState<DiscountFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [matchMode, setMatchMode] = useState<MatchMode>('all');

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: string; discounts: DiscountCode[] } | null>(null);

  const fetchDiscounts = useCallback(async () => {
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

      const response = await fetch(`/api/admin/discounts?${params}`, { credentials: 'include' });
      const result = await response.json();

      if (result.success) {
        setDiscounts(result.data?.discounts || result.discounts || []);
        setPagination(prev => ({ ...prev, total: result.data?.pagination?.total || result.pagination?.total || 0 }));
      }
    } catch (error) {
      console.error('Failed to fetch discounts:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, sortColumn, sortDirection, searchQuery, searchMode, filters, matchMode]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await fetch('/api/admin/discounts/stats', { credentials: 'include' });
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
      fetchDiscounts();
      fetchStats();
    }
  }, [user, fetchDiscounts, fetchStats]);

  const handleSearch = useCallback((query: string, mode: SearchMode) => {
    setSearchQuery(query);
    setSearchMode(mode);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleFiltersChange = useCallback((newFilters: DiscountFilters) => {
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

  const handleToggleActive = useCallback(async (discount: DiscountCode) => {
    try {
      await fetch(`/api/admin/discounts/${discount.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: !discount.is_active })
      });
      fetchDiscounts();
      fetchStats();
    } catch (error) {
      console.error('Failed to toggle active:', error);
    }
  }, [fetchDiscounts, fetchStats]);

  const handleBulkDelete = useCallback((selectedDiscounts: DiscountCode[]) => {
    setPendingAction({ type: 'delete', discounts: selectedDiscounts });
    setShowPasswordModal(true);
  }, []);

  const handlePasswordVerified = useCallback(async () => {
    if (!pendingAction) return;
    setShowPasswordModal(false);

    try {
      const ids = pendingAction.discounts.map(d => d.id);
      await fetch('/api/admin/discounts/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'delete', discountIds: ids })
      });
      fetchDiscounts();
      fetchStats();
    } catch (error) {
      console.error('Failed to delete discounts:', error);
    }
    setPendingAction(null);
  }, [pendingAction, fetchDiscounts, fetchStats]);

  const statsSections: StatSection[] = useMemo(() => {
    if (!stats) return [];
    return [
      {
        title: 'Totals',
        items: [
          { label: 'Total Codes', value: stats.total, bold: true },
          { label: 'Active', value: stats.active },
          { label: 'Redemptions', value: stats.totalRedemptions }
        ]
      },
      {
        title: 'By Status',
        items: [
          { label: 'Active', value: stats.active },
          { label: 'Inactive', value: stats.inactive },
          { label: 'Expired', value: stats.expired }
        ]
      },
      {
        title: 'By Type',
        items: Object.entries(stats.byType || {}).map(([k, v]) => ({ label: k, value: v }))
      }
    ];
  }, [stats]);

  const columns: TableColumn<DiscountCode>[] = useMemo(() => [
    { key: 'code', header: 'Code', accessor: (row) => <span className="font-mono font-medium">{row.code}</span>, sortable: true },
    {
      key: 'discount_type',
      header: 'Discount',
      accessor: (d) => d.discount_type === 'percentage' ? `${d.discount_value}%` : `$${d.discount_value}`
    },
    { key: 'applies_to', header: 'Tier', accessor: (row) => row.applies_to, sortable: true },
    { key: 'current_uses', header: 'Uses', accessor: (d) => `${d.current_uses}${d.max_uses ? `/${d.max_uses}` : ''}` },
    {
      key: 'is_active',
      header: 'Status',
      accessor: (d) => (
        <span className={`px-2 py-1 rounded text-xs ${d.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {d.is_active ? 'Active' : 'Inactive'}
        </span>
      )
    },
    { key: 'valid_until', header: 'Expires', accessor: (d) => d.valid_until ? new Date(d.valid_until).toLocaleDateString() : 'Never' }
  ], []);

  const actions: TableAction<DiscountCode>[] = useMemo(() => [
    { label: 'View Stats', icon: <Eye className="w-4 h-4" />, iconOnly: true, onClick: (d) => window.open(`/admin/discounts/${d.id}`, '_blank'), variant: 'primary' },
    { label: 'Edit', icon: <Edit2 className="w-4 h-4" />, iconOnly: true, onClick: (d) => window.open(`/admin/discounts/${d.id}/edit`, '_blank'), variant: 'primary' },
    { label: 'Activate', icon: <CheckCircle className="w-4 h-4" />, iconOnly: true, onClick: handleToggleActive, isHidden: (d) => d.is_active, variant: 'primary' },
    { label: 'Deactivate', icon: <XCircle className="w-4 h-4" />, iconOnly: true, onClick: handleToggleActive, isHidden: (d) => !d.is_active, variant: 'warning' },
    {
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      iconOnly: true,
      onClick: (d) => {
        setPendingAction({ type: 'delete', discounts: [d] });
        setShowPasswordModal(true);
      },
      variant: 'danger'
    }
  ], [handleToggleActive]);

  const bulkActions: BulkAction<DiscountCode>[] = useMemo(() => [
    { label: 'Delete Selected', onClick: handleBulkDelete }
  ], [handleBulkDelete]);

  if (!user) return <div className="flex items-center justify-center min-h-[400px]"><div className="text-gray-500">Loading...</div></div>;
  if (user.role !== 'admin') return <div className="flex items-center justify-center min-h-[400px]"><div className="text-red-600 font-medium">Access Denied</div></div>;

  return (
    <div className="p-6">
      <AdminPageHeader title="Discounts Manager" onCreateNew={() => window.open('/admin/discounts/new', '_blank')} onImportExport={() => {}} />
      <AdminStatsPanel title="Discount Statistics" sections={statsSections} loading={statsLoading} />

      <div className="flex items-center gap-4 mb-4">
        <AdminSearchBar placeholder="Search by code..." onSearch={handleSearch} />
        <AdminAdvancedFilterPanel isOpen={filtersOpen} filters={filters} onChange={handleFiltersChange} onClear={handleClearFilters} onToggle={() => setFiltersOpen(p => !p)} activeFilterCount={activeFilterCount} fields={discountFilterFields} matchMode={matchMode} onMatchModeChange={setMatchMode} />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <AdminPaginationControls title="Discount Codes" page={pagination.page} pageSize={pagination.pageSize} total={pagination.total} loading={loading} onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))} onPageSizeChange={(s) => setPagination(prev => ({ ...prev, pageSize: s, page: 1 }))} onRefresh={fetchDiscounts} />
        <AdminTableTemplate<DiscountCode> title="" data={discounts} columns={columns} rowKey={(row) => row.id} loading={loading} actions={actions} bulkActions={bulkActions} tableId="admin-discounts" onSort={handleColumnSort} sortState={{ column: sortColumn, direction: sortDirection }} />
      </div>

      <AdminPasswordModal isOpen={showPasswordModal} onClose={() => { setShowPasswordModal(false); setPendingAction(null); }} onVerified={handlePasswordVerified} operationDescription={`delete ${pendingAction?.discounts.length || 0} discount code(s)`} />
    </div>
  );
}
