/**
 * NotificationPreferencesSection - User Notification Preferences UI
 *
 * Renders notification preference controls organized by category.
 * Follows PrivacySettingsSection pattern with ToggleSwitch components.
 *
 * @authority docs/notificationService/phases/PHASE_2_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/features/profile/components/PrivacySettingsSection.tsx - Toggle pattern
 */

'use client';

import React from 'react';
import { Bell, Mail, MessageSquare, Users, Star, Calendar, CreditCard, Shield, Clock, BadgeCheck } from 'lucide-react';
import { UserNotificationPreferences, CategoryPreference, EmailDeliveryMode } from '@core/services/notification/types';

// ============================================================================
// Props Interface
// ============================================================================

interface NotificationPreferencesSectionProps {
  preferences: UserNotificationPreferences;
  onPreferencesChange: (updates: Partial<UserNotificationPreferences>) => void;
  isLoading?: boolean;
}

// ============================================================================
// Reusable Toggle Switch (from PrivacySettingsSection pattern)
// ============================================================================

interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  description?: string;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  label,
  checked,
  onChange,
  description,
  disabled = false
}) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex-1 mr-4">
      <span className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>{label}</span>
      {description && (
        <p className={`text-xs ${disabled ? 'text-gray-300' : 'text-gray-500'}`}>{description}</p>
      )}
    </div>
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
        disabled
          ? 'bg-gray-200 cursor-not-allowed'
          : checked
          ? 'bg-[#ed6437]'
          : 'bg-gray-300'
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

// ============================================================================
// Email Mode Selector
// ============================================================================

interface EmailModeSelectorProps {
  value: EmailDeliveryMode;
  onChange: (value: EmailDeliveryMode) => void;
  disabled?: boolean;
}

const EmailModeSelector: React.FC<EmailModeSelectorProps> = ({
  value,
  onChange,
  disabled = false
}) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex-1 mr-4">
      <span className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>Email notifications</span>
      <p className={`text-xs ${disabled ? 'text-gray-300' : 'text-gray-500'}`}>
        When to receive email notifications
      </p>
    </div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as EmailDeliveryMode)}
      disabled={disabled}
      className={`rounded-md border px-3 py-1 text-sm ${
        disabled
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'border-gray-300 text-gray-700'
      }`}
    >
      <option value="never">Never</option>
      <option value="digest">Digest only</option>
      <option value="immediate">Immediate</option>
    </select>
  </div>
);

// ============================================================================
// Category Section Component
// ============================================================================

