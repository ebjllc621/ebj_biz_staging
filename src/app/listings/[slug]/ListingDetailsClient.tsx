/**
 * ListingDetailsClient - Client Component for Listing Details Page
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Phase R2 - Main Content Edit Mode Integration
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * Client component for listing details page interactivity.
 * Phases 1-7: Hero, action bar, content sections, reviews, sidebar.
 * Phase 8: Mobile optimization with tab navigation, floating action bar, and chat FAB.
 * Phase 9: Performance optimization with Web Vitals monitoring and lazy loading.
 * Phase R2: Main content edit mode integration with drag-and-drop layout management.
 *
 * @see docs/pages/layouts/listings/details/MASTER_BRAIN_PLAN.md
 * @see docs/pages/layouts/listings/details/detailspageenhance/phases/PHASE_R2_BRAIN_PLAN.md
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import type { Listing } from '@core/services/ListingService';
import { useListingDetails, type CategoryInfo } from '@/features/listings/hooks/useListingDetails';
import {
  ListingHero,
  ListingOverview,
  ListingStats,
  ListingCategories,
  ListingLocation,
  ListingBusinessHours,
  ListingContactInfo,
  ListingSocialLinks,
  ListingSidebar,
  ListingOffers,
  ListingEvents,
  ListingAnnouncements,
  ListingMemberships,
  ListingServices,
  ListingQuotes,
  ListingAttachments,
  ListingOtherLocations,
  ListingAffiliatedListings,
  ListingMeetTheTeam,   // Phase 4 - Missing Components
  ListingTestimonials,  // Phase 4 - Missing Components
  ListingProjects,      // Phase 4 - Missing Components
  ListingProducts,      // Phase 4 - Missing Components
  ListingJobs,          // Phase 7 - Cross-Feature Integration
  MobileActionBar,      // Phase 8
  MobileTabNavigation,  // Phase 8
  ChatFAB,              // Phase 8
  MobileLayoutEditFAB,  // Phase 8 Mobile Optimization
  ClaimListingModal,    // Phase 2 - Claim Feature
  ListingViewModeToggle, // Phase 12.1 - View Mode Toggle
  SectionLayoutManager,  // Phase 12.2 - Section Layout Manager
  FeatureLayoutManager,  // Phase R2 - Feature Layout Manager
  ListingActionButtons,  // Layout refactor - action buttons at top of main content
} from '@/features/listings/components/details';
import { TierGatedFeature } from '@/features/listings/components/TierGatedFeature';
import { WebVitalsMonitor } from '@/features/listings/components/details/WebVitalsMonitor';
import { useClaimListing } from '@/features/listings/hooks/useClaimListing';
import { calculateListingCompleteness } from '@features/listings/utils/calculateListingCompleteness';
import { useAuth } from '@core/context/AuthContext';
import EditListingModal from '@features/listings/components/EditListingModal/EditListingModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import type { ListingViewMode, SectionId, FeatureId, FeatureConfig } from '@features/listings/types/listing-section-layout';
import { isPublicFeature } from '@features/listings/types/listing-section-layout';
import { useListingSectionLayout } from '@features/listings/hooks/useListingSectionLayout';

// Phase 9: Lazy load below-fold components
const ListingGallery = dynamic(
  () => import('@/features/listings/components/details/ListingGallery'),
  {
    loading: () => (
      <section className="bg-white rounded-lg shadow-sm p-6">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="relative aspect-square min-h-[200px] bg-gray-200 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </section>
    ),
    ssr: false
  }
);

const ListingVideoPlayer = dynamic(
  () => import('@/features/listings/components/details/ListingVideoPlayer'),
  {
    loading: () => (
      <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4" />
        <div className="aspect-video bg-gray-200 rounded-lg" />
      </div>
    ),
    ssr: false
  }
);

const ListingAudioPlayer = dynamic(
  () => import('@/features/listings/components/details/ListingAudioPlayer'),
  {
    loading: () => (
      <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4" />
        <div className="h-[166px] bg-gray-200 rounded-lg" />
      </div>
    ),
    ssr: false
  }
);

const ListingVideoGallerySection = dynamic(
  () => import('@/features/listings/components/details/ListingVideoGallerySection'),
  {
    loading: () => (
      <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4" />
        <div className="aspect-video bg-gray-200 rounded-lg" />
      </div>
    ),
    ssr: false
  }
);


// Phase 5A: Business activity feed (public)
const BusinessActivityFeed = dynamic(
  () => import('@features/listings/components/details/BusinessActivityFeed').then(m => ({ default: m.BusinessActivityFeed })),
  { ssr: false }
);

// Phase 3B: Review prompt modal
const ReviewPromptModal = dynamic(
  () => import('@features/listings/components/ReviewPromptModal').then(m => ({ default: m.ReviewPromptModal })),
  { ssr: false }
);

// Phase 4B: Consumer share prompt toast (uses localStorage - browser API)
const ConsumerSharePrompt = dynamic(
  () => import('@features/listings/components/ConsumerSharePrompt').then(m => ({ default: m.ConsumerSharePrompt })),
  { ssr: false }
);

// Phase 4B: Listing share modal for consumer share flow
const ListingShareModalDynamic = dynamic(
  () => import('@features/listings/components/ListingShareModal').then(mod => ({ default: mod.ListingShareModal })),
  { ssr: false }
);

const ReviewModal = dynamic(
  () => import('@/components/reviews/ReviewModal'),
  { ssr: false }
);

const ListingReviews = dynamic(
  () => import('@/features/listings/components/details/ListingReviews'),
  {
    loading: () => (
      <section className="bg-white rounded-lg shadow-sm p-6">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-6 animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2 animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    ),
    ssr: false
  }
);

const RelatedListings = dynamic(
  () => import('@/features/listings/components/details/RelatedListings'),
  {
    loading: () => (
      <section className="bg-white rounded-lg shadow-sm p-6">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="relative aspect-video bg-gray-200 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </section>
    ),
    ssr: false
  }
);

interface ListingDetailsClientProps {
  /** URL slug for the listing */
  slug: string;
  /** Initial listing data from server (for optimal LCP - Phase 11) */
  initialListing: Listing | null;
  /** Initial categories array from server (multi-category support) */
  initialCategories?: CategoryInfo[] | null;
  /** Initial category name from server (legacy, backwards compatibility) */
  initialCategoryName: string | null;
  /** Initial category slug from server (legacy, backwards compatibility) */
  initialCategorySlug: string | null;
}

