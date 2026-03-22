/**
 * Location Page - Manage Business Location
 *
 * @route /dashboard/listings/[listingId]/location
 * @component Client Component
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 7 - Core Listing Manager Pages
 */
'use client';

import React from 'react';
import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { LocationManager } from '@features/dashboard/components/managers/LocationManager';

export default function LocationPage() {
  return (
    <ListingManagerTemplate
      title="Location"
      description="Manage your business address, coordinates, and map preview"
      featureId="location"
    >
      <LocationManager />
    </ListingManagerTemplate>
  );
}
