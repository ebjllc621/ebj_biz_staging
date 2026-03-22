/**
 * ProfileInfoSection - Profile Information Display (Bio, Goals, Interests, Social Links)
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

import { Globe, Instagram, Linkedin, Twitter, Facebook, Youtube, Music2, MapPin, Users, Award } from 'lucide-react';
import { PublicProfile } from '../types';
import type { CategoryInterest, CustomInterest, GroupInterest, MembershipInterest } from '../types/user-interests';

// ============================================================================
// ICON COMPONENT MAP
// ============================================================================

const SOCIAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  website: Globe,
  instagram: Instagram,
  linkedin: Linkedin,
  twitter: Twitter,
  facebook: Facebook,
  youtube: Youtube,
  tiktok: Music2,
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ProfileInfoSectionProps {
  /** User profile data */
  profile: PublicProfile;
  /** Category interests from user_interests table (Phase 3A) */
  categoryInterests?: CategoryInterest[];
  /** Custom interests from user_interests table (Phase 3B) */
  customInterests?: CustomInterest[];
  /** Groups from user_interests table (Phase 3C) */
  groups?: GroupInterest[];
  /** Memberships from user_interests table (Phase 3C) */
  memberships?: MembershipInterest[];
}

// ============================================================================
// SOCIAL PLATFORM CONFIG
// ============================================================================

const SOCIAL_PLATFORMS = [
  { key: 'bizconekt', label: 'Bizconekt Listing', bgColor: 'bg-[#F5A882]', hoverColor: 'hover:bg-[#ed6437]', isCustomIcon: true },
  { key: 'website', label: 'Website', bgColor: 'bg-gray-400', hoverColor: 'hover:bg-gray-500' },
  { key: 'instagram', label: 'Instagram', bgColor: 'bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400', hoverColor: 'hover:opacity-80' },
  { key: 'tiktok', label: 'TikTok', bgColor: 'bg-gray-500', hoverColor: 'hover:bg-black' },
  { key: 'linkedin', label: 'LinkedIn', bgColor: 'bg-[#5BA4D4]', hoverColor: 'hover:bg-[#0077B5]' },
  { key: 'twitter', label: 'X (Twitter)', bgColor: 'bg-gray-500', hoverColor: 'hover:bg-gray-700' },
  { key: 'facebook', label: 'Facebook', bgColor: 'bg-[#6BA3E8]', hoverColor: 'hover:bg-[#1877F2]' },
  { key: 'youtube', label: 'YouTube', bgColor: 'bg-[#E57373]', hoverColor: 'hover:bg-[#FF0000]' }
] as const;

// ============================================================================
// PROFILEINFOSECTION COMPONENT
// ============================================================================

/**
 * ProfileInfoSection - Display bio, goals, interests, and social links
 *
 * @example
 * ```tsx
 * <ProfileInfoSection profile={profileData} />
 * ```
 */
