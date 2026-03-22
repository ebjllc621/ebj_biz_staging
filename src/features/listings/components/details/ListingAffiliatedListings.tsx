/**
 * ListingAffiliatedListings - Affiliated/Partner Business Display
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 7 - Feature Component Enhancements
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Affiliated/partner business display
 * - Different from RelatedListings (manual association vs category match)
 * - Partnership type badges (Partner, Vendor, Referral)
 * - Mutual display (show on both listings)
 * - Empty state returns null
 *
 * @see docs/pages/layouts/listings/details/detailspageenhance/phases/PHASE_7_BRAIN_PLAN.md
 */
'use client';

import { useState, useEffect } from 'react';
import { Link2, ExternalLink, Building2, Settings } from 'lucide-react';
import Link from 'next/link';
import type { Listing } from '@core/services/ListingService';

interface AffiliatedListing {
  id: number;
  name: string;
  slug: string;
  logo_url?: string;
  type: string;
  relationship: 'partner' | 'vendor' | 'referral' | 'franchise';
  mutual: boolean;
}

export interface ListingAffiliatedListingsProps {
  /** Listing data */
  listing: Listing;
  /** Whether in edit mode */
  isEditing?: boolean;
  isEditMode?: boolean;
}

/**
 * Get relationship badge color
 */
function getRelationshipColor(relationship: AffiliatedListing['relationship']): string {
  const colors: Record<AffiliatedListing['relationship'], string> = {
    partner: 'bg-blue-100 text-blue-700',
    vendor: 'bg-purple-100 text-purple-700',
    referral: 'bg-green-100 text-green-700',
    franchise: 'bg-orange-100 text-orange-700'
  };
  return colors[relationship] || 'bg-gray-100 text-gray-700';
}

export function ListingAffiliatedListings({ listing, isEditing, isEditMode }: ListingAffiliatedListingsProps) {
  // Support both prop names for backward compatibility
  const inEditMode = isEditMode ?? isEditing;
  const [affiliates, setAffiliates] = useState<AffiliatedListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch affiliated listings
  useEffect(() => {
    let isMounted = true;

    async function fetchAffiliates() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/listings/${listing.id}/affiliates`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch affiliated listings');
        }

        const result = await response.json();
        if (isMounted && result.success) {
          setAffiliates(result.data || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load affiliated listings');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchAffiliates();

    return () => {
      isMounted = false;
    };
  }, [listing.id]);

  // Show empty state in edit mode when no affiliates
  if (inEditMode && !isLoading && affiliates.length === 0) {
    return (
      <section className="bg-white rounded-lg shadow-sm p-6 border-2 border-dashed border-gray-300">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <Link2 className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              Affiliated Businesses
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              No affiliated businesses yet. Connect with partners and related businesses.
            </p>
            <Link
              href={`/dashboard/listings/${String(listing.id)}/affiliates` as any}
              className="inline-flex items-center gap-2 px-4 py-2 bg-biz-navy text-white text-sm font-medium rounded-md hover:bg-biz-navy/90 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configure
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Return null in published mode when no affiliates
  if (!isLoading && affiliates.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-biz-navy flex items-center gap-2">
          <Link2 className="w-5 h-5 text-biz-orange" />
          Affiliated Businesses
          {!isLoading && affiliates.length > 0 && (
            <span className="text-sm font-normal text-gray-500">
              ({affiliates.length})
            </span>
          )}
        </h2>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2 w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-4">
          {error}
        </div>
      )}

      {/* Affiliates Grid */}
      {!isLoading && !error && affiliates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {affiliates.map((affiliate) => (
            <Link
              key={affiliate.id}
              href={`/listings/${affiliate.slug}`}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start gap-3">
                {/* Logo or Icon */}
                <div className="flex-shrink-0">
                  {affiliate.logo_url ? (
                    <img
                      src={affiliate.logo_url}
                      alt={affiliate.name}
                      className="w-12 h-12 object-contain rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 group-hover:text-biz-orange transition-colors truncate">
                      {affiliate.name}
                    </h3>
                    <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  </div>

                  {/* Type */}
                  {affiliate.type && (
                    <p className="text-sm text-gray-600 mb-2 truncate">{affiliate.type}</p>
                  )}

                  {/* Relationship Badge */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded-full capitalize ${getRelationshipColor(affiliate.relationship)}`}
                    >
                      {affiliate.relationship}
                    </span>
                    {affiliate.mutual && (
                      <span className="text-xs text-gray-500">Mutual</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
