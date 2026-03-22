/**
 * ListingSidebar - Desktop Sidebar Container
 *
 * @component Client Component
 * @tier ADVANCED (Phase 5 Enhanced)
 * @phase Phase 5 - Right Sidebar Management (Enhanced from Phase 6)
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Sticky positioning on scroll (desktop only)
 * - Mobile visibility control (edit mode vs published mode)
 * - Drag-and-drop feature reordering (edit mode)
 * - Tier-based content rendering
 * - WantMoreFeaturesBox integration (edit mode, essentials/plus)
 * - Max height constraint with scroll
 *
 * @see docs/pages/layouts/listings/details/detailspageenhance/phases/PHASE_5_BRAIN_PLAN.md
 */
'use client';

import { useEffect, useState, useMemo } from 'react';
import type { Listing } from '@core/services/ListingService';
import type { ListingViewMode, FeatureId, ListingTier } from '@features/listings/types/listing-section-layout';
import { isFeatureAvailable } from '@features/listings/types/listing-section-layout';
import { useListingSectionLayout } from '@features/listings/hooks/useListingSectionLayout';
import { WantMoreFeaturesBox } from './WantMoreFeaturesBox';
import { SidebarLayoutManager } from './SidebarLayoutManager';
import { SidebarFeatureCard } from './SidebarFeatureCard';
import { QuickContactCard } from './QuickContactCard';
import { AvailabilityCalendar } from './AvailabilityCalendar';
import { RequestQuoteButton } from './RequestQuoteButton';
import { SidebarLocationCard } from './SidebarLocationCard';
import { SidebarContactCard } from './SidebarContactCard';
import { SidebarHoursCard } from './SidebarHoursCard';
import { SidebarSocialCard } from './SidebarSocialCard';
import { SidebarMembershipsCard } from './SidebarMembershipsCard';
import { SidebarTestimonialsCard } from './SidebarTestimonialsCard';
import { SidebarReviewsCarousel } from './SidebarReviewsCarousel';
import { Megaphone, Briefcase, CirclePlus, Flag } from 'lucide-react';
import { TierGatedFeature } from '../TierGatedFeature';
import { ListingCategories } from './ListingCategories';

/** Category information for multi-category display */
interface CategoryInfo {
  id: number;
  name: string;
  slug: string;
}

interface ListingSidebarProps {
  /** Listing data */
  listing: Listing;
  /** Whether editing is active (Phase 5) */
  isEditing?: boolean;
  /** View mode for visibility control (Phase 5) */
  viewMode?: ListingViewMode;
  /** Categories for the listing */
  categories?: CategoryInfo[];
  /** Legacy category name */
  categoryName?: string;
  /** Legacy category slug */
  categorySlug?: string;
  /** Callback to open the global ReviewModal */
  onViewAllReviews?: () => void;
}

