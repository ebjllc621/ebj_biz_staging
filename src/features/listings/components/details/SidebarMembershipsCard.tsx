/**
 * SidebarMembershipsCard - Compact Membership Badges
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase R3 - Sidebar Feature Correction
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - First 3 compact membership badges
 * - "View all X" button if more than 3
 * - Award and CheckCircle icons
 * - Returns null if no memberships
 *
 * @see docs/pages/layouts/listings/details/userdash/phases/PHASE_R3_BRAIN_PLAN.md
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Award, CheckCircle } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';

interface Membership {
  id: number;
  name: string;
  type: 'membership' | 'certification' | 'accolade' | 'award';
  issuer?: string;
  verified?: boolean;
  logo_url?: string;
}

interface SidebarMembershipsCardProps {
  /** Listing data */
  listing: Listing;
}

export function SidebarMembershipsCard({ listing }: SidebarMembershipsCardProps) {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch memberships
  useEffect(() => {
    let isMounted = true;

    async function fetchMemberships() {
      setIsLoading(true);

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
        // Silently fail - component returns null on error
        if (isMounted) {
          setMemberships([]);
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

  // Get first 3 memberships
  const displayMemberships = useMemo(() => {
    return memberships.slice(0, 3);
  }, [memberships]);

  const totalCount = memberships.length;
  const hasMore = totalCount > 3;

  // Return null if loading or no memberships
  if (isLoading || totalCount === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg overflow-hidden p-3">
      <div className="space-y-2">
        {/* Membership Badges (First 3) */}
        {displayMemberships.map((membership) => (
          <div
            key={membership.id}
            className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg"
          >
            {/* Logo or Icon */}
            {membership.logo_url ? (
              <img
                src={membership.logo_url}
                alt={membership.name}
                className="w-8 h-8 object-contain flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Award className="w-4 h-4 text-gray-400" />
              </div>
            )}

            {/* Name + Issuer */}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-900 truncate">
                {membership.name}
              </div>
              {membership.issuer && (
                <div className="text-xs text-gray-500 truncate">
                  {membership.issuer}
                </div>
              )}
            </div>

            {/* Verified Badge */}
            {membership.verified && (
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            )}
          </div>
        ))}

        {/* View All Button */}
        {hasMore && (
          <button className="w-full text-xs text-biz-orange hover:text-biz-orange/80 font-medium transition-colors">
            View all {totalCount}
          </button>
        )}
      </div>
    </div>
  );
}

export default SidebarMembershipsCard;
