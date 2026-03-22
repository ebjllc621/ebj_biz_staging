/**
 * PrivacySettingsSection - Privacy controls and notification preferences
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 */

'use client';

import { Shield, Eye, Bell } from 'lucide-react';
import {
  ProfileVisibilitySettings,
  UserProfilePreferences,
  FieldVisibility
} from '../types';
import { UserNotificationPreferences } from '@core/services/notification/types';
import { NotificationPreferencesSection } from '@features/notifications/components/NotificationPreferencesSection';

interface PrivacySettingsSectionProps {
  visibilitySettings: ProfileVisibilitySettings;
  preferences: UserProfilePreferences;
  notificationPreferences?: UserNotificationPreferences;
  onVisibilityChange: (_field: keyof ProfileVisibilitySettings, _value: unknown) => void;
  onPreferencesChange: (_field: keyof UserProfilePreferences, _value: boolean) => void;
  onNotificationPreferencesChange?: (_updates: Partial<UserNotificationPreferences>) => void;
}

const VisibilitySelect = ({
  label,
  value,
  onChange
}: {
  label: string;
  value: FieldVisibility;
  onChange: (_val: FieldVisibility) => void;
}) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm text-gray-700">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as FieldVisibility)}
      className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[#ed6437]"
    >
      <option value="public">Everyone</option>
      <option value="connections">Connections Only</option>
      <option value="hidden">Hidden</option>
    </select>
  </div>
);

