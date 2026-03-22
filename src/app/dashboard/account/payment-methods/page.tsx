/**
 * Dashboard Payment Methods Page
 *
 * @tier STANDARD
 * @authority docs/components/billing&subs/phases/PHASE_3B_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component with authentication check
 * - ErrorBoundary wrapper (STANDARD tier)
 * - credentials: 'include' for authenticated fetch
 * - fetchWithCsrf for mutations
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/core/context/AuthContext';
import { redirect } from 'next/navigation';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { CreditCard, Trash2, Star, Plus, Building2 } from 'lucide-react';
import { fetchWithCsrf } from '@core/utils/csrf';
import { AddPaymentMethodModal } from '@/components/billing/AddPaymentMethodModal';

// ============================================================================
// TYPES
// ============================================================================

interface PaymentMethod {
  id: number;
  stripePaymentMethodId: string;
  type: 'card' | 'us_bank_account' | 'paypal' | 'link';
  brand: string | null;
  lastFour: string | null;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
  createdAt: string;
}

// ============================================================================
// PAGE CONTENT
// ============================================================================

function PaymentMethodsPageContent() {
  const { user, loading } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [fetching, setFetching] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // ============================================================================
  // AUTHENTICATION GATE
  // ============================================================================

  if (!loading && !user) {
    redirect('/');
  }

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchMethods = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/payment-methods', {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to load payment methods');
      const data = await res.json() as { data?: { items?: PaymentMethod[] }; items?: PaymentMethod[] };
      setMethods(data.data?.items ?? data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && user) {
      void fetchMethods();
    }
  }, [loading, user, fetchMethods]);

  // ============================================================================
  // MUTATION HANDLERS
  // ============================================================================

  const handleSetDefault = useCallback(async (id: number) => {
    setActionLoading(id);
    try {
      const res = await fetchWithCsrf(`/api/billing/payment-methods/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true })
      });
      if (!res.ok) throw new Error('Failed to set default');
      await fetchMethods();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment method');
    } finally {
      setActionLoading(null);
    }
  }, [fetchMethods]);

  const handleRemove = useCallback(async (id: number) => {
    if (!window.confirm('Remove this payment method?')) return;
    setActionLoading(id);
    try {
      const res = await fetchWithCsrf(`/api/billing/payment-methods/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to remove payment method');
      await fetchMethods();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove payment method');
    } finally {
      setActionLoading(null);
    }
  }, [fetchMethods]);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Methods</h1>
          <p className="text-gray-600 mt-1">Manage your saved cards and billing details</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Payment Method
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty state */}
      {methods.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">No payment methods saved yet.</p>
          <p className="text-gray-500 text-sm mt-1 mb-4">Add a card, bank account, or digital wallet to get started.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Payment Method
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {methods.map(method => {
            const isBank = method.type === 'us_bank_account';
            const isPayPal = method.type === 'paypal';
            const isLink = method.type === 'link';
            const Icon = isBank ? Building2 : CreditCard;
            const label = isLink ? 'Stripe Link' : isPayPal ? 'PayPal' : isBank ? 'Bank Account' : (method.brand || 'Card');

            return (
              <div
                key={method.id}
                className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 capitalize">
                        {label}
                      </span>
                      {method.lastFour && (
                        <span className="text-gray-600">**** {method.lastFour}</span>
                      )}
                      {method.isDefault && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-600">
                          <Star className="w-3 h-3" />
                          Default
                        </span>
                      )}
                    </div>
                    {method.expMonth && method.expYear && (
                      <div className="text-sm text-gray-500 mt-0.5">
                        Expires {method.expMonth.toString().padStart(2, '0')}/{method.expYear}
                      </div>
                    )}
                    {isBank && (
                      <div className="text-sm text-gray-500 mt-0.5">US Bank Account</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {!method.isDefault && (
                    <button
                      onClick={() => void handleSetDefault(method.id)}
                      disabled={actionLoading === method.id}
                      className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Set as Default
                    </button>
                  )}
                  <button
                    onClick={() => void handleRemove(method.id)}
                    disabled={actionLoading === method.id}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    aria-label="Remove payment method"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Payment Method Modal */}
      <AddPaymentMethodModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          void fetchMethods();
        }}
      />
    </div>
  );
}

export default function PaymentMethodsPage() {
  return (
    <ErrorBoundary componentName="PaymentMethodsPage">
      <PaymentMethodsPageContent />
    </ErrorBoundary>
  );
}
