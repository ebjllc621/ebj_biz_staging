/**
 * SEO Page - Manage Listing SEO Settings
 *
 * @route /dashboard/listings/[listingId]/seo
 * @component Client Component
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 11 - Contact Info & SEO Management
 * @authority docs/pages/layouts/listings/details/userdash/MASTER_INDEX_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - Uses ListingManagerTemplate for consistent layout
 * - Validates listingId via [listingId]/layout.tsx
 * - Renders SEOManager component
 */
'use client';

import React from 'react';
import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { SEOManager } from '@features/dashboard/components/managers/SEOManager';

/**
 * SEOPage - SEO settings manager page
 */
export default function SEOPage() {
  return (
    <ListingManagerTemplate
      title="SEO Settings"
      description="Optimize how your listing appears in search engine results"
    >
      <SEOManager />
    </ListingManagerTemplate>
  );
}
