/**
 * BizWireContactButton - Universal contact button for listing entity pages
 *
 * @authority docs/components/contactListing/phases/PHASE_2_PLAN.md
 * @tier SIMPLE
 *
 * Manages modal state internally. Accepts full Listing type — Phase 3 integration
 * passes the full Listing object from listing entity pages.
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Listing } from '@core/services/ListingService';
import type { BizWireSourcePage } from '../types';
import { ContactListingModal } from './ContactListingModal';

// ============================================================================
// PROPS
// ============================================================================

interface BizWireContactButtonProps {
  listing: Listing;
  sourcePage: BizWireSourcePage;
  sourceEntityType?: string;
  sourceEntityId?: number;
  variant?: 'primary' | 'secondary' | 'sidebar';
  className?: string;
}

// ============================================================================
// VARIANT CONFIG
// ============================================================================

const VARIANT_STYLES = {
  primary: 'px-4 py-2 rounded-md border border-biz-navy bg-biz-navy text-white hover:bg-biz-navy/90',
  secondary: 'px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
  sidebar: 'w-[60%] mx-auto px-3 py-2.5 bg-orange-50 text-[#ed6437] border border-[#ed6437] rounded-lg hover:bg-orange-100 text-base font-medium',
} as const;

const VARIANT_LABELS = {
  primary: 'Contact',
  secondary: 'Contact',
  sidebar: 'Contact',
} as const;

/** Bizconekt logo icon for sidebar variant */
const LOGO_ICON_URL = '/uploads/site/branding/logo-icon.png';

// ============================================================================
// COMPONENT
// ============================================================================

export function BizWireContactButton({
  listing,
  sourcePage,
  sourceEntityType,
  sourceEntityId,
  variant = 'primary',
  className = '',
}: BizWireContactButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center justify-center gap-2 transition-colors ${VARIANT_STYLES[variant]} ${className}`}
        aria-label={`Contact ${listing.name}`}
      >
        {variant === 'sidebar' ? (
          <Image src={LOGO_ICON_URL} alt="Bizconekt" width={36} height={36} className="flex-shrink-0" />
        ) : (
          <Image src={LOGO_ICON_URL} alt="Bizconekt" width={16} height={16} className="flex-shrink-0" />
        )}
        <span>{VARIANT_LABELS[variant]}</span>
      </button>

      <ContactListingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        listing={{
          id: listing.id,
          name: listing.name,
          slug: listing.slug,
          logo_url: listing.logo_url,
        }}
        sourcePage={sourcePage}
        sourceEntityType={sourceEntityType}
        sourceEntityId={sourceEntityId}
      />
    </>
  );
}
