/**
 * Social Links Page - Manage Social Media Profiles
 *
 * @route /dashboard/listings/[listingId]/social
 * @component Client Component
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 7 - Core Listing Manager Pages
 */
'use client';

import React from 'react';
import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { SocialLinksManager } from '@features/dashboard/components/managers/SocialLinksManager';

export default function SocialLinksPage() {
  return (
    <ListingManagerTemplate
      title="Social Media Links"
      description="Manage your social media profiles across all platforms"
      featureId="social-links"
    >
      <SocialLinksManager />
    </ListingManagerTemplate>
  );
}
