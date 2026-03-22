/**
 * Profile Feature Type Definitions
 *
 * @authority docs/pages/layouts/home/user/phases/PHASE_4_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 */

import { ConnectionStatus } from '@features/connections/types';

// Phase 3A: Export user interests types
export * from './user-interests';

// Phase 6: Export profile layout types
export * from './profile-layout';

// Re-import ProfileLayout for use in this file
import { ProfileLayout } from './profile-layout';

// ============================================================================
// PUBLIC PROFILE TYPES
// ============================================================================

/**
 * Public profile data visible to other users
 * Fields are filtered based on visibility settings
 */
export interface PublicProfile {
  /** User ID */
  id: number;
  /** Unique username for profile URL */
  username: string;
  /** Full name */
  name: string | null;
  /** Display name (shown publicly) */
  display_name: string | null;
  /** Email address (visibility controlled by showEmail setting) */
  email: string | null;
  /** Contact phone number (visibility controlled by showPhone setting) */
  contact_phone: string | null;
  /** User bio/about text */
  bio: string | null;
  /** Occupation/job title */
  occupation: string | null;
  /** User goals */
  goals: string | null;
  /** Social media links */
  social_links: Record<string, string> | null;
  /** Avatar image URL */
  avatar_url: string | null;
  /** Avatar background color for default avatars */
  avatar_bg_color: string | null;
  /** Cover/banner image URL */
  cover_image_url: string | null;
  /** City */
  city: string | null;
  /** State/province */
  state: string | null;
  /** Country */
  country: string | null;

  // Phase 2: Extended biographical fields
  /** Where user grew up */
  hometown: string | null;
  /** High school name */
  high_school: string | null;
  /** High school graduation year */
  high_school_year: number | null;
  /** College/University name */
  college: string | null;
  /** College graduation year */
  college_year: number | null;
  /** Degree/Field of study */
  degree: string | null;
  /** Skills (array of skill tags) */
  skills: string[] | null;
  /** Hobbies and activities */
  hobbies: string | null;

  /** Membership tier (essentials/plus/preferred/premium) */
  membership_tier: string;
  /** User role */
  role: string;
  /** Account creation date (Date object or ISO string from JSON) */
  created_at: Date | string;
  /** Profile visibility setting */
  profile_visibility: 'public' | 'connections' | 'private';
  /** Granular visibility settings (only returned to profile owner) */
  visibility_settings?: ProfileVisibilitySettings | null;
  /** User preferences (only returned to profile owner) */
  user_preferences?: UserProfilePreferences | null;
  /** Profile panel layout preferences (only returned to profile owner) */
  profile_layout?: ProfileLayout | null;
}

// ============================================================================
// PROFILE STATISTICS
// ============================================================================

/**
 * Profile statistics for display
 */
export interface ProfileStats {
  /** Number of profile views (last 30 days) */
  profile_views: number;
  /** Number of connections */
  connections: number;
  /** Number of recommendations received */
  recommendations: number;
}

// ============================================================================
// PROFILE UPDATE TYPES
// ============================================================================

/**
 * Data that can be updated on a profile
 * All fields are optional - only provided fields are updated
 * @note Uses first_name and last_name (NOT a single 'name' field)
 */
export interface ProfileUpdateData {
  /** First name */
  first_name?: string;
  /** Last name */
  last_name?: string;
  /** Display name */
  display_name?: string;
  /** Contact phone number */
  contact_phone?: string;
  /** Bio text */
  bio?: string;
  /** Occupation */
  occupation?: string;
  /** Goals text */
  goals?: string;
  /** Social media links */
  social_links?: Record<string, string>;
  /** Avatar URL (null to clear) */
  avatar_url?: string | null;
  /** Cover image URL (null to clear) */
  cover_image_url?: string | null;
  /** City */
  city?: string;
  /** State */
  state?: string;
  /** Country */
  country?: string;

