/**
 * [listingId] Layout - Route Validation Wrapper
 *
 * @description Validates listingId URL parameter and ensures user ownership
 * @component Client Component (uses hooks, router)
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 7 - Core Listing Manager Pages
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_7_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST redirect to /dashboard/listings if invalid ID or not owned
 * - MUST sync URL listing ID with context selectedListingId
 * - Prevents unauthorized access to other users' listing pages
 *
 * USAGE:
 * Automatic layout wrapper for all /dashboard/listings/[listingId]/* routes.
 * Validates ownership before rendering children.
 */
'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useListingContext } from '@features/dashboard/context/ListingContext';

// ============================================================================
// TYPES
// ============================================================================

export interface ListingIdLayoutProps {
  children: ReactNode;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ListingIdLayout - Validates listing ID from URL
 *
 * Ensures listingId in URL is valid, user owns it, and syncs with context.
 * Redirects to /dashboard/listings if validation fails.
 *
 * @param children - Child pages to render after validation
 * @returns Validated layout or loading spinner
 */
export default function ListingIdLayout({ children }: ListingIdLayoutProps) {
  const router = useRouter();
  const params = useParams();
  const { selectedListingId, setSelectedListingId, userListings, isLoading } = useListingContext();

  const urlListingId = params.listingId ? parseInt(params.listingId as string, 10) : null;

  useEffect(() => {
    // Wait for context to load
    if (isLoading) return;

    // Validate URL listing ID
    if (!urlListingId || isNaN(urlListingId)) {
      router.replace('/dashboard/listings');
      return;
    }

    // Check ownership
    const ownsListing = userListings.some(l => l.id === urlListingId);
    if (!ownsListing) {
      router.replace('/dashboard/listings');
      return;
    }

    // Sync context if different
    if (selectedListingId !== urlListingId) {
      setSelectedListingId(urlListingId);
    }
  }, [urlListingId, selectedListingId, userListings, isLoading, router, setSelectedListingId]);

  // Show loading while context initializes or validation in progress
  if (isLoading || selectedListingId !== urlListingId) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ed6437]" />
      </div>
    );
  }

  return <>{children}</>;
}
