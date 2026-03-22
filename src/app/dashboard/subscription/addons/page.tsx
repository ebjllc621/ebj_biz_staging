/**
 * Add-On Suites Management Page
 *
 * Displays available add-on suites with add/remove functionality.
 * Shows 4 industry-specific suites: Creator, Realtor, Restaurant, Scribe SEO.
 * Client Component that fetches data from API route.
 *
 * @authority PHASE_5.5_BRAIN_PLAN.md - Add-On Management
 * @governance Build Map v2.1 ENHANCED compliance
 * @phase Phase 5.5 - Subscription & Billing UI
 * @remediation Phase R6.2 - Client-side fetching to prevent prerender errors
 */

'use client';

// Force dynamic rendering - required for React Context (useAuth, etc.)
// Prevents 'Cannot read properties of null (reading useContext)' in production build
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { AddonGrid } from '@/features/subscription/components/AddonGrid';
import { ErrorService } from '@core/services/ErrorService';

/**
 * Add-On Suites Management Page - Client Component
 * Fetches data client-side from API route
 * NO direct DatabaseService access
 */
export default function AddonsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/subscription/addons', {
          credentials: 'include'
        });
        const result = await response.json();
        setData(result);
      } catch (error) {
        ErrorService.capture('Failed to fetch add-ons data:', error);
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
        <h1 className="text-3xl font-bold mb-4">Add-On Suites</h1>
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-800">Failed to load add-ons data</p>
        </div>
      </div>
    );
  }

  // Check if user has listings
  if (!data.listing) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-4">Add-On Suites</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <p className="text-yellow-800">
            You need to create a listing before managing add-ons.
          </p>
          <a href="/dashboard/listings/create" className="text-blue-600 hover:underline mt-2 inline-block">
            Create Your First Listing
          </a>
        </div>
      </div>
    );
  }

  const { listing, activeAddons, availableAddons, isPremium } = data;
  const subscriptionId = null; // TODO: Get from Server Action if needed

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Add-On Suites</h1>
          <p className="text-gray-600 mt-2">
            Enhance your listing with industry-specific features for {listing.name}
          </p>
        </div>
        <a
          href="/dashboard/subscription"
          className="text-blue-600 hover:underline text-sm"
        >
          ← Back to Subscription
        </a>
      </div>

      {/* Active Add-Ons Summary */}
      {activeAddons.length > 0 && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Active Add-Ons</h3>
          <p className="text-sm text-blue-800">
            {activeAddons.length} of {availableAddons.length} suites active
          </p>
          <p className="text-sm text-blue-700 mt-1">
            Total monthly cost: $
            {activeAddons
              .reduce((sum: number, addon: { pricing_monthly: number }) => sum + (addon.pricing_monthly || 0), 0)
              .toFixed(2)}
            /month
          </p>
        </div>
      )}

      {/* Add-On Grid */}
      <AddonGrid
        availableAddons={availableAddons}
        activeAddons={activeAddons}
        isPremium={isPremium}
        listingId={listing.id}
        subscriptionId={subscriptionId}
      />
    </div>
  );
}