  // Phase 2: Extended biographical fields
  /** Where user grew up */
  hometown?: string;
  /** High school name */
  high_school?: string;
  /** High school graduation year */
  high_school_year?: number;
  /** College/University name */
  college?: string;
  /** College graduation year */
  college_year?: number;
  /** Degree/Field of study */
  degree?: string;
  /** Skills (array of skill tags) */
  skills?: string[];
  /** Hobbies and activities */
  hobbies?: string;

  /** Profile visibility */
  profile_visibility?: 'public' | 'connections' | 'private';
  /** Avatar background color for default avatars */
  avatar_bg_color?: string;
  /** Granular visibility settings */
  visibility_settings?: Partial<ProfileVisibilitySettings>;
  /** User preferences */
  user_preferences?: Partial<UserProfilePreferences>;
}

// ============================================================================
// PASSWORD CHANGE TYPES
// ============================================================================

/**
 * Password change request data
 */
export interface PasswordChangeData {
  /** Current password for verification */
  current_password: string;
  /** New password */
  new_password: string;
  /** Confirm new password */
  confirm_password: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Response from GET /api/users/[username]/profile
 */
export interface ProfilePageResponse {
  /** Profile data */
  profile: PublicProfile;
  /** Profile statistics */
  stats: ProfileStats;
  /** Whether the viewer is the profile owner */
  is_owner: boolean;
  /** Whether the viewer can edit the profile */
  can_edit: boolean;
  /** Connection status between viewer and profile owner */
  connection_status: ConnectionStatus;
  /** Whether the viewer is following the profile owner */
  is_following: boolean;
}

/**
 * Response from PUT /api/users/profile
 */
export interface ProfileUpdateResponse {
  /** Updated profile data */
  profile: PublicProfile;
  /** Success message */
  message: string;
}

/**
 * Response from PUT /api/users/profile/password
 */
export interface PasswordChangeResponse {
  /** Success message */
  message: string;
}

// ============================================================================
// VISIBILITY SETTINGS (Granular Privacy Controls)
// ============================================================================

/**
 * Visibility level for profile fields
 */
export type FieldVisibility = 'public' | 'connections' | 'hidden';

/**
 * Granular visibility settings for profile fields
 * Controls what different user groups can see
 */
export interface ProfileVisibilitySettings {
  /** Overall profile visibility */
  profileVisibility: 'public' | 'connections' | 'private';
  /** Email visibility */
  showEmail: FieldVisibility;
  /** Phone visibility */
  showPhone: FieldVisibility;
  /** Social links visibility */
  showSocialLinks: FieldVisibility;
  /** Location visibility */
  showLocation: FieldVisibility;
  /** Occupation visibility */
  showOccupation: FieldVisibility;
  /** Whether to show interests */
  showInterests: boolean;
  /** Whether to show goals */
  showGoals: boolean;

  // Phase 2: Extended field visibility
  /** Hometown visibility */
  showHometown: FieldVisibility;
  /** Education (high school + college) visibility */
  showEducation: FieldVisibility;
  /** Skills visibility */
  showSkills: FieldVisibility;
  /** Hobbies visibility */
  showHobbies: FieldVisibility;

  // Phase 3A: Category interests visibility
  /** Category interests visibility */
  showCategoryInterests: FieldVisibility;

  // Phase 3B: Custom interests visibility
  /** Custom interests visibility */
  showCustomInterests: FieldVisibility;

  // Phase 3C: Groups and Memberships visibility
  /** Groups visibility */
  showGroups: FieldVisibility;
  /** Memberships visibility */
  showMemberships: FieldVisibility;

