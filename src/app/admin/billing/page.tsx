/**
 * Admin Billing Overview Page
 * /admin/billing - Overview dashboard showing billing stats and recent transactions
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: AdminTableTemplate (MANDATORY for recent transactions table)
 * - Authentication: Admin-only access required
 * - Service Boundary: NO direct database access (API routes only)
 * - Credentials: 'include' for all fetch requests
 * - Complexity: ADVANCED tier (error boundaries required)
 * - ErrorBoundary: MANDATORY
 *
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 3A
 * @component
 * @returns {JSX.Element} Admin billing overview interface
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { AdminTableTemplate, TableColumn } from '@/components/admin/templates/AdminTableTemplate';
import { AdminPageHeader } from '@/components/admin/shared/AdminPageHeader';
import { useAuth } from '@core/hooks/useAuth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorFallback } from '@/components/common/ErrorFallback';
import { Users, DollarSign, Receipt, CreditCard } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface BillingStats {
  subscriptions: {
    total: number;
    active: number;
    cancelled: number;
    expired: number;
    suspended: number;
  };
  revenue: {
    total: number;
    thisMonth: number;
    avgTransaction: number;
  };
  transactions: {
    total: number;
  };
  paymentMethods: {
    total: number;
  };
}

interface RecentTransaction {
  id: number;
  invoice_number: string | null;
  transaction_type: string;
  status: string;
  amount: number;
  transaction_date: string;
  user_email: string;
  user_name: string | null;
  listing_name: string | null;
}

const DEFAULT_STATS: BillingStats = {
  subscriptions: { total: 0, active: 0, cancelled: 0, expired: 0, suspended: 0 },
  revenue: { total: 0, thisMonth: 0, avgTransaction: 0 },
  transactions: { total: 0 },
  paymentMethods: { total: 0 }
};

// ============================================================================
// STAT CARD SUB-COMPONENT
// ============================================================================

function StatCard({
  title,
  value,
  icon: Icon
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <Icon className="w-8 h-8 text-orange-500" />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function AdminBillingOverviewContent() {
  const { user, loading: authLoading } = useAuth();

  const [stats, setStats] = useState<BillingStats>(DEFAULT_STATS);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      const response = await fetch('/api/admin/billing/stats', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch billing stats');
      }

      const data = await response.json();
      const statsData = data.data?.stats ?? data.stats;
      if (statsData) {
        setStats(statsData as BillingStats);
      }
    } catch (error) {
      console.error('Error fetching billing stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  const fetchRecentTransactions = useCallback(async () => {
    try {
      setIsLoadingTransactions(true);
      const response = await fetch('/api/admin/billing/transactions?pageSize=10', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recent transactions');
      }

      const data = await response.json();
      const transactions = data.data?.transactions ?? data.transactions ?? [];
      setRecentTransactions(transactions as RecentTransaction[]);
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.role === 'admin') {
      void fetchStats();
      void fetchRecentTransactions();
    }
  }, [authLoading, user, fetchStats, fetchRecentTransactions]);

  // ============================================================================
  // TABLE COLUMNS
  // ============================================================================

  const transactionColumns: TableColumn<RecentTransaction>[] = [
    {
      key: 'invoice_number',
      header: 'Invoice #',
      accessor: (row) => row.invoice_number ?? '—'
    },
    {
      key: 'user_email',
      header: 'User',
      accessor: (row) => (
        <div>
          <p className="font-medium text-sm">{row.user_name ?? row.user_email}</p>
          <p className="text-xs text-gray-500">{row.user_email}</p>
        </div>
      )
    },
    {
      key: 'transaction_type',
      header: 'Type',
      accessor: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
          {row.transaction_type.replace(/_/g, ' ')}
        </span>
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      accessor: (row) => `$${row.amount.toFixed(2)}`
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => {
        const colorMap: Record<string, string> = {
          completed: 'bg-green-100 text-green-800',
          pending: 'bg-yellow-100 text-yellow-800',
          failed: 'bg-red-100 text-red-800',
          refunded: 'bg-gray-100 text-gray-800'
        };
        const color = colorMap[row.status] ?? 'bg-gray-100 text-gray-800';
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
            {row.status}
          </span>
        );
      }
    },
    {
      key: 'transaction_date',
      header: 'Date',
      accessor: (row) => new Date(row.transaction_date).toLocaleDateString()
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
        title="Billing & Subscriptions"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Active Subscriptions"
          value={isLoadingStats ? '...' : stats.subscriptions.active}
          icon={Users}
        />
        <StatCard
          title="Monthly Revenue"
          value={isLoadingStats ? '...' : `$${stats.revenue.thisMonth.toFixed(2)}`}
          icon={DollarSign}
        />
        <StatCard
          title="Total Transactions"
          value={isLoadingStats ? '...' : stats.transactions.total}
          icon={Receipt}
        />
        <StatCard
          title="Payment Methods"
          value={isLoadingStats ? '...' : stats.paymentMethods.total}
          icon={CreditCard}
        />
      </div>

      {/* Recent Transactions */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
          <Link
            href="/admin/billing/transactions"
            className="text-sm text-orange-600 hover:text-orange-800 font-medium"
          >
            View All Transactions
          </Link>
        </div>

        <AdminTableTemplate<RecentTransaction>
          title=""
          data={recentTransactions}
          columns={transactionColumns}
          rowKey={(row) => row.id}
          loading={isLoadingTransactions}
          emptyMessage="No recent transactions found."
          searchable={false}
        />
      </div>

      {/* Quick Links */}
      <div className="flex gap-4">
        <Link
          href="/admin/billing/subscriptions"
          className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium text-sm"
        >
          View All Subscriptions
        </Link>
        <Link
          href="/admin/billing/transactions"
          className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm"
        >
          View All Transactions
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// EXPORT WITH ERROR BOUNDARY
// ============================================================================

export default function AdminBillingOverviewPage() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <AdminBillingOverviewContent />
    </ErrorBoundary>
  );
}
