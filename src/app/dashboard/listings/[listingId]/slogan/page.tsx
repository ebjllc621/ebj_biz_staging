/**
 * Slogan Page - Manage Business Slogan
 *
 * @route /dashboard/listings/[listingId]/slogan
 * @component Client Component
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Listing Manager Pages
 */
'use client';

import React from 'react';
import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { SloganManager } from '@features/dashboard/components/managers/SloganManager';

export default function SloganPage() {
  return (
    <ListingManagerTemplate
      title="Slogan"
      description="Add a memorable tagline that captures the essence of your business"
      featureId="slogan"
    >
      <SloganManager />
    </ListingManagerTemplate>
  );
}
