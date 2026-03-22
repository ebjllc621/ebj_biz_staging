/**
 * BundleDetailClient - Client Component for Bundle Detail Page
 *
 * Displays bundle information, included offers, and claim functionality.
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Package,
  ArrowLeft,
  Clock,
  Users,
  Tag,
  CheckCircle,
  AlertCircle,
  Loader2,
  Gift,
  Calendar,
} from 'lucide-react';
import type { OfferBundle, Offer, BundleClaimResult } from '@features/offers/types';
import { useAuth } from '@/core/context/AuthContext';

interface BundleDetailClientProps {
  slug: string;
  initialBundle: OfferBundle | null;
}

export function BundleDetailClient({ slug, initialBundle }: BundleDetailClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isAuthenticated = user !== null;
  const [bundle] = useState<OfferBundle | null>(initialBundle);
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<BundleClaimResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!bundle) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-700 mb-2">Bundle Not Found</h1>
        <p className="text-gray-500 mb-6">
          The bundle you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/bundles"
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Browse Bundles
        </Link>
      </div>
    );
  }

  const savings = bundle.total_value && bundle.bundle_price
    ? Math.round(((bundle.total_value - bundle.bundle_price) / bundle.total_value) * 100)
    : 0;

  const formatPrice = (price: number | null): string => {
    if (price === null) return 'Free';
    return `$${price.toFixed(2)}`;
  };

  const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isExpired = new Date(bundle.end_date) < new Date();
  const isSoldOut = bundle.max_claims !== null && bundle.claims_count >= bundle.max_claims;
  const canClaim = bundle.status === 'active' && !isExpired && !isSoldOut;

  const handleClaimBundle = async () => {
    if (!isAuthenticated) {
      router.push(`/auth/signin?redirect=${encodeURIComponent(`/bundles/${slug}`)}` as Parameters<typeof router.push>[0]);
      return;
    }

    setClaiming(true);
    setError(null);

    try {
      const response = await fetch(`/api/bundles/${slug}/claim`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim bundle');
      }

      setClaimResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white py-8">
        <div className="container mx-auto px-4">
          <Link
            href="/bundles"
            className="inline-flex items-center gap-2 text-purple-200 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Bundles
          </Link>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Package className="w-10 h-10" />
                <h1 className="text-3xl md:text-4xl font-bold">{bundle.name}</h1>
              </div>
              {bundle.description && (
                <p className="text-xl text-purple-100 max-w-2xl">
                  {bundle.description}
                </p>
              )}
            </div>

            {savings > 0 && (
              <div className="bg-white text-purple-700 px-6 py-4 rounded-xl text-center">
                <span className="text-4xl font-bold">{savings}%</span>
                <p className="text-sm font-medium">SAVINGS</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Included Offers */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Gift className="w-5 h-5 text-purple-600" />
                Included Offers ({bundle.offers?.length || 0})
              </h2>

              {bundle.offers && bundle.offers.length > 0 ? (
                <div className="space-y-4">
                  {bundle.offers.map((offer: Offer) => (
                    <div
                      key={offer.id}
                      className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Tag className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {offer.title}
                        </h3>
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {offer.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          {offer.discount_percentage && (
                            <span className="text-green-600 font-medium">
                              {offer.discount_percentage}% off
                            </span>
                          )}
                          {offer.original_price && (
                            <span className="text-gray-400 line-through">
                              ${offer.original_price.toFixed(2)}
                            </span>
                          )}
                          {offer.sale_price && (
                            <span className="text-gray-900 font-medium">
                              ${offer.sale_price.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No offers available in this bundle.
                </p>
              )}
            </div>

            {/* Claim Result */}
            {claimResult && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-bold text-green-800 mb-2">
                      Bundle Claimed Successfully!
                    </h3>
                    <p className="text-green-700 mb-4">
                      You saved {formatPrice(claimResult.total_savings)} with this bundle!
                    </p>
                    <p className="text-green-600 text-sm">
                      Check your email for redemption codes, or view them in your dashboard.
                    </p>
                    <Link
                      href="/dashboard/my-offers"
                      className="inline-flex items-center gap-2 mt-4 text-green-700 hover:text-green-800 font-medium"
                    >
                      View My Offers
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-bold text-red-800 mb-2">
                      Claim Failed
                    </h3>
                    <p className="text-red-700">{error}</p>
                    <button
                      onClick={() => setError(null)}
                      className="mt-4 text-red-700 hover:text-red-800 font-medium"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-4">
              {/* Pricing */}
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatPrice(bundle.bundle_price)}
                  </span>
                  {bundle.total_value && bundle.total_value > (bundle.bundle_price || 0) && (
                    <span className="text-lg text-gray-400 line-through">
                      {formatPrice(bundle.total_value)}
                    </span>
                  )}
                </div>
                {savings > 0 && (
                  <p className="text-green-600 font-medium">
                    You save {formatPrice((bundle.total_value || 0) - (bundle.bundle_price || 0))}
                  </p>
                )}
              </div>

              {/* Status */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600">
                    Valid until {formatDate(bundle.end_date)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Users className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600">
                    {bundle.claims_count} claimed
                    {bundle.max_claims && (
                      <span> / {bundle.max_claims} available</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <span
                    className={`font-medium ${
                      bundle.status === 'active'
                        ? 'text-green-600'
                        : bundle.status === 'expired'
                        ? 'text-gray-600'
                        : bundle.status === 'sold_out'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                    }`}
                  >
                    {bundle.status === 'sold_out'
                      ? 'Sold Out'
                      : bundle.status.charAt(0).toUpperCase() + bundle.status.slice(1)}
                  </span>
                </div>
              </div>

              {/* Claim Button */}
              {canClaim && !claimResult && (
                <button
                  onClick={handleClaimBundle}
                  disabled={claiming}
                  className="w-full py-3 px-6 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {claiming ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Claiming...
                    </>
                  ) : (
                    <>
                      <Package className="w-5 h-5" />
                      Claim Bundle
                    </>
                  )}
                </button>
              )}

              {!canClaim && !claimResult && (
                <div className="text-center py-3 px-6 bg-gray-100 text-gray-600 font-medium rounded-lg">
                  {isExpired
                    ? 'This bundle has expired'
                    : isSoldOut
                    ? 'This bundle is sold out'
                    : 'Bundle not available'}
                </div>
              )}

              {claimResult && (
                <Link
                  href="/dashboard/my-offers"
                  className="block w-full py-3 px-6 bg-green-600 text-white font-semibold rounded-lg text-center hover:bg-green-700 transition-colors"
                >
                  View My Offers
                </Link>
              )}

              {!isAuthenticated && canClaim && (
                <p className="text-sm text-gray-500 text-center mt-3">
                  Sign in to claim this bundle
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
