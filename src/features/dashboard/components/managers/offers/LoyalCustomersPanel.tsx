/**
 * LoyalCustomersPanel - Business view of loyal customers
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Star, Loader2, RefreshCw, Trophy, Crown } from 'lucide-react';
import type { LoyalCustomer, LoyaltyTier } from '@features/offers/types';

interface LoyalCustomersPanelProps {
  listingId: number;
  maxDisplay?: number;
}

const TIER_ICONS: Record<LoyaltyTier, React.ReactNode> = {
  new: null,
  bronze: <Star className="w-4 h-4 text-amber-600" />,
  silver: <Star className="w-4 h-4 text-gray-400" />,
  gold: <Crown className="w-4 h-4 text-yellow-500" />,
  platinum: <Trophy className="w-4 h-4 text-purple-600" />,
};

const TIER_COLORS: Record<LoyaltyTier, string> = {
  new: 'bg-gray-100 text-gray-600',
  bronze: 'bg-amber-100 text-amber-700',
  silver: 'bg-gray-200 text-gray-700',
  gold: 'bg-yellow-100 text-yellow-700',
  platinum: 'bg-purple-100 text-purple-700',
};

export function LoyalCustomersPanel({ listingId, maxDisplay = 10 }: LoyalCustomersPanelProps) {
  const [customers, setCustomers] = useState<LoyalCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/listings/${listingId}/loyal-customers`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch loyal customers');
      }

      const data = await response.json();
      setCustomers((data.customers || []).slice(0, maxDisplay));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [listingId, maxDisplay]);

  useEffect(() => {
    if (listingId) {
      fetchCustomers();
    }
  }, [listingId, fetchCustomers]);

  const getTierLabel = (tier: LoyaltyTier): string => {
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 text-sm mb-2">{error}</p>
        <button
          onClick={fetchCustomers}
          className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">No Loyal Customers Yet</h3>
        <p className="text-gray-500 text-sm">
          Customers who claim multiple offers will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-900 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Top Loyal Customers
        </h3>
        <button
          onClick={fetchCustomers}
          className="p-2 text-gray-400 hover:text-purple-600 rounded-lg"
          aria-label="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="divide-y divide-gray-200">
        {customers.map((customer, index) => (
          <div
            key={customer.user_id}
            className="py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                {index + 1}
              </div>
              <div>
                <p className="font-medium text-gray-900">{customer.display_name}</p>
                <p className="text-xs text-gray-500">
                  Last claim: {formatDate(customer.last_claim_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                {customer.total_claims} claims
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[customer.loyalty_tier]}`}>
                {TIER_ICONS[customer.loyalty_tier]}
                {getTierLabel(customer.loyalty_tier)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
