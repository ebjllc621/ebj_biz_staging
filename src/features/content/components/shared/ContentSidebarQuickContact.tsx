/**
 * ContentSidebarQuickContact - Contact Business buttons for content sidebars
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Content Sidebar Unification
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @reference src/features/jobs/components/JobSidebarQuickContact.tsx
 */
'use client';

import { Phone, Mail, Globe } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';
import { BizWireContactButton } from '@features/bizwire/components/BizWireContactButton';
import { ListingTierEnforcer } from '@features/listings/utils/ListingTierEnforcer';
import type { ListingTier } from '@features/listings/types/listing-section-layout';

interface ContentSidebarQuickContactProps {
  listing: Listing;
  /** Optional source ID for BizWire tracking */
  sourceId?: number;
  /** Optional source type for BizWire tracking */
  sourceType?: string;
}

export function ContentSidebarQuickContact({ listing, sourceId, sourceType = 'content' }: ContentSidebarQuickContactProps) {
  const listingTier = (listing.tier || 'essentials') as ListingTier;

  // Tier gating
  const canShowBizWire = ListingTierEnforcer.isFeatureAvailable('bizwire', listingTier);
  const canShowWebsite = listing.website &&
    ListingTierEnforcer.isFeatureAvailable('website', listingTier);

  const hasAnyContact = canShowBizWire || listing.phone || listing.email || canShowWebsite;
  if (!hasAnyContact) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Contact Listing</h4>

      <div className="space-y-2">
        {/* 1. Conekt via BizWire - Orange (essentials+) */}
        {canShowBizWire && (
          <BizWireContactButton
            listing={listing}
            sourcePage="content_detail"
            sourceEntityType={sourceType}
            sourceEntityId={sourceId}
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

export default ContentSidebarQuickContact;
