/**
 * Admin Billing Refunds Page
 * /admin/billing/refunds - Paginated refund request management table
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: AdminTableTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: NO direct database access (API routes only)
 * - Credentials: 'include' for all fetch requests
 * - Complexity: ADVANCED tier (error boundaries required)
 * - ErrorBoundary: MANDATORY
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 4B
 * @component
 * @returns {JSX.Element} Admin refund request management interface
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { AdminTableTemplate, TableColumn } from '@/components/admin/templates/AdminTableTemplate';
import { AdminPageHeader } from '@/components/admin/shared/AdminPageHeader';
import { useAuth } from '@core/hooks/useAuth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorFallback } from '@/components/common/ErrorFallback';
import { Eye, Check, X, Play } from 'lucide-react';
import { fetchWithCsrf } from '@core/utils/csrf';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AdminRefund {
  id: number;
  user_id: number;
  entity_type: string;
  entity_id: number;
  requested_amount: string | number;
  approved_amount: string | number | null;
  status: string;
  reason_category: string;
  reason_details: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  user_email: string;
  user_name: string | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface Filters {
  status: string;
  search: string;
}

// ============================================================================
// BADGE HELPERS
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    submitted: 'bg-yellow-100 text-yellow-800',
    under_review: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    denied: 'bg-red-100 text-red-800',
    processing: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-800 text-white',
    failed: 'bg-red-100 text-red-800'
  };
  const color = colorMap[status] ?? 'bg-gray-100 text-gray-800';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${color}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function AdminRefundsContent() {
  const { user, loading: authLoading } = useAuth();

  const [refunds, setRefunds] = useState<AdminRefund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1
  });
  const [filters, setFilters] = useState<Filters>({
    status: '',
    search: ''
  });

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchRefunds = useCallback(async (page: number, currentFilters: Filters) => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20'
      });
      if (currentFilters.status) params.set('status', currentFilters.status);
      if (currentFilters.search) params.set('search', currentFilters.search);

      const response = await fetch(`/api/admin/billing/refunds?${params.toString()}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch refunds');
      }

      const data = await response.json() as {
        data?: { refunds?: AdminRefund[]; pagination?: Pagination };
        refunds?: AdminRefund[];
        pagination?: Pagination;
      };
      const items = data.data?.refunds ?? data.refunds ?? [];
      const paginationData = data.data?.pagination ?? data.pagination;

      setRefunds(items as AdminRefund[]);
      if (paginationData) {
        setPagination(paginationData as Pagination);
      }
    } catch (error) {
      console.error('Error fetching refunds:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.role === 'admin') {
      void fetchRefunds(pagination.page, filters);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, fetchRefunds]);

  const handlePageChange = useCallback((newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    void fetchRefunds(newPage, filters);
  }, [fetchRefunds, filters]);

  const handleFilterChange = useCallback((key: keyof Filters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
    void fetchRefunds(1, newFilters);
  }, [fetchRefunds, filters]);

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================

  const handleAction = useCallback(async (id: number, action: string, reason?: string) => {
    try {
      const body: Record<string, unknown> = { action };
      if (reason) body.reason = reason;

      const response = await fetchWithCsrf(`/api/admin/billing/refunds/${id}/action`, {
        method: 'POST',
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Action failed: ${action}`);
      }

      // Refresh the list after action
      void fetchRefunds(pagination.page, filters);
    } catch (error) {
      console.error('Error performing refund action:', error);
    }
  }, [fetchRefunds, pagination.page, filters]);

  const handleApprove = useCallback((id: number) => {
    void handleAction(id, 'approve');
  }, [handleAction]);

  const handleDeny = useCallback((id: number) => {
    const reason = window.prompt('Reason for denial:');
    if (reason) {
      void handleAction(id, 'deny', reason);
    }
  }, [handleAction]);

  const handleProcess = useCallback((id: number) => {
    void handleAction(id, 'process');
  }, [handleAction]);

  // ============================================================================
  // TABLE COLUMNS
  // ============================================================================

  const columns: TableColumn<AdminRefund>[] = [
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
      key: 'entity_type',
      header: 'Entity Type',
      accessor: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 capitalize">
          {row.entity_type.replace(/_/g, ' ')}
        </span>
      )
    },
    {
      key: 'requested_amount',
      header: 'Requested Amount',
      accessor: (row) => `$${parseFloat(String(row.requested_amount || row.approved_amount || 0)).toFixed(2)}`
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.status} />
    },
    {
      key: 'reason_category',
      header: 'Reason',
      accessor: (row) => (
        <span className="text-sm text-gray-700 capitalize">
          {row.reason_category.replace(/_/g, ' ')}
        </span>
      )
    },
    {
      key: 'created_at',
      header: 'Created',
      accessor: (row) => new Date(row.created_at).toLocaleDateString()
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (row) => (
        <div className="flex items-center gap-1">
          {/* View - always available */}
          <button
            onClick={() => window.location.href = `/admin/billing/refunds/${row.id}`}
            className="p-1 text-gray-500 hover:text-gray-700 rounded transition-colors"
            title="View refund details"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Approve - available for submitted and under_review */}
          {(row.status === 'submitted' || row.status === 'under_review') && (
            <button
              onClick={() => handleApprove(row.id)}
              className="p-1 text-green-600 hover:text-green-800 rounded transition-colors"
              title="Approve refund"
            >
              <Check className="w-4 h-4" />
            </button>
          )}

          {/* Deny - available for submitted and under_review */}
          {(row.status === 'submitted' || row.status === 'under_review') && (
            <button
              onClick={() => handleDeny(row.id)}
              className="p-1 text-red-600 hover:text-red-800 rounded transition-colors"
              title="Deny refund"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Process - available for approved */}
          {row.status === 'approved' && (
            <button
              onClick={() => handleProcess(row.id)}
              className="p-1 text-blue-600 hover:text-blue-800 rounded transition-colors"
              title="Process refund"
            >
              <Play className="w-4 h-4" />
            </button>
          )}
        </div>
      )
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
        title="Refund Requests"
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
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="denied">Denied</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>

        {/* Search */}
        <input
          type="text"
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          placeholder="Search by email, name, or reason..."
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 min-w-[240px]"
        />
      </div>

      {/* Table */}
      <AdminTableTemplate<AdminRefund>
        title="Refund Requests"
        data={refunds}
        columns={columns}
        rowKey={(row) => row.id}
        loading={isLoading}
        emptyMessage="No refund requests found."
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

export default function AdminRefundsPage() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <AdminRefundsContent />
    </ErrorBoundary>
  );
}
