/**
 * Memberships & Accolades Page
 *
 * @route /dashboard/listings/[listingId]/memberships
 * @component Client Component
 * @tier STANDARD
 * @phase Listing Manager - Memberships & Accolades
 */
'use client';

import React from 'react';
import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { MembershipsManager } from '@features/dashboard/components/managers/MembershipsManager';

export default function MembershipsPage() {
  return (
    <ListingManagerTemplate
      title="Memberships & Accolades"
      description="Showcase certifications, awards, professional memberships, and accolades on your listing"
      featureId="memberships"
    >
      <MembershipsManager />
    </ListingManagerTemplate>
  );
}
