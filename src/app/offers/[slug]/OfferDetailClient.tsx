/**
 * OfferDetailClient - Client Component for Offer Detail Page
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Offers Phase 1 - Core CRUD & Display
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/offers/build/phases/PHASE_1_CORE_CRUD_BRAIN_PLAN.md
 *
 * Client component for offer details page interactivity (claim, share, analytics).
 * Receives initial data from server component for optimal LCP.
 */
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Share2, Star, ShieldAlert } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import BizModal from '@/components/BizModal';

const BusinessEventsPreview = dynamic(
  () => import('@features/events/components/BusinessEventsPreview').then(m => ({ default: m.BusinessEventsPreview })),
  { ssr: false }
);
const BusinessJobsPreview = dynamic(
  () => import('@features/jobs/components/BusinessJobsPreview').then(m => ({ default: m.BusinessJobsPreview })),
  { ssr: false }
);
const OfferReviewsList = dynamic(
  () => import('@features/offers/components/OfferReviewsList').then(m => ({ default: m.OfferReviewsList })),
  { ssr: false }
);
import { OfferClaimModal } from '@features/offers/components/OfferClaimModal';
import { OfferShareModal } from '@features/offers/components/OfferShareModal';
import { OfferDetailSidebar } from '@features/offers/components/OfferDetailSidebar';
import SocialProofBadge from '@features/offers/components/SocialProofBadge';
import { TrendingBadge } from '@features/offers/components/TrendingBadge';
import { RecommendButton } from '@features/sharing/components/RecommendButton';
import { useOfferClaim } from '@features/offers/hooks/useOfferClaim';
import { useOfferFollow } from '@features/offers/hooks/useOfferFollow';
import { useSocialProof } from '@features/offers/hooks/useSocialProof';
import { DisputeModal } from '@features/offers/components/DisputeModal';
import { WriteReviewModal } from '@/components/reviews/WriteReviewModal';
import type { OfferWithListing, ClaimResult } from '@features/offers/types';
import type { Listing } from '@core/services/ListingService';
import { GalleryDisplay } from '@features/media/gallery';
import type { GalleryItem } from '@features/media/gallery';

interface OfferDetailClientProps {
  /** URL slug for the offer */
  slug: string;
  /** Initial offer data from server (for optimal LCP) */
  initialOffer: OfferWithListing | null;
  /** Initial listing data from server (for sidebar) */
  initialListing: Listing | null;
}

/**
 * OfferDetailClientInternal component
 * Handles rendering of offer details with 2-column layout
 */