/**
 * ListingDetailsClientInternal component
 * Handles data fetching and rendering of listing details
 */
function ListingDetailsClientInternal({
  slug,
  initialListing,
  initialCategories,
  initialCategoryName,
  initialCategorySlug
}: ListingDetailsClientProps) {
  const {
    listing,
    categories,
    categoryName,
    categorySlug,
    isLoading,
    error,
    refetch,
    incrementViewCount,
  } = useListingDetails(slug, {
    initialListing,
    initialCategories,
    initialCategoryName,
    initialCategorySlug
  });

  // Phase 2: Claim listing hook
  const claim = useClaimListing(listing);

  // Phase 6: Listing completion and edit modal
  const { user } = useAuth();
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Phase 3B: Review prompt state
  const [reviewPrompt, setReviewPrompt] = useState<{ listingId: number; listingName: string } | null>(null);
  const [, setPendingReviewPrompts] = useState<Array<{ id: number; entity_id: number }>>([]);

  // Phase 4B: Consumer share prompt state
  const [showSharePrompt, setShowSharePrompt] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Sidebar ReviewModal state (global "View all reviews" trigger)
  const [showSidebarReviewModal, setShowSidebarReviewModal] = useState(false);

  // Phase 12: View mode state
  const [viewMode, setViewMode] = useState<ListingViewMode>('published');

  // Phase R2: Router for navigation
  const router = useRouter();

  // Phase R2: Layout state management
  // Use initialLayout from listing to prevent layout flash on page load
  const {
    layout,
    updateLayout,
    isLoading: layoutLoading,
  } = useListingSectionLayout({
    listingId: listing?.id || 0,
    initialLayout: listing?.section_layout || null,
    autoLoad: true  // Will skip API fetch if initialLayout provided
  });

  // Calculate completion percentage
  const completion = listing ? calculateListingCompleteness(listing) : null;

  // Check if current user is the owner (user.id is string, user_id is number)
  const isOwner = Boolean(
    listing && user && listing.user_id === parseInt(user.id, 10)
  );

  // Check if current user is admin
  const isAdmin = Boolean(user && user.role === 'admin');

  // Increment view count on mount
  useEffect(() => {
    if (listing) {
      incrementViewCount();
    }
  }, [listing, incrementViewCount]);

  // Phase 3B: Check for pending review prompts on mount (auth users only)
  useEffect(() => {
    if (!user || !listing) return;
    const checkPendingPrompts = async () => {
      try {
        const res = await fetch('/api/notifications/review-prompts', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const prompts: Array<{ id: number; entity_id: number }> = data.data?.prompts ?? [];
          const match = prompts.find((p) => p.entity_id === listing.id);
          if (match) {
            setPendingReviewPrompts(prompts);
            setReviewPrompt({
              listingId: listing.id,
              listingName: listing.name || ''
            });
          }
        }
      } catch { /* silent */ }
    };
    void checkPendingPrompts();
  }, [user, listing]);

  // Phase 3B: Track listing interactions to schedule review prompts
  // Phase 4B: Also triggers consumer share prompt after a 2s delay
  const handleListingInteraction = useCallback(async (interactionType: string) => {
    if (!user || !listing) return;
    try {
      await fetch('/api/notifications/review-prompts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id, interactionType })
      });
    } catch { /* fire-and-forget */ }

    // Phase 4B: Show share prompt 2s after interaction (check localStorage dismiss first)
    const storageKey = `bk_share_prompt_dismissed_${listing.id}`;
    try {
      const dismissExpiry = localStorage.getItem(storageKey);
      if (!dismissExpiry || Date.now() > parseInt(dismissExpiry, 10)) {
        setTimeout(() => setShowSharePrompt(true), 2000);
      }
    } catch {
      // localStorage unavailable — skip share prompt
    }
  }, [user, listing]);

  // Phase R2: Feature change handler is now provided by SectionLayoutManager
  // This removes the competing state issue - SectionLayoutManager is the single source of truth

  // Phase R2: Render feature callback for main content
  const renderMainContentFeature = useCallback((
    featureId: FeatureId,
    isVisible: boolean
  ): React.ReactNode => {
    if (!listing) return null;

    // Only render if visible in published mode
    // Edit mode visibility is handled by DraggableFeatureWrapper
    if (!isVisible && viewMode === 'published') return null;

    switch (featureId) {
      // Details section
      case 'quick-facts':
        // Quick facts moved to hero title box - no longer rendered in main content
        return null;

      case 'categories':
        // Categories moved to sidebar - no longer rendered in main content
        return null;

      case 'description':
        return <ListingOverview listing={listing} />;

      case 'memberships':
        return (
          <TierGatedFeature featureId="memberships" listing={listing} isEditing={viewMode === 'edit'}>
            <ListingMemberships listing={listing} isEditing={viewMode === 'edit'} />
          </TierGatedFeature>
        );

      case 'contact-info':
        return <ListingContactInfo listing={listing} isEditMode={viewMode === 'edit'} />;

      case 'location':
        return <ListingLocation listing={listing} isEditMode={viewMode === 'edit'} />;

      case 'hours':
        return <ListingBusinessHours listing={listing} />;

      case 'social-links':
        return <ListingSocialLinks listing={listing} isEditMode={viewMode === 'edit'} />;

      case 'video-embed':
        return <ListingVideoPlayer listing={listing} isEditMode={viewMode === 'edit'} />;

      case 'audio-embed':
        return <ListingAudioPlayer listing={listing} isEditMode={viewMode === 'edit'} />;

      // Features section
      case 'gallery':
        return <ListingGallery listing={listing} isEditMode={viewMode === 'edit'} />;

      case 'video-gallery':
        return <ListingVideoGallerySection listing={listing} isEditMode={viewMode === 'edit'} />;

      case 'offers':
        return <ListingOffers listing={listing} isEditMode={viewMode === 'edit'} />;

      case 'events':
        return <ListingEvents listing={listing} isEditMode={viewMode === 'edit'} />;

      case 'jobs':
        return <ListingJobs listing={listing} isEditMode={viewMode === 'edit'} />;

      case 'attachments':
        return (
          <TierGatedFeature featureId="attachments" listing={listing} isEditing={viewMode === 'edit'}>
            <ListingAttachments listing={listing} isEditing={viewMode === 'edit'} />
          </TierGatedFeature>
        );

      case 'other-locations':
        return (
          <TierGatedFeature featureId="other-locations" listing={listing} isEditing={viewMode === 'edit'}>
            <ListingOtherLocations listing={listing} isEditMode={viewMode === 'edit'} />
          </TierGatedFeature>
        );

      case 'affiliated':
        return <ListingAffiliatedListings listing={listing} isEditMode={viewMode === 'edit'} />;

      // Communication section
      case 'reviews':
        return <ListingReviews listing={listing} />;

      // Advanced section
      case 'announcements':
        return (
          <TierGatedFeature featureId="announcements" listing={listing} isEditing={viewMode === 'edit'}>
            <ListingAnnouncements listing={listing} isEditing={viewMode === 'edit'} />
          </TierGatedFeature>
        );

      case 'services':
        return (
          <TierGatedFeature featureId="services" listing={listing} isEditing={viewMode === 'edit'}>
            <ListingServices listing={listing} isEditing={viewMode === 'edit'} />
          </TierGatedFeature>
        );

      case 'quotes':
        return (
          <TierGatedFeature featureId="quotes" listing={listing} isEditing={viewMode === 'edit'}>
            <ListingQuotes listing={listing} isEditing={viewMode === 'edit'} />
          </TierGatedFeature>
        );

      case 'team':
        return (
          <TierGatedFeature featureId="team" listing={listing} isEditing={viewMode === 'edit'}>
            <ListingMeetTheTeam listing={listing} isEditing={viewMode === 'edit'} />
          </TierGatedFeature>
        );

      case 'testimonials':
        return (
          <TierGatedFeature featureId="testimonials" listing={listing} isEditing={viewMode === 'edit'}>
            <ListingTestimonials listing={listing} isEditing={viewMode === 'edit'} />
          </TierGatedFeature>
        );

      case 'projects':
        return (
          <TierGatedFeature featureId="projects" listing={listing} isEditing={viewMode === 'edit'}>
            <ListingProjects listing={listing} isEditing={viewMode === 'edit'} />
          </TierGatedFeature>
        );

      case 'products':
        return (
          <TierGatedFeature featureId="products" listing={listing} isEditing={viewMode === 'edit'}>
            <ListingProducts listing={listing} isEditing={viewMode === 'edit'} />
          </TierGatedFeature>
        );

      // Dashboard-only features - NOT rendered on listing details page
      // These are managed through the listing manager in user's dashboard
      case 'keywords':       // SEO management - dashboard only
      case 'messages':       // Messaging - dashboard only
      case 'followers':      // Follower management - dashboard only
      case 'recommendations':// Recommendations - dashboard only
      case 'notifications':  // Notification settings - dashboard only
        return null;

      default:
        return null;
    }
  }, [listing, categories, categoryName, categorySlug, viewMode]);

  // Phase R2: Render section content callback
  // onFeaturesChange is now provided by SectionLayoutManager - single source of truth
  const renderSectionContent = useCallback((
    sectionId: SectionId,
    features: FeatureConfig[],
    isEditing: boolean,
    onFeaturesChange: (newFeatures: FeatureConfig[]) => void
  ): React.ReactNode => {
    // Skip sidebar section (handled separately)
    if (sectionId === 'sidebar') return null;

    return (
      <FeatureLayoutManager
        sectionId={sectionId}
        features={features}
        isEditing={isEditing}
        onFeaturesChange={onFeaturesChange}
        renderFeature={renderMainContentFeature}
        listingTier={listing?.tier || 'essentials'}
        onUpgradeClick={() => router.push('/dashboard/subscription')}
      />
    );
  }, [listing, renderMainContentFeature, router]);

  // Phase R2: Render section content for published (non-edit) mode
  // Respects layout order and visibility, filters dashboard-only features
  const renderPublishedSectionContent = useCallback((
    sectionId: SectionId,
    features: FeatureConfig[]
  ): React.ReactNode => {
    // Filter to only visible, public features
    const publicFeatures = features
      .filter(f => f.visible)
      .filter(f => isPublicFeature(f.id))
      .sort((a, b) => a.order - b.order);

    if (publicFeatures.length === 0) return null;

    return (
      <div className="space-y-6">
        {publicFeatures.map(feature => (
          <div key={feature.id}>
            {renderMainContentFeature(feature.id, feature.visible)}
          </div>
        ))}
      </div>
    );
  }, [renderMainContentFeature]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse">
          {/* Hero Skeleton */}
          <div className="relative w-full h-64 md:h-96 bg-gray-200" />

          {/* Action Bar Skeleton */}
          <div className="border-b border-gray-200 bg-white">
            <div className="container mx-auto px-4 py-4">
              <div className="flex gap-4 justify-center">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-24 h-10 bg-gray-200 rounded-md" />
                ))}
              </div>
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-8 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
              <div className="space-y-4">
                <div className="h-48 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-red-800 mb-4">
            Unable to Load Listing
          </h2>
          <p className="text-red-700 mb-6">
            {error}
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => refetch()}
              className="px-6 py-3 bg-biz-navy text-white rounded-md hover:bg-biz-navy/90 transition-colors"
            >
              Try Again
            </button>
            <a
              href="/listings"
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Back to Listings
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center bg-yellow-50 border border-yellow-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-yellow-800 mb-4">
            Listing Not Found
          </h2>
          <p className="text-yellow-700 mb-6">
            The listing you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <a
            href="/listings"
            className="inline-block px-6 py-3 bg-biz-navy text-white rounded-md hover:bg-biz-navy/90 transition-colors"
          >
            Browse All Listings
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Phase 9: Web Vitals Monitoring */}
      <WebVitalsMonitor />

      <div className="min-h-screen bg-gray-50">
        {/* Hero Section - includes cover, logo, info card with quick facts */}
        <ListingHero
          listing={listing}
          completion={completion}
          isOwner={isOwner}
          onEditClick={() => setEditModalOpen(true)}
        />

      {/* Phase 12: View Mode Toggle (Owner or Admin only) */}
      {(isOwner || isAdmin) && listing && (
        <div className="container mx-auto px-4 py-4">
          <ListingViewModeToggle
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            isOwner={isOwner}
            isAdmin={isAdmin}
            listingName={listing.name}
          />
        </div>
      )}

      {/* Phase 8: Mobile Tab Navigation */}
      <MobileTabNavigation />

      {/* Main Content Area - Phase R2: Layout-Managed */}
      <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Action Buttons - always at top, not part of layout system */}
            <ListingActionButtons
              listing={listing}
              claimStatus={claim.claimStatus}
              isAuthenticated={claim.claimStatus.isAuthenticated}
              onClaimClick={claim.openModal}
            />

            {viewMode === 'edit' && layout ? (
              // Edit mode: Use SectionLayoutManager with drag-and-drop
              <SectionLayoutManager
                listingId={listing.id}
                listingTier={listing.tier || 'essentials'}
                showControls={true}
                onUpgradeClick={() => router.push('/dashboard/subscription')}
                renderSection={(sectionId, features, isEditing, onFeaturesChange) =>
                  renderSectionContent(sectionId, features, isEditing, onFeaturesChange)
                }
              />
            ) : layout ? (
              // Published mode: Layout-driven rendering
              <>
                {layout.sections
                  .filter(section => section.id !== 'sidebar' && section.visible)
                  .sort((a, b) => a.order - b.order)
                  .map(section => (
                    <div key={section.id} id={section.id}>
                      {renderPublishedSectionContent(section.id, section.features)}
                    </div>
                  ))
                }
              </>
            ) : (
              // Fallback for listings without saved layout (default order)
              <>
                <div id="overview" className="bg-white rounded-lg shadow-sm p-6">
                  <ListingOverview listing={listing} />
                </div>
                <div id="location">
                  <ListingLocation listing={listing} />
                  <ListingBusinessHours listing={listing} />
                </div>
                <div id="gallery">
                  <ListingGallery listing={listing} />
                </div>
                <div id="video-gallery">
                  <ListingVideoGallerySection listing={listing} />
                </div>
                <div>
                  <ListingVideoPlayer listing={listing} />
                </div>
                <div id="reviews">
                  <ListingReviews listing={listing} />
                </div>
                <div id="offers">
                  <ListingOffers listing={listing} />
                </div>
                <div id="events">
                  <ListingEvents listing={listing} />
                </div>
                <TierGatedFeature featureId="announcements" listing={listing} isEditing={false}>
                  <ListingAnnouncements listing={listing} />
                </TierGatedFeature>
              </>
            )}
          </div>

          {/* Sidebar - Phase 5 Enhanced */}
          <div id="contact">
            <ListingSidebar
              listing={listing}
              isEditing={viewMode === 'edit'}
              viewMode={viewMode}
              categories={categories}
              categoryName={categoryName || undefined}
              categorySlug={categorySlug || undefined}
              onViewAllReviews={() => setShowSidebarReviewModal(true)}
            />
          </div>
        </div>

        {/* Phase 7: Related Listings (full width below main content) */}
        <div id="related" className="mt-6">
          <RelatedListings listing={listing} />
        </div>

        {/* Phase 5A: Business Activity Feed (public, full width) */}
        {viewMode === 'published' && listing.id && (
          <div id="activity-feed" className="mt-6">
            <BusinessActivityFeed
              listingId={listing.id}
              listingName={listing.name}
              maxItems={6}
            />
          </div>
        )}
      </div>

      {/* Phase 8: Mobile Action Bar (Fixed Bottom) */}
      <MobileActionBar
        listing={listing}
        claimStatus={claim.claimStatus}
        onClaimClick={claim.openModal}
      />

        {/* Phase 8: Chat FAB (Fixed Bottom-Right) */}
        <ChatFAB listing={listing} />

        {/* Phase 8: Mobile Layout Edit FAB (For Owners/Admins Only) */}
        {(isOwner || isAdmin) && (
          <MobileLayoutEditFAB
            isEditing={viewMode === 'edit'}
            onToggleEditing={() => setViewMode(prev => prev === 'edit' ? 'published' : 'edit')}
            aboveActionBar={true}
          />
        )}

        {/* Phase 2: Claim Listing Modal */}
        <ClaimListingModal listing={listing} claim={claim} />

        {/* Phase 6: Edit Listing Modal */}
        {isOwner && listing && (
          <EditListingModal
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            listingId={listing.id}
            onSuccess={() => {
              setEditModalOpen(false);
              refetch();
            }}
          />
        )}

        {/* Phase 3B: Review Prompt Modal */}
        {reviewPrompt && (
          <ReviewPromptModal
            isOpen={!!reviewPrompt}
            onClose={() => setReviewPrompt(null)}
            listingId={reviewPrompt.listingId}
            listingName={reviewPrompt.listingName}
            onReviewSubmitted={() => setReviewPrompt(null)}
          />
        )}

        {/* Phase 4B: Consumer Share Prompt Toast */}
        {listing && (
          <ConsumerSharePrompt
            isVisible={showSharePrompt}
            listing={{
              id: listing.id,
              slug: listing.slug,
              name: listing.name,
              image: listing.logo_url ?? listing.cover_image_url ?? undefined,
            }}
            onDismiss={() => setShowSharePrompt(false)}
            onShare={() => {
              setShowSharePrompt(false);
              setShowShareModal(true);
            }}
          />
        )}

        {/* Phase 4B: Listing Share Modal (triggered from ConsumerSharePrompt) */}
        {listing && (
          <ListingShareModalDynamic
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            listing={{
              id: listing.id,
              slug: listing.slug,
              name: listing.name,
              image: listing.logo_url ?? listing.cover_image_url ?? undefined,
            }}
            context="share"
          />
        )}

        {/* Global ReviewModal (triggered from sidebar "View all reviews") */}
        {listing && (
          <ReviewModal
            isOpen={showSidebarReviewModal}
            onClose={() => setShowSidebarReviewModal(false)}
            entityType="listing"
            entityId={listing.id}
            entityName={listing.name}
            entityOwnerId={listing.user_id || 0}
          />
        )}
      </div>
    </>
  );
}

/**
 * ListingDetailsClient with ErrorBoundary wrapper
 * @tier ADVANCED - Requires ErrorBoundary per Build Map v2.1
 */
export function ListingDetailsClient(props: ListingDetailsClientProps) {
  return (
    <ErrorBoundary
      componentName="ListingDetailsClient"
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-red-800 mb-4">
              Something went wrong
            </h2>
            <p className="text-red-700 mb-6">
              We encountered an error loading this listing. Please try again.
            </p>
            <a
              href="/listings"
              className="inline-block px-6 py-3 bg-biz-navy text-white rounded-md hover:bg-biz-navy/90 transition-colors"
            >
              Browse All Listings
            </a>
          </div>
        </div>
      }
    >
      <ListingDetailsClientInternal {...props} />
    </ErrorBoundary>
  );
}
