/**
 * Dashboard Subscription Overview Page
 *
 * @tier STANDARD
 * @authority docs/components/billing&subs/phases/PHASE_3B_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component with authentication check
 * - ErrorBoundary wrapper (STANDARD tier)
 * - credentials: 'include' for authenticated fetch
 * - Fetches from /api/listings/mine (matches ListingContext pattern)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/core/context/AuthContext';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Receipt, ArrowRight, PlusCircle } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface UserListing {
  id: number;
  name: string;
  slug: string;
  tier: string;
  status: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getTierBadgeClasses(tier: string): string {
  switch (tier?.toLowerCase()) {
    case 'plus':
      return 'bg-blue-100 text-blue-700';
    case 'preferred':
      return 'bg-purple-100 text-purple-700';
    case 'premium':
      return 'bg-orange-100 text-orange-600';
    case 'essentials':
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

function formatTierName(tier: string): string {
  if (!tier) return 'Essentials';
  return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
}

// ============================================================================
// PAGE CONTENT
// ============================================================================

function SubscriptionOverviewPageContent() {
  const { user, loading } = useAuth();
  const [listings, setListings] = useState<UserListing[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // AUTHENTICATION GATE
  // ============================================================================

  if (!loading && !user) {
    redirect('/');
  }

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchListings = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const res = await fetch('/api/listings/mine', {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to load listings');
      const result = await res.json() as { data?: { listings?: UserListing[] } };
      setListings(result.data?.listings ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && user) {
      void fetchListings();
    }
  }, [loading, user, fetchListings]);

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
        <h1 className="text-2xl font-bold text-gray-900">Subscription Overview</h1>
        <p className="text-gray-600 mt-1">View and manage subscription tiers for each of your listings</p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty state */}
      {listings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">You don&apos;t have any listings yet.</p>
          <p className="text-gray-500 text-sm mt-1 mb-6">Create a listing to get started with a subscription.</p>
          <Link
            href="/dashboard/listings/create"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Create a Listing
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map(listing => (
            <div
              key={listing.id}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between gap-4"
            >
              {/* Listing info */}
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Receipt className="w-5 h-5 text-gray-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 truncate">
                      {listing.name}
                    </span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getTierBadgeClasses(listing.tier)}`}>
                      {formatTierName(listing.tier)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5 capitalize">
                    Status: {listing.status}
                  </div>
                </div>
              </div>

              {/* Manage link */}
              <Link
                href={`/dashboard/listings/${listing.id}/billing`}
                className="inline-flex items-center gap-1 flex-shrink-0 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
              >
                Manage Subscription
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SubscriptionOverviewPage() {
  return (
    <ErrorBoundary componentName="SubscriptionOverviewPage">
      <SubscriptionOverviewPageContent />
    </ErrorBoundary>
  );
}
