/**
 * Branding Page - Manage Logo, Cover Image & SEO Metadata
 *
 * @route /dashboard/listings/[listingId]/branding
 * @component Client Component
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase Branding - Listing Manager Branding Page
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_BRANDING_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - Uses ListingManagerTemplate for consistent layout
 * - Validates listingId via [listingId]/layout.tsx
 * - Renders BrandingManager component
 */
'use client';

import React from 'react';
import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { BrandingManager } from '@features/dashboard/components/managers/BrandingManager';

/**
 * BrandingPage - Branding manager page
 */
export default function BrandingPage() {
  return (
    <ListingManagerTemplate
      title="Branding"
      description="Manage your business logo, cover image, and their SEO metadata"
      featureId="branding"
    >
      <BrandingManager />
    </ListingManagerTemplate>
  );
}
