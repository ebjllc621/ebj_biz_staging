/**
 * Contact Info Page - Manage Owner/Manager Contact Information
 *
 * @route /dashboard/listings/[listingId]/contact-info
 * @component Client Component
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 11 - Contact Info & SEO Management
 * @authority docs/pages/layouts/listings/details/userdash/MASTER_INDEX_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - Uses ListingManagerTemplate for consistent layout
 * - Validates listingId via [listingId]/layout.tsx
 * - Renders ContactInfoManager component
 */
'use client';

import React from 'react';
import { ListingManagerTemplate } from '@features/dashboard/components/ListingManagerTemplate';
import { ContactInfoManager } from '@features/dashboard/components/managers/ContactInfoManager';

/**
 * ContactInfoPage - Contact Information manager page
 */
export default function ContactInfoPage() {
  return (
    <ListingManagerTemplate
      title="Contact Information"
      description="Manage your business phone, email, and website — displayed on your public listing page"
      featureId="contact-info"
    >
      <ContactInfoManager />
    </ListingManagerTemplate>
  );
}
