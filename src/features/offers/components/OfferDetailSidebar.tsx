/**
 * OfferDetailSidebar - Business Information Sidebar for Offer Detail Page
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Offers Detail Layout Alignment
 * @governance Build Map v2.1 ENHANCED
 *
 * Mirrors JobDetailSidebar pattern - reuses shared listing sidebar components.
 * Includes offer-specific sections: follow business, social proof activity.
 *
 * @see src/features/jobs/components/JobDetailSidebar.tsx (reference pattern)
 */
'use client';

import { useEffect, useState } from 'react';
import type { Listing } from '@core/services/ListingService';
import type { OfferWithListing, NotificationFrequency } from '@features/offers/types';

// Reusable sidebar components from listings (same as JobDetailSidebar)
import { SidebarLocationCard } from '@features/listings/components/details/SidebarLocationCard';
import { SidebarHoursCard } from '@features/listings/components/details/SidebarHoursCard';
import { SidebarSocialCard } from '@features/listings/components/details/SidebarSocialCard';

// Reusable sidebar components from jobs
import { JobSidebarBusinessHeader } from '@features/jobs/components/JobSidebarBusinessHeader';
import { JobSidebarQuickContact } from '@features/jobs/components/JobSidebarQuickContact';

// Offer-specific components
import { OfferFollowButton } from '@features/offers/components/OfferFollowButton';

interface OfferDetailSidebarProps {
  offer: OfferWithListing;
  listing: Listing | null;
  isFollowingBusiness: boolean;
  followFrequency: NotificationFrequency;
  socialProofData: {
    totalClaims: number;
    connectionsClaimed: number;
    recentClaimsCount: number;
    isTrending: boolean;
  } | null;
}

export function OfferDetailSidebar({
  offer,
  listing,
  isFollowingBusiness,
  followFrequency,
  socialProofData
}: OfferDetailSidebarProps) {
  const [isSticky, setIsSticky] = useState(false);

  // Handle sticky positioning on scroll (matches JobDetailSidebar)
  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // If no listing data, show minimal sidebar
  if (!listing) {
    return (
      <aside
        className={`
          ${isSticky ? 'sticky top-4' : ''}
          max-h-[calc(100vh-2rem)]
          overflow-y-auto
          scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent
        `}
      >
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-4">
              {offer.listing_logo ? (
                <img
                  src={offer.listing_logo}
                  alt={offer.listing_name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-500">
                    {offer.listing_name.charAt(0)}
                  </span>
                </div>
              )}
              <h3 className="font-semibold text-gray-900 text-lg">
                {offer.listing_name}
              </h3>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`
        ${isSticky ? 'sticky top-4' : ''}
        max-h-[calc(100vh-2rem)]
        overflow-y-auto
        scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent
      `}
    >
      <div className="space-y-4">
        {/* Business Header (logo, name, rating) - reuses job component */}
        <JobSidebarBusinessHeader listing={listing} />

        {/* Quick Contact Card - reuses job component */}
        <JobSidebarQuickContact listing={listing} />

        {/* Location with Map & Get Directions */}
        <SidebarLocationCard listing={listing} />

        {/* Business Hours */}
        <SidebarHoursCard listing={listing} />

        {/* Social Links */}
        <SidebarSocialCard listing={listing} />

        {/* Follow Business for Offers */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Get Notified of New Offers
          </h4>
          <OfferFollowButton
            followType="business"
            targetId={offer.listing_id}
            targetName={offer.listing_name}
            initialIsFollowing={isFollowingBusiness}
            initialFrequency={followFrequency}
            size="md"
          />
        </div>

        {/* Social Proof / Offer Activity */}
        {socialProofData && (socialProofData.totalClaims > 0 || socialProofData.connectionsClaimed > 0) && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Offer Activity
            </h4>
            <div className="space-y-2 text-sm text-gray-600">
              {socialProofData.totalClaims > 0 && (
                <p>{socialProofData.totalClaims} total claims</p>
              )}
              {socialProofData.connectionsClaimed > 0 && (
                <p>{socialProofData.connectionsClaimed} of your connections claimed this</p>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default OfferDetailSidebar;
