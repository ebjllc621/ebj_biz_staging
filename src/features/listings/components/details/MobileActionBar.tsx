/**
 * MobileActionBar - Floating Bottom Action Bar (Mobile Only)
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 8 - Mobile Optimization (Updated Phase 12 - Recommend Button)
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Fixed bottom positioning on mobile/tablet (< 1024px)
 * - 6 primary actions: Call, Directions, Share, Recommend, Favorite, Contact
 * - Touch-friendly targets (min 44px)
 * - Authentication-gated actions
 * - Web Share API integration
 * - Haptic feedback on tap
 * - Hidden on desktop (>= 1024px)
 *
 * @see docs/pages/layouts/listings/details/phases/PHASE_8_BRAIN_PLAN.md
 * @see docs/components/connections/userrecommendations/phases/PHASE_12_RECOMMEND_BUTTON_BRAIN_PLAN.md
 */
'use client';

import { useState, useCallback } from 'react';
import { Phone, MapPin, Share2, Heart, Mail, Send } from 'lucide-react';
import { useAuth } from '@core/hooks/useAuth';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { Listing } from '@core/services/ListingService';
import { ClaimListingButton } from './ClaimListingButton';
import type { ClaimUIStatus } from '@/features/listings/hooks/useClaimListing';
import { ErrorService } from '@core/services/ErrorService';
import { RecommendButton } from '@features/sharing/components';

interface MobileActionBarProps {
  /** Listing data */
  listing: Listing;
  /** Claim status for the listing (Phase 2 - Claim Feature) */
  claimStatus?: ClaimUIStatus;
  /** Callback for claim button click (Phase 2 - Claim Feature) */
  onClaimClick?: () => void;
}

export function MobileActionBar({
  listing,
  claimStatus,
  onClaimClick,
}: MobileActionBarProps) {
  const { user } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handle phone call
   */
  const handleCall = useCallback(() => {
    if (!listing.phone) return;

    // Haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    window.location.href = `tel:${listing.phone}`;
  }, [listing.phone]);

  /**
   * Handle get directions
   */
  const handleDirections = useCallback(() => {
    if (!listing.latitude || !listing.longitude) return;

    // Haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    // Open Google Maps with directions
    const destination = `${listing.latitude},${listing.longitude}`;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [listing.latitude, listing.longitude]);

  /**
   * Handle share (Web Share API)
   */
  const handleShare = useCallback(async () => {
    // Haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    const shareData = {
      title: listing.name,
      text: listing.slogan || listing.description?.substring(0, 100) || '',
      url: window.location.href
    };

    // Use Web Share API if available (mobile browsers)
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error - ignore
        if ((err as Error).name !== 'AbortError') {
          ErrorService.capture('Share failed:', err);
        }
      }
    } else {
      // Fallback: Copy link to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      } catch (err) {
        ErrorService.capture('Clipboard failed:', err);
      }
    }
  }, [listing]);

  /**
   * Handle favorite toggle
   */
  const handleFavorite = useCallback(async () => {
    if (!user || user.role === 'visitor') {
      alert('Please sign in to save favorites');
      return;
    }

    // Haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    setIsLoading(true);

    try {
      const response = await fetchWithCsrf(`/api/listings/${listing.id}/favorite`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to toggle favorite');
      }

      setIsFavorited(prev => !prev);
    } catch (err) {
      ErrorService.capture('Favorite toggle failed:', err);
      alert('Failed to save favorite. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user, listing.id]);

  /**
   * Handle contact (scroll to contact section or open modal)
   */
  const handleContact = useCallback(() => {
    // Haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    // Scroll to contact section in sidebar (or open contact modal)
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // Fallback: Open email client
      if (listing.email) {
        window.location.href = `mailto:${listing.email}`;
      }
    }
  }, [listing.email]);

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
      <div className="flex items-center justify-around px-2 py-3">
        {/* Call */}
        {listing.phone && (
          <button
            onClick={handleCall}
            className="flex flex-col items-center gap-1 px-3 py-2 text-gray-700 hover:text-biz-orange transition-colors active:scale-95 min-w-[44px]"
            aria-label="Call business"
          >
            <Phone className="w-5 h-5" />
            <span className="text-xs font-medium">Call</span>
          </button>
        )}

        {/* Directions */}
        {listing.latitude && listing.longitude && (
          <button
            onClick={handleDirections}
            className="flex flex-col items-center gap-1 px-3 py-2 text-gray-700 hover:text-biz-orange transition-colors active:scale-95 min-w-[44px]"
            aria-label="Get directions"
          >
            <MapPin className="w-5 h-5" />
            <span className="text-xs font-medium">Directions</span>
          </button>
        )}

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex flex-col items-center gap-1 px-3 py-2 text-gray-700 hover:text-biz-orange transition-colors active:scale-95 min-w-[44px]"
          aria-label="Share listing"
        >
          <Share2 className="w-5 h-5" />
          <span className="text-xs font-medium">Share</span>
        </button>

        {/* Recommend (Phase 12) */}
        <RecommendButton
          entityType="listing"
          entityId={listing.id.toString()}
          entityPreview={{
            title: listing.name,
            description: listing.description ?? null,
            image_url: listing.logo_url ?? listing.cover_image_url ?? null,
            url: typeof window !== 'undefined' ? window.location.href : `/listings/${listing.slug}`
          }}
          variant="mobile"
        />

        {/* Favorite */}
        <button
          onClick={handleFavorite}
          disabled={isLoading}
          className={`
            flex flex-col items-center gap-1 px-3 py-2 transition-colors active:scale-95 min-w-[44px]
            ${isFavorited ? 'text-red-500' : 'text-gray-700 hover:text-red-500'}
            disabled:opacity-50
          `}
          aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={`w-5 h-5 ${isFavorited ? 'fill-red-500' : ''}`} />
          <span className="text-xs font-medium">Save</span>
        </button>

        {/* Contact */}
        <button
          onClick={handleContact}
          className="flex flex-col items-center gap-1 px-3 py-2 text-gray-700 hover:text-biz-orange transition-colors active:scale-95 min-w-[44px]"
          aria-label="Contact business"
        >
          <Mail className="w-5 h-5" />
          <span className="text-xs font-medium">Contact</span>
        </button>

        {/* Claim Listing Button (Phase 2) */}
        {onClaimClick && claimStatus && !claimStatus.isClaimed && !claimStatus.isOwner && (
          <ClaimListingButton
            claimStatus={claimStatus}
            isAuthenticated={!!user}
            onClaimClick={onClaimClick}
            variant="mobile"
          />
        )}
      </div>
    </div>
  );
}

export default MobileActionBar;
