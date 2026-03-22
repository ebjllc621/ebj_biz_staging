/**
 * Admin Featured Listings Manager
 *
 * GOVERNANCE COMPLIANCE:
 * - Authority: docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 * - Template: AdminTableTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: ListingService via existing API routes
 * - Credentials: 'include' for all fetch requests
 * - fetchWithCsrf for all POST/PATCH/DELETE
 * - Complexity: STANDARD tier
 *
 * Manages the is_featured column on listings table.
 * Uses existing /api/admin/listings (GET) and /api/admin/listings/batch-update (POST).
 *
 * @authority Phase 4C Brain Plan - 4.9 FeaturedListingsAdmin
 * @component
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Crown, Eye } from 'lucide-react';
import { AdminTableTemplate, TableColumn, TableAction, BulkAction } from '@/components/admin/templates/AdminTableTemplate';
import {
  AdminPageHeader,
  AdminStatsPanel,
  AdminSearchBar,
  AdminPaginationControls,
  type StatSection,
} from '@/components/admin/shared';
import { useAuth } from '@core/hooks/useAuth';
import { fetchWithCsrf } from '@core/utils/csrf';

// ============================================================================
// Types
// ============================================================================

interface FeaturedListing {
  id: number;
  name: string;
  slug: string | null;
  user_email: string;
  tier: 'essentials' | 'plus' | 'preferred' | 'premium';
  status: string;
  is_featured: boolean;
  last_update: string;
}

interface FeaturedStats {
  total: number;
  featured: number;
  by_tier: {
    essentials: number;
    plus: number;
    preferred: number;
    premium: number;
  };
}

// ============================================================================
// Status badge helper
// ============================================================================

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  suspended: 'bg-red-100 text-red-800',
  draft: 'bg-blue-100 text-blue-800',
  paused: 'bg-orange-100 text-orange-800',
};

const TIER_COLORS: Record<string, string> = {
  essentials: 'bg-gray-100 text-gray-700',
  plus: 'bg-blue-100 text-blue-700',
  preferred: 'bg-purple-100 text-purple-700',
  premium: 'bg-amber-100 text-amber-700',
};

// ============================================================================
// Component
// ============================================================================

export default function AdminFeaturedListingsPage() {
  const { user } = useAuth();

  const [listings, setListings] = useState<FeaturedListing[]>([]);
  const [stats, setStats] = useState<FeaturedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [sortColumn, setSortColumn] = useState<string>('last_update');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  // ============================================================================
  // Data fetching
  // ============================================================================

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        pageSize: String(pagination.pageSize),
        sortColumn,
        sortDirection,
        search: searchQuery,
      });

      const res = await fetch(`/api/admin/listings?${params}`, { credentials: 'include' });
      const result = await res.json();

      if (result.success) {
        setListings(result.data?.listings ?? []);
        setPagination(prev => ({ ...prev, total: result.data?.pagination?.total ?? 0 }));
      }
    } catch (error) {
      console.error('Failed to fetch listings:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, sortColumn, sortDirection, searchQuery]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/listings/stats', { credentials: 'include' });
      const result = await res.json();
      if (result.success) {
        const data = result.data ?? {};
        setStats({
          total: data.total ?? 0,
          featured: data.featured ?? 0,
          by_tier: data.by_tier ?? { essentials: 0, plus: 0, preferred: 0, premium: 0 },
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchListings();
      fetchStats();
    }
  }, [user, fetchListings, fetchStats]);

  // ============================================================================
  // Featured toggle
  // ============================================================================

  const handleFeatureToggle = useCallback(async (listing: FeaturedListing) => {
    setTogglingId(listing.id);
    try {
      await fetchWithCsrf('/api/admin/listings/batch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [listing.id], updates: { is_featured: !listing.is_featured } }),
      });
      // Optimistic update
      setListings(prev =>
        prev.map(l => l.id === listing.id ? { ...l, is_featured: !l.is_featured } : l)
      );
      fetchStats();
    } catch (error) {
      console.error('Failed to toggle featured status:', error);
    } finally {
      setTogglingId(null);
    }
  }, [fetchStats]);

  // ============================================================================
  // Bulk actions
  // ============================================================================

  const handleBulkFeature = useCallback(async (selected: FeaturedListing[]) => {
    try {
      await fetchWithCsrf('/api/admin/listings/batch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selected.map(l => l.id), updates: { is_featured: true } }),
      });
      fetchListings();
      fetchStats();
    } catch (error) {
      console.error('Failed to bulk feature:', error);
    }
  }, [fetchListings, fetchStats]);

  const handleBulkUnfeature = useCallback(async (selected: FeaturedListing[]) => {
    try {
      await fetchWithCsrf('/api/admin/listings/batch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selected.map(l => l.id), updates: { is_featured: false } }),
      });
      fetchListings();
      fetchStats();
    } catch (error) {
      console.error('Failed to bulk unfeature:', error);
    }
  }, [fetchListings, fetchStats]);

  // ============================================================================
  // Sort handler
  // ============================================================================

  const handleColumnSort = useCallback((columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [sortColumn]);

  // ============================================================================
  // Stats sections
  // ============================================================================

  const statsSections: StatSection[] = useMemo(() => {
    if (!stats) return [];
    return [
      {
        title: 'Totals',
        items: [
          { label: 'Total Listings', value: stats.total, bold: true },
          { label: 'Featured', value: stats.featured },
          { label: 'Not Featured', value: stats.total - stats.featured },
        ],
      },
      {
        title: 'Featured by Tier',
        items: [
          { label: 'Essentials', value: stats.by_tier.essentials },
          { label: 'Plus', value: stats.by_tier.plus },
          { label: 'Preferred', value: stats.by_tier.preferred },
          { label: 'Premium', value: stats.by_tier.premium },
        ],
      },
    ];
  }, [stats]);

  // ============================================================================
  // Table columns
  // ============================================================================

  const columns: TableColumn<FeaturedListing>[] = useMemo(() => [
    {
      key: 'id',
      header: 'ID',
      accessor: (row) => row.id,
      sortable: true,
    },
    {
      key: 'name',
      header: 'Name',
      accessor: (row) => (
        <a
          href={`/listings/${row.slug ?? row.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-600 hover:text-orange-800 font-medium hover:underline"
        >
          {row.name}
        </a>
      ),
      sortable: true,
    },
    {
      key: 'user_email',
      header: 'Owner',
      accessor: (row) => <span className="text-sm text-gray-600">{row.user_email}</span>,
    },
    {
      key: 'tier',
      header: 'Tier',
      accessor: (row) => (
        <span className={`px-2 py-0.5 text-xs rounded-full font-medium capitalize ${TIER_COLORS[row.tier] ?? 'bg-gray-100 text-gray-700'}`}>
          {row.tier}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => (
        <span className={`px-2 py-0.5 text-xs rounded-full font-medium capitalize ${STATUS_COLORS[row.status] ?? 'bg-gray-100 text-gray-700'}`}>
          {row.status}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'is_featured',
      header: 'Featured',
      accessor: (row) => (
        <button
          type="button"
          onClick={() => handleFeatureToggle(row)}
          disabled={togglingId === row.id}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 disabled:opacity-50 ${
            row.is_featured ? 'bg-green-500' : 'bg-gray-300'
          }`}
          aria-label={row.is_featured ? 'Remove from featured' : 'Add to featured'}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              row.is_featured ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      ),
    },
    {
      key: 'last_update',
      header: 'Last Updated',
      accessor: (row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.last_update).toLocaleDateString()}
        </span>
      ),
      sortable: true,
    },
  ], [handleFeatureToggle, togglingId]);

  // ============================================================================
  // Table actions
  // ============================================================================

  const actions: TableAction<FeaturedListing>[] = useMemo(() => [
    {
      label: 'View',
      icon: <Eye className="w-4 h-4" />,
      iconOnly: true,
      onClick: (row) => window.open(`/listings/${row.slug ?? row.id}`, '_blank'),
      variant: 'primary',
    },
    {
      label: 'Feature',
      icon: <Crown className="w-4 h-4" />,
      iconOnly: true,
      onClick: handleFeatureToggle,
      variant: 'primary',
    },
  ], [handleFeatureToggle]);

  // ============================================================================
  // Bulk actions
  // ============================================================================

  const bulkActions: BulkAction<FeaturedListing>[] = useMemo(() => [
    { label: 'Feature Selected', onClick: handleBulkFeature },
    { label: 'Unfeature Selected', onClick: handleBulkUnfeature },
  ], [handleBulkFeature, handleBulkUnfeature]);

  // ============================================================================
  // Guard
  // ============================================================================

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }
  if (user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600 font-medium">Access Denied</div>
      </div>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="p-6">
      <AdminPageHeader
        title="Featured Listings"
        onImportExport={() => {}}
      />

      <AdminStatsPanel
        title="Featured Listings Statistics"
        sections={statsSections}
        loading={statsLoading}
      />

      <div className="flex items-center gap-4 mb-4">
        <AdminSearchBar
          placeholder="Search by listing name or #ID..."
          onSearch={(query) => {
            setSearchQuery(query);
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <AdminPaginationControls
          title="Listings"
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          loading={loading}
          onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
          onPageSizeChange={(s) => setPagination(prev => ({ ...prev, pageSize: s, page: 1 }))}
          onRefresh={fetchListings}
        />
        <AdminTableTemplate<FeaturedListing>
          title=""
          data={listings}
          columns={columns}
          rowKey={(row) => row.id}
          loading={loading}
          actions={actions}
          bulkActions={bulkActions}
          tableId="admin-featured-listings"
          onSort={handleColumnSort}
          sortState={{ column: sortColumn, direction: sortDirection }}
        />
      </div>
    </div>
  );
}
