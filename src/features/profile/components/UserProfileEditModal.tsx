/**
 * UserProfileEditModal - Three-Tab Profile Edit Modal
 *
 * @tier ADVANCED
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 * @authority docs/pages/layouts/home/user/phases/PHASE_4_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component ('use client' directive)
 * - BizModal wrapper (MANDATORY for all modals)
 * - ErrorBoundary wrapper (ADVANCED tier requirement)
 * - Path aliases (@features/, @components/)
 * - Lucide React icons only
 * - UMM-compliant image uploads
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, User, Lock, Settings, Camera, X, Plus, Upload, Phone } from 'lucide-react';
import { fetchCsrfToken } from '@core/utils/csrf';
import BizModal, {
  BizModalSectionHeader,
  BizModalInput,
  BizModalTextarea,
  BizModalFormGrid
} from '@/components/BizModal/BizModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { PublicProfile, ProfileUpdateData, PasswordChangeData } from '../types';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { AvatarColorSelector } from './AvatarColorSelector';
import { PrivacySettingsSection } from './PrivacySettingsSection';
import { GuidanceTipsBox } from './GuidanceTipsBox';
import { InterestsCategorySelector } from './InterestsCategorySelector';
import { CustomInterestInput } from './CustomInterestInput';
import { InterestBadge } from './InterestBadge';
import { GroupsSection } from './GroupsSection';
import { MembershipsSection } from './MembershipsSection';
import {
  ProfileVisibilitySettings,
  UserProfilePreferences,
  DEFAULT_VISIBILITY_SETTINGS,
  DEFAULT_USER_PREFERENCES,
  AvatarBgColor,
  CategoryInterest
} from '../types';
import type { CustomInterest, GroupInterest, MembershipInterest } from '../types/user-interests';
import { UserNotificationPreferences } from '@core/services/notification/types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UserProfileEditModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Current user profile data */
  profile: PublicProfile;
  /** Callback after successful update */
  onProfileUpdate?: (_updatedProfile: PublicProfile) => void;
  /** Initial tab to display when modal opens (defaults to 'profile') */
  initialTab?: TabType;
}

type TabType = 'profile' | 'password' | 'settings';

interface ProfileFormData {
  first_name: string;  // Changed from 'name' to match DB schema
  last_name: string;   // Added to match DB schema
  display_name: string;
  contact_phone: string;  // Contact phone number (visibility controlled by showPhone)
  bio: string;
  occupation: string;
  goals: string;
  social_links: Record<string, string>;
  avatar_url: string;
  cover_image_url: string;
  city: string;
  state: string;
  country: string;
  profile_visibility: 'public' | 'connections' | 'private';

  // Phase 2: Extended biographical fields
  hometown: string;
  high_school: string;
  high_school_year: string; // String for form input, convert to number on save
  college: string;
  college_year: string;     // String for form input, convert to number on save
  degree: string;
  skills: string[];
  hobbies: string;
}

interface PasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

// ============================================================================
// USERPROFILEEDITMODAL CONTENT
// ============================================================================

