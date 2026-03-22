/**
 * AssociatedListingsPanel - Display user's associated listings
 *
 * @tier ADVANCED
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/pages/layouts/userProfile/phases/PHASE_4B_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component ('use client' directive)
 * - Path aliases (@features/, @components/)
 * - Lucide React icons only
 * - Returns null if no listings (no empty panel)
 * - Loading skeleton while fetching
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Building2 } from 'lucide-react';
import { ListingMiniCard, UserListingWithReviews } from './ListingMiniCard';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AssociatedListingsPanelProps {
  /** Username to fetch listings for */
  username: string;
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function AssociatedListingsSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6 animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-5 h-5 bg-gray-200 rounded" />
        <div className="h-5 w-48 bg-gray-200 rounded" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-48 bg-gray-200 rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2 space-y-2">
                <div className="h-32 bg-gray-200 rounded-lg" />
                <div className="h-8 bg-gray-200 rounded" />
              </div>
              <div className="md:col-span-3 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-16 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// ASSOCIATEDLISTINGSPANEL COMPONENT
// ============================================================================

/**
 * AssociatedListingsPanel - Container for user's associated listings
 *
 * @example
 * ```tsx
 * <AssociatedListingsPanel username="johndoe" />
 * ```
 */
export function AssociatedListingsPanel({ username }: AssociatedListingsPanelProps) {
  const [listings, setListings] = useState<UserListingWithReviews[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssociatedListings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/listings`, {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 404) {
          setListings([]);
          setIsLoading(false);
          return;
        }
        throw new Error('Failed to fetch associated listings');
      }

      const result = await response.json() as {
        success: boolean;
        data: {
          listings: UserListingWithReviews[];
          total: number;
        };
      };

      if (result.success && result.data) {
        setListings(result.data.listings);
      } else {
        setListings([]);
      }
    } catch {
      setError('Failed to load associated listings');
      setListings([]);
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchAssociatedListings();
  }, [fetchAssociatedListings]);

  // Loading state
  if (isLoading) {
    return <AssociatedListingsSkeleton />;
  }

  // Don't render if no listings or error
  if (error || listings.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-5 h-5 text-[#022641]" />
        <h3 className="text-lg font-semibold text-[#022641]">
          Associated Listings ({listings.length})
        </h3>
      </div>

      {/* Listings */}
      <div className="space-y-6">
        {listings.map((listing) => (
          <ListingMiniCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}

export default AssociatedListingsPanel;
