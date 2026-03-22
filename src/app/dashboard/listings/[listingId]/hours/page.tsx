/**
 * Business Hours Page - Manage Weekly Schedule
 *
 * @route /dashboard/listings/[listingId]/hours
 * @component Client Component
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 7 - Core Listing Manager Pages
 */
'use client';

import React from 'react';
import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { HoursManager } from '@features/dashboard/components/managers/HoursManager';

export default function HoursPage() {
  return (
    <ListingManagerTemplate
      title="Business Hours"
      description="Manage your weekly schedule with day-by-day open and close times"
      featureId="hours"
    >
      <HoursManager />
    </ListingManagerTemplate>
  );
}
