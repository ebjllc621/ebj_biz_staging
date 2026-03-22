/**
 * Categories Page - Manage Categories & Keywords
 *
 * @route /dashboard/listings/[listingId]/categories
 * @component Client Component
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 7 - Core Listing Manager Pages
 */
'use client';

import React from 'react';
import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { CategoriesManager } from '@features/dashboard/components/managers/CategoriesManager';

export default function CategoriesPage() {
  return (
    <ListingManagerTemplate
      title="Categories & Keywords"
      description="Manage categories, keywords, features, and amenities for your listing"
      featureId="categories"
    >
      <CategoriesManager />
    </ListingManagerTemplate>
  );
}
