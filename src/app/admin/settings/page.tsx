/**
 * Admin System Settings Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: AdminDashboardTemplate with grouped settings (STANDARD tier)
 * - Authentication: Admin-only access required
 * - Service Boundary: API routes for database access (NO direct database)
 * - Credentials: 'include' for all fetch requests
 *
 * Features:
 * - Grouped system settings (General, Email, Payment, Media, Security)
 * - Setting types: string, number, boolean, JSON
 * - Test email functionality
 * - Setting validation and error handling
 * - Real-time save feedback
 *
 * @authority PHASE_5.2_BRAIN_PLAN.md - Section 3.2.3
 * @component
 * @returns {JSX.Element} Admin system settings interface
 */

'use client';


// Force dynamic rendering (required for useAuth() - React Context cannot be used in SSG)
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { useAuth } from '@core/hooks/useAuth';
import { fetchWithCsrf } from '@core/utils/csrf';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type SettingType = 'string' | 'number' | 'boolean' | 'json';
type SettingGroup = 'general' | 'email' | 'payment' | 'media' | 'security';

interface SystemSetting {
  id: number;
  key: string;
  value: string;
  type: SettingType;
  group: SettingGroup;
  label: string;
  description?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface SettingFormData {
  [key: string]: any;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Test Email Modal Component
 */
function TestEmailModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSend = async () => {
    if (!email.trim()) {
      alert('Please enter an email address');
      return;
    }

    setSending(true);
    setResult(null);

    try {
      // @governance MANDATORY - CSRF protection for POST requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf('/api/admin/settings/test-email', {method: 'POST', body: JSON.stringify({ email })});

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, message: 'Test email sent successfully!' });
      } else {
        setResult({ success: false, message: data.message ?? 'Failed to send test email' });
      }
    } catch (error) {
      setResult({ success: false, message: 'Error sending test email' });
    } finally {
      setSending(false);
    }
  };

  return (
    <BizModal isOpen={isOpen} onClose={onClose} title="Test Email Configuration" size="small">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="test@example.com"
          />
          <p className="text-xs text-gray-500 mt-1">
            A test email will be sent to this address
          </p>
        </div>

        {result && (
          <div className={`p-3 rounded text-sm ${
            result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {result.message}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <BizModalButton variant="secondary" onClick={onClose} disabled={sending}>
            Close
          </BizModalButton>
          <BizModalButton variant="primary" onClick={handleSend} disabled={sending}>
            {sending ? 'Sending...' : 'Send Test Email'}
          </BizModalButton>
        </div>
      </div>
    </BizModal>
  );
}

/**
 * Setting Field Component
 */
function SettingField({
  setting,
  value,
  onChange
}: {
  setting: SystemSetting;
  value: any;
  onChange: (key: string, value: any) => void;
}) {
  const renderInput = () => {
    switch (setting.type) {
      case 'boolean':
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value === true || value === 'true'}
              onChange={(e) => onChange(setting.key, e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">Enabled</span>
          </label>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(setting.key, parseFloat(e.target.value))}
            className="w-full px-3 py-2 border rounded"
          />
        );

      case 'json':
        return (
          <textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value ?? ''}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onChange(setting.key, parsed);
              } catch {
                onChange(setting.key, e.target.value);
              }
            }}
            className="w-full px-3 py-2 border rounded font-mono text-sm"
            rows={5}
          />
        );

      default: // string
        return (
          <input
            type="text"
            value={value ?? ''}
            onChange={(e) => onChange(setting.key, e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{setting.label}</label>
        <span className="text-xs text-gray-600">{setting.type}</span>
      </div>
      {renderInput()}
      {setting.description && (
        <p className="text-xs text-gray-500">{setting.description}</p>
      )}
    </div>
  );
}

/**
 * Settings Group Component
 */
function SettingsGroup({
  title,
  settings,
  formData,
  onChange
}: {
  title: string;
  settings: SystemSetting[];
  formData: SettingFormData;
  onChange: (key: string, value: any) => void;
}) {
  if (settings.length === 0) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded shadow">
      <h3 className="text-lg font-medium mb-4">{title}</h3>
      <div className="space-y-4">
        {settings.map(setting => (
          <SettingField
            key={setting.key}
            setting={setting}
            value={formData[setting.key]}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * AdminSettingsPage - System configuration interface for platform administrators
 *
 * Provides grouped settings management with real-time updates.
 * Requires admin role for access.
 *
 * @component
 * @returns {JSX.Element} Admin settings interface
 */
export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [formData, setFormData] = useState<SettingFormData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmailModalOpen, setTestEmailModalOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  // GOVERNANCE FIX: useEffect MUST be called before any early returns
  // React Rules of Hooks: Hooks must be called in the same order on every render
  useEffect(() => {
    // Only fetch if user is admin - conditional logic INSIDE the hook
    if (user?.role === 'admin') {
      fetchSettings();
    }
  }, [user]);

  // Conditional returns AFTER all hooks
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600 font-medium">Access Denied: Admin privileges required</div>
      </div>
    );
  }

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const settingsData = data.data?.settings ?? [];
        setSettings(settingsData);

        // Initialize form data
        const initialData: SettingFormData = {};
        settingsData.forEach((setting: SystemSetting) => {
          try {
            initialData[setting.key] = setting.type === 'json'
              ? JSON.parse(setting.value)
              : setting.type === 'number'
              ? parseFloat(setting.value)
              : setting.type === 'boolean'
              ? setting.value === 'true'
              : setting.value;
          } catch {
            initialData[setting.key] = setting.value;
          }
        });
        setFormData(initialData);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      // Convert form data to API format
      const updates = settings.map(setting => ({
        key: setting.key,
        value: setting.type === 'json'
          ? JSON.stringify(formData[setting.key])
          : String(formData[setting.key])
      }));

      // @governance MANDATORY - CSRF protection for PUT requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf('/api/admin/settings', {method: 'PUT', body: JSON.stringify({ settings: updates })});

      if (response.ok) {
        setSaveMessage({ type: 'success', text: 'Settings saved successfully!' });
        await fetchSettings();
      } else {
        const error = await response.json();
        setSaveMessage({ type: 'error', text: error.message ?? 'Failed to save settings' });
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Error saving settings' });
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // GROUPING
  // ============================================================================

  const groupedSettings: Record<SettingGroup, SystemSetting[]> = {
    general: settings.filter(s => s.group === 'general'),
    email: settings.filter(s => s.group === 'email'),
    payment: settings.filter(s => s.group === 'payment'),
    media: settings.filter(s => s.group === 'media'),
    security: settings.filter(s => s.group === 'security')
  };

  const groups: { key: SettingGroup; title: string }[] = [
    { key: 'general', title: 'General Settings' },
    { key: 'email', title: 'Email Configuration' },
    { key: 'payment', title: 'Payment Settings' },
    { key: 'media', title: 'Media Settings' },
    { key: 'security', title: 'Security Settings' }
  ];

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">System Settings</h1>
            <p className="text-gray-600">Configure platform-wide settings</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTestEmailModalOpen(true)}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Test Email
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-[#ed6437] text-white rounded hover:bg-[#d55a2f] disabled:bg-gray-400"
            >
              {saving ? 'Saving...' : 'Save All Changes'}
            </button>
          </div>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className={`mt-4 p-3 rounded ${
            saveMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {saveMessage.text}
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white p-8 rounded shadow text-center text-gray-500">
          Loading settings...
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <SettingsGroup
              key={group.key}
              title={group.title}
              settings={groupedSettings[group.key]}
              formData={formData}
              onChange={handleChange}
            />
          ))}
        </div>
      )}

      {/* Test Email Modal */}
      <TestEmailModal
        isOpen={testEmailModalOpen}
        onClose={() => setTestEmailModalOpen(false)}
      />
    </>
  );
}
