/**
 * ListingManagerTemplate - Reusable Manager Page Wrapper
 *
 * @description Template wrapper for all listing manager pages with consistent layout
 * @component Client Component
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 7 - Core Listing Manager Pages
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_7_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - Orange theme (#ed6437) consistent with listing manager routes
 * - Provides consistent header, breadcrumb, and section layout
 * - Uses ListingContext for breadcrumb display
 *
 * USAGE:
 * ```tsx
 * <ListingManagerTemplate
 *   title="Quick Facts"
 *   description="Manage basic business information"
 * >
 *   {children}
 * </ListingManagerTemplate>
 * ```
 */
'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { ChevronRight, Building2 } from 'lucide-react';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useListingLayoutSync } from '@features/dashboard/hooks/useListingLayoutSync';
import { FeatureVisibilityBanner } from './FeatureVisibilityBanner';
import type { FeatureId, ListingTier } from '@features/listings/types/listing-section-layout';

// ============================================================================
// TYPES
// ============================================================================

export interface ListingManagerTemplateProps {
  /** Page title */
  title: string;
  /** Page description */
  description?: string;
  /** Page content */
  children: ReactNode;
  /** Feature ID for visibility tracking (Phase 6) */
  featureId?: FeatureId;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ListingManagerTemplate - Reusable manager page wrapper
 *
 * Provides consistent layout for all listing manager pages with breadcrumb
 * navigation and page header.
 *
 * @param title - Page title
 * @param description - Optional page description
 * @param children - Page content
 * @returns Wrapped manager page
 *
 * @example
 * ```tsx
 * <ListingManagerTemplate title="Quick Facts" description="Basic business info">
 *   <QuickFactsForm />
 * </ListingManagerTemplate>
 * ```
 */
export function ListingManagerTemplate({
  title,
  description,
  children,
  featureId
}: ListingManagerTemplateProps) {
  const { selectedListing, selectedListingId, isLoading } = useListingContext();

  // Phase 6: Layout sync for visibility tracking
  const {
    toggleFeatureVisibility,
    visibilityMap
  } = useListingLayoutSync({
    listingId: selectedListingId,
    listingTier: (selectedListing?.tier || 'essentials') as ListingTier,
    autoLoad: !!featureId
  });

  // Get feature visibility state
  const featureState = featureId ? visibilityMap.get(featureId) : null;
  const isHidden = featureState ? !featureState.visible : false;
  const isLocked = featureState?.locked || false;

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ed6437]" />
      </div>
    );
  }

  // Show error state if no listing selected
  if (!selectedListingId || !selectedListing) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="bg-gray-100 rounded-full p-6 mb-6">
          <Building2 className="w-16 h-16 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Listing Selected</h2>
        <p className="text-gray-600 mb-6 max-w-md">
          Please select a listing from the dropdown to manage its information.
        </p>
        <Link
          href={"/dashboard/listings" as Route}
          className="px-6 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors font-medium"
        >
          Go to Listings Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <Link
          href={"/dashboard/listings" as Route}
          className="text-gray-600 hover:text-[#ed6437] transition-colors"
        >
          Listing Dashboard
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <Link
          href={"/dashboard/listings" as Route}
          className="text-gray-600 hover:text-[#ed6437] transition-colors max-w-[200px] truncate"
          title={selectedListing.name}
        >
          {selectedListing.name}
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-[#ed6437] font-medium">{title}</span>
      </nav>

      {/* Page Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        {description && (
          <p className="text-gray-600">{description}</p>
        )}
      </div>

      {/* Phase 6: Feature Visibility Banner */}
      {featureId && featureState && (isHidden || isLocked) && (
        <FeatureVisibilityBanner
          featureLabel={title}
          isHidden={isHidden}
          isLocked={isLocked}
          requiredTier={featureState.requiredTier}
          listingId={selectedListingId!}
          listingSlug={selectedListing?.slug}
          onToggleVisibility={
            !isLocked
              ? () => void toggleFeatureVisibility(featureId)
              : undefined
          }
        />
      )}

      {/* Page Content */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        {children}
      </div>
    </div>
  );
}

export default ListingManagerTemplate;
