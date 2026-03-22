/**
 * EventSponsorBadge - Inline "Sponsored by [Business Name]" badge
 *
 * Shown in the hero section for title-tier sponsors only.
 * Pill-shaped badge linking to the sponsor's listing.
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 5 - Task 5.8: EventSponsorBadge
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

interface EventSponsorBadgeProps {
  sponsorName: string;
  sponsorSlug?: string;
  className?: string;
}

export function EventSponsorBadge({ sponsorName, sponsorSlug, className = '' }: EventSponsorBadgeProps) {
  const badgeContent = (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium rounded-full ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
      Sponsored by {sponsorName}
    </span>
  );

  if (sponsorSlug) {
    return (
      <a
        href={`/listings/${sponsorSlug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block hover:opacity-80 transition-opacity"
      >
        {badgeContent}
      </a>
    );
  }

  return badgeContent;
}
