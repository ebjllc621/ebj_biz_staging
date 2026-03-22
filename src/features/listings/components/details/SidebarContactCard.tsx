/**
 * SidebarContactCard - Contact Business Buttons
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase R3 - Sidebar Feature Correction (Updated: tier gating + button order)
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Button order (by sort position):
 * 1. Send via BizWire (orange, essentials+)
 * 2. Send Email (outlined, essentials+, if email exists)
 * 3. Call Business (outlined, essentials+, if phone exists)
 * 4. Visit Website (outlined, plus+, if website exists)
 *
 * Tier gating:
 * - BizWire: essentials+ (bizwire feature)
 * - Email/Phone: essentials+ (contact-info feature)
 * - Website: plus+ (website feature)
 *
 * @see docs/pages/layouts/listings/details/userdash/phases/PHASE_R3_BRAIN_PLAN.md
 */
'use client';

import { Phone, Mail, Globe } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';
import { ListingTierEnforcer } from '@features/listings/utils/ListingTierEnforcer';
import { BizWireContactButton } from '@features/bizwire/components/BizWireContactButton';
import type { ListingTier } from '@features/listings/types/listing-section-layout';

interface SidebarContactCardProps {
  /** Listing data */
  listing: Listing;
}

export function SidebarContactCard({ listing }: SidebarContactCardProps) {
  const listingTier = (listing.tier || 'essentials') as ListingTier;

  // Tier gating checks
  const canShowBizWire = ListingTierEnforcer.isFeatureAvailable('bizwire', listingTier);
  const canShowWebsite = listing.website &&
    ListingTierEnforcer.isFeatureAvailable('website', listingTier);

  // Check if any contact action exists
  const hasAnyContact = canShowBizWire || listing.phone || listing.email || canShowWebsite;

  if (!hasAnyContact) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden p-3">
      {/* Section Title */}
      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
        <Phone className="w-4 h-4 text-biz-orange" />
        Contact Listing
      </h4>

      <div className="space-y-2">
        {/* 1. Conekt via BizWire - Orange (essentials+) */}
        {canShowBizWire && (
          <BizWireContactButton
            listing={listing}
            sourcePage="listing_detail"
            variant="sidebar"
          />
        )}

        {/* 2-4. Email / Call / Website - Icon-only row */}
        {(listing.email || listing.phone || canShowWebsite) && (
          <div className="flex items-center justify-center gap-3 pt-1">
            {listing.email && (
              <a
                href={`mailto:${listing.email}`}
                className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:text-biz-orange transition-colors"
                aria-label="Send email"
                title="Send Email"
              >
                <Mail className="w-5 h-5" />
              </a>
            )}
            {listing.phone && (
              <a
                href={`tel:${listing.phone}`}
                className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:text-biz-orange transition-colors"
                aria-label="Call business"
                title="Call Business"
              >
                <Phone className="w-5 h-5" />
              </a>
            )}
            {canShowWebsite && (
              <a
                href={listing.website || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:text-biz-orange transition-colors"
                aria-label="Visit website"
                title="Visit Website"
              >
                <Globe className="w-5 h-5" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SidebarContactCard;
