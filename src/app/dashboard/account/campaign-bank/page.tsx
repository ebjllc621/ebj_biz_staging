/**
 * Dashboard Campaign Bank Page
 * /dashboard/account/campaign-bank - View and fund listing campaign banks
 *
 * @tier STANDARD
 * @authority MASTER_BILLING_BRAIN_PLAN.md Phase 6
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component with authentication check
 * - ErrorBoundary wrapper (STANDARD tier)
 * - credentials: 'include' for authenticated fetch
 * - fetchWithCsrf for mutations (POST)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/core/context/AuthContext';
import { redirect } from 'next/navigation';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Megaphone } from 'lucide-react';
import { fetchWithCsrf } from '@core/utils/csrf';

// ============================================================================
// TYPES
// ============================================================================

interface CampaignBank {
  id: number;
  userId: number;
  listingId: number;
  balance: number;
  totalDeposited: number;
  totalSpent: number;
  lastDepositAt: string | null;
  lastSpendAt: string | null;
  status: 'active' | 'frozen' | 'depleted';
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatMoney(amount: number): string {
  return `$${parseFloat(String(amount)).toFixed(2)}`;
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    active: 'bg-green-100 text-green-600',
    frozen: 'bg-yellow-100 text-yellow-600',
    depleted: 'bg-red-100 text-red-600'
  };
  const color = colorMap[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${color}`}>
      {status}
    </span>
  );
}

// ============================================================================
// PAGE CONTENT
// ============================================================================

function CampaignBankPageContent() {
  const { user, loading } = useAuth();
  const [banks, setBanks] = useState<CampaignBank[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deposit form state
  const [depositListingId, setDepositListingId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDescription, setDepositDescription] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositSuccess, setDepositSuccess] = useState<string | null>(null);

  // ============================================================================
  // AUTHENTICATION GATE
  // ============================================================================

  if (!loading && !user) {
    redirect('/');
  }

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchBanks = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/campaign-bank', {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to load campaign banks');
      const data = await res.json() as {
        data?: { items?: CampaignBank[] };
        items?: CampaignBank[];
      };
      setBanks(data.data?.items ?? data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && user) {
      void fetchBanks();
    }
  }, [loading, user, fetchBanks]);

  // ============================================================================
  // DEPOSIT HANDLER
  // ============================================================================

  const handleDeposit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositError(null);
    setDepositSuccess(null);

    const listingId = parseInt(depositListingId, 10);
    const amount = parseFloat(depositAmount);

    if (isNaN(listingId) || listingId <= 0) {
      setDepositError('Please select a valid listing.');
      return;
    }
    if (isNaN(amount) || amount < 1) {
      setDepositError('Amount must be at least $1.00.');
      return;
    }

    setDepositing(true);
    try {
      const res = await fetchWithCsrf('/api/billing/campaign-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          amount,
          description: depositDescription || undefined
        })
      });

      if (!res.ok) {
        const errData = await res.json() as { error?: string; message?: string };
        throw new Error(errData.error ?? errData.message ?? 'Deposit failed');
      }

      setDepositSuccess('Funds added successfully.');
      setDepositListingId('');
      setDepositAmount('');
      setDepositDescription('');
      await fetchBanks();
    } catch (err) {
      setDepositError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setDepositing(false);
    }
  }, [depositListingId, depositAmount, depositDescription, fetchBanks]);

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--dashboard-spinner,#ea580c)]" />
      </div>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Campaign Bank</h1>
        <p className="text-gray-600 mt-1">Manage advertising credits for your listings</p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Bank cards */}
      {banks.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No campaign banks yet. Add funds to start advertising.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banks.map((bank) => (
            <div
              key={bank.id}
              className="bg-white rounded-xl border border-gray-200 p-5 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Listing #{bank.listingId}</p>
                </div>
                <StatusBadge status={bank.status} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Balance</p>
                  <p className="font-bold text-gray-900">{formatMoney(bank.balance)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Deposited</p>
                  <p className="text-sm text-gray-700">{formatMoney(bank.totalDeposited)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Spent</p>
                  <p className="text-sm text-gray-700">{formatMoney(bank.totalSpent)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Funds */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Funds</h2>

        {depositError && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {depositError}
          </div>
        )}
        {depositSuccess && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            {depositSuccess}
          </div>
        )}

        <form onSubmit={(e) => { void handleDeposit(e); }} className="space-y-4">
          <div>
            <label htmlFor="deposit-listing" className="block text-sm font-medium text-gray-700 mb-1">
              Listing ID
            </label>
            {banks.length > 0 ? (
              <select
                id="deposit-listing"
                value={depositListingId}
                onChange={(e) => setDepositListingId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              >
                <option value="">Select a listing...</option>
                {banks.map((bank) => (
                  <option key={bank.listingId} value={bank.listingId}>
                    Listing #{bank.listingId} ({formatMoney(bank.balance)} balance)
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="deposit-listing"
                type="number"
                value={depositListingId}
                onChange={(e) => setDepositListingId(e.target.value)}
                placeholder="Enter listing ID..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
                min="1"
              />
            )}
          </div>

          <div>
            <label htmlFor="deposit-amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount ($)
            </label>
            <input
              id="deposit-amount"
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div>
            <label htmlFor="deposit-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="deposit-description"
              type="text"
              value={depositDescription}
              onChange={(e) => setDepositDescription(e.target.value)}
              placeholder="e.g., Spring campaign funding"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <button
            type="submit"
            disabled={depositing}
            className="w-full sm:w-auto px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium rounded-lg text-sm transition-colors"
          >
            {depositing ? 'Adding Funds...' : 'Add Funds'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// EXPORT WITH ERROR BOUNDARY
// ============================================================================

export default function CampaignBankPage() {
  return (
    <ErrorBoundary>
      <CampaignBankPageContent />
    </ErrorBoundary>
  );
}