const ToggleSwitch = ({
  label,
  checked,
  onChange,
  description
}: {
  label: string;
  checked: boolean;
  onChange: (_val: boolean) => void;
  description?: string;
}) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex-1 mr-4">
      <span className="text-sm text-gray-700">{label}</span>
      {description && <p className="text-xs text-gray-500">{description}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-[#ed6437]' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

export function PrivacySettingsSection({
  visibilitySettings,
  preferences,
  notificationPreferences,
  onVisibilityChange,
  onPreferencesChange,
  onNotificationPreferencesChange
}: PrivacySettingsSectionProps) {
  // Determine whether to show full notification preferences or legacy toggles
  const showFullNotificationPreferences =
    notificationPreferences !== undefined &&
    onNotificationPreferencesChange !== undefined;

  return (
    <div className="space-y-6">
      {/* Profile Visibility Section */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-5 h-5 text-[#022641]" />
          <h3 className="font-medium text-[#022641]">Profile Visibility</h3>
        </div>

        <div className="space-y-1 divide-y divide-gray-200">
          <VisibilitySelect
            label="Show Email"
            value={visibilitySettings.showEmail}
            onChange={(val) => onVisibilityChange('showEmail', val)}
          />
          <VisibilitySelect
            label="Show Phone Number"
            value={visibilitySettings.showPhone}
            onChange={(val) => onVisibilityChange('showPhone', val)}
          />
          <VisibilitySelect
            label="Show Location"
            value={visibilitySettings.showLocation}
            onChange={(val) => onVisibilityChange('showLocation', val)}
          />
          <VisibilitySelect
            label="Show Occupation"
            value={visibilitySettings.showOccupation}
            onChange={(val) => onVisibilityChange('showOccupation', val)}
          />
          <VisibilitySelect
            label="Show Social Links"
            value={visibilitySettings.showSocialLinks}
            onChange={(val) => onVisibilityChange('showSocialLinks', val)}
          />
          <ToggleSwitch
            label="Show Interests"
            description="Display your interest tags on your profile"
            checked={visibilitySettings.showInterests}
            onChange={(val) => onVisibilityChange('showInterests', val)}
          />
          <ToggleSwitch
            label="Show Goals"
            description="Display your goals on your profile"
            checked={visibilitySettings.showGoals}
            onChange={(val) => onVisibilityChange('showGoals', val)}
          />
          <VisibilitySelect
            label="Show Hometown"
            value={visibilitySettings.showHometown || 'public'}
            onChange={(val) => onVisibilityChange('showHometown', val)}
          />
          <VisibilitySelect
            label="Show Education"
            value={visibilitySettings.showEducation || 'public'}
            onChange={(val) => onVisibilityChange('showEducation', val)}
          />
          <VisibilitySelect
            label="Show Skills"
            value={visibilitySettings.showSkills || 'public'}
            onChange={(val) => onVisibilityChange('showSkills', val)}
          />
          <VisibilitySelect
            label="Show Hobbies"
            value={visibilitySettings.showHobbies || 'public'}
            onChange={(val) => onVisibilityChange('showHobbies', val)}
          />
          <VisibilitySelect
            label="Show Custom Interests"
            value={visibilitySettings.showCustomInterests || 'public'}
            onChange={(val) => onVisibilityChange('showCustomInterests', val)}
          />
          <VisibilitySelect
            label="Show Groups"
            value={visibilitySettings.showGroups || 'public'}
            onChange={(val) => onVisibilityChange('showGroups', val)}
          />
          <VisibilitySelect
            label="Show Memberships"
            value={visibilitySettings.showMemberships || 'public'}
            onChange={(val) => onVisibilityChange('showMemberships', val)}
          />
        </div>
      </div>

      {/* Privacy Controls Section */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-[#022641]" />
          <h3 className="font-medium text-[#022641]">Privacy Controls</h3>
        </div>

        <div className="space-y-1 divide-y divide-gray-200">
          <ToggleSwitch
            label="Allow Profile Views"
            description="Track when others view your profile"
            checked={visibilitySettings.allowProfileViews}
            onChange={(val) => onVisibilityChange('allowProfileViews', val)}
          />
          <ToggleSwitch
            label="Show on Member Directory"
            description="Appear in public member searches"
            checked={visibilitySettings.showOnMemberDirectory}
            onChange={(val) => onVisibilityChange('showOnMemberDirectory', val)}
          />
          <ToggleSwitch
            label="Allow Direct Messages"
            description="Receive messages from other members"
            checked={visibilitySettings.allowDirectMessages}
            onChange={(val) => onVisibilityChange('allowDirectMessages', val)}
          />
          <ToggleSwitch
            label="Search Engine Indexing"
            description="Allow search engines to index your profile"
            checked={visibilitySettings.indexable}
            onChange={(val) => onVisibilityChange('indexable', val)}
          />
        </div>
      </div>

      {/* Notification Preferences Section - Conditional Rendering */}
      {showFullNotificationPreferences ? (
        // Full notification preferences UI (Phase 2 component)
        <NotificationPreferencesSection
          preferences={notificationPreferences}
          onPreferencesChange={onNotificationPreferencesChange}
        />
      ) : (
        // Legacy notification toggles (backwards compatibility)
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-[#022641]" />
            <h3 className="font-medium text-[#022641]">Notification Preferences</h3>
          </div>

          <div className="space-y-1 divide-y divide-gray-200">
            <ToggleSwitch
              label="Email Notifications"
              description="Important updates and alerts"
              checked={preferences.emailNotifications}
              onChange={(val) => onPreferencesChange('emailNotifications', val)}
            />
            <ToggleSwitch
              label="Weekly Digest"
              description="Summary of activity and updates"
              checked={preferences.weeklyDigest}
              onChange={(val) => onPreferencesChange('weeklyDigest', val)}
            />
            <ToggleSwitch
              label="Activity Notifications"
              description="Likes, comments, and mentions"
              checked={preferences.activityNotifications}
              onChange={(val) => onPreferencesChange('activityNotifications', val)}
            />
            <ToggleSwitch
              label="Connection Requests"
              description="New connection requests"
              checked={preferences.connectionRequests}
              onChange={(val) => onPreferencesChange('connectionRequests', val)}
            />
            <ToggleSwitch
              label="Profile View Notifications"
              description="When someone views your profile"
              checked={preferences.profileViewNotifications}
              onChange={(val) => onPreferencesChange('profileViewNotifications', val)}
            />
            <ToggleSwitch
              label="Marketing Emails"
              description="Promotions and special offers"
              checked={preferences.marketingEmails}
              onChange={(val) => onPreferencesChange('marketingEmails', val)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default PrivacySettingsSection;