interface CategorySectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  preference: CategoryPreference;
  onChange: (updates: Partial<CategoryPreference>) => void;
  globalEnabled: boolean;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  icon,
  title,
  description,
  preference,
  onChange,
  globalEnabled
}) => {
  const isDisabled = !globalEnabled || !preference.enabled;

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[#ed6437]">{icon}</span>
        <h4 className="font-medium text-gray-900">{title}</h4>
      </div>
      <p className="text-xs text-gray-500 mb-3">{description}</p>

      <div className="space-y-1 border-t pt-3">
        <ToggleSwitch
          label="Enable notifications"
          checked={preference.enabled}
          onChange={(val) => onChange({ enabled: val })}
          disabled={!globalEnabled}
        />

        <ToggleSwitch
          label="In-app notifications"
          checked={preference.inApp}
          onChange={(val) => onChange({ inApp: val })}
          description="Show in notification center"
          disabled={isDisabled}
        />

        <ToggleSwitch
          label="Push notifications"
          checked={preference.push}
          onChange={(val) => onChange({ push: val })}
          description="Browser and mobile push"
          disabled={isDisabled}
        />

        <EmailModeSelector
          value={preference.email}
          onChange={(val) => onChange({ email: val })}
          disabled={isDisabled}
        />
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export function NotificationPreferencesSection({
  preferences,
  onPreferencesChange,
  isLoading = false
}: NotificationPreferencesSectionProps) {
  // Category update handler
  const handleCategoryChange = (
    category: keyof UserNotificationPreferences['categories'],
    updates: Partial<CategoryPreference>
  ) => {
    onPreferencesChange({
      categories: {
        ...preferences.categories,
        [category]: {
          ...preferences.categories[category],
          ...updates
        }
      }
    });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Settings */}
      <div className="p-4 bg-white border rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Bell size={20} className="text-[#ed6437]" />
          Notification Settings
        </h3>

        <ToggleSwitch
          label="Enable all notifications"
          checked={preferences.globalEnabled}
          onChange={(val) => onPreferencesChange({ globalEnabled: val })}
          description="Master toggle for all notification types"
        />
      </div>

      {/* Quiet Hours */}
      <div className="p-4 bg-white border rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Clock size={20} className="text-[#ed6437]" />
          Quiet Hours
        </h3>

        <ToggleSwitch
          label="Enable quiet hours"
          checked={preferences.quietHoursEnabled}
          onChange={(val) => onPreferencesChange({ quietHoursEnabled: val })}
          description="Pause non-urgent notifications during set hours"
          disabled={!preferences.globalEnabled}
        />

        {preferences.quietHoursEnabled && preferences.globalEnabled && (
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Start time</label>
              <input
                type="time"
                value={preferences.quietHoursStart}
                onChange={(e) => onPreferencesChange({ quietHoursStart: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">End time</label>
              <input
                type="time"
                value={preferences.quietHoursEnd}
                onChange={(e) => onPreferencesChange({ quietHoursEnd: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Category Sections */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Notification Categories</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <CategorySection
            icon={<MessageSquare size={18} />}
            title="Messages"
            description="New messages and mentions"
            preference={preferences.categories.messages}
            onChange={(updates) => handleCategoryChange('messages', updates)}
            globalEnabled={preferences.globalEnabled}
          />

          <CategorySection
            icon={<Users size={18} />}
            title="Connections"
            description="Connection requests and responses"
            preference={preferences.categories.connections}
            onChange={(updates) => handleCategoryChange('connections', updates)}
            globalEnabled={preferences.globalEnabled}
          />

          <CategorySection
            icon={<Star size={18} />}
            title="Reviews"
            description="Reviews received and responses"
            preference={preferences.categories.reviews}
            onChange={(updates) => handleCategoryChange('reviews', updates)}
            globalEnabled={preferences.globalEnabled}
          />

          <CategorySection
            icon={<Calendar size={18} />}
            title="Events"
            description="Event RSVPs, reminders, and updates"
            preference={preferences.categories.events}
            onChange={(updates) => handleCategoryChange('events', updates)}
            globalEnabled={preferences.globalEnabled}
          />

          <CategorySection
            icon={<CreditCard size={18} />}
            title="Subscriptions"
            description="Payment and subscription updates"
            preference={preferences.categories.subscriptions}
            onChange={(updates) => handleCategoryChange('subscriptions', updates)}
            globalEnabled={preferences.globalEnabled}
          />

          <CategorySection
            icon={<Shield size={18} />}
            title="System"
            description="Security alerts and announcements"
            preference={preferences.categories.system}
            onChange={(updates) => handleCategoryChange('system', updates)}
            globalEnabled={preferences.globalEnabled}
          />

          <CategorySection
            icon={<BadgeCheck size={18} />}
            title="Recommendations"
            description="Get notified when someone recommends a business, event, or connection to you"
            preference={preferences.categories.recommendations}
            onChange={(updates) => handleCategoryChange('recommendations', updates)}
            globalEnabled={preferences.globalEnabled}
          />
        </div>
      </div>

      {/* Digest Settings */}
      <div className="p-4 bg-white border rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Mail size={20} className="text-[#ed6437]" />
          Email Digest
        </h3>

        <ToggleSwitch
          label="Enable email digest"
          checked={preferences.digestEnabled}
          onChange={(val) => onPreferencesChange({ digestEnabled: val })}
          description="Receive a summary of notifications via email"
          disabled={!preferences.globalEnabled}
        />

        {preferences.digestEnabled && preferences.globalEnabled && (
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Frequency</label>
              <select
                value={preferences.digestFrequency}
                onChange={(e) => onPreferencesChange({
                  digestFrequency: e.target.value as 'daily' | 'weekly'
                })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Delivery time</label>
              <input
                type="time"
                value={preferences.digestTime}
                onChange={(e) => onPreferencesChange({ digestTime: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationPreferencesSection;