export function ProfileInfoSection({
  profile,
  categoryInterests = [],
  customInterests = [],
  groups = [],
  memberships = []
}: ProfileInfoSectionProps) {
  const hasBio = profile.bio && profile.bio.trim().length > 0;
  const hasGoals = profile.goals && profile.goals.trim().length > 0;
  const hasSkills = profile.skills && profile.skills.length > 0;
  const hasHobbies = profile.hobbies && profile.hobbies.trim().length > 0;
  const hasEducation = profile.high_school || profile.college || profile.degree;
  const hasSocialLinks = profile.social_links && Object.values(profile.social_links).some(url => url);
  // Phase 2: Hometown
  const hasHometown = profile.hometown && profile.hometown.trim().length > 0;
  // Phase 3A/3B/3C: User interests from user_interests table
  const hasCategoryInterests = categoryInterests.length > 0;
  const hasCustomInterests = customInterests.length > 0;
  const hasGroups = groups.length > 0;
  const hasMemberships = memberships.length > 0;

  // If nothing to show, don't render
  if (!hasBio && !hasGoals && !hasSkills && !hasHobbies && !hasEducation && !hasSocialLinks && !hasHometown && !hasCategoryInterests && !hasCustomInterests && !hasGroups && !hasMemberships) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* 1. Bio */}
      {hasBio && (
        <div>
          <h2 className="text-lg font-semibold text-[#022641] mb-3">About</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
        </div>
      )}

      {/* 2. Hobbies & Activities */}
      {hasHobbies && (
        <div>
          <h2 className="text-lg font-semibold text-[#022641] mb-3">Hobbies & Activities</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{profile.hobbies}</p>
        </div>
      )}

      {/* 3. Skills */}
      {hasSkills && (
        <div>
          <h2 className="text-lg font-semibold text-[#022641] mb-3">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {profile.skills!.map((skill, index) => (
              <span
                key={index}
                className="bg-[#022641] text-white px-3 py-1 rounded-full text-sm font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 4. Goals */}
      {hasGoals && (
        <div>
          <h2 className="text-lg font-semibold text-[#022641] mb-3">Goals</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{profile.goals}</p>
        </div>
      )}

      {/* 5. Groups & Organizations (from user_interests table - Phase 3C) */}
      {hasGroups && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-[#022641]" />
            <h2 className="text-lg font-semibold text-[#022641]">Groups & Organizations</h2>
          </div>
          <div className="space-y-2">
            {groups.map((group) => (
              <div
                key={group.id}
                className="bg-gray-50 rounded-lg p-3 border border-gray-200"
              >
                <p className="font-medium text-[#022641]">{group.group_name}</p>
                {group.group_role && (
                  <p className="text-sm text-gray-600">Role: {group.group_role}</p>
                )}
                {group.group_purpose && (
                  <p className="text-sm text-gray-500 mt-1">{group.group_purpose}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Memberships & Certifications (from user_interests table - Phase 3C) */}
      {hasMemberships && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5 text-[#ed6437]" />
            <h2 className="text-lg font-semibold text-[#022641]">Memberships & Certifications</h2>
          </div>
          <div className="space-y-2">
            {memberships.map((membership) => (
              <div
                key={membership.id}
                className="bg-gray-50 rounded-lg p-3 border border-gray-200"
              >
                <p className="font-medium text-[#022641]">{membership.membership_name}</p>
                {membership.membership_description && (
                  <p className="text-sm text-gray-500 mt-1">{membership.membership_description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Other Interests (Combined Category + Custom Interests - unified display) */}
      {(hasCategoryInterests || hasCustomInterests) && (
        <div>
          <h2 className="text-lg font-semibold text-[#022641] mb-3">Other Interests</h2>
          <div className="flex flex-wrap gap-2">
            {/* Category interests displayed as badges */}
            {categoryInterests.map((interest) => (
              <span
                key={`category-${interest.id}`}
                className="bg-[#F5A882] text-[#022641] px-3 py-1 rounded-full text-sm font-medium"
              >
                {interest.category_name}
              </span>
            ))}
            {/* Custom interests displayed as badges (same styling) */}
            {customInterests.map((interest) => (
              <span
                key={`custom-${interest.id}`}
                className="bg-[#F5A882] text-[#022641] px-3 py-1 rounded-full text-sm font-medium"
              >
                {interest.custom_value}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 8. Education */}
      {hasEducation && (
        <div>
          <h2 className="text-lg font-semibold text-[#022641] mb-3">Education</h2>
          <div className="space-y-2 text-gray-700">
            {profile.college && (
              <p>
                <span className="font-medium">{profile.college}</span>
                {profile.degree && <span className="text-gray-500"> - {profile.degree}</span>}
                {profile.college_year && <span className="text-gray-500"> ({profile.college_year})</span>}
              </p>
            )}
            {profile.high_school && (
              <p>
                <span className="font-medium">{profile.high_school}</span>
                {profile.high_school_year && <span className="text-gray-500"> ({profile.high_school_year})</span>}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 9. Hometown */}
      {hasHometown && (
        <div className="flex items-start gap-2">
          <MapPin className="w-5 h-5 text-[#ed6437] mt-0.5 flex-shrink-0" />
          <div>
            <h2 className="text-lg font-semibold text-[#022641] mb-1">Hometown</h2>
            <p className="text-gray-700">{profile.hometown}</p>
          </div>
        </div>
      )}

      {/* 10. Social Links */}
      {hasSocialLinks && (
        <div>
          <h2 className="text-lg font-semibold text-[#022641] mb-3">Connect</h2>
          <div className="flex flex-wrap gap-4">
            {SOCIAL_PLATFORMS.map((platform) => {
              const { key, label, bgColor, hoverColor } = platform;
              const isCustomIcon = 'isCustomIcon' in platform && platform.isCustomIcon;
              const url = profile.social_links?.[key];
              if (!url) return null;

              const IconComponent = SOCIAL_ICONS[key];

              return (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Visit ${label}`}
                  className={`w-12 h-12 rounded-full ${bgColor} ${hoverColor} flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105`}
                >
                  {isCustomIcon ? (
                    <img
                      src="/uploads/site/branding/logo-icon.png"
                      alt={label}
                      className="w-7 h-7 object-contain"
                    />
                  ) : (
                    IconComponent && <IconComponent className="w-6 h-6 text-white" />
                  )}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileInfoSection;
