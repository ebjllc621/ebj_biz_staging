/**
 * ContentSidebarCreatorCard - Creator Profile card for content sidebars
 *
 * Shows the listing owner's avatar, name, and provides
 * "View Profile" and "Contact Creator" action buttons.
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Content Sidebar Unification
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @reference src/features/jobs/components/JobSidebarBusinessHeader.tsx
 */
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { User, MessageSquare } from 'lucide-react';
import type { Listing } from '@core/services/ListingService';
import { getAvatarInitials } from '@core/utils/avatar';

interface ContentSidebarCreatorCardProps {
  listing: Listing;
  /** Accent color for avatar fallback gradient */
  accentColor?: 'orange' | 'purple' | 'teal';
  /** Called when Contact Creator is clicked */
  onContactClick?: () => void;
}

const GRADIENT_MAP = {
  orange: 'from-orange-500 to-orange-700',
  purple: 'from-purple-500 to-purple-700',
  teal: 'from-teal-500 to-teal-700',
} as const;

const ACCENT_COLOR_MAP = {
  orange: 'bg-biz-orange hover:bg-biz-orange/90',
  purple: 'bg-purple-600 hover:bg-purple-700',
  teal: 'bg-teal-600 hover:bg-teal-700',
} as const;

const ACCENT_OUTLINE_MAP = {
  orange: 'border-biz-orange text-biz-orange hover:bg-biz-orange hover:text-white',
  purple: 'border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white',
  teal: 'border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white',
} as const;

export function ContentSidebarCreatorCard({
  listing,
  accentColor = 'orange',
  onContactClick,
}: ContentSidebarCreatorCardProps) {
  const gradient = GRADIENT_MAP[accentColor];
  const accentBtn = ACCENT_COLOR_MAP[accentColor];
  const outlineBtn = ACCENT_OUTLINE_MAP[accentColor];

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Creator Profile
      </h4>

      {/* Avatar + Name */}
      <div className="flex flex-col items-center text-center">
        <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 mb-2">
          {listing.logo_url ? (
            <Image
              src={listing.logo_url}
              alt={listing.name}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${gradient}`}>
              <span className="text-white text-lg font-bold">
                {getAvatarInitials(listing.name)}
              </span>
            </div>
          )}
        </div>

        <p className="font-semibold text-gray-900 text-sm line-clamp-1">
          {listing.name}
        </p>
        {listing.type && (
          <p className="text-xs text-gray-500 capitalize">{listing.type}</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-4 space-y-2">
        <Link
          href={`/listings/${listing.slug}`}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors ${accentBtn}`}
        >
          <User className="w-4 h-4" />
          View Profile
        </Link>

        {onContactClick ? (
          <button
            onClick={onContactClick}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border-2 transition-colors ${outlineBtn}`}
          >
            <MessageSquare className="w-4 h-4" />
            Contact Creator
          </button>
        ) : (
          <Link
            href={`/listings/${listing.slug}#contact`}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border-2 transition-colors ${outlineBtn}`}
          >
            <MessageSquare className="w-4 h-4" />
            Contact Creator
          </Link>
        )}
      </div>
    </div>
  );
}

export default ContentSidebarCreatorCard;
