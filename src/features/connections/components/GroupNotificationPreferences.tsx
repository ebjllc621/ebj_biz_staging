/**
 * GroupNotificationPreferences Component
 * Toggle switches for group notification settings
 *
 * GOVERNANCE COMPLIANCE:
 * - SIMPLE tier component (<100 lines)
 * - Uses fetchWithCsrf for PATCH requests
 * - Client Component ('use client')
 *
 * @tier SIMPLE
 * @phase Connection Groups Feature - Phase 2
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/3-5-26/phases/PHASE_2_BRAIN_PLAN.md
 */

'use client';

import React, { useState } from 'react';
import { Bell, MessageCircle, Activity, BadgeCheck } from 'lucide-react';
import { fetchWithCsrf } from '@core/utils/csrf';
import type {
  GroupMemberNotificationPreferences,
  UpdateMemberNotificationPreferencesInput
} from '../types/group-actions';

export interface GroupNotificationPreferencesProps {
  groupId: number;
  memberId: number;
  preferences: GroupMemberNotificationPreferences;
  onUpdate?: (preferences: GroupMemberNotificationPreferences) => void;
  className?: string;
}

interface ToggleItemProps {
  icon: React.ElementType;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleItem({ icon: Icon, label, description, checked, onChange, disabled }: ToggleItemProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <div className="p-2 bg-gray-100 rounded-lg">
        <Icon className="w-4 h-4 text-gray-600" />
      </div>
      <div className="flex-1">
        <div className="font-medium text-gray-900">{label}</div>
        <div className="text-sm text-gray-500">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          checked ? 'bg-blue-600' : 'bg-gray-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}

export function GroupNotificationPreferences({
  groupId,
  memberId,
  preferences,
  onUpdate,
  className = ''
}: GroupNotificationPreferencesProps) {
  const [currentPrefs, setCurrentPrefs] = useState(preferences);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleChange = async (key: keyof GroupMemberNotificationPreferences, value: boolean) => {
    const newPrefs = { ...currentPrefs, [key]: value };
    setCurrentPrefs(newPrefs);

    setIsUpdating(true);
    try {
      const update: UpdateMemberNotificationPreferencesInput = { [key]: value };
      await fetchWithCsrf(
        `/api/users/connections/groups/${groupId}/members/${memberId}/notifications`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update)
        }
      );
      onUpdate?.(newPrefs);
    } catch {
      // Revert on error
      setCurrentPrefs(currentPrefs);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Notification Preferences</h3>
      </div>

      <div className="space-y-4">
        <ToggleItem
          icon={MessageCircle}
          label="Messages"
          description="Get notified when someone posts a message"
          checked={currentPrefs.notifyMessages}
          onChange={(v) => handleChange('notifyMessages', v)}
          disabled={isUpdating}
        />

        <ToggleItem
          icon={BadgeCheck}
          label="Recommendations"
          description="Get notified when someone recommends a listing"
          checked={currentPrefs.notifyRecommendations}
          onChange={(v) => handleChange('notifyRecommendations', v)}
          disabled={isUpdating}
        />

        <ToggleItem
          icon={Activity}
          label="Activity"
          description="Get notified about group activity (members joining/leaving)"
          checked={currentPrefs.notifyActivity}
          onChange={(v) => handleChange('notifyActivity', v)}
          disabled={isUpdating}
        />
      </div>
    </div>
  );
}
