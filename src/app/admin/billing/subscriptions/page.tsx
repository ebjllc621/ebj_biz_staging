/**
 * Admin Billing Subscriptions Page
 * /admin/billing/subscriptions - Paginated subscription management table
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: AdminTableTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: NO direct database access (API routes only)
 * - Credentials: 'include' for all fetch requests
 * - Complexity: ADVANCED tier (error boundaries required)
 * - ErrorBoundary: MANDATORY
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 3A
 * @component
 * @returns {JSX.Element} Admin subscriptions management interface
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { AdminTableTemplate, TableColumn } from '@/components/admin/templates/AdminTableTemplate';
import { AdminPageHeader } from '@/components/admin/shared/AdminPageHeader';
import { useAuth } from '@core/hooks/useAuth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorFallback } from '@/components/common/ErrorFallback';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AdminSubscription {
  id: number;
  listing_id: number;
  plan_id: number;
  status: string;
  billing_cycle: string;
  current_period_start: string | null;
  current_period_end: string | null;
  next_billing_date: string | null;
  created_at: string;
  updated_at: string;
  tier: string;
  plan_name: string;
  pricing_monthly: number | string;
  pricing_annual: number | string;
  user_email: string;
  user_name: string | null;
  listing_name: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface Filters {
  status: string;
  tier: string;
  search: string;
}

// ============================================================================
// BADGE HELPERS
// ============================================================================

function TierBadge({ tier }: { tier: string }) {
  const colorMap: Record<string, string> = {
    essentials: 'bg-gray-100 text-gray-800',
    plus: 'bg-blue-100 text-blue-800',
    preferred: 'bg-purple-100 text-purple-800',
    premium: 'bg-orange-100 text-orange-800'
  };
  const color = colorMap[tier] ?? 'bg-gray-100 text-gray-800';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${color}`}>
      {tier}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    cancelled: 'bg-yellow-100 text-yellow-800',
    expired: 'bg-red-100 text-red-800',
    suspended: 'bg-red-100 text-red-800'
  };
  const color = colorMap[status] ?? 'bg-gray-100 text-gray-800';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${color}`}>
      {status}
    </span>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function AdminSubscriptionsContent() {
  const { user, loading: authLoading } = useAuth();

  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1
  });
  const [filters, setFilters] = useState<Filters>({
    status: '',
    tier: '',
    search: ''
  });

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchSubscriptions = useCallback(async (page: number, currentFilters: Filters) => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20'
      });
      if (currentFilters.status) params.set('status', currentFilters.status);
      if (currentFilters.tier) params.set('tier', currentFilters.tier);
      if (currentFilters.search) params.set('search', currentFilters.search);

      const response = await fetch(`/api/admin/billing/subscriptions?${params.toString()}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscriptions');
      }

      const data = await response.json();
      const items = data.data?.subscriptions ?? data.subscriptions ?? [];
      const paginationData = data.data?.pagination ?? data.pagination;

      setSubscriptions(items as AdminSubscription[]);
      if (paginationData) {
        setPagination(paginationData as Pagination);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.role === 'admin') {
      void fetchSubscriptions(pagination.page, filters);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, fetchSubscriptions]);

  const handlePageChange = useCallback((newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    void fetchSubscriptions(newPage, filters);
  }, [fetchSubscriptions, filters]);

  const handleFilterChange = useCallback((key: keyof Filters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
    void fetchSubscriptions(1, newFilters);
  }, [fetchSubscriptions, filters]);

  // ============================================================================
  // TABLE COLUMNS
  // ============================================================================

  const columns: TableColumn<AdminSubscription>[] = [
    {
      key: 'id',
      header: 'ID',
      accessor: (row) => row.id
    },
    {
      key: 'user',
      header: 'User',
      accessor: (row) => (
        <div>
          <p className="font-medium text-sm">{row.user_name ?? row.user_email}</p>
          <p className="text-xs text-gray-500">{row.user_email}</p>
        </div>
      )
    },
    {
      key: 'listing_name',
      header: 'Listing',
      accessor: (row) => row.listing_name
    },
    {
      key: 'tier',
      header: 'Tier',
      accessor: (row) => <TierBadge tier={row.tier} />
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.status} />
    },
    {
      key: 'billing_cycle',
      header: 'Cycle',
      accessor: (row) => (
        <span className="capitalize">{row.billing_cycle}</span>
      )
    },
    {
      key: 'next_billing_date',
      header: 'Next Billing',
      accessor: (row) =>
        row.next_billing_date
          ? new Date(row.next_billing_date).toLocaleDateString()
          : '—'
    },
    {
      key: 'created_at',
      header: 'Created',
      accessor: (row) => new Date(row.created_at).toLocaleDateString()
    }
  ];

  // ============================================================================
  // RENDER
  // ============================================================================

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Access denied. Admin privileges required.</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <AdminPageHeader
        title="Subscriptions"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Status filter */}
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
          <option value="suspended">Suspended</option>
        </select>

        {/* Tier filter */}
        <select
          value={filters.tier}
          onChange={(e) => handleFilterChange('tier', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">All Tiers</option>
          <option value="essentials">Essentials</option>
          <option value="plus">Plus</option>
          <option value="preferred">Preferred</option>
          <option value="premium">Premium</option>
        </select>

        {/* Search */}
        <input
          type="text"
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          placeholder="Search listing or email..."
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 min-w-[200px]"
        />
      </div>

      {/* Table */}
      <AdminTableTemplate<AdminSubscription>
        title="Subscriptions"
        data={subscriptions}
        columns={columns}
        rowKey={(row) => row.id}
        loading={isLoading}
        emptyMessage="No subscriptions found."
        searchable={false}
        pagination={{
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onPageChange: handlePageChange
        }}
      />
    </div>
  );
}

// ============================================================================
// EXPORT WITH ERROR BOUNDARY
// ============================================================================

export default function AdminSubscriptionsPage() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <AdminSubscriptionsContent />
    </ErrorBoundary>
  );
}
