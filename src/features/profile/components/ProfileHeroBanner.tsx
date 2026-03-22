/**
 * ProfileHeroBanner - Hero Section with Cover Image, Avatar, and User Info
 *
 * @tier SIMPLE
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 * @authority docs/pages/layouts/home/user/phases/PHASE_4_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component ('use client' directive)
 * - Path aliases (@features/, @components/)
 * - Lucide React icons only
 */

'use client';

import { MapPin, Briefcase, Calendar, Pencil, Phone, Mail } from 'lucide-react';
import { PublicProfile } from '../types';
import { ProfileCompletionIndicator } from './ProfileCompletionIndicator';
import { ProfileCompletionResult } from '../utils/calculateProfileCompletion';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ProfileHeroBannerProps {
  /** User profile data */
  profile: PublicProfile;
  /** Whether to show edit button */
  showEditButton: boolean;
  /** Edit button click handler */
  onEditClick?: () => void;
  /** Profile completion result (optional) */
  completion?: ProfileCompletionResult | null;
  /** Whether this is the profile owner viewing */
  isOwner?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get initials from name for avatar fallback
 */
function getInitials(name: string | null, displayName: string | null): string {
  const nameToUse = displayName || name || '';
  const parts = nameToUse.split(' ').filter(Boolean);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return nameToUse.substring(0, 2).toUpperCase() || '?';
}

/**
 * Format date for "Member since" display
 * @note Handles both Date objects and ISO date strings (from JSON parsing)
 */
function formatMemberSince(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

/**
 * Get tier badge color classes
 */
function getTierBadgeColor(tier: string): string {
  switch (tier.toLowerCase()) {
    case 'premium':
      return 'bg-purple-100 text-purple-800';
    case 'preferred':
      return 'bg-yellow-100 text-yellow-800';
    case 'plus':
      return 'bg-blue-100 text-blue-800';
    case 'essentials':
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// ============================================================================
// PROFILEHEROBANNER COMPONENT
// ============================================================================

/**
 * ProfileHeroBanner - Hero section with cover image, avatar, and user info
 *
 * @example
 * ```tsx
 * <ProfileHeroBanner
 *   profile={profileData}
 *   showEditButton={true}
 *   onEditClick={() => setEditModalOpen(true)}
 * />
 * ```
 */
export function ProfileHeroBanner({ profile, showEditButton, onEditClick, completion, isOwner }: ProfileHeroBannerProps) {
  const displayName = profile.display_name || profile.name || profile.username;
  const location = [profile.city, profile.state].filter(Boolean).join(', ');

  return (
    <div className="relative">
      {/* Cover Image or Gradient */}
      <div className="h-32 sm:h-40 md:h-48 bg-gradient-to-r from-blue-600 to-purple-600 relative">
        {profile.cover_image_url && (
          <img
            src={profile.cover_image_url}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/20" />

        {/* Profile Completion Indicator (compact variant in hero) */}
        {completion && isOwner && (
          <div className="absolute top-4 right-4 max-w-xs">
            <ProfileCompletionIndicator
              completion={completion}
              onEditClick={onEditClick}
              variant="compact"
              isOwner={isOwner}
            />
          </div>
        )}
      </div>

      {/* Profile Content */}
      <div className="relative px-4 sm:px-6 lg:px-8 pb-6 flex justify-center">
        {/* Title Box - Light background for readability against cover images */}
        {/* Reduced overlap: ~10% of cover height, max 70% width */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 sm:p-5 -mt-4 sm:-mt-5 w-full max-w-[70%]">
          <div className="flex flex-col sm:flex-row sm:items-end">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-lg object-cover bg-white"
                />
              ) : (
                <div
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-lg flex items-center justify-center"
                  style={{ backgroundColor: profile.avatar_bg_color || '#022641' }}
                >
                  <span className="text-2xl sm:text-3xl font-bold text-white">
                    {getInitials(profile.name, profile.display_name)}
                  </span>
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="mt-4 sm:mt-0 sm:ml-6 sm:pb-2 flex-1">
              <div className="flex items-start justify-between">
                <div>
                  {/* Display Name */}
                  <h1 className="text-2xl sm:text-3xl font-bold text-[#022641]">
                    {displayName}
                  </h1>

                  {/* Info Row */}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                    {/* Tier Badge */}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTierBadgeColor(profile.membership_tier)}`}>
                      {profile.membership_tier.charAt(0).toUpperCase() + profile.membership_tier.slice(1)} Member
                    </span>

                    {/* Occupation */}
                    {profile.occupation && (
                      <span className="flex items-center">
                        <Briefcase className="w-4 h-4 mr-1" />
                        {profile.occupation}
                      </span>
                    )}

                    {/* Location */}
                    {location && (
                      <span className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {location}
                      </span>
                    )}

                    {/* Phone Number (visibility-controlled by server) */}
                    {profile.contact_phone && (
                      <span className="flex items-center">
                        <Phone className="w-4 h-4 mr-1" />
                        <a
                          href={`tel:${profile.contact_phone}`}
                          className="hover:text-[#ed6437] transition-colors"
                        >
                          {profile.contact_phone}
                        </a>
                      </span>
                    )}

                    {/* Email (visibility-controlled by server) */}
                    {profile.email && (
                      <span className="flex items-center">
                        <Mail className="w-4 h-4 mr-1" />
                        <a
                          href={`mailto:${profile.email}`}
                          className="hover:text-[#ed6437] transition-colors"
                        >
                          {profile.email}
                        </a>
                      </span>
                    )}

                    {/* Member Since */}
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      Member since {formatMemberSince(profile.created_at)}
                    </span>
                  </div>
                </div>

                {/* Edit Button */}
                {showEditButton && (
                  <button
                    onClick={onEditClick}
                    className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a2f] transition-colors font-medium text-sm"
                  >
                    <Pencil className="w-4 h-4" />
                    <span className="hidden sm:inline">Edit Profile</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileHeroBanner;
