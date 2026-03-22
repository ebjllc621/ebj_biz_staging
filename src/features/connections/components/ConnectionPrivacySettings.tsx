/**
 * ConnectionPrivacySettings - Connection privacy controls
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

'use client';

import { useState, useEffect } from 'react';
import { Shield, Users, UserCheck } from 'lucide-react';
import { fetchWithCsrf } from '@core/utils/csrf';
import { ConnectionPrivacySettings as PrivacySettingsType } from '../types';

interface ConnectionPrivacySettingsProps {
  onSaveSuccess?: () => void;
}

const WhoCanConnectSelect = ({
  value,
  onChange
}: {
  value: 'everyone' | 'connections_of_connections' | 'nobody';
  onChange: (val: 'everyone' | 'connections_of_connections' | 'nobody') => void;
}) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex-1 mr-4">
      <span className="text-sm text-gray-700">Who can send you connection requests</span>
      <p className="text-xs text-gray-500">Control who can request to connect with you</p>
    </div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as 'everyone' | 'connections_of_connections' | 'nobody')}
      className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[#ed6437]"
    >
      <option value="everyone">Everyone</option>
      <option value="connections_of_connections">Mutual Connections Only</option>
      <option value="nobody">Nobody</option>
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
  onChange: (val: boolean) => void;
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

export function ConnectionPrivacySettings({ onSaveSuccess }: ConnectionPrivacySettingsProps) {
  const [settings, setSettings] = useState<PrivacySettingsType>({
    whoCanConnect: 'everyone',
    requireMessage: false,
    autoDeclineNoMessage: false,
    showConnectionCount: true,
    allowFollows: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/users/settings/connection-privacy', {
        credentials: 'include'
      });
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        setSettings(data.settings);
      }
    } catch (err) {
      setError('Failed to load privacy settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetchWithCsrf('/api/users/settings/connection-privacy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        setSuccessMessage('Privacy settings saved successfully');
        onSaveSuccess?.();
      } else {
        const result = await response.json();
        setError(result.error?.message || 'Failed to save settings');
      }
    } catch (err) {
      setError('Failed to save privacy settings');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = <K extends keyof PrivacySettingsType>(
    key: K,
    value: PrivacySettingsType[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSuccessMessage(null); // Clear success message on change
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Requests Section */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-[#022641]" />
          <h3 className="font-medium text-[#022641]">Connection Requests</h3>
        </div>

        <div className="space-y-1 divide-y divide-gray-200">
          <WhoCanConnectSelect
            value={settings.whoCanConnect}
            onChange={(val) => updateSetting('whoCanConnect', val)}
          />
          <ToggleSwitch
            label="Require Message"
            description="Connection requests must include a message"
            checked={settings.requireMessage}
            onChange={(val) => updateSetting('requireMessage', val)}
          />
          <ToggleSwitch
            label="Auto-Decline Without Message"
            description="Automatically decline requests without a message"
            checked={settings.autoDeclineNoMessage}
            onChange={(val) => updateSetting('autoDeclineNoMessage', val)}
          />
        </div>
      </div>

      {/* Visibility Section */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-[#022641]" />
          <h3 className="font-medium text-[#022641]">Profile Visibility</h3>
        </div>

        <div className="space-y-1 divide-y divide-gray-200">
          <ToggleSwitch
            label="Show Connection Count"
            description="Display your total connections on your profile"
            checked={settings.showConnectionCount}
            onChange={(val) => updateSetting('showConnectionCount', val)}
          />
        </div>
      </div>

      {/* Follow System Section */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <UserCheck className="w-5 h-5 text-[#022641]" />
          <h3 className="font-medium text-[#022641]">Follow System</h3>
        </div>

        <div className="space-y-1 divide-y divide-gray-200">
          <ToggleSwitch
            label="Allow Follows"
            description="Let other users follow you without connecting"
            checked={settings.allowFollows}
            onChange={(val) => updateSetting('allowFollows', val)}
          />
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
          {successMessage}
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-[#ed6437] text-white rounded-md hover:bg-[#d55830] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

export default ConnectionPrivacySettings;
