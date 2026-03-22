/**
 * Description Page - Manage Business Description
 *
 * @route /dashboard/listings/[listingId]/description
 * @component Client Component
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 7 - Core Listing Manager Pages
 */
'use client';

import React from 'react';
import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { DescriptionManager } from '@features/dashboard/components/managers/DescriptionManager';

export default function DescriptionPage() {
  return (
    <ListingManagerTemplate
      title="Description"
      description="Manage your business description with rich text formatting"
      featureId="description"
    >
      <DescriptionManager />
    </ListingManagerTemplate>
  );
}
