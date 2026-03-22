/**
 * Subscription Management Page
 *
 * Displays current subscription plan and plan comparison table for upgrades/downgrades.
 * Client Component that fetches data from API route.
 *
 * @authority PHASE_5.5_BRAIN_PLAN.md - Plan Selection Interface
 * @governance Build Map v2.1 ENHANCED compliance
 * @phase Phase 5.5 - Subscription & Billing UI
 * @remediation Phase R6.2 - Client-side fetching to prevent prerender errors
 */

'use client';

// Force dynamic rendering - required for React Context (useAuth, etc.)
// Prevents 'Cannot read properties of null (reading useContext)' in production build
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { CurrentPlanCard } from '@/features/subscription/components/CurrentPlanCard';
import { PlanComparisonTable } from '@/features/subscription/components/PlanComparisonTable';
import { ErrorService } from '@core/services/ErrorService';

/**
 * Subscription Management Page - Client Component
 * Fetches data client-side from API route
 * NO direct DatabaseService access
 */
export default function SubscriptionPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/subscription/data', {
          credentials: 'include'
        });
        const result = await response.json();
        setData(result);
      } catch (error) {
        ErrorService.capture('Failed to fetch subscription data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-4">Subscription Management</h1>
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-800">Failed to load subscription data</p>
        </div>
      </div>
    );
  }

  // Check if user has listings
  if (data.listings.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-4">Subscription Management</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <p className="text-yellow-800">
            You need to create a listing before managing subscriptions.
          </p>
          <a href="/dashboard/listings/create" className="text-blue-600 hover:underline mt-2 inline-block">
            Create Your First Listing
          </a>
        </div>
      </div>
    );
  }

  const { listing, currentPlan, availablePlans, isGrandfathered, nextBilling } = data;

  if (!listing) {
    return null; // Should not happen - already handled in Server Action
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Subscription Management</h1>
        <p className="text-gray-600 mt-2">
          Manage your subscription plan and add-on features for {listing.name}
        </p>
      </div>

      {currentPlan ? (
        <>
          <CurrentPlanCard
            plan={currentPlan}
            isGrandfathered={isGrandfathered}
            nextBilling={nextBilling}
          />

          <PlanComparisonTable
            currentPlan={currentPlan}
            availablePlans={availablePlans}
            isGrandfathered={isGrandfathered}
            listingId={listing.id}
          />

          <div className="mt-6 text-center">
            <a
              href="/dashboard/subscription/addons"
              className="text-blue-600 hover:underline text-sm"
            >
              Manage Add-On Suites →
            </a>
          </div>
        </>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <p className="text-blue-800">
            No active subscription found. Your listing will be created with the free Essentials plan.
          </p>
        </div>
      )}
    </div>
  );
}
