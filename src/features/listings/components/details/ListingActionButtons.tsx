/**
 * ListingActionButtons - Action button bar for listing details page
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Layout Refactor - Buttons moved from hero to top of main content
 * @governance Build Map v2.1 ENHANCED
 *
 * Renders the action icon buttons (favorite, share, recommend, contact, etc.)
 * Always appears at the top of the main content area.
 * NOT draggable, NOT a layout section - always fixed position.
 */
'use client';

import { useState } from 'react';
import { Heart, Share2, Globe, MapPin, Star } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';
import { ClaimListingButton } from './ClaimListingButton';
import type { ClaimUIStatus } from '@/features/listings/hooks/useClaimListing';
import { useAnalyticsTracking } from '@/features/listings/hooks/useAnalyticsTracking';
import { useShareModal } from '@features/listings/hooks/useShareModal';
import { ListingShareModal } from '@features/listings/components/ListingShareModal';
import { WriteReviewModal } from '@/components/reviews/WriteReviewModal';
import { BizWireContactButton } from '@features/bizwire/components/BizWireContactButton';
import { RecommendButton } from '@features/sharing/components';
import { ListingTierEnforcer } from '@features/listings/utils/ListingTierEnforcer';
import type { ListingTier } from '@features/listings/types/listing-section-layout';

interface ListingActionButtonsProps {
  listing: Listing;
  claimStatus?: ClaimUIStatus;
  isAuthenticated?: boolean;
  onClaimClick?: () => void;
}

export function ListingActionButtons({
  listing,
  claimStatus,
  isAuthenticated,
  onClaimClick,
}: ListingActionButtonsProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const { trackClick } = useAnalyticsTracking(listing.id);
  const { isOpen: isShareOpen, listing: shareListing, context: shareContext, openShareModal, closeShareModal } = useShareModal();

  const handleFavorite = async () => {
    const newState = !isFavorited;
    setIsFavorited(newState);
    trackClick('listing_favorite', { action: newState ? 'add' : 'remove' });
  };

  const handleShare = () => {
    trackClick('listing_share', { platform: 'modal_open' });
    openShareModal({
      id: listing.id,
      slug: listing.slug,
      name: listing.name,
      description: listing.description,
      image: listing.logo_url,
    });
  };

  const handleWebsite = () => {
    if (listing.website) {
      trackClick('listing_website_click');
      window.open(listing.website, '_blank', 'noopener,noreferrer');
    }
  };

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

  const iconBtnClass = 'flex items-center justify-center w-10 h-10 rounded-full border border-[#022641] bg-transparent text-[#022641] hover:bg-[#022641]/10 transition-colors';

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex flex-wrap gap-2 justify-center">
        {/* Favorite */}
        <button
          onClick={handleFavorite}
          title={isFavorited ? 'Remove from favorites' : 'Favorite'}
          className={`flex items-center justify-center w-10 h-10 rounded-full border transition-colors ${
            isFavorited
              ? 'border-red-400 bg-red-50 text-red-500 hover:bg-red-100'
              : 'border-[#022641] bg-transparent text-[#022641] hover:bg-[#022641]/10'
          }`}
          aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          title="Share"
          className={iconBtnClass}
          aria-label="Share listing"
        >
          <Share2 className="w-5 h-5" />
        </button>

        {/* Recommend - Phase 12 integration */}
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
          size="sm"
          iconOnly
          className="!w-10 !h-10 !min-w-0 !p-0 !rounded-full !border !border-[#022641] !bg-transparent hover:!bg-[#022641]/10 !text-[#022641] [&>svg]:!w-5 [&>svg]:!h-5"
        />

        {/* Contact - BizWire */}
        <BizWireContactButton
          listing={listing}
          sourcePage="listing_detail"
          variant="sidebar"
          className="!w-10 !h-10 !min-w-0 !mx-0 !p-0 !rounded-full !border-[#ed6437] !bg-[#ed6437]/15 hover:!bg-[#ed6437]/25 !text-base [&>span]:!hidden [&>img]:!w-6 [&>img]:!h-6"
        />

        {/* Website - Plus+ tier only */}
        {listing.website && ListingTierEnforcer.isFeatureAvailable('website', (listing.tier || 'essentials') as ListingTier) && (
          <button
            onClick={handleWebsite}
            title="Website"
            className={iconBtnClass}
            aria-label="Visit website"
          >
            <Globe className="w-5 h-5" />
          </button>
        )}

        {/* Directions */}
        {(listing.latitude || listing.address) && (
          <button
            onClick={handleDirections}
            title="Directions"
            className={iconBtnClass}
            aria-label="Get directions"
          >
            <MapPin className="w-5 h-5" />
          </button>
        )}

        {/* Write a Review */}
        <button
          title="Write a Review"
          className={iconBtnClass}
          aria-label="Write a review"
          onClick={() => {
            trackClick('listing_review_click');
            setShowWriteReview(true);
          }}
        >
          <Star className="w-5 h-5" />
        </button>

        {/* Claim Listing Button */}
        {onClaimClick && claimStatus && !claimStatus.isClaimed && (
          <ClaimListingButton
            claimStatus={claimStatus}
            isAuthenticated={isAuthenticated ?? false}
            onClaimClick={onClaimClick}
            variant="desktop"
          />
        )}
      </div>

      {/* Social Share Modal */}
      {shareListing && (
        <ListingShareModal
          isOpen={isShareOpen}
          onClose={closeShareModal}
          listing={shareListing}
          context={shareContext}
        />
      )}

      {/* Write Review Modal */}
      <WriteReviewModal
        isOpen={showWriteReview}
        onClose={() => setShowWriteReview(false)}
        entityType="listing"
        entityId={listing.id}
        entityName={listing.name}
      />
    </div>
  );
}
