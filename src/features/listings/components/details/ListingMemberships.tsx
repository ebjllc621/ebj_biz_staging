/**
 * ListingMemberships - Memberships & Accolades Display
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 7 - Feature Component Enhancements
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Display memberships, certifications, accolades
 * - Verification badges for verified memberships
 * - Grid layout with responsive columns
 * - Link to issuing organization (if available)
 * - Empty state returns null
 *
 * @see docs/pages/layouts/listings/details/detailspageenhance/phases/PHASE_7_BRAIN_PLAN.md
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Award, CheckCircle, ExternalLink, Settings } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';

interface Membership {
  id: number;
  name: string;
  type: 'membership' | 'certification' | 'accolade' | 'award';
  issuer?: string;
  issuer_url?: string;
  issued_date?: string;
  expiry_date?: string;
  verified?: boolean;
  logo_url?: string;
}

interface ListingMembershipsProps {
  /** Listing data */
  listing: Listing;
  /** Whether in edit mode */
  isEditing?: boolean;
}

export function ListingMemberships({ listing, isEditing }: ListingMembershipsProps) {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch memberships
  useEffect(() => {
    let isMounted = true;

    async function fetchMemberships() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/listings/${listing.id}/memberships`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch memberships');
        }

        const result = await response.json();
        if (isMounted && result.success) {
          setMemberships(result.data?.memberships || result.data || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load memberships');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchMemberships();

    return () => {
      isMounted = false;
    };
  }, [listing.id]);

  // Show empty state in edit mode when no memberships
  if (isEditing && !isLoading && memberships.length === 0) {
    return (
      <section className="bg-white rounded-lg shadow-sm p-6 border-2 border-dashed border-gray-300">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <Award className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              Memberships & Accolades
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              No memberships yet. Add certifications, awards, or professional memberships.
            </p>
            <Link
              href={`/dashboard/listings/${String(listing.id)}/memberships` as any}
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

  // Return null in published mode when no memberships
  if (!isLoading && memberships.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-biz-navy flex items-center gap-2">
          <Award className="w-5 h-5 text-biz-orange" />
          Memberships & Accolades
          {!isLoading && memberships.length > 0 && (
            <span className="text-sm font-normal text-gray-500">
              ({memberships.length})
            </span>
          )}
        </h2>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
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

      {/* Memberships Grid */}
      {!isLoading && !error && memberships.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {memberships.map((membership) => (
            <div
              key={membership.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Logo placeholder or icon */}
              <div className="flex items-start gap-3 mb-3">
                {membership.logo_url ? (
                  <img
                    src={membership.logo_url}
                    alt={membership.name}
                    className="w-12 h-12 object-contain"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Award className="w-6 h-6 text-gray-400" />
                  </div>
                )}

                {/* Verified badge */}
                {membership.verified && (
                  <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />
                )}
              </div>

              {/* Membership Name */}
              <h3 className="font-semibold text-gray-900 mb-1">{membership.name}</h3>

              {/* Type badge */}
              <div className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 capitalize mb-2">
                {membership.type}
              </div>

              {/* Issuer */}
              {membership.issuer && (
                <div className="text-sm text-gray-600 mb-2">
                  {membership.issuer_url ? (
                    <a
                      href={membership.issuer_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-biz-orange hover:underline"
                    >
                      {membership.issuer}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span>{membership.issuer}</span>
                  )}
                </div>
              )}

              {/* Dates */}
              {membership.issued_date && (
                <div className="text-xs text-gray-500">
                  Issued: {new Date(membership.issued_date).toLocaleDateString()}
                </div>
              )}
              {membership.expiry_date && (
                <div className="text-xs text-gray-500">
                  Expires: {new Date(membership.expiry_date).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