function UserProfileEditModalContent({
  isOpen,
  onClose,
  profile,
  onProfileUpdate,
  initialTab = 'profile'
}: UserProfileEditModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Password visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Phase 2: Skill input
  const [skillInput, setSkillInput] = useState('');

  // Phase 3A: Category interests
  const [categoryInterests, setCategoryInterests] = useState<CategoryInterest[]>([]);

  // Phase 3B: Custom interests from database
  const [customInterests, setCustomInterests] = useState<CustomInterest[]>([]);

  // Phase 3C: Groups and Memberships from database
  const [groups, setGroups] = useState<GroupInterest[]>([]);
  const [memberships, setMemberships] = useState<MembershipInterest[]>([]);

  // Avatar background color
  const [avatarBgColor, setAvatarBgColor] = useState<AvatarBgColor>(
    (profile?.avatar_bg_color as AvatarBgColor) || '#022641'
  );

  // Privacy settings
  const [visibilitySettings, setVisibilitySettings] = useState<ProfileVisibilitySettings>(DEFAULT_VISIBILITY_SETTINGS);
  const [userPreferences, setUserPreferences] = useState<UserProfilePreferences>(DEFAULT_USER_PREFERENCES);

  // Notification preferences (Phase 6)
  const [notificationPreferences, setNotificationPreferences] = useState<UserNotificationPreferences | null>(null);

  // File upload states
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Track original avatar URL to detect removal (for Cloudinary cleanup)
  const [originalAvatarUrl, setOriginalAvatarUrl] = useState<string>('');

  // Profile form data
  // @note Uses first_name/last_name to match actual DB schema
  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    first_name: '',
    last_name: '',
    display_name: '',
    contact_phone: '',
    bio: '',
    occupation: '',
    goals: '',
    social_links: {
      bizconekt: '',
      instagram: '',
      tiktok: '',
      facebook: '',
      twitter: '',
      linkedin: '',
      youtube: '',
      website: ''
    },
    avatar_url: '',
    cover_image_url: '',
    city: '',
    state: '',
    country: '',
    profile_visibility: 'public',
    // Phase 2: Extended biographical fields
    hometown: '',
    high_school: '',
    high_school_year: '',
    college: '',
    college_year: '',
    degree: '',
    skills: [],
    hobbies: ''
  });

  // Password form data
  const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  // ==========================================================================
  // LOAD PROFILE DATA
  // ==========================================================================

  // Set active tab when modal opens with initialTab
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Fetch notification preferences when modal opens and settings tab is accessible
  useEffect(() => {
    const fetchNotificationPreferences = async () => {
      if (!isOpen) return;

      try {
        const response = await fetch('/api/users/settings/notification-preferences', {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          // API response wrapped by createSuccessResponse: { data: { preferences: ... } }
          if (data.data?.preferences) {
            setNotificationPreferences(data.data.preferences);
          }
        }
      } catch {
        // Silently fail - notification preferences are optional
      }
    };

    fetchNotificationPreferences();
  }, [isOpen]);

  // Phase 3A+3B: Fetch all interests when modal opens
  useEffect(() => {
    const loadAllInterests = async () => {
      if (!isOpen) return;

      try {
        // Use username-based endpoint to load target user's interests (not session user's)
        // This fixes the admin edit modal bug where interests were loading from admin's profile
        const response = await fetch(`/api/users/${encodeURIComponent(profile.username)}/interests`, {
          credentials: 'include'
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Category interests (Phase 3A)
            if (result.data.category_interests) {
              setCategoryInterests(result.data.category_interests);
            } else if (result.data.interests) {
              // Backward compatibility
              setCategoryInterests(result.data.interests);
            }

            // Custom interests (Phase 3B)
            if (result.data.custom_interests) {
              setCustomInterests(result.data.custom_interests);
            }

            // Groups (Phase 3C)
            if (result.data.groups) {
              setGroups(result.data.groups);
            }

            // Memberships (Phase 3C)
            if (result.data.memberships) {
              setMemberships(result.data.memberships);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load interests:', err);
      }
    };

    loadAllInterests();
  }, [isOpen]);

  useEffect(() => {
    if (profile && isOpen) {
      // Parse first_name and last_name from the computed name field
      // Note: profile.name is computed as "first_name last_name" by the service
      const nameParts = (profile.name ?? '').split(' ');
      const firstName = nameParts[0] ?? '';
      const lastName = nameParts.slice(1).join(' ') ?? '';

      setProfileForm({
        first_name: firstName,
        last_name: lastName,
        display_name: profile.display_name ?? '',
        contact_phone: profile.contact_phone ?? '',
        bio: profile.bio ?? '',
        occupation: profile.occupation ?? '',
        goals: profile.goals ?? '',
        social_links: {
          bizconekt: profile.social_links?.bizconekt ?? '',
          instagram: profile.social_links?.instagram ?? '',
          tiktok: profile.social_links?.tiktok ?? '',
          facebook: profile.social_links?.facebook ?? '',
          twitter: profile.social_links?.twitter ?? '',
          linkedin: profile.social_links?.linkedin ?? '',
          youtube: profile.social_links?.youtube ?? '',
          website: profile.social_links?.website ?? ''
        },
        avatar_url: profile.avatar_url ?? '',
        cover_image_url: profile.cover_image_url ?? '',
        city: profile.city ?? '',
        state: profile.state ?? '',
        country: profile.country ?? '',
        profile_visibility: profile.profile_visibility,
        // Phase 2: Extended biographical fields
        hometown: profile.hometown ?? '',
        high_school: profile.high_school ?? '',
        high_school_year: profile.high_school_year?.toString() ?? '',
        college: profile.college ?? '',
        college_year: profile.college_year?.toString() ?? '',
        degree: profile.degree ?? '',
        skills: profile.skills ?? [],
        hobbies: profile.hobbies ?? ''
      });

      // Sync avatar background color from profile
      setAvatarBgColor(
        (profile.avatar_bg_color as AvatarBgColor) || '#022641'
      );

      // Track original avatar URL for deletion detection
      setOriginalAvatarUrl(profile.avatar_url ?? '');

      // Load visibility settings from profile, falling back to defaults
      if (profile.visibility_settings) {
        setVisibilitySettings({
          ...DEFAULT_VISIBILITY_SETTINGS,
          ...profile.visibility_settings
        });
      } else {
        setVisibilitySettings(DEFAULT_VISIBILITY_SETTINGS);
      }

      // Load user preferences from profile, falling back to defaults
      if (profile.user_preferences) {
        setUserPreferences({
          ...DEFAULT_USER_PREFERENCES,
          ...profile.user_preferences
        });
      } else {
        setUserPreferences(DEFAULT_USER_PREFERENCES);
      }

      // Reset password form
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      setErrors({});
      setSuccessMessage(null);
    }
  }, [profile, isOpen]);

  // ==========================================================================
  // FORM HANDLERS
  // ==========================================================================

  const handleProfileChange = useCallback((field: keyof ProfileFormData, value: unknown) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }, [errors]);

  const handleSocialLinkChange = useCallback((platform: string, value: string) => {
    setProfileForm(prev => ({
      ...prev,
      social_links: {
        ...prev.social_links,
        [platform]: value
      }
    }));
  }, []);

  const handlePasswordChange = useCallback((field: keyof PasswordFormData, value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }, [errors]);

  // ==========================================================================
  // SKILL HANDLERS (Phase 2)
  // ==========================================================================

  const handleAddSkill = useCallback(() => {
    const trimmed = skillInput.trim();
    if (trimmed && !profileForm.skills.includes(trimmed)) {
      handleProfileChange('skills', [...profileForm.skills, trimmed]);
      setSkillInput('');
    }
  }, [skillInput, profileForm.skills, handleProfileChange]);

  const handleRemoveSkill = useCallback((skill: string) => {
    handleProfileChange('skills', profileForm.skills.filter(s => s !== skill));
  }, [profileForm.skills, handleProfileChange]);

  // ==========================================================================
  // CUSTOM INTEREST HANDLERS (Phase 3B)
  // ==========================================================================

  // Phase 3B: Handler for removing custom interests
  // Uses username-based endpoint to ensure we delete from target user's profile
  const handleRemoveCustomInterest = useCallback(async (interestId: number) => {
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(profile.username)}/interests/${interestId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setCustomInterests(prev => prev.filter(i => i.id !== interestId));
      } else {
        console.error('Failed to remove custom interest');
      }
    } catch (err) {
      console.error('Remove custom interest error:', err);
    }
  }, [profile.username]);

  // ==========================================================================
  // FILE UPLOAD HANDLERS
  // ==========================================================================

  // Avatar file upload handler
  const handleAvatarFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', 'users');
      formData.append('entityId', String(profile.id));
      formData.append('mediaType', 'avatar');

      // Fetch CSRF token for upload (HttpOnly cookie requires API fetch)
      const csrfToken = await fetchCsrfToken();
      const headers: HeadersInit = {};
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data?.file?.url) {
          handleProfileChange('avatar_url', result.data.file.url);
        }
      } else {
        setErrors({ avatar: 'Failed to upload avatar' });
      }
    } catch {
      setErrors({ avatar: 'Upload error. Please try again.' });
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [profile.id, handleProfileChange]);

  // Cover image file upload handler
  const handleCoverFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', 'users');
      formData.append('entityId', String(profile.id));
      formData.append('mediaType', 'cover');

      // Fetch CSRF token for upload (HttpOnly cookie requires API fetch)
      const csrfToken = await fetchCsrfToken();
      const headers: HeadersInit = {};
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data?.file?.url) {
          handleProfileChange('cover_image_url', result.data.file.url);
        }
      } else {
        setErrors({ cover: 'Failed to upload cover image' });
      }
    } catch {
      setErrors({ cover: 'Upload error. Please try again.' });
    } finally {
      setIsUploadingCover(false);
    }
  }, [profile.id, handleProfileChange]);

  // Visibility settings handler
  const handleVisibilityChange = useCallback((field: keyof ProfileVisibilitySettings, value: unknown) => {
    setVisibilitySettings(prev => ({ ...prev, [field]: value }));
  }, []);

  // Preferences handler
  const handlePreferencesChange = useCallback((field: keyof UserProfilePreferences, value: boolean) => {
    setUserPreferences(prev => ({ ...prev, [field]: value }));
  }, []);

  // Notification preferences handler (Phase 6)
  // Updates local state only - saved on "Save Changes" click via handleSaveSettings
  const handleNotificationPreferencesChange = useCallback((updates: Partial<UserNotificationPreferences>) => {
    if (!notificationPreferences) return;

    // Deep merge for nested category updates
    const newPrefs = {
      ...notificationPreferences,
      ...updates,
      categories: updates.categories
        ? { ...notificationPreferences.categories, ...updates.categories }
        : notificationPreferences.categories
    };
    setNotificationPreferences(newPrefs);
  }, [notificationPreferences]);

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  const validateProfileForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Either first_name or display_name should be provided
    if (!profileForm.first_name.trim() && !profileForm.display_name.trim()) {
      newErrors.first_name = 'First name or display name is required';
    }

    if (!profileForm.display_name.trim()) {
      newErrors.display_name = 'Display name is required';
    }

    // Validate social links
    Object.entries(profileForm.social_links).forEach(([platform, url]) => {
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        newErrors[`social_${platform}`] = 'URL must start with http:// or https://';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [profileForm]);

  const validatePasswordForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!passwordForm.current_password) {
      newErrors.current_password = 'Current password is required';
    }

    if (!passwordForm.new_password) {
      newErrors.new_password = 'New password is required';
    } else if (passwordForm.new_password.length < 8) {
      newErrors.new_password = 'Password must be at least 8 characters';
    }

    if (!passwordForm.confirm_password) {
      newErrors.confirm_password = 'Please confirm your new password';
    } else if (passwordForm.new_password !== passwordForm.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [passwordForm]);

  // ==========================================================================
  // SUBMIT HANDLERS
  // ==========================================================================

  const handleSaveProfile = useCallback(async () => {
    if (!validateProfileForm()) return;

    setIsSubmitting(true);
    setSuccessMessage(null);

    try {
      // Check if avatar was removed (had one, now empty)
      const avatarWasRemoved = originalAvatarUrl && !profileForm.avatar_url;

      // If avatar was removed, delete it from Cloudinary
      if (avatarWasRemoved && profile?.id) {
        try {
          const csrfToken = await fetchCsrfToken();
          if (csrfToken) {
            // Delete the avatar from storage (users/{userId}/avatar/)
            await fetch(`/api/media/upload?entityType=users&entityId=${profile.id}&subfolder=avatar`, {
              method: 'DELETE',
              headers: {
                'X-CSRF-Token': csrfToken,
              },
              credentials: 'include',
            });
            console.log('[PROFILE_EDIT] Deleted avatar from Cloudinary');
          }
        } catch (deleteError) {
          // Log but don't fail the save - avatar cleanup is best-effort
          console.warn('[PROFILE_EDIT] Failed to delete avatar from Cloudinary:', deleteError);
        }
      }

      // Filter out empty social links
      const filteredSocialLinks: Record<string, string> = {};
      Object.entries(profileForm.social_links).forEach(([key, value]) => {
        if (value.trim()) {
          filteredSocialLinks[key] = value.trim();
        }
      });

      // Build update data - use empty string for clearable text fields (not undefined)
      // undefined = "don't update", empty string = "clear this field"
      const updateData: ProfileUpdateData = {
        first_name: profileForm.first_name,  // Allow clearing
        last_name: profileForm.last_name,    // Allow clearing
        display_name: profileForm.display_name,
        contact_phone: profileForm.contact_phone,  // Allow clearing
        bio: profileForm.bio,                // Allow clearing
        occupation: profileForm.occupation,  // Allow clearing
        goals: profileForm.goals,            // Allow clearing
        social_links: filteredSocialLinks,   // Empty object clears all links
        // Use null to explicitly clear avatar (triggers DB update to NULL), undefined means "don't update"
        avatar_url: avatarWasRemoved ? null : (profileForm.avatar_url || undefined),
        cover_image_url: profileForm.cover_image_url || undefined,
        city: profileForm.city,              // Allow clearing
        state: profileForm.state,            // Allow clearing
        country: profileForm.country,        // Allow clearing
        profile_visibility: profileForm.profile_visibility,
        avatar_bg_color: avatarBgColor,
        visibility_settings: visibilitySettings,
        user_preferences: userPreferences,
        // Phase 2: Extended biographical fields
        hometown: profileForm.hometown,      // Allow clearing
        high_school: profileForm.high_school,  // Allow clearing
        high_school_year: profileForm.high_school_year ? parseInt(profileForm.high_school_year, 10) : undefined,
        college: profileForm.college,        // Allow clearing
        college_year: profileForm.college_year ? parseInt(profileForm.college_year, 10) : undefined,
        degree: profileForm.degree,          // Allow clearing
        skills: profileForm.skills,          // Empty array clears skills
        hobbies: profileForm.hobbies         // Allow clearing
      };

      // Use username-based endpoint to ensure we update the correct user
      // This is critical for admin editing other users' profiles
      const response = await fetch(`/api/users/${encodeURIComponent(profile.username)}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessMessage('Profile updated successfully');
        // Update original avatar URL after successful save
        setOriginalAvatarUrl(profileForm.avatar_url);
        if (onProfileUpdate && result.data?.profile) {
          onProfileUpdate(result.data.profile);
        }
      } else {
        setErrors({ submit: result.error?.message || 'Failed to update profile' });
      }
    } catch {
      setErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  }, [profileForm, validateProfileForm, onProfileUpdate, avatarBgColor, visibilitySettings, userPreferences, originalAvatarUrl, profile?.id, profile.username]);

  const handleChangePassword = useCallback(async () => {
    if (!validatePasswordForm()) return;

    setIsSubmitting(true);
    setSuccessMessage(null);

    try {
      const data: PasswordChangeData = {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
        confirm_password: passwordForm.confirm_password
      };

      const response = await fetch('/api/users/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessMessage('Password changed successfully');
        setPasswordForm({
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
      } else {
        setErrors({ submit: result.error?.message || 'Failed to change password' });
      }
    } catch {
      setErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  }, [passwordForm, validatePasswordForm]);

  /**
   * Save settings tab data (visibility + user preferences + notification preferences)
   * Does NOT require profile field validation
   * Closes modal after successful save
   */
  const handleSaveSettings = useCallback(async () => {
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrors({});

    try {
      // Settings tab saves visibility and legacy preferences
      const updateData: ProfileUpdateData = {
        visibility_settings: visibilitySettings,
        user_preferences: userPreferences
      };

      // Use username-based endpoint to ensure we update the correct user
      // This is critical for admin editing other users' profiles
      const response = await fetch(`/api/users/${encodeURIComponent(profile.username)}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      const result = await response.json();

      if (response.ok) {
        // Also save notification preferences if they exist
        if (notificationPreferences) {
          await fetch('/api/users/settings/notification-preferences', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ preferences: notificationPreferences })
          });
        }

        setSuccessMessage('Settings saved successfully');
        if (onProfileUpdate && result.data?.profile) {
          onProfileUpdate(result.data.profile);
        }

        // Close modal after short delay to show success message
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        setErrors({ submit: result.error?.message || 'Failed to save settings' });
      }
    } catch {
      setErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  }, [visibilitySettings, userPreferences, notificationPreferences, onProfileUpdate, onClose, profile.username]);

  const handleSubmit = useCallback(() => {
    if (activeTab === 'profile') {
      handleSaveProfile();
    } else if (activeTab === 'settings') {
      // Settings tab uses separate handler that doesn't require profile validation
      handleSaveSettings();
    } else if (activeTab === 'password') {
      handleChangePassword();
    }
  }, [activeTab, handleSaveProfile, handleSaveSettings, handleChangePassword]);

  // ==========================================================================
  // CLOSE HANDLER
  // ==========================================================================

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    setActiveTab('profile');
    setErrors({});
    setSuccessMessage(null);
    onClose();
  }, [isSubmitting, onClose]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  const footer = (
    <div className="flex justify-end gap-3">
      <button
        onClick={handleClose}
        disabled={isSubmitting}
        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || isUploadingAvatar || isUploadingCover}
        className="px-4 py-2 text-white bg-[#ed6437] rounded-lg hover:bg-[#d55a2f] transition-colors font-medium disabled:opacity-50"
      >
        {isSubmitting ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Profile"
      subtitle={`${profile.name ?? profile.username} • @${profile.username}`}
      maxWidth="2xl"
      footer={footer}
    >
      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'profile'
              ? 'bg-white text-[#022641] shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <User className="w-4 h-4" />
          Profile
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'password'
              ? 'bg-white text-[#022641] shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Lock className="w-4 h-4" />
          Password
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'settings'
              ? 'bg-white text-[#022641] shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 text-sm">{successMessage}</p>
        </div>
      )}

      {/* Error Display */}
      {errors.submit && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{errors.submit}</p>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Guidance Tips Box */}
          <GuidanceTipsBox />

          {/* Profile Picture */}
          <div className="text-center">
            <div className="relative inline-block">
              <div
                className="w-24 h-24 rounded-full overflow-hidden shadow-md flex items-center justify-center"
                style={{ backgroundColor: profileForm.avatar_url ? undefined : avatarBgColor }}
              >
                {profileForm.avatar_url ? (
                  <img src={profileForm.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-white" />
                )}
              </div>
              {/* Remove avatar button - lower left (opposite camera button) */}
              {profileForm.avatar_url && !isUploadingAvatar && (
                <button
                  type="button"
                  onClick={() => setProfileForm(prev => ({ ...prev, avatar_url: '' }))}
                  className="absolute bottom-0 left-0 bg-gray-600 hover:bg-gray-700 text-white p-2 rounded-full shadow-lg transition-colors"
                  title="Remove profile picture"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <label
                htmlFor="avatar-upload"
                className={`absolute bottom-0 right-0 bg-[#ed6437] hover:bg-[#d55a2f] text-white p-2 rounded-full shadow-lg transition-colors cursor-pointer ${isUploadingAvatar ? 'opacity-50' : ''}`}
              >
                {isUploadingAvatar ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
                disabled={isUploadingAvatar}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">Click the camera icon to upload a profile picture</p>
            {errors.avatar && <p className="text-red-600 text-sm mt-1">{errors.avatar}</p>}

            {/* Avatar Color Selector - always show, used for default avatar fallback */}
            <div className="mt-4">
              <AvatarColorSelector
                selectedColor={avatarBgColor}
                onColorSelect={setAvatarBgColor}
                disabled={isUploadingAvatar}
              />
              {profileForm.avatar_url && (
                <p className="text-xs text-gray-500 mt-1">
                  This color is used when your avatar image cannot be loaded
                </p>
              )}
            </div>
          </div>

          {/* Cover Image Upload */}
          <div className="mt-6 p-4 border border-dashed border-gray-300 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-[#022641]">Cover Image</h4>
                <p className="text-sm text-gray-500">Recommended: 1200x300 pixels</p>
              </div>
              <label
                htmlFor="cover-upload"
                className={`flex items-center gap-2 px-4 py-2 bg-[#022641] text-white rounded-lg hover:bg-[#033a5c] transition-colors cursor-pointer ${isUploadingCover ? 'opacity-50' : ''}`}
              >
                {isUploadingCover ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>{profileForm.cover_image_url ? 'Change' : 'Upload'}</span>
              </label>
              <input
                id="cover-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverFileChange}
                disabled={isUploadingCover}
              />
            </div>
            {profileForm.cover_image_url && (
              <div className="mt-3">
                <img
                  src={profileForm.cover_image_url}
                  alt="Cover"
                  className="w-full h-20 object-cover rounded-lg"
                />
              </div>
            )}
            {errors.cover && <p className="text-red-600 text-sm mt-1">{errors.cover}</p>}
          </div>

          {/* Basic Information */}
          <BizModalSectionHeader step={1} title="Basic Information" />
          <BizModalFormGrid>
            <BizModalInput
              label="First Name"
              value={profileForm.first_name}
              onChange={(e) => handleProfileChange('first_name', e.target.value)}
              error={errors.first_name}
            />
            <BizModalInput
              label="Last Name"
              value={profileForm.last_name}
              onChange={(e) => handleProfileChange('last_name', e.target.value)}
              error={errors.last_name}
            />
          </BizModalFormGrid>
          <BizModalFormGrid>
            <BizModalInput
              label="Display Name"
              value={profileForm.display_name}
              onChange={(e) => handleProfileChange('display_name', e.target.value)}
              error={errors.display_name}
              placeholder="How you want to be displayed publicly"
              required
            />
            <div>
              <label className="block font-medium mb-2 text-sm text-[#022641]">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </span>
              </label>
              <input
                type="tel"
                value={profileForm.contact_phone}
                onChange={(e) => handleProfileChange('contact_phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-[#ed6437] focus:ring-orange-200 transition shadow-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Control who sees this in Settings → Profile Visibility
              </p>
            </div>
          </BizModalFormGrid>

          <BizModalFormGrid>
            <BizModalInput
              label="Occupation"
              value={profileForm.occupation}
              onChange={(e) => handleProfileChange('occupation', e.target.value)}
              placeholder="Your profession or job title"
            />
            <div>
              <label className="block font-medium mb-2 text-sm text-[#022641]">Profile Visibility</label>
              <select
                value={profileForm.profile_visibility}
                onChange={(e) => handleProfileChange('profile_visibility', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-[#ed6437] focus:ring-orange-200 transition shadow-sm"
              >
                <option value="public">Public - Anyone can view</option>
                <option value="connections">Connections Only</option>
                <option value="private">Private - Only you</option>
              </select>
            </div>
          </BizModalFormGrid>

          {/* Phase 2: Background & Education Section */}
          <BizModalSectionHeader step={1.5} title="Background & Education" />
          <BizModalFormGrid>
            <BizModalInput
              label="Hometown"
              value={profileForm.hometown}
              onChange={(e) => handleProfileChange('hometown', e.target.value)}
              placeholder="Where did you grow up?"
            />
            <BizModalInput
              label="High School"
              value={profileForm.high_school}
              onChange={(e) => handleProfileChange('high_school', e.target.value)}
              placeholder="High school name"
            />
          </BizModalFormGrid>

          <BizModalFormGrid>
            <div>
              <label className="block font-medium mb-2 text-sm text-[#022641]">
                High School Graduation Year
              </label>
              <select
                value={profileForm.high_school_year}
                onChange={(e) => handleProfileChange('high_school_year', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-[#ed6437] focus:ring-orange-200 transition shadow-sm"
              >
                <option value="">Select year</option>
                {Array.from({ length: 60 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <BizModalInput
              label="College/University"
              value={profileForm.college}
              onChange={(e) => handleProfileChange('college', e.target.value)}
              placeholder="College or university name"
            />
          </BizModalFormGrid>

          <BizModalFormGrid>
            <div>
              <label className="block font-medium mb-2 text-sm text-[#022641]">
                College Graduation Year
              </label>
              <select
                value={profileForm.college_year}
                onChange={(e) => handleProfileChange('college_year', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-[#ed6437] focus:ring-orange-200 transition shadow-sm"
              >
                <option value="">Select year</option>
                {Array.from({ length: 60 }, (_, i) => new Date().getFullYear() + 5 - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <BizModalInput
              label="Degree/Field of Study"
              value={profileForm.degree}
              onChange={(e) => handleProfileChange('degree', e.target.value)}
              placeholder="e.g., B.S. Computer Science"
            />
          </BizModalFormGrid>

          {/* Skills Section */}
          <div className="mt-4">
            <label className="block font-medium mb-2 text-sm text-[#022641]">Skills</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {profileForm.skills.map((skill, index) => (
                <span
                  key={index}
                  className="bg-[#022641] text-white px-3 py-1 rounded-full text-sm flex items-center gap-1"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-white hover:text-gray-200 ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                placeholder="Add a skill"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200 transition shadow-sm"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                disabled={!skillInput.trim()}
                className="px-4 py-2 bg-[#022641] text-white rounded-lg hover:bg-[#033a5c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Hobbies Section */}
          <BizModalTextarea
            label="Hobbies & Activities"
            value={profileForm.hobbies}
            onChange={(e) => handleProfileChange('hobbies', e.target.value)}
            placeholder="What do you enjoy doing in your free time?"
            rows={3}
          />

          <BizModalTextarea
            label="Bio"
            value={profileForm.bio}
            onChange={(e) => handleProfileChange('bio', e.target.value)}
            placeholder="Tell us about yourself..."
            rows={4}
          />

          <BizModalTextarea
            label="Goals"
            value={profileForm.goals}
            onChange={(e) => handleProfileChange('goals', e.target.value)}
            placeholder="What are you looking to achieve?"
            rows={3}
          />

          {/* Location */}
          <BizModalSectionHeader step={2} title="Location" />
          <BizModalFormGrid>
            <BizModalInput
              label="City"
              value={profileForm.city}
              onChange={(e) => handleProfileChange('city', e.target.value)}
              placeholder="Your city"
            />
            <BizModalInput
              label="State/Province"
              value={profileForm.state}
              onChange={(e) => handleProfileChange('state', e.target.value)}
              placeholder="Your state or province"
            />
          </BizModalFormGrid>

          {/* Interests */}
          <BizModalSectionHeader step={3} title="Interests" />

          {/* Phase 3A: Category-based Interests */}
          <div className="mb-4">
            <label className="block font-medium mb-2 text-sm text-[#022641]">
              Category Interests
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Select from Bizconekt categories to show your areas of interest
            </p>
            <InterestsCategorySelector
              interests={categoryInterests}
              onInterestsChange={setCategoryInterests}
              disabled={isSubmitting}
              maxInterests={20}
              username={profile.username}
            />
          </div>

          {/* Phase 3B: Custom Interests with unified badge display */}
          <div className="mt-6">
            <label className="block font-medium mb-2 text-sm text-[#022641]">
              Custom Interests
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Add interests not found in the categories above
            </p>

            {/* Custom Interest Input */}
            <CustomInterestInput
              interests={customInterests}
              onInterestAdd={(interest) => setCustomInterests(prev => [...prev, interest])}
              disabled={isSubmitting}
              maxInterests={20}
              placeholder="Type a custom interest..."
              username={profile.username}
            />

            {/* Custom Interest Badges */}
            {customInterests.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {customInterests.map((interest) => (
                  <InterestBadge
                    key={interest.id}
                    id={interest.id}
                    label={interest.custom_value}
                    type="custom"
                    onDelete={handleRemoveCustomInterest}
                    disabled={isSubmitting}
                  />
                ))}
              </div>
            )}

            {/* Interest Count */}
            <p className="text-xs text-gray-500 mt-2">
              {customInterests.length} of 20 custom interests added
            </p>
          </div>

          {/* Phase 3C: Groups Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <GroupsSection
              groups={groups}
              onGroupsChange={setGroups}
              disabled={isSubmitting}
              maxGroups={10}
              username={profile.username}
            />
          </div>

          {/* Phase 3C: Memberships Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <MembershipsSection
              memberships={memberships}
              onMembershipsChange={setMemberships}
              disabled={isSubmitting}
              maxMemberships={10}
              username={profile.username}
            />
          </div>

          {/* Combined Interest Summary */}
          <div className="p-3 bg-gray-50 rounded-lg mt-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-[#022641]">
                {categoryInterests.length + customInterests.length + groups.length + memberships.length}
              </span>
              {' '}total interest items
              ({categoryInterests.length} categories, {customInterests.length} custom,
               {groups.length} groups, {memberships.length} memberships)
            </p>
          </div>

          {/* Social Links */}
          <BizModalSectionHeader step={4} title="Social Links" />
          <BizModalFormGrid>
            <BizModalInput
              label="Bizconekt Listing"
              value={profileForm.social_links.bizconekt}
              onChange={(e) => handleSocialLinkChange('bizconekt', e.target.value)}
              placeholder="https://bizconekt.com/listings/your-listing"
              error={errors.social_bizconekt}
            />
            <BizModalInput
              label="Instagram"
              value={profileForm.social_links.instagram}
              onChange={(e) => handleSocialLinkChange('instagram', e.target.value)}
              placeholder="https://instagram.com/yourprofile"
              error={errors.social_instagram}
            />
            <BizModalInput
              label="TikTok"
              value={profileForm.social_links.tiktok}
              onChange={(e) => handleSocialLinkChange('tiktok', e.target.value)}
              placeholder="https://tiktok.com/@yourprofile"
              error={errors.social_tiktok}
            />
            <BizModalInput
              label="Facebook"
              value={profileForm.social_links.facebook}
              onChange={(e) => handleSocialLinkChange('facebook', e.target.value)}
              placeholder="https://facebook.com/yourprofile"
              error={errors.social_facebook}
            />
            <BizModalInput
              label="Twitter"
              value={profileForm.social_links.twitter}
              onChange={(e) => handleSocialLinkChange('twitter', e.target.value)}
              placeholder="https://twitter.com/yourprofile"
              error={errors.social_twitter}
            />
            <BizModalInput
              label="LinkedIn"
              value={profileForm.social_links.linkedin}
              onChange={(e) => handleSocialLinkChange('linkedin', e.target.value)}
              placeholder="https://linkedin.com/in/yourprofile"
              error={errors.social_linkedin}
            />
            <BizModalInput
              label="YouTube"
              value={profileForm.social_links.youtube}
              onChange={(e) => handleSocialLinkChange('youtube', e.target.value)}
              placeholder="https://youtube.com/yourprofile"
              error={errors.social_youtube}
            />
            <BizModalInput
              label="Website"
              value={profileForm.social_links.website}
              onChange={(e) => handleSocialLinkChange('website', e.target.value)}
              placeholder="https://yourwebsite.com"
              error={errors.social_website}
            />
          </BizModalFormGrid>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div className="space-y-6">
          <BizModalSectionHeader step={1} title="Change Password" />
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block font-medium mb-1 text-sm text-[#022641]">Current Password *</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordForm.current_password}
                  onChange={(e) => handlePasswordChange('current_password', e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 transition shadow-sm ${
                    errors.current_password
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-300 focus:border-[#ed6437] focus:ring-orange-200'
                  }`}
                  placeholder="Enter your current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.current_password && <p className="text-red-600 text-sm mt-1">{errors.current_password}</p>}
            </div>

            <div>
              <label className="block font-medium mb-1 text-sm text-[#022641]">New Password *</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.new_password}
                  onChange={(e) => handlePasswordChange('new_password', e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 transition shadow-sm ${
                    errors.new_password
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-300 focus:border-[#ed6437] focus:ring-orange-200'
                  }`}
                  placeholder="Enter your new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.new_password && <p className="text-red-600 text-sm mt-1">{errors.new_password}</p>}
              <PasswordStrengthIndicator password={passwordForm.new_password} />
            </div>

            <div>
              <label className="block font-medium mb-1 text-sm text-[#022641]">Confirm New Password *</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordForm.confirm_password}
                  onChange={(e) => handlePasswordChange('confirm_password', e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 transition shadow-sm ${
                    errors.confirm_password
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-300 focus:border-[#ed6437] focus:ring-orange-200'
                  }`}
                  placeholder="Confirm your new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirm_password && <p className="text-red-600 text-sm mt-1">{errors.confirm_password}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Account Information - keep existing */}
          <BizModalSectionHeader step={1} title="Account Information" />
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">User ID:</span>
                <span className="ml-2 font-medium">{profile.id}</span>
              </div>
              <div>
                <span className="text-gray-600">Username:</span>
                <span className="ml-2 font-medium">@{profile.username}</span>
              </div>
              <div>
                <span className="text-gray-600">Role:</span>
                <span className="ml-2 font-medium capitalize">{profile.role}</span>
              </div>
              <div>
                <span className="text-gray-600">Membership:</span>
                <span className="ml-2 font-medium capitalize">{profile.membership_tier}</span>
              </div>
              <div>
                <span className="text-gray-600">Member Since:</span>
                <span className="ml-2 font-medium">
                  {typeof profile.created_at === 'string'
                    ? new Date(profile.created_at).toLocaleDateString()
                    : profile.created_at.toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Privacy & Notification Settings */}
          <BizModalSectionHeader step={2} title="Privacy & Notifications" />
          <PrivacySettingsSection
            visibilitySettings={visibilitySettings}
            preferences={userPreferences}
            notificationPreferences={notificationPreferences || undefined}
            onVisibilityChange={handleVisibilityChange}
            onPreferencesChange={handlePreferencesChange}
            onNotificationPreferencesChange={notificationPreferences ? handleNotificationPreferencesChange : undefined}
          />

          {/* Data & Privacy Actions */}
          <BizModalSectionHeader step={3} title="Data & Account Actions" />
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700 mb-3">
              Data export and account deletion features are coming soon.
            </p>
            <div className="flex gap-2">
              <button
                disabled
                className="px-4 py-2 bg-white text-gray-600 border border-gray-200 rounded-lg cursor-not-allowed text-sm"
              >
                Export Data
              </button>
              <button
                disabled
                className="px-4 py-2 bg-white text-gray-600 border border-gray-200 rounded-lg cursor-not-allowed text-sm"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </BizModal>
  );
}

// ============================================================================
// USERPROFILEEDITMODAL COMPONENT (WITH ERRORBOUNDARY)
// ============================================================================

/**
 * UserProfileEditModal - Wrapped with ErrorBoundary (ADVANCED tier requirement)
 *
 * @example
 * ```tsx
 * <UserProfileEditModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   profile={profileData}
 *   onProfileUpdate={(updated) => setProfile(updated)}
 * />
 * ```
 */
export function UserProfileEditModal(props: UserProfileEditModalProps) {
  return (
    <ErrorBoundary componentName="UserProfileEditModal">
      <UserProfileEditModalContent {...props} />
    </ErrorBoundary>
  );
}

export default UserProfileEditModal;
