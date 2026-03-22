/**
 * ProfilePreviewPanel - Simplified read-only profile preview
 *
 * @description Collapsible preview panel showing a simplified view of the creator profile
 *   as it would appear publicly. Does NOT fetch data — renders from provided profile prop.
 * @component Client Component
 * @tier STANDARD
 * @phase Tier 3 Creator Profiles - Phase 8B
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier3_Phases/PHASE_8B_PORTFOLIO_COLLABORATION_MANAGEMENT.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - Orange theme (#ed6437) for action buttons
 * - getAvatarInitials from @core/utils/avatar — NO local implementations
 */
'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, ExternalLink, Star, FolderOpen, Users } from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';
import { getAvatarInitials } from '@core/utils/avatar';
import type { AffiliateMarketerProfile } from '@core/types/affiliate-marketer';
import type { InternetPersonalityProfile } from '@core/types/internet-personality';

// ============================================================================
// TYPES
// ============================================================================

interface ProfilePreviewPanelProps {
  profileType: 'affiliate_marketer' | 'internet_personality';
  profile: AffiliateMarketerProfile | InternetPersonalityProfile;
  listingId: number;
  refreshKey: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function BadgeList({ items, maxVisible = 5 }: { items: string[]; maxVisible?: number }) {
  const visible = items.slice(0, maxVisible);
  const remaining = items.length - visible.length;
  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map(item => (
        <span
          key={item}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200"
        >
          {item}
        </span>
      ))}
      {remaining > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          +{remaining} more
        </span>
      )}
    </div>
  );
}

// ============================================================================
// AM PREVIEW
// ============================================================================

function AffiliateMarketerPreview({
  profile,
  portfolioCount,
}: {
  profile: AffiliateMarketerProfile;
  portfolioCount: number;
}) {
  const initials = getAvatarInitials(profile.display_name);

  return (
    <div className="space-y-4">
      {/* Profile header */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {profile.profile_image ? (
            <img
              src={profile.profile_image}
              alt={profile.display_name}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-semibold">
              {initials}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-900 truncate">{profile.display_name}</h4>
          {profile.headline && (
            <p className="text-sm text-gray-600 mt-0.5">{profile.headline}</p>
          )}
          {profile.location && (
            <p className="text-xs text-gray-500 mt-0.5">{profile.location}</p>
          )}
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="text-sm text-gray-700 line-clamp-3">{profile.bio}</p>
      )}

      {/* Niches */}
      {profile.niches && profile.niches.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Niches</p>
          <BadgeList items={profile.niches} />
        </div>
      )}

      {/* Specializations */}
      {profile.specializations && profile.specializations.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Specializations</p>
          <BadgeList items={profile.specializations} />
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-4 text-sm text-gray-600 pt-2 border-t border-gray-100">
        <span className="flex items-center gap-1.5">
          <Star className="w-4 h-4 text-yellow-400" />
          {Number(profile.rating_average).toFixed(1)} ({profile.rating_count} reviews)
        </span>
        <span className="flex items-center gap-1.5">
          <FolderOpen className="w-4 h-4" />
          {portfolioCount} portfolio item{portfolioCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Public link */}
      {profile.status === 'active' && profile.slug && (
        <Link
          href={`/affiliate-marketers/${profile.slug}` as Route}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-[#ed6437] hover:underline font-medium"
        >
          <ExternalLink className="w-4 h-4" />
          View full public profile
        </Link>
      )}
    </div>
  );
}

// ============================================================================
// IP PREVIEW
// ============================================================================

function InternetPersonalityPreview({
  profile,
  collaborationCount,
}: {
  profile: InternetPersonalityProfile;
  collaborationCount: number;
}) {
  const initials = getAvatarInitials(profile.display_name);

  return (
    <div className="space-y-4">
      {/* Profile header */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {profile.profile_image ? (
            <img
              src={profile.profile_image}
              alt={profile.display_name}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-semibold">
              {initials}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-900 truncate">{profile.display_name}</h4>
          {profile.headline && (
            <p className="text-sm text-gray-600 mt-0.5">{profile.headline}</p>
          )}
          {profile.location && (
            <p className="text-xs text-gray-500 mt-0.5">{profile.location}</p>
          )}
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="text-sm text-gray-700 line-clamp-3">{profile.bio}</p>
      )}

      {/* Content Categories */}
      {profile.content_categories && profile.content_categories.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Content Categories</p>
          <BadgeList items={profile.content_categories} />
        </div>
      )}

      {/* Collaboration Types */}
      {profile.collaboration_types && profile.collaboration_types.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Collaboration Types</p>
          <BadgeList items={profile.collaboration_types} />
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-4 text-sm text-gray-600 pt-2 border-t border-gray-100">
        <span className="flex items-center gap-1.5">
          <Star className="w-4 h-4 text-yellow-400" />
          {Number(profile.rating_average).toFixed(1)} ({profile.rating_count} reviews)
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="w-4 h-4" />
          {collaborationCount} collaboration{collaborationCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Public link */}
      {profile.status === 'active' && profile.slug && (
        <Link
          href={`/internet-personalities/${profile.slug}` as Route}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-[#ed6437] hover:underline font-medium"
        >
          <ExternalLink className="w-4 h-4" />
          View full public profile
        </Link>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProfilePreviewPanel({
  profileType,
  profile,
  listingId: _listingId,
  refreshKey: _refreshKey,
}: ProfilePreviewPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isAM = profileType === 'affiliate_marketer';
  const amProfile = isAM ? (profile as AffiliateMarketerProfile) : null;
  const ipProfile = !isAM ? (profile as InternetPersonalityProfile) : null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Panel header */}
      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Eye className="w-5 h-5 text-[#ed6437]" />
          <span className="font-medium text-gray-900">Preview Profile</span>
          <span className="text-xs text-gray-500 font-normal">
            — how your profile appears publicly
          </span>
        </div>
        {isExpanded ? (
          <EyeOff className="w-4 h-4 text-gray-400" />
        ) : (
          <Eye className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Collapsible preview body */}
      {isExpanded && (
        <div className="px-6 pb-6 space-y-4">
          {/* Preview banner */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2.5 text-sm text-orange-700 font-medium">
            This is a preview of how your profile will appear publicly.
          </div>

          {/* Bordered preview frame */}
          <div className="border border-dashed border-gray-300 rounded-xl p-5 bg-gray-50">
            {amProfile && (
              <AffiliateMarketerPreview
                profile={amProfile}
                portfolioCount={amProfile.campaign_count}
              />
            )}
            {ipProfile && (
              <InternetPersonalityPreview
                profile={ipProfile}
                collaborationCount={ipProfile.collaboration_count}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePreviewPanel;