function OfferDetailClientInternal({
  slug,
  initialOffer,
  initialListing
}: OfferDetailClientProps) {
  const router = useRouter();

  // Use initial data from server
  const [offer, setOffer] = useState<OfferWithListing | null>(initialOffer);
  const [_listing, setListing] = useState<Listing | null>(initialListing);
  const [isLoading, setIsLoading] = useState(!initialOffer);
  const [error, setError] = useState<string | null>(null);
  const [hasClaimed, setHasClaimed] = useState(false);

  // Modal states
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [showClaimFirstPrompt, setShowClaimFirstPrompt] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  // Media gallery items for hero carousel
  const [offerMedia, setOfferMedia] = useState<GalleryItem[]>([]);

  // Claim hook
  const {
    claimOffer,
    isLoading: isClaimLoading,
    error: claimError
  } = useOfferClaim({
    offerId: offer?.id ?? 0,
    onSuccess: (result) => {
      setClaimResult(result);
      setHasClaimed(true);
    }
  });

  // Follow hook - check if user follows this business for offers
  const {
    follows: isFollowingBusiness,
    follow: followData
  } = useOfferFollow('business', offer?.listing_id ?? null);

  // Social proof hook
  const {
    data: socialProofData,
    loading: socialProofLoading
  } = useSocialProof({
    offerId: offer?.id ?? 0,
    autoLoad: !!offer?.id
  });

  // Fetch offer if not provided by server (fallback)
  useEffect(() => {
    if (!initialOffer && slug) {
      fetchOffer();
    }
  }, [slug, initialOffer]);

  // Fetch offer media for carousel
  useEffect(() => {
    if (!offer?.id) return;
    fetch(`/api/offers/${offer.id}/media`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const mediaItems = data.data?.media || [];
        const items: GalleryItem[] = mediaItems.map((m: { id: number; media_type: string; file_url: string; alt_text?: string | null; embed_url?: string | null; platform?: string | null }, idx: number) => ({
          id: String(m.id),
          type: m.media_type as 'image' | 'video',
          url: m.file_url,
          alt: m.alt_text || `Offer media ${idx + 1}`,
          embedUrl: m.embed_url || undefined,
          videoProvider: m.platform || undefined,
        }));
        setOfferMedia(items);
      })
      .catch(() => { /* silently fail — offer.image fallback remains */ });
  }, [offer?.id]);

  const fetchOffer = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/offers/by-slug/${slug}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Offer not found');
        }
        throw new Error('Failed to fetch offer');
      }

      const data = await response.json();
      const offerData = data.data?.offer;
      setOffer(offerData);

      // Fetch full listing details
      if (offerData?.listing_id) {
        const listingRes = await fetch(`/api/listings/${offerData.listing_id}`, {
          credentials: 'include'
        });
        if (listingRes.ok) {
          const listingData = await listingRes.json();
          setListing(listingData.data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load offer');
    } finally {
      setIsLoading(false);
    }
  };

  // Open claim modal
  const handleClaimClick = useCallback(() => {
    if (!offer) return;
    setShowClaimModal(true);
  }, [offer]);

  // Execute claim (called by modal)
  const handleConfirmClaim = useCallback(async (): Promise<ClaimResult | null> => {
    return await claimOffer('offer_detail');
  }, [claimOffer]);

  // Handle successful claim — stay on claim modal so user can see promo code
  // Share modal opens when user manually closes the claim modal
  const handleClaimSuccess = useCallback((result: ClaimResult) => {
    setClaimResult(result);
    setHasClaimed(true);
    // Don't auto-close — let user read the success/promo code and close manually
  }, []);

  // Open share modal directly (for share button)
  const handleShareClick = useCallback(() => {
    if (!offer) return;
    setShowShareModal(true);
  }, [offer]);

  const handleRecommendSuccess = useCallback(() => {
    // Could show a toast or update UI state here
    console.log('Offer recommended successfully');
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse">
          {/* Back Button Skeleton */}
          <div className="bg-white border-b border-gray-200">
            <div className="container mx-auto px-4 py-4">
              <div className="h-6 w-20 bg-gray-200 rounded" />
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-gray-200 rounded-lg" />
                <div className="h-48 bg-gray-200 rounded-lg" />
              </div>
              {/* Sidebar */}
              <div className="space-y-4">
                <div className="h-32 bg-gray-200 rounded-lg" />
                <div className="h-48 bg-gray-200 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !offer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg font-medium">{error || 'Offer not found'}</p>
          <button
            onClick={() => router.push('/offers')}
            className="mt-4 text-biz-orange hover:text-orange-600 font-medium"
          >
            Back to Offers
          </button>
        </div>
      </div>
    );
  }

  // Calculate savings display
  const savingsDisplay = offer.discount_percentage
    ? `${offer.discount_percentage}% OFF`
    : offer.original_price && offer.sale_price
    ? `Save $${(Number(offer.original_price) - Number(offer.sale_price)).toFixed(2)}`
    : 'Special Offer';

  // Check if offer is expired or sold out
  const isExpired = new Date() > new Date(offer.end_date);
  const isSoldOut = offer.quantity_remaining !== null && offer.quantity_remaining <= 0;
  const isActive = offer.status === 'active' && !isExpired && !isSoldOut;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
        </div>
      </div>

      {/* Main Content Area - 2-COLUMN LAYOUT (matches Jobs detail) */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content (col-span-2) - Hero + Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 lg:p-8">
                {/* Cover Image: Carousel (multiple media) or single image fallback */}
                {offerMedia.length > 0 ? (
                  <div className="w-full rounded-lg overflow-hidden mb-6">
                    <GalleryDisplay
                      items={offerMedia}
                      layout="carousel"
                      enableLightbox={true}
                      showFeaturedBadge={false}
                      entityName={offer.title}
                    />
                  </div>
                ) : offer.image ? (
                  <div className="w-full h-48 md:h-64 rounded-lg overflow-hidden mb-6">
                    <img
                      src={offer.image}
                      alt={offer.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : null}

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                    {savingsDisplay}
                  </span>
                  {offer.is_featured && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold">
                      Featured
                    </span>
                  )}
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    {offer.offer_type}
                  </span>

                  {/* Social Proof Badges */}
                  {socialProofData && socialProofData.isTrending && (
                    <TrendingBadge variant="default" />
                  )}
                  {socialProofData && socialProofData.recentClaimsCount > 0 && (
                    <SocialProofBadge
                      claimsToday={socialProofData.recentClaimsCount}
                      trending={socialProofData.isTrending}
                    />
                  )}
                </div>

                {/* Title */}
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                  {offer.title}
                </h1>

                <p className="text-lg text-gray-600 mb-4">
                  {offer.listing_name}
                  {offer.city && offer.state && ` \u2022 ${offer.city}, ${offer.state}`}
                </p>

                {/* Pricing */}
                {offer.original_price && offer.sale_price && (
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-3xl font-bold text-biz-orange">
                      ${Number(offer.sale_price).toFixed(2)}
                    </span>
                    <span className="text-xl text-gray-500 line-through">
                      ${Number(offer.original_price).toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap lg:flex-nowrap items-center gap-2">
                  {/* Claim Button */}
                  <button
                    onClick={handleClaimClick}
                    disabled={!isActive || hasClaimed}
                    className={`flex-1 sm:flex-none inline-flex items-center justify-center whitespace-nowrap px-6 py-3 rounded-lg font-semibold text-sm transition-colors ${
                      !isActive || hasClaimed
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-biz-orange text-white hover:bg-orange-600'
                    }`}
                  >
                    {hasClaimed
                      ? 'Claimed'
                      : isSoldOut
                      ? 'Sold Out'
                      : isExpired
                      ? 'Expired'
                      : 'Claim Offer'}
                  </button>

                  {/* Share Button */}
                  <button
                    onClick={handleShareClick}
                    className="inline-flex items-center justify-center whitespace-nowrap gap-1.5 px-4 py-3 rounded-lg font-semibold text-sm border-2 border-gray-300 text-gray-700 hover:border-biz-navy hover:text-biz-navy transition-colors"
                  >
                    <Share2 className="w-4 h-4 flex-shrink-0" />
                    <span>Share</span>
                  </button>
                  <RecommendButton
                    entityType="offer"
                    entityId={offer.id.toString()}
                    entityPreview={{
                      title: offer.title,
                      description: offer.description,
                      image_url: offer.image || offer.listing_logo || null,
                      url: `/offers/${offer.slug}`
                    }}
                    variant="secondary"
                    size="sm"
                    className="!py-3 !px-4 !border-2 !rounded-lg !font-semibold !text-sm !whitespace-nowrap [&>svg]:w-4 [&>svg]:h-4 [&>svg]:flex-shrink-0"
                    onRecommendSuccess={handleRecommendSuccess}
                  />

                  {/* Write a Review Button — shows claim-first prompt if no claim */}
                  <button
                    onClick={() => {
                      if (claimResult?.claimId) {
                        setShowWriteReview(true);
                      } else {
                        setShowClaimFirstPrompt(true);
                      }
                    }}
                    className="inline-flex items-center justify-center whitespace-nowrap gap-1.5 px-4 py-3 rounded-lg font-semibold text-sm border-2 border-gray-300 text-gray-700 hover:border-biz-navy hover:text-biz-navy transition-colors"
                  >
                    <Star className="w-4 h-4 flex-shrink-0" />
                    <span>Review</span>
                  </button>
                </div>

                {/* Expiration Info */}
                {isActive && (
                  <p className="mt-3 text-sm text-gray-600">
                    Expires: {new Date(offer.end_date).toLocaleDateString()}
                    {offer.quantity_remaining !== null &&
                      ` \u2022 ${offer.quantity_remaining} remaining`}
                  </p>
                )}

                {/* Dispute link — only shown after a successful claim */}
                {claimResult && (
                  <button
                    onClick={() => setShowDisputeModal(true)}
                    className="text-sm text-gray-500 hover:text-gray-700 underline mt-2"
                  >
                    Report an Issue
                  </button>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-biz-navy mb-4">
                Offer Details
              </h2>
              <p className="text-gray-700 whitespace-pre-line">
                {offer.description || 'No description available.'}
              </p>
            </div>

            {/* Terms & Conditions */}
            {offer.terms_conditions && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-biz-navy mb-4">
                  Terms & Conditions
                </h2>
                <p className="text-gray-600 text-sm whitespace-pre-line">
                  {offer.terms_conditions}
                </p>
              </div>
            )}

            {/* Redemption Instructions */}
            {offer.redemption_instructions && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-biz-navy mb-4">
                  How to Redeem
                </h2>
                <p className="text-gray-700">
                  {offer.redemption_instructions}
                </p>
              </div>
            )}

            {offer.listing_id && (
              <BusinessEventsPreview
                listingId={offer.listing_id}
                listingName={offer.listing_name}
                listingSlug={offer.listing_slug}
              />
            )}

            {offer.listing_id && (
              <BusinessJobsPreview
                listingId={offer.listing_id}
                listingName={offer.listing_name}
                listingSlug={offer.listing_slug}
              />
            )}

            {/* Reviews Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <OfferReviewsList
                offerId={offer.id}
                offerName={offer.title}
                claimId={claimResult?.claimId}
                onClaimRequired={() => setShowClaimFirstPrompt(true)}
              />
            </div>
          </div>

          {/* Sidebar - BUSINESS INFORMATION (matches Jobs detail pattern) */}
          <div className="hidden lg:block">
            <OfferDetailSidebar
              offer={offer}
              listing={_listing}
              isFollowingBusiness={isFollowingBusiness}
              followFrequency={followData?.notification_frequency ?? 'realtime'}
              socialProofData={socialProofData}
            />
          </div>
        </div>
      </div>

      {/* Claim Modal */}
      {offer && (
        <OfferClaimModal
          isOpen={showClaimModal}
          onClose={() => {
            setShowClaimModal(false);
            // After user closes claim modal, open share modal if claim was successful
            if (claimResult) {
              setShowShareModal(true);
            }
          }}
          offer={offer}
          onConfirmClaim={handleConfirmClaim}
          claimResult={claimResult}
          isLoading={isClaimLoading}
          error={claimError}
          onClaimSuccess={handleClaimSuccess}
        />
      )}

      {/* Share Modal */}
      {offer && (
        <OfferShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          offer={offer}
          promoCode={claimResult?.promoCode}
          context={claimResult ? 'post-claim' : 'share'}
        />
      )}

      {/* Write Review Modal (from hero button) */}
      <WriteReviewModal
        isOpen={showWriteReview}
        onClose={() => setShowWriteReview(false)}
        entityType="offer"
        entityId={offer.id}
        entityName={offer.title}
        claimId={claimResult?.claimId}
      />

      {/* Claim First Prompt — shown when user tries to review without claiming */}
      <BizModal
        isOpen={showClaimFirstPrompt}
        onClose={() => setShowClaimFirstPrompt(false)}
        title="Claim Required"
        maxWidth="sm"
      >
        <div className="text-center py-4">
          <ShieldAlert className="w-12 h-12 text-biz-orange mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Claim this offer first
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            You need to claim and redeem this offer before you can leave a review.
            This helps ensure reviews come from real customers.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowClaimFirstPrompt(false)}
              className="px-4 py-2 rounded-lg font-medium text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={() => {
                setShowClaimFirstPrompt(false);
                setShowClaimModal(true);
              }}
              className="px-6 py-2 rounded-lg font-semibold text-sm bg-biz-orange text-white hover:bg-orange-600 transition-colors"
            >
              Claim Offer
            </button>
          </div>
        </div>
      </BizModal>

      {/* Dispute Modal */}
      {claimResult && offer && (
        <DisputeModal
          isOpen={showDisputeModal}
          onClose={() => setShowDisputeModal(false)}
          offerId={offer.id}
          offerTitle={offer.title}
          claimId={claimResult.claimId}
        />
      )}
    </div>
  );
}

/**
 * OfferDetailClient with ErrorBoundary wrapper
 */
export function OfferDetailClient(props: OfferDetailClientProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="container mx-auto px-4 py-8">
          <p className="text-red-600">Failed to load offer details</p>
        </div>
      }
      isolate={true}
      componentName="OfferDetailClient"
    >
      <OfferDetailClientInternal {...props} />
    </ErrorBoundary>
  );
}
