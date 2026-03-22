/**
 * HealthAlertToggle - Health Alert Email Toggle Component
 *
 * Provides admin control over health alert email notifications.
 * Features:
 * - Toggle switch for enabling/disabling alerts
 * - Loading state during API calls
 * - Success/error feedback messages
 * - Auto-clear messages after 3 seconds
 *
 * GOVERNANCE COMPLIANCE:
 * - 'use client' directive for client-side state
 * - fetchWithCsrf for CSRF protection
 * - ErrorBoundary compatible (STANDARD tier)
 * - Import paths use @core/ aliases
 *
 * @phase Phase 4 - Service Health Monitoring Enhancement
 * @authority SERVICE_HEALTH_MONITORING_MASTER_BRAIN_PLAN.md
 * @tier STANDARD
 */

'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import HealthAlertConfigModal from '@/components/admin/HealthAlertConfigModal';
import HealthAlertTestModal from '@/components/admin/HealthAlertTestModal';
import { ErrorService } from '@core/services/ErrorService';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface HealthAlertConfig {
  id: number;
  enabled: boolean;
  adminEmail: string;
  throttleMinutes: number;
  alertOnUnhealthy: boolean;
  alertOnRecovered: boolean;
  alertOnDegraded: boolean;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

interface HealthAlertToggleProps {
  /** Optional callback when toggle state changes */
  onToggleChange?: (enabled: boolean) => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * HealthAlertToggle - Memoized toggle component for health alert email control
 */
const HealthAlertToggle = memo(function HealthAlertToggle({
  onToggleChange
}: HealthAlertToggleProps) {
  const [config, setConfig] = useState<HealthAlertConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);

  // Fetch initial config
  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/health-alerts/config', {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success && result.data) {
        setConfig(result.data);
      } else {
        setMessage({ type: 'error', text: 'Failed to load alert configuration' });
      }
    } catch (error) {
      ErrorService.capture('[HealthAlertToggle] Failed to fetch config:', error);
      setMessage({ type: 'error', text: 'Error loading configuration' });
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Auto-clear message after 3 seconds
  useEffect(() => {
    if (message) {
      const timeoutId = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timeoutId);
    }
  }, [message]);

  // Toggle handler
  const handleToggle = useCallback(async () => {
    if (!config || updating) return;

    const newEnabled = !config.enabled;
    setUpdating(true);
    setMessage(null);

    try {
      // @governance MANDATORY - CSRF protection for PUT requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf('/api/admin/health-alerts/config', {
        method: 'PUT',
        body: JSON.stringify({ enabled: newEnabled })
      });

      const result = await response.json();

      if (result.success && result.data) {
        setConfig(result.data);
        setMessage({
          type: 'success',
          text: newEnabled ? 'Health alerts enabled' : 'Health alerts disabled'
        });
        onToggleChange?.(newEnabled);
      } else {
        setMessage({
          type: 'error',
          text: result.data?.message || result.error?.userMessage || 'Failed to update'
        });
      }
    } catch (error) {
      ErrorService.capture('[HealthAlertToggle] Toggle failed:', error);
      setMessage({ type: 'error', text: 'Error updating configuration' });
    } finally {
      setUpdating(false);
    }
  }, [config, updating, onToggleChange]);

  // Handle config save from modal
  const handleConfigSave = useCallback((updatedConfig: HealthAlertConfig) => {
    setConfig(updatedConfig);
    setMessage({ type: 'success', text: 'Configuration saved' });
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="animate-pulse flex items-center gap-2">
        <div className="w-4 h-4 bg-gray-200 rounded"></div>
        <div className="h-4 w-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  // Error state (no config loaded)
  if (!config) {
    return (
      <div className="text-sm text-red-600">
        Unable to load alert configuration
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Toggle Control */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={handleToggle}
          disabled={updating}
          className={`w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
            updating ? 'opacity-50 cursor-wait' : 'cursor-pointer'
          }`}
        />
        <span className="text-sm font-medium">
          Email Alerts {config.enabled ? 'Enabled' : 'Disabled'}
        </span>
        {updating && (
          <span className="text-xs text-gray-500">(Updating...)</span>
        )}
      </label>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 ml-8">
        <button
          onClick={() => setShowConfigModal(true)}
          disabled={loading || updating}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
            loading || updating
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
          }`}
          title="Configure health alert settings"
        >
          ⚙ Config
        </button>
        <button
          onClick={() => setShowTestModal(true)}
          disabled={loading || updating || !config?.enabled}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
            loading || updating || !config?.enabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-green-50 text-green-700 hover:bg-green-100'
          }`}
          title={!config?.enabled ? 'Enable alerts to test' : 'Send a test alert email'}
        >
          📧 Test
        </button>
      </div>

      {/* Status Indicator */}
      <div className={`text-xs flex items-center gap-1.5 ${
        config.enabled ? 'text-green-600' : 'text-gray-500'
      }`}>
        <span className={`w-2 h-2 rounded-full ${
          config.enabled ? 'bg-green-500' : 'bg-gray-400'
        }`}></span>
        <span>
          {config.enabled
            ? `Alerts sent to ${config.adminEmail}`
            : 'Email notifications disabled'}
        </span>
      </div>

      {/* Feedback Message */}
      {message && (
        <div className={`text-xs px-2 py-1 rounded ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700'
            : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Config Modal */}
      <HealthAlertConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        config={config}
        onSave={handleConfigSave}
      />

      {/* Test Modal */}
      <HealthAlertTestModal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        adminEmail={config?.adminEmail}
      />
    </div>
  );
});

export default HealthAlertToggle;
