/**
 * BundlesPageClient - Client Component for Bundles Directory
 *
 * Handles data fetching, filtering, and display of offer bundles.
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Package, ArrowRight, Loader2, Search, Filter, X } from 'lucide-react';
import type { OfferBundle } from '@features/offers/types';

interface BundleFilters {
  status: 'active' | 'all';
  search: string;
}

export function BundlesPageClient() {
  const [bundles, setBundles] = useState<OfferBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<BundleFilters>({
    status: 'active',
    search: '',
  });

  const fetchBundles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters.search) {
        params.append('q', filters.search);
      }

      const response = await fetch(`/api/bundles?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bundles');
      }

      const data = await response.json();
      setBundles(data.bundles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchBundles();
  }, [fetchBundles]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
  };

  const handleStatusChange = (status: 'active' | 'all') => {
    setFilters(prev => ({ ...prev, status }));
  };

  const clearSearch = () => {
    setFilters(prev => ({ ...prev, search: '' }));
  };

  const calculateSavings = (bundle: OfferBundle): number => {
    if (!bundle.total_value || !bundle.bundle_price) return 0;
    return Math.round(((bundle.total_value - bundle.bundle_price) / bundle.total_value) * 100);
  };

  const formatPrice = (price: number | null): string => {
    if (price === null) return 'Free';
    return `$${price.toFixed(2)}`;
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <Package className="w-10 h-10" />
              <h1 className="text-4xl font-bold">Offer Bundles</h1>
            </div>
            <p className="text-xl text-purple-100">
              Save more by claiming multiple offers in one package. Bundle deals offer exclusive savings
              that you can&apos;t get by claiming offers individually.
            </p>
          </div>
        </div>
      </section>

      {/* Filters Section */}
      <section className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={handleSearchChange}
                placeholder="Search bundles..."
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              {filters.search && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => handleStatusChange('active')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    filters.status === 'active'
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => handleStatusChange('all')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    filters.status === 'all'
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bundles Grid */}
      <section className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 text-purple-600 animate-spin mb-4" />
            <p className="text-gray-600">Loading bundles...</p>
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
            <p className="text-red-700">{error}</p>
            <button
              onClick={fetchBundles}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        ) : bundles.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-700 mb-2">No Bundles Found</h2>
            <p className="text-gray-500 mb-6">
              {filters.search
                ? `No bundles match "${filters.search}"`
                : 'There are no active bundles available right now.'}
            </p>
            {filters.search && (
              <button
                onClick={clearSearch}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bundles.map((bundle) => {
              const savings = calculateSavings(bundle);

              return (
                <Link
                  key={bundle.id}
                  href={`/bundles/${bundle.slug}` as any}
                  className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg hover:border-purple-200 transition-all"
                >
                  {/* Bundle Header */}
                  <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-4 text-white">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold group-hover:underline">
                          {bundle.name}
                        </h3>
                        <p className="text-purple-100 text-sm mt-1">
                          {bundle.offers?.length || 0} offers included
                        </p>
                      </div>
                      {savings > 0 && (
                        <span className="bg-white text-purple-700 px-2 py-1 rounded-full text-sm font-bold">
                          Save {savings}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bundle Content */}
                  <div className="p-4">
                    {bundle.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {bundle.description}
                      </p>
                    )}

                    {/* Pricing */}
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-2xl font-bold text-gray-900">
                        {formatPrice(bundle.bundle_price)}
                      </span>
                      {bundle.total_value && bundle.total_value > (bundle.bundle_price || 0) && (
                        <span className="text-gray-400 line-through text-sm">
                          {formatPrice(bundle.total_value)}
                        </span>
                      )}
                    </div>

                    {/* Status & Claims */}
                    <div className="flex items-center justify-between text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          bundle.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : bundle.status === 'expired'
                            ? 'bg-gray-100 text-gray-600'
                            : bundle.status === 'sold_out'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {bundle.status === 'sold_out' ? 'Sold Out' : bundle.status.charAt(0).toUpperCase() + bundle.status.slice(1)}
                      </span>
                      <span className="text-gray-500">
                        {bundle.claims_count} claimed
                        {bundle.max_claims && (
                          <span> / {bundle.max_claims}</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="px-4 pb-4">
                    <div className="flex items-center justify-end text-purple-600 font-medium group-hover:text-purple-700">
                      View Bundle
                      <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