  /** Allow profile view tracking */
  allowProfileViews: boolean;
  /** Allow search engine indexing */
  indexable: boolean;
  /** Show on member directory */
  showOnMemberDirectory: boolean;
  /** Allow direct messages */
  allowDirectMessages: boolean;
}

/**
 * Default visibility settings
 */
export const DEFAULT_VISIBILITY_SETTINGS: ProfileVisibilitySettings = {
  profileVisibility: 'public',
  showEmail: 'connections',
  showPhone: 'connections',
  showSocialLinks: 'public',
  showLocation: 'public',
  showOccupation: 'public',
  showInterests: true,
  showGoals: true,
  showHometown: 'public',
  showEducation: 'public',
  showSkills: 'public',
  showHobbies: 'public',
  showCategoryInterests: 'public',
  showCustomInterests: 'public',
  showGroups: 'public',
  showMemberships: 'public',
  allowProfileViews: true,
  indexable: false,
  showOnMemberDirectory: true,
  allowDirectMessages: true
};

// ============================================================================
// USER PREFERENCES (Notification & Data Settings)
// ============================================================================

/**
 * User notification and data preferences
 */
export interface UserProfilePreferences {
  /** General email notifications */
  emailNotifications: boolean;
  /** Marketing emails opt-in */
  marketingEmails: boolean;
  /** Data processing consent */
  dataProcessing: boolean;
  /** Weekly digest emails */
  weeklyDigest: boolean;
  /** Profile completion reminders */
  profileCompletionReminders: boolean;
  /** Activity notifications (likes, comments) */
  activityNotifications: boolean;
  /** Connection request notifications */
  connectionRequests: boolean;
  /** Profile view notifications */
  profileViewNotifications: boolean;
}

/**
 * Default user preferences
 */
export const DEFAULT_USER_PREFERENCES: UserProfilePreferences = {
  emailNotifications: true,
  marketingEmails: false,
  dataProcessing: true,
  weeklyDigest: true,
  profileCompletionReminders: true,
  activityNotifications: true,
  connectionRequests: true,
  profileViewNotifications: false
};

// ============================================================================
// AVATAR CUSTOMIZATION
// ============================================================================

/**
 * Available background colors for default avatars
 */
export const AVATAR_BG_COLORS = [
  { value: '#022641', label: 'Navy Blue', name: 'primary' },
  { value: '#ed6437', label: 'Orange', name: 'accent' },
  { value: '#6b7280', label: 'Gray', name: 'neutral' },
  { value: '#7c3aed', label: 'Purple', name: 'purple' },
  { value: '#059669', label: 'Green', name: 'green' },
  { value: '#dc2626', label: 'Red', name: 'red' }
] as const;

export type AvatarBgColor = typeof AVATAR_BG_COLORS[number]['value'];

// ============================================================================
// DATABASE ROW TYPES
// ============================================================================

/**
 * Raw user row from database query
 * @reference src/core/types/db-rows.ts - UserRow interface
 * @note Uses first_name and last_name columns (NOT a single 'name' column)
 */
export interface UserProfileRow {
  id: number;
  username: string;
  first_name: string | null;  // Actual DB column (not 'name')
  last_name: string | null;   // Actual DB column (not 'name')
  display_name: string | null;
  contact_phone: string | null;  // Contact phone (visibility controlled by showPhone)
  email: string;
  bio: string | null;
  occupation: string | null;
  goals: string | null;
  social_links: string | null; // JSON string
  avatar_url: string | null;
  avatar_bg_color: string | null;
  cover_image_url: string | null;
  city: string | null;
  state: string | null;
  country: string | null;

  // Phase 2: Extended biographical fields
  hometown: string | null;
  high_school: string | null;
  high_school_year: number | null;
  college: string | null;
  college_year: number | null;
  degree: string | null;
  skills: string | null; // JSON string in DB
  hobbies: string | null;

  role: string;  // Database uses 'role', not 'membership_tier'
  created_at: Date;
  profile_visibility: 'public' | 'connections' | 'private' | null;
  // GOVERNANCE: MariaDB auto-parses JSON columns - can be string OR object
  // @see docs/dna/mariadb-behavioral-patterns.md
  visibility_settings: string | ProfileVisibilitySettings | null;
  user_preferences: string | UserProfilePreferences | null;
  password_hash?: string;
}
