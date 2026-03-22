/**
 * AdminDisputesClient - Admin interface for managing offer disputes
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 6 - Dispute Resolution
 * @governance Build Map v2.1 ENHANCED
 *
 * GOVERNANCE COMPLIANCE:
 * - 'use client' directive: MANDATORY
 * - ErrorBoundary: MANDATORY (STANDARD tier)
 * - AdminTableTemplate: MANDATORY (admin pages)
 * - fetchWithCsrf: MANDATORY for all mutations
 * - credentials: 'include' for all fetch requests
 * - Admin-only gate enforced
 */
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@core/hooks/useAuth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AdminTableTemplate, TableColumn, TableAction } from '@/components/admin/templates/AdminTableTemplate';
import {
  AdminPageHeader,
  AdminPaginationControls,
} from '@/components/admin/shared';
import { DisputeResolutionModal } from '@features/offers/components/DisputeResolutionModal';
import type { OfferDispute } from '@features/offers/types';

// ============================================================================
// TYPES
// ============================================================================

interface DisputeRow extends OfferDispute {
  // Extended with any extra fields returned by the API if needed
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-800',
  investigating: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

// ============================================================================
// CLIENT COMPONENT CONTENT
// ============================================================================

function AdminDisputesClientContent() {
  const { user } = useAuth();

  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0 });
  const [statusFilter, setStatusFilter] = useState<string>('');

  const [resolveTarget, setResolveTarget] = useState<DisputeRow | null>(null);

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.pageSize),
      });
      if (statusFilter) {
        params.set('status', statusFilter);
      }

      const response = await fetch(
        `/api/admin/offers/disputes?${params}`,
        { credentials: 'include' }
      );
      const result = await response.json();

      if (result.success) {
        setDisputes(result.data?.items ?? []);
        setPagination(prev => ({ ...prev, total: result.data?.total ?? 0 }));
      }
    } catch (error) {
      console.error('[AdminDisputesClient] Failed to fetch disputes:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, statusFilter]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchDisputes();
    }
  }, [user, fetchDisputes]);

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const columns: TableColumn<DisputeRow>[] = useMemo(() => [
    {
      key: 'id',
      header: 'ID',
      accessor: (row) => row.id,
      sortable: false,
    },
    {
      key: 'claim_id',
      header: 'Claim ID',
      accessor: (row) => row.claim_id,
      sortable: false,
    },
    {
      key: 'user_id',
      header: 'User ID',
      accessor: (row) => row.user_id,
      sortable: false,
    },
    {
      key: 'reason',
      header: 'Reason',
      accessor: (row) => row.reason.replace(/_/g, ' '),
      sortable: false,
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            STATUS_STYLES[row.status] ?? 'bg-gray-100 text-gray-800'
          }`}
        >
          {row.status}
        </span>
      ),
      sortable: false,
    },
    {
      key: 'created_at',
      header: 'Created',
      accessor: (row) => new Date(row.created_at).toLocaleDateString(),
      sortable: false,
    },
  ], []);

  const actions: TableAction<DisputeRow>[] = useMemo(() => [
    {
      label: 'Resolve',
      onClick: (row) => setResolveTarget(row),
      variant: 'primary',
      isHidden: (row) => row.status === 'closed',
    },
  ], []);

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

  return (
    <div className="p-6">
      <AdminPageHeader
        title="Offer Disputes"
        onCreateNew={undefined}
        onImportExport={undefined}
      />

      {/* Status filter */}
      <div className="mb-4 flex items-center gap-3">
        <label
          htmlFor="disputes-status-filter"
          className="text-sm font-medium text-gray-700"
        >
          Filter by status:
        </label>
        <select
          id="disputes-status-filter"
          value={statusFilter}
          onChange={(e) => handleStatusFilterChange(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
        >
          <option value="">All</option>
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <AdminPaginationControls
          title="Disputes"
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          loading={loading}
          onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
          onPageSizeChange={(s) => setPagination(prev => ({ ...prev, pageSize: s, page: 1 }))}
          onRefresh={fetchDisputes}
        />
        <AdminTableTemplate<DisputeRow>
          title=""
          data={disputes}
          columns={columns}
          rowKey={(row) => row.id}
          loading={loading}
          actions={actions}
          tableId="admin-offer-disputes"
        />
      </div>

      {/* Resolution modal */}
      {resolveTarget && (
        <DisputeResolutionModal
          isOpen={true}
          onClose={() => setResolveTarget(null)}
          disputeId={resolveTarget.id}
          offerId={resolveTarget.claim_id}
          offerTitle={`Claim #${resolveTarget.claim_id}`}
          currentStatus={resolveTarget.status}
          onSuccess={() => {
            setResolveTarget(null);
            fetchDisputes();
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// PUBLIC EXPORT (with ErrorBoundary)
// ============================================================================

export function AdminDisputesClient() {
  return (
    <ErrorBoundary componentName="AdminDisputesClient">
      <AdminDisputesClientContent />
    </ErrorBoundary>
  );
}

export default AdminDisputesClient;
