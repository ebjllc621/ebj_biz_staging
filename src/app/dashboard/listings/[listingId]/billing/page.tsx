/**
 * Billing Page - Subscription and Billing Management
 *
 * Route: /dashboard/listings/[listingId]/billing
 *
 * @tier PAGE
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST use ListingManagerTemplate wrapper
 * - MUST use BillingManager component
 * - Server Component (no 'use client' needed at page level)
 */

import React from 'react';
import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { BillingManager } from '@features/dashboard/components/managers/BillingManager';
import { CreditCard } from 'lucide-react';

export const metadata = {
  title: 'Billing - Listing Manager',
  description: 'Manage your subscription plan and billing settings'
};

interface PageProps {
  params: Promise<{
    listingId: string;
  }>;
}

export default async function BillingPage({ params }: PageProps) {
  const { listingId } = await params;

  return (
    <ListingManagerTemplate
      title="Billing & Subscription"
      description="Manage your subscription plan, add-ons, and billing settings"
    >
      <BillingManager />
    </ListingManagerTemplate>
  );
}
