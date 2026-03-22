/**
 * ListingActionBar - Action buttons bar for listing details page
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 1 - Hero & Action Bar (Updated Phase 12 - Recommend Button)
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * Action bar with buttons:
 * - Favorite (Heart icon) - Toggle favorite state + tracking
 * - Share (Share2 icon) - Web Share API with clipboard fallback + tracking
 * - Recommend (Send icon) - Recommend listing to a connection (Phase 12)
 * - Contact (MessageCircle icon) - Opens contact modal + tracking
 * - Website (Globe icon) - Opens business website + tracking
 * - Directions (Navigation icon) - Opens Google Maps + tracking
 *
 * @see docs/pages/layouts/listings/details/phases/PHASE_1_BRAIN_PLAN.md
 * @see docs/components/connections/userrecommendations/phases/PHASE_12_RECOMMEND_BUTTON_BRAIN_PLAN.md
 */
'use client';

import { useState } from 'react';
import { Heart, Share2, Globe, Navigation } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';
import { ClaimListingButton } from './ClaimListingButton';
import type { ClaimUIStatus } from '@/features/listings/hooks/useClaimListing';
import { ErrorService } from '@core/services/ErrorService';
import { useAnalyticsTracking } from '@/features/listings/hooks/useAnalyticsTracking';
import { RecommendButton } from '@features/sharing/components';
import { BizWireContactButton } from '@features/bizwire/components/BizWireContactButton';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ListingTierEnforcer } from '@features/listings/utils/ListingTierEnforcer';
import type { ListingTier } from '@features/listings/types/listing-section-layout';

interface ListingActionBarProps {
  /** Listing data */
  listing: Listing;
  /** Claim status for the listing (Phase 2 - Claim Feature) */
  claimStatus?: ClaimUIStatus;
  /** Whether user is authenticated (Phase 2 - Claim Feature) */
  isAuthenticated?: boolean;
  /** Callback for claim button click (Phase 2 - Claim Feature) */
  onClaimClick?: () => void;
}

/**
 * ListingActionBarContent - internal implementation
 */
function ListingActionBarContent({
  listing,
  claimStatus,
  isAuthenticated,
  onClaimClick,
}: ListingActionBarProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Analytics tracking hook
  const { trackClick } = useAnalyticsTracking(listing.id);

  /**
   * Handle favorite toggle
   * TODO: Connect to favorites API in future phase
   */
  const handleFavorite = async () => {
    const newState = !isFavorited;
    setIsFavorited(newState);
    trackClick('listing_favorite', { action: newState ? 'add' : 'remove' });
    // TODO: API call to toggle favorite
  };

  /**
   * Handle share action
   * Uses Web Share API with clipboard fallback
   */
  const handleShare = async () => {
    setIsSharing(true);

    const shareData = {
      title: listing.name,
      text: listing.description || `Check out ${listing.name} on Bizconekt`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        trackClick('listing_share', { platform: 'native_share' });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(window.location.href);
        trackClick('listing_share', { platform: 'clipboard' });
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      // User cancelled or error occurred
      ErrorService.capture('Share failed:', error);
    } finally {
      setIsSharing(false);
    }
  };

  /**
   * Handle website action
   * Opens business website in new tab
   */
  const handleWebsite = () => {
    if (listing.website) {
      trackClick('listing_website_click');
      window.open(listing.website, '_blank', 'noopener,noreferrer');
    }
  };

  /**
   * Handle directions action
   * Opens Google Maps with business location
   */
  const handleDirections = () => {
    trackClick('listing_directions_click');
    if (listing.latitude && listing.longitude) {
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${listing.latitude},${listing.longitude}`;
      window.open(mapsUrl, '_blank', 'noopener,noreferrer');
    } else if (listing.address) {
      const addressQuery = encodeURIComponent(
        `${listing.address}, ${listing.city}, ${listing.state} ${listing.zip_code}`
      );
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${addressQuery}`;
      window.open(mapsUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-wrap gap-3 justify-center md:justify-start">
          {/* Favorite Button */}
          <button
            onClick={handleFavorite}
            className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${
              isFavorited
                ? 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
            <span className="hidden sm:inline">
              {isFavorited ? 'Favorited' : 'Favorite'}
            </span>
          </button>

          {/* Share Button - Traditional sharing (native OS dialog) */}
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            aria-label="Share listing"
          >
            <Share2 className="w-5 h-5" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* Recommend Button - Send to a connection (Phase 12) */}
          <RecommendButton
            entityType="listing"
            entityId={listing.id.toString()}
            entityPreview={{
              title: listing.name,
              description: listing.description ?? null,
              image_url: listing.logo_url ?? listing.cover_image_url ?? null,
              url: typeof window !== 'undefined' ? window.location.href : `/listings/${listing.slug}`
            }}
            variant="secondary"
            size="md"
          />

          {/* Contact Button - BizWire */}
          <BizWireContactButton
            listing={listing}
            sourcePage="listing_detail"
            variant="primary"
          />

          {/* Website Button - Plus+ tier only */}
          {listing.website && ListingTierEnforcer.isFeatureAvailable('website', (listing.tier || 'essentials') as ListingTier) && (
            <button
              onClick={handleWebsite}
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              aria-label="Visit website"
            >
              <Globe className="w-5 h-5" />
              <span className="hidden sm:inline">Website</span>
            </button>
          )}

          {/* Directions Button */}
          {(listing.latitude || listing.address) && (
            <button
              onClick={handleDirections}
              className="flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              aria-label="Get directions"
            >
              <Navigation className="w-5 h-5" />
              <span className="hidden sm:inline">Directions</span>
            </button>
          )}

          {/* Claim Listing Button (Phase 2) */}
          {onClaimClick && claimStatus && !claimStatus.isClaimed && (
            <ClaimListingButton
              claimStatus={claimStatus}
              isAuthenticated={isAuthenticated ?? false}
              onClaimClick={onClaimClick}
              variant="desktop"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function ListingActionBar(props: ListingActionBarProps) {
  return (
    <ErrorBoundary componentName="ListingActionBar">
      <ListingActionBarContent {...props} />
    </ErrorBoundary>
  );
}
