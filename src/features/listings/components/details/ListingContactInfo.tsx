/**
 * ListingContactInfo - Contact Information Display
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 3 - Location & Contact
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Phone with click-to-call (tel: link)
 * - Email with click-to-email (mailto: link)
 * - Website with external link
 * - Responsive card layout
 *
 * @see docs/pages/layouts/listings/details/phases/PHASE_3_BRAIN_PLAN.md
 */
'use client';

import Link from 'next/link';
import { Phone, Mail, Globe, ExternalLink, Settings } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';
import { ListingTierEnforcer } from '@features/listings/utils/ListingTierEnforcer';
import type { ListingTier } from '@features/listings/types/listing-section-layout';

interface ListingContactInfoProps {
  /** Listing data */
  listing: Listing;
  isEditMode?: boolean;
}

interface ContactItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
  external?: boolean;
}

/**
 * Individual contact item with icon and link
 */
function ContactItem({ icon, label, value, href, external = false }: ContactItemProps) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-biz-orange/10 flex items-center justify-center text-biz-orange group-hover:bg-biz-orange group-hover:text-white transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <span className="block text-xs text-gray-500 uppercase tracking-wide">
          {label}
        </span>
        <span className="block text-gray-900 font-medium truncate group-hover:text-biz-orange transition-colors">
          {value}
        </span>
      </div>
      {external && (
        <ExternalLink className="w-4 h-4 text-gray-600 flex-shrink-0 mt-3" />
      )}
    </a>
  );
}

export function ListingContactInfo({ listing, isEditMode }: ListingContactInfoProps) {
  const hasPhone = Boolean(listing.phone);
  const hasEmail = Boolean(listing.email);

  // Website requires Plus tier or higher - tier-gate it
  const listingTier = (listing.tier || 'essentials') as ListingTier;
  const hasWebsite = Boolean(listing.website) &&
    ListingTierEnforcer.isFeatureAvailable('website', listingTier);

  const hasContactInfo = hasPhone || hasEmail || hasWebsite;

  // Show empty state in edit mode when no contact info
  if (isEditMode && !hasContactInfo) {
    return (
      <section className="bg-white rounded-lg shadow-sm p-6 border-2 border-dashed border-gray-300">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <Phone className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              Contact Information
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              No contact info yet. Add phone, email, or website.
            </p>
            <Link
              href={`/dashboard/listings/${String(listing.id)}/contact-info` as any}
              className="inline-flex items-center gap-2 px-4 py-2 bg-biz-navy text-white text-sm font-medium rounded-md hover:bg-biz-navy/90 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configure
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Return null in published mode when no contact info
  if (!hasContactInfo) {
    return null;
  }

  return (
    <section className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-biz-navy mb-4">
        Contact Information
      </h2>

      <div className="space-y-1">
        {/* Phone */}
        {hasPhone && (
          <ContactItem
            icon={<Phone className="w-5 h-5" />}
            label="Phone"
            value={listing.phone!}
            href={`tel:${listing.phone}`}
          />
        )}

        {/* Email */}
        {hasEmail && (
          <ContactItem
            icon={<Mail className="w-5 h-5" />}
            label="Email"
            value={listing.email!}
            href={`mailto:${listing.email}`}
          />
        )}

        {/* Website */}
        {hasWebsite && (
          <ContactItem
            icon={<Globe className="w-5 h-5" />}
            label="Website"
            value={listing.website!.replace(/^https?:\/\/(www\.)?/, '')}
            href={listing.website!.startsWith('http') ? listing.website! : `https://${listing.website}`}
            external
          />
        )}
      </div>
    </section>
  );
}

export default ListingContactInfo;
