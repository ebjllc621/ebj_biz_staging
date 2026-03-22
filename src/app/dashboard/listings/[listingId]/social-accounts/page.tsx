/**
 * Social Accounts Page - Manage Connected Social Media Accounts & Post History
 *
 * @route /dashboard/listings/[listingId]/social-accounts
 * @component Client Component
 * @tier ADVANCED
 * @phase Tier 5A Social Media Manager - Phase 8
 */
'use client';

import React from 'react';
import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { SocialAccountsManager } from '@features/dashboard/components/managers/SocialAccountsManager';

export default function SocialAccountsPage() {
  return (
    <ListingManagerTemplate
      title="Social Accounts"
      description="Manage connected social media accounts and view post history"
    >
      <SocialAccountsManager />
    </ListingManagerTemplate>
  );
}
