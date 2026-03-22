/**
 * Quick Facts Page - Manage Basic Business Information
 *
 * @route /dashboard/listings/[listingId]/quick-facts
 * @component Client Component
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 7 - Core Listing Manager Pages
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_7_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - Uses ListingManagerTemplate for consistent layout
 * - Validates listingId via [listingId]/layout.tsx
 * - Renders QuickFactsManager component
 */
'use client';

import React from 'react';
import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { QuickFactsManager } from '@features/dashboard/components/managers/QuickFactsManager';

/**
 * QuickFactsPage - Quick Facts manager page
 */
export default function QuickFactsPage() {
  return (
    <ListingManagerTemplate
      title="Quick Facts"
      description="Manage basic business information including name, slogan, type, and year established"
      featureId="quick-facts"
    >
      <QuickFactsManager />
    </ListingManagerTemplate>
  );
}
