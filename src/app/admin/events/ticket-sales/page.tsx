/**
 * Admin Ticket Sales Overview Page
 *
 * Platform-wide ticket sales monitoring with stats panel,
 * filterable purchase table, and refund actions.
 *
 * @tier STANDARD
 * @phase Phase 5B - Native Ticketing (Admin Dashboard)
 * @authority docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 */
'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import { Eye, RefreshCw, Loader2 } from 'lucide-react';
import { AdminTableTemplate, type TableColumn, type TableAction } from '@/components/admin/templates/AdminTableTemplate';
import {
  AdminStatsPanel,
  type StatSection,
} from '@/components/admin/shared';
import { useAuth } from '@core/hooks/useAuth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { AdminTicketSale, PlatformTicketSalesStats } from '@features/events/types';

// ============================================================================
// TABLE ROW TYPE (formatted for display)
// ============================================================================

interface TicketSaleRow {
  id: number;
  event_id: number;
  event_title: string;
  event_slug: string;
  buyer_name: string;
  buyer_email: string;
  ticket_name: string;
  quantity: number;
  total_amount: number;
  total_amount_display: string;
  payment_status: string;
  created_at_display: string;
}

// ============================================================================
// MAIN CONTENT
// ============================================================================

function AdminTicketSalesContent() {
  const { user } = useAuth();

  const [stats, setStats] = useState<PlatformTicketSalesStats | null>(null);
  const [items, setItems] = useState<AdminTicketSale[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [refundTarget, setRefundTarget] = useState<AdminTicketSale | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  const limit = 25;

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/events/ticket-sales?${params}`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setStats(data.stats || null);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch {
      // Error state handled by empty data
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData();
    }
  }, [user, fetchData]);

  // Redirect non-admin
  if (user && user.role !== 'admin') {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-medium">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  const handleRefund = async () => {
    if (!refundTarget) return;
    try {
      setIsRefunding(true);
      setRefundError(null);
      const res = await fetchWithCsrf(`/api/events/${refundTarget.event_id}/refunds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchase_id: refundTarget.id }),
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Refund failed');
      }
      setRefundTarget(null);
      await fetchData();
    } catch (err) {
      setRefundError(err instanceof Error ? err.message : 'Refund failed');
    } finally {
      setIsRefunding(false);
    }
  };

  // Stats Panel
  const statSections: StatSection[] = stats ? [
    {
      title: 'Revenue & Sales',
      items: [
        { label: 'Total Revenue', value: `$${stats.total_revenue.toFixed(2)}` },
        { label: 'Total Purchases', value: stats.total_purchases },
        { label: 'Total Refunds', value: stats.total_refunds },
        { label: 'Net Revenue', value: `$${(stats.total_revenue - stats.total_refund_amount).toFixed(2)}` },
      ],
    },
  ] : [];

  // Format table data
  const formattedItems: TicketSaleRow[] = items.map((item) => ({
    id: item.id,
    event_id: item.event_id,
    event_title: item.event_title,
    event_slug: item.event_slug,
    buyer_name: item.buyer_name,
    buyer_email: item.buyer_email,
    ticket_name: item.ticket_name,
    quantity: item.quantity,
    total_amount: item.total_amount,
    total_amount_display: `$${item.total_amount.toFixed(2)}`,
    payment_status: item.payment_status,
    created_at_display: new Date(item.created_at).toLocaleDateString(),
  }));

  // Table columns
  const columns: TableColumn<TicketSaleRow>[] = [
    { key: 'id', header: 'ID', accessor: (row) => row.id, sortable: true },
    { key: 'event_title', header: 'Event', accessor: (row) => row.event_title, sortable: true },
    {
      key: 'buyer_name',
      header: 'Buyer',
      accessor: (row) => (
        <div>
          <div className="font-medium">{row.buyer_name}</div>
          <div className="text-xs text-gray-500">{row.buyer_email}</div>
        </div>
      ),
      sortable: true,
    },
    { key: 'ticket_name', header: 'Tier', accessor: (row) => row.ticket_name },
    { key: 'quantity', header: 'Qty', accessor: (row) => row.quantity },
    { key: 'total_amount', header: 'Amount', accessor: (row) => row.total_amount_display, sortable: true },
    {
      key: 'payment_status',
      header: 'Status',
      accessor: (row) => {
        const colors: Record<string, string> = {
          completed: 'bg-green-100 text-green-800',
          refunded: 'bg-red-100 text-red-800',
          pending: 'bg-yellow-100 text-yellow-800',
          failed: 'bg-gray-100 text-gray-800',
        };
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[row.payment_status] || 'bg-gray-100 text-gray-800'}`}>
            {row.payment_status}
          </span>
        );
      },
      sortable: true,
    },
    { key: 'created_at', header: 'Date', accessor: (row) => row.created_at_display, sortable: true },
  ];

  // Table actions
  const actions: TableAction<TicketSaleRow>[] = [
    {
      label: 'View',
      icon: <Eye className="w-4 h-4" />,
      onClick: (row) => {
        window.open(`/events/${row.event_slug}`, '_blank');
      },
      iconOnly: true,
    },
    {
      label: 'Refund',
      icon: <RefreshCw className="w-4 h-4" />,
      onClick: (row) => {
        const sale = items.find(s => s.id === row.id);
        if (sale) {
          setRefundTarget(sale);
        }
      },
      variant: 'danger',
      iconOnly: true,
      isHidden: (row) => row.payment_status !== 'completed',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ticket Sales</h1>
        <p className="text-gray-600 mt-1">Platform-wide ticket sales monitoring</p>
      </div>

      {/* Stats Panel */}
      {stats && <AdminStatsPanel sections={statSections} />}

      {/* Status Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="refunded">Refunded</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Table */}
      <AdminTableTemplate<TicketSaleRow>
        title="Ticket Purchases"
        data={formattedItems}
        columns={columns}
        rowKey={(row) => row.id}
        actions={actions}
        loading={isLoading}
        emptyMessage="No ticket purchases found"
        pagination={{
          page,
          pageSize: limit,
          total,
          onPageChange: setPage,
        }}
      />

      {/* Refund Modal */}
      {refundTarget && (
        <BizModal
          isOpen={true}
          onClose={() => { setRefundTarget(null); setRefundError(null); }}
          title="Process Refund"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-gray-700">Process a refund for this ticket purchase?</p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div><span className="font-medium">Event:</span> {refundTarget.event_title}</div>
              <div><span className="font-medium">Buyer:</span> {refundTarget.buyer_name}</div>
              <div><span className="font-medium">Ticket:</span> {refundTarget.ticket_name} × {refundTarget.quantity}</div>
              <div><span className="font-medium">Amount:</span> ${refundTarget.total_amount.toFixed(2)}</div>
            </div>

            {refundError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{refundError}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <BizModalButton
                variant="secondary"
                onClick={() => { setRefundTarget(null); setRefundError(null); }}
                disabled={isRefunding}
              >
                Cancel
              </BizModalButton>
              <BizModalButton
                variant="danger"
                onClick={handleRefund}
                disabled={isRefunding}
              >
                {isRefunding ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  'Process Refund'
                )}
              </BizModalButton>
            </div>
          </div>
        </BizModal>
      )}
    </div>
  );
}

export default function AdminTicketSalesPage() {
  return (
    <ErrorBoundary componentName="AdminTicketSalesPage">
      <AdminTicketSalesContent />
    </ErrorBoundary>
  );
}