export function ListingSidebar({
  listing,
  isEditing = false,
  viewMode = 'published',
  categories,
  categoryName,
  categorySlug,
  onViewAllReviews,
}: ListingSidebarProps) {
  const [isSticky, setIsSticky] = useState(false);

  // Handle sticky positioning on scroll
  useEffect(() => {
    const handleScroll = () => {
      // Sidebar becomes sticky after scrolling past hero (approx 400px)
      setIsSticky(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate listing tier
  const listingTier: ListingTier = listing.tier as ListingTier;

  // Mobile visibility logic (Phase 5)
  const mobileVisibilityClass = viewMode === 'published'
    ? 'hidden lg:block'    // Hidden on mobile for visitors
    : 'block';             // Visible on all sizes in edit mode

  // Published mode: load saved layout to respect order + visibility
  // Hook must be called unconditionally (React rules of hooks)
  const { layout, isLoading: layoutLoading } = useListingSectionLayout({
    listingId: listing.id,
    autoLoad: !isEditing // Only auto-load for published mode (edit mode uses SidebarLayoutManager)
  });

  // Extract sidebar features sorted by order, filtered to visible only
  const sortedVisibleFeatures = useMemo(() => {
    if (isEditing || !layout) return null;
    const sidebarSection = layout.sections.find(s => s.id === 'sidebar');
    if (!sidebarSection) return null;
    return [...sidebarSection.features]
      .filter(f => f.visible)
      .sort((a, b) => a.order - b.order);
  }, [isEditing, layout]);

  // Render sidebar feature (Phase R3 - corrected)
  const renderSidebarFeature = (featureId: FeatureId, isVisible: boolean) => {
    // Skip rendering if not visible and not editing
    if (!isVisible && !isEditing) return null;

    switch (featureId) {
      case 'sidebar-categories':
        return (
          <ListingCategories
            listing={listing}
            categories={categories}
            categoryName={categoryName}
            categorySlug={categorySlug}
            compact
          />
        );

      case 'sidebar-contact':
        return <SidebarContactCard listing={listing} />;

      case 'sidebar-location':
        return <SidebarLocationCard listing={listing} />;

      case 'sidebar-hours':
        return <SidebarHoursCard listing={listing} />;

      case 'sidebar-social':
        return <SidebarSocialCard listing={listing} />;

      case 'sidebar-memberships':
        return (
          <TierGatedFeature featureId="sidebar-memberships" listing={listing} isEditing={isEditing} variant="inline">
            <SidebarMembershipsCard listing={listing} />
          </TierGatedFeature>
        );

      case 'sidebar-testimonials':
        return (
          <TierGatedFeature featureId="sidebar-testimonials" listing={listing} isEditing={isEditing} variant="inline">
            <SidebarTestimonialsCard listing={listing} />
          </TierGatedFeature>
        );

      case 'sidebar-quote':
        return (
          <TierGatedFeature featureId="sidebar-quote" listing={listing} isEditing={isEditing} variant="inline">
            <SidebarFeatureCard
              title="Request Quote"
              description="Request a personalized quote"
              showHeader={false}
            >
              <RequestQuoteButton listing={listing} />
            </SidebarFeatureCard>
          </TierGatedFeature>
        );

      case 'sidebar-announcements':
        return (
          <TierGatedFeature featureId="sidebar-announcements" listing={listing} isEditing={isEditing} variant="inline">
            <SidebarFeatureCard
              title="Announcements"
              description="Special announcements and CTAs"
            >
              <div className="text-sm text-gray-500 text-center py-4">
                <Megaphone className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                <p>No announcements</p>
              </div>
            </SidebarFeatureCard>
          </TierGatedFeature>
        );

      case 'sidebar-calendar': {
        // Calendar is tied to services — only show when services feature is available
        const servicesAvailable = isFeatureAvailable('sidebar-services', listingTier);
        // In published mode, hide if services aren't tier-available
        if (!isEditing && !servicesAvailable) return null;
        return (
          <TierGatedFeature featureId="sidebar-services" listing={listing} isEditing={isEditing} variant="inline">
            <SidebarFeatureCard
              title="Calendar"
              description="Availability calendar for services"
              showHeader={false}
            >
              <AvailabilityCalendar listing={listing} />
            </SidebarFeatureCard>
          </TierGatedFeature>
        );
      }

      case 'sidebar-services':
        return (
          <TierGatedFeature featureId="sidebar-services" listing={listing} isEditing={isEditing} variant="inline">
            <SidebarFeatureCard
              title="Services"
              description="Available services"
            >
              <div className="text-sm text-gray-500 text-center py-4">
                <Briefcase className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                <p>No services listed</p>
              </div>
            </SidebarFeatureCard>
          </TierGatedFeature>
        );

      case 'sidebar-reviews':
        return <SidebarReviewsCarousel listingId={listing.id} onViewAllReviews={onViewAllReviews} />;

      default:
        return null;
    }
  };

  // Edit mode rendering (Phase 5)
  if (isEditing) {
    return (
      <aside
        className={`
          ${mobileVisibilityClass} lg:col-span-1
          ${isSticky ? 'sticky top-4' : ''}
          max-h-[calc(100vh-2rem)]
          overflow-y-auto
          scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent
        `}
      >
        <div className="space-y-4">
          {/* WantMoreFeaturesBox at top (essentials/plus only) */}
          {listingTier !== 'preferred' && listingTier !== 'premium' && (
            <WantMoreFeaturesBox
              currentTier={listingTier}
              listingId={listing.id}
            />
          )}

          {/* Sidebar Layout Manager with DnD */}
          <SidebarLayoutManager
            listingId={listing.id}
            listingTier={listingTier}
            renderFeature={renderSidebarFeature}
          />
        </div>
      </aside>
    );
  }

  // Published mode rendering - respects saved layout order and visibility
  return (
    <aside
      className={`
        ${mobileVisibilityClass} lg:col-span-1
        ${isSticky ? 'sticky top-4' : ''}
        max-h-[calc(100vh-2rem)]
        overflow-y-auto
        scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent
      `}
    >
      <div className="space-y-4">
        {/* Quick Contact Card (title box) - always at top, not part of layout */}
        <QuickContactCard listing={listing} />

        {/* Layout-driven sidebar features */}
        {sortedVisibleFeatures ? (
          sortedVisibleFeatures.map(feature => (
            <div key={feature.id}>
              {renderSidebarFeature(feature.id, true)}
            </div>
          ))
        ) : layoutLoading ? (
          // Minimal loading skeleton while layout loads
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : null}

        {/* Follow & Report - always at bottom, not part of layout */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <button
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg border border-[#022641] bg-[#022641]/5 text-[#022641] hover:bg-[#022641]/15 transition-colors text-sm font-medium"
            aria-label="Follow this listing"
            onClick={() => {
              // TODO: Follow action when integrated
            }}
          >
            <CirclePlus className="w-5 h-5 flex-shrink-0" />
            <span>Follow this Listing!</span>
          </button>
          <button
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors text-sm font-medium"
            aria-label="Report this listing"
            onClick={() => {
              // TODO: Report modal when component is built
            }}
          >
            <Flag className="w-5 h-5 flex-shrink-0" />
            <span>Report this Listing</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default ListingSidebar;
