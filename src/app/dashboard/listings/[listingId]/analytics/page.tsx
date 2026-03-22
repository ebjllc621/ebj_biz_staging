/**
 * Analytics Page - Listing Analytics Dashboard
 *
 * Route: /dashboard/listings/[listingId]/analytics
 *
 * @tier PAGE
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST use ListingManagerTemplate wrapper
 * - MUST use AnalyticsManager component
 * - Server Component (no 'use client' needed at page level)
 */

import React from 'react';
import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { AnalyticsManager } from '@features/dashboard/components/managers/AnalyticsManager';
import { BarChart3 } from 'lucide-react';

export const metadata = {
  title: 'Analytics - Listing Manager',
  description: 'View detailed analytics and performance metrics for your listing'
};

interface PageProps {
  params: Promise<{
    listingId: string;
  }>;
}

export default async function AnalyticsPage({ params }: PageProps) {
  const { listingId } = await params;

  return (
    <ListingManagerTemplate
      title="Analytics"
      description="View detailed performance metrics and visitor insights"
    >
      <AnalyticsManager />
    </ListingManagerTemplate>
  );
}
