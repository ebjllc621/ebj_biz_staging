/**
 * Campaigns Page - Marketing Campaigns Management
 *
 * Route: /dashboard/listings/[listingId]/campaigns
 *
 * @tier PAGE
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST use ListingManagerTemplate wrapper
 * - MUST use CampaignsManager component
 * - Server Component (no 'use client' needed at page level)
 */

import React from 'react';
import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { CampaignsManager } from '@features/dashboard/components/managers/CampaignsManager';
import { Megaphone } from 'lucide-react';

export const metadata = {
  title: 'Campaigns - Listing Manager',
  description: 'Create and manage marketing campaigns for your listing'
};

interface PageProps {
  params: Promise<{
    listingId: string;
  }>;
}

export default async function CampaignsPage({ params }: PageProps) {
  const { listingId } = await params;

  return (
    <ListingManagerTemplate
      title="Marketing Campaigns"
      description="Create and manage promotional campaigns to boost visibility"
    >
      <CampaignsManager />
    </ListingManagerTemplate>
  );
}
