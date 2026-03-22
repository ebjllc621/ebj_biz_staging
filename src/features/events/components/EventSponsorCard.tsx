/**
 * EventSponsorCard - Individual sponsor display card
 *
 * Displays a sponsor with tier-appropriate sizing:
 * - title: full-width card with logo + message
 * - gold: medium card with logo
 * - silver: small card with logo
 * - bronze: text-only minimal
 * - community: badge-only minimal
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 5 - Task 5.7: EventSponsorCard
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import type { EventSponsor } from '@features/events/types';

interface EventSponsorCardProps {
  sponsor: EventSponsor;
  onSponsorClick?: (_sponsorId: number) => void;
}

const tierConfig = {
  title: {
    cardClass: 'w-full border-2 border-amber-300 bg-amber-50 rounded-xl p-5',
    logoSize: 'h-16 max-w-[120px]',
    showMessage: true,
    showCategory: true,
    label: 'Title Sponsor',
    labelClass: 'text-xs font-semibold text-amber-700 uppercase tracking-wide',
  },
  gold: {
    cardClass: 'border border-yellow-200 bg-yellow-50 rounded-lg p-4',
    logoSize: 'h-10 max-w-[80px]',
    showMessage: false,
    showCategory: true,
    label: 'Gold Sponsor',
    labelClass: 'text-xs font-medium text-yellow-700 uppercase tracking-wide',
  },
  silver: {
    cardClass: 'border border-gray-200 bg-gray-50 rounded-lg p-3',
    logoSize: 'h-8 max-w-[60px]',
    showMessage: false,
    showCategory: false,
    label: 'Silver Sponsor',
    labelClass: 'text-xs font-medium text-gray-500 uppercase tracking-wide',
  },
  bronze: {
    cardClass: 'border border-orange-100 bg-orange-50 rounded-md px-3 py-2',
    logoSize: '',
    showMessage: false,
    showCategory: false,
    label: 'Bronze Sponsor',
    labelClass: 'text-xs font-medium text-orange-600 uppercase tracking-wide',
  },
  community: {
    cardClass: 'border border-green-100 bg-green-50 rounded-md px-3 py-2',
    logoSize: '',
    showMessage: false,
    showCategory: false,
    label: 'Community Sponsor',
    labelClass: 'text-xs font-medium text-green-600 uppercase tracking-wide',
  },
} as const;

export function EventSponsorCard({ sponsor, onSponsorClick }: EventSponsorCardProps) {
  const config = tierConfig[sponsor.sponsor_tier];
  const href = sponsor.listing_slug ? `/listings/${sponsor.listing_slug}` : undefined;
  const displayName = sponsor.listing_name || 'Sponsor';

  const handleClick = () => {
    if (onSponsorClick) {
      onSponsorClick(sponsor.id);
    }
  };

  const cardContent = (
    <div className={`${config.cardClass} transition-shadow hover:shadow-md`}>
      <div className="flex items-center gap-3">
        {/* Logo for title/gold/silver tiers */}
        {config.logoSize && sponsor.listing_logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sponsor.listing_logo}
            alt={displayName}
            className={`object-contain ${config.logoSize} flex-shrink-0`}
          />
        ) : config.logoSize ? (
          <div className={`${config.logoSize} flex items-center justify-center bg-white rounded border border-gray-200 flex-shrink-0`}>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">
              {displayName.charAt(0)}
            </span>
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <p className={config.labelClass}>{config.label}</p>
          <p className="font-semibold text-gray-900 truncate">{displayName}</p>
          {config.showCategory && sponsor.listing_tier && (
            <p className="text-xs text-gray-500 mt-0.5">{sponsor.listing_tier}</p>
          )}
          {config.showMessage && sponsor.sponsor_message && (
            <p className="text-sm text-gray-700 mt-2 leading-snug">{sponsor.sponsor_message}</p>
          )}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="block"
      >
        {cardContent}
      </a>
    );
  }

  return (
    <div onClick={handleClick} className={onSponsorClick ? 'cursor-pointer' : undefined}>
      {cardContent}
    </div>
  );
}
