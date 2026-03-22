/**
 * My Offers Dashboard Page - View claimed offers and promo codes
 *
 * @tier STANDARD
 * @phase Offers Phase 1 - Core CRUD & Display
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/offers/build/phases/PHASE_1_CORE_CRUD_BRAIN_PLAN.md
 */
'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Gift,
  Copy,
  Check,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Filter
} from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useUserClaims } from '@features/offers/hooks/useUserClaims';
import type { Claim, ClaimStatus } from '@features/offers/types';

function ClaimCard({ claim }: { claim: Claim }) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(claim.promo_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [claim.promo_code]);

  const now = new Date();
  const endDate = new Date(claim.end_date);
  const isExpired = endDate <= now;
  const isRedeemed = claim.status === 'redeemed';
  const isActive = claim.status === 'claimed' && !isExpired;

  // Days until expiration
  const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const statusConfig = {
    active: {
      icon: Clock,
      label: daysUntilExpiry <= 3 ? `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}` : 'Active',
      color: daysUntilExpiry <= 3 ? 'text-amber-600 bg-amber-50' : 'text-green-600 bg-green-50'
    },
    redeemed: {
      icon: CheckCircle,
      label: 'Redeemed',
      color: 'text-blue-600 bg-blue-50'
    },
    expired: {
      icon: XCircle,
      label: 'Expired',
      color: 'text-gray-500 bg-gray-100'
    }
  };

  const status = isRedeemed ? 'redeemed' : isExpired ? 'expired' : 'active';
  const { icon: StatusIcon, label: statusLabel, color: statusColor } = statusConfig[status];

  return (
    <div className={`bg-white rounded-xl border ${isActive ? 'border-gray-200' : 'border-gray-100'} overflow-hidden transition-shadow hover:shadow-md`}>
      <div className="flex gap-4 p-4">
        {/* Offer Image */}
        {claim.offer_image ? (
          <img
            src={claim.offer_image}
            alt={claim.offer_title}
            className={`w-20 h-20 rounded-lg object-cover flex-shrink-0 ${!isActive ? 'opacity-60' : ''}`}
          />
        ) : (
          <div className={`w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 ${!isActive ? 'opacity-60' : ''}`}>
            <Gift className="w-8 h-8 text-gray-400" />
          </div>
        )}

        {/* Offer Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className={`font-semibold ${isActive ? 'text-gray-900' : 'text-gray-500'} truncate`}>
                {claim.offer_title}
              </h3>
              <p className="text-sm text-gray-500">{claim.business_name}</p>
            </div>
            <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {statusLabel}
            </span>
          </div>

          {/* Promo Code */}
          <div className="mt-3">
            {isActive ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 border border-dashed border-gray-300 rounded-lg px-3 py-2">
                  <span className="font-mono font-bold text-gray-900 tracking-wider">
                    {claim.promo_code}
                  </span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 px-3 py-2 bg-[#ed6437] text-white rounded-lg text-sm font-medium hover:bg-[#d55a31] transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <span className="font-mono text-gray-400 line-through">
                  {claim.promo_code}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 mt-3">
            <span className="text-xs text-gray-500">
              Claimed: {new Date(claim.claimed_at).toLocaleDateString()}
            </span>
            {isActive && (
              <span className="text-xs text-gray-500">
                Expires: {endDate.toLocaleDateString()}
              </span>
            )}
            {isRedeemed && claim.redeemed_at && (
              <span className="text-xs text-gray-500">
                Redeemed: {new Date(claim.redeemed_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MyOffersPageContent() {
  const [statusFilter, setStatusFilter] = useState<ClaimStatus | 'all'>('all');
  const { claims, isLoading, error, activeCount, redeemedCount, expiredCount } = useUserClaims();

  // Filter claims based on selected status
  const filteredClaims = claims.filter(claim => {
    if (statusFilter === 'all') return true;

    const now = new Date();
    const isExpired = new Date(claim.end_date) <= now;

    if (statusFilter === 'claimed') {
      return claim.status === 'claimed' && !isExpired;
    }
    if (statusFilter === 'redeemed') {
      return claim.status === 'redeemed';
    }
    if (statusFilter === 'expired') {
      return claim.status === 'expired' || (claim.status === 'claimed' && isExpired);
    }
    return true;
  });

  const filterOptions = [
    { value: 'all', label: 'All', count: claims.length },
    { value: 'claimed', label: 'Active', count: activeCount },
    { value: 'redeemed', label: 'Redeemed', count: redeemedCount },
    { value: 'expired', label: 'Expired', count: expiredCount }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Offers</h1>
          <p className="text-gray-600 mt-1">
            Your claimed offers and promo codes
          </p>
        </div>

        <Link
          href="/offers"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg font-medium hover:bg-[#d55a31] transition-colors"
        >
          <Gift className="w-4 h-4" />
          Browse Offers
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{activeCount}</div>
          <div className="text-sm text-green-600">Active</div>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{redeemedCount}</div>
          <div className="text-sm text-blue-600">Redeemed</div>
        </div>
        <div className="bg-gray-100 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-gray-600">{expiredCount}</div>
          <div className="text-sm text-gray-500">Expired</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
        {filterOptions.map(option => (
          <button
            key={option.value}
            onClick={() => setStatusFilter(option.value as ClaimStatus | 'all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === option.value
                ? 'bg-[#ed6437] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {option.label}
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${
              statusFilter === option.value
                ? 'bg-white/20'
                : 'bg-gray-200'
            }`}>
              {option.count}
            </span>
          </button>
        ))}
      </div>

      {/* Claims List */}
      <div className="space-y-4">
        {isLoading ? (
          // Loading skeleton
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-2/3" />
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-10 bg-gray-200 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {statusFilter === 'all'
                ? "No claimed offers yet"
                : `No ${statusFilter} offers`}
            </h3>
            <p className="text-gray-600 mb-4">
              {statusFilter === 'all'
                ? "Discover great deals from local businesses"
                : "Try selecting a different filter"}
            </p>
            <Link
              href="/offers"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg font-medium hover:bg-[#d55a31] transition-colors"
            >
              <Gift className="w-4 h-4" />
              Browse Offers
            </Link>
          </div>
        ) : (
          filteredClaims.map(claim => (
            <ClaimCard key={claim.id} claim={claim} />
          ))
        )}
      </div>
    </div>
  );
}

export default function MyOffersPage() {
  return (
    <ErrorBoundary componentName="MyOffersPage">
      <MyOffersPageContent />
    </ErrorBoundary>
  );
}
