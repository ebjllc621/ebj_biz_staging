/**
 * HealthAlertConfigModal - Health Alert Configuration Modal
 *
 * Provides full configuration control for health alert settings.
 * Features:
 * - Edit admin email address
 * - Configure throttle window (1-60 minutes)
 * - Toggle alert type preferences (unhealthy/recovered/degraded)
 * - CSRF-protected form submission
 * - Validation with error feedback
 *
 * GOVERNANCE COMPLIANCE:
 * - 'use client' directive for client-side state
 * - BizModal wrapper (MANDATORY)
 * - fetchWithCsrf for CSRF protection
 * - ErrorBoundary compatible (STANDARD tier)
 * - Import paths use @core/ aliases
 *
 * @phase Phase 6.2 - Health Alert Admin UI Enhancement
 * @authority HEALTH_ALERT_ADMIN_UI_MASTER_BRAIN_PLAN.md
 * @tier STANDARD
 */

'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import BizModal, { BizModalButton } from '@/components/BizModal/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';
import { ErrorService } from '@core/services/ErrorService';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface HealthAlertConfig {
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

interface ConfigFormData {
  adminEmail: string;
  throttleMinutes: number;
  alertOnUnhealthy: boolean;
  alertOnRecovered: boolean;
  alertOnDegraded: boolean;
}

interface ValidationErrors {
  adminEmail?: string;
  throttleMinutes?: string;
}

export interface HealthAlertConfigModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Current config to edit (required when isOpen) */
  config: HealthAlertConfig | null;
  /** Callback when config is saved successfully */
  onSave?: (updatedConfig: HealthAlertConfig) => void;
}

// ============================================================================
// Validation
// ============================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm(data: ConfigFormData): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!data.adminEmail.trim()) {
    errors.adminEmail = 'Email address is required';
  } else if (!EMAIL_REGEX.test(data.adminEmail)) {
    errors.adminEmail = 'Please enter a valid email address';
  }

  if (data.throttleMinutes < 1 || data.throttleMinutes > 60) {
    errors.throttleMinutes = 'Throttle must be between 1 and 60 minutes';
  }

  return errors;
}

// ============================================================================
// Component
// ============================================================================

/**
 * HealthAlertConfigModal - Memoized config modal component
 */
const HealthAlertConfigModal = memo(function HealthAlertConfigModal({
  isOpen,
  onClose,
  config,
  onSave
}: HealthAlertConfigModalProps) {
  // Form state
  const [formData, setFormData] = useState<ConfigFormData>({
    adminEmail: '',
    throttleMinutes: 5,
    alertOnUnhealthy: true,
    alertOnRecovered: true,
    alertOnDegraded: false
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Populate form when config changes or modal opens
  useEffect(() => {
    if (config && isOpen) {
      setFormData({
        adminEmail: config.adminEmail,
        throttleMinutes: config.throttleMinutes,
        alertOnUnhealthy: config.alertOnUnhealthy,
        alertOnRecovered: config.alertOnRecovered,
        alertOnDegraded: config.alertOnDegraded
      });
      setErrors({});
      setSaveError(null);
    }
  }, [config, isOpen]);

  // Handle field changes
  const handleChange = useCallback((field: keyof ConfigFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    setSaveError(null);
  }, [errors]);

  // Handle save
  const handleSave = useCallback(async () => {
    // Validate form
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      // @governance MANDATORY - CSRF protection for PUT requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf('/api/admin/health-alerts/config', {
        method: 'PUT',
        body: JSON.stringify({
          adminEmail: formData.adminEmail.trim(),
          throttleMinutes: formData.throttleMinutes,
          alertOnUnhealthy: formData.alertOnUnhealthy,
          alertOnRecovered: formData.alertOnRecovered,
          alertOnDegraded: formData.alertOnDegraded
        })
      });

      const result = await response.json();

      if (result.success && result.data) {
        onSave?.(result.data);
        onClose();
      } else {
        setSaveError(result.error?.userMessage || result.data?.message || 'Failed to save configuration');
      }
    } catch (error) {
      ErrorService.capture('[HealthAlertConfigModal] Save failed:', error);
      setSaveError('Error saving configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [formData, onSave, onClose]);

  // Handle modal close
  const handleClose = useCallback(() => {
    if (!saving) {
      onClose();
    }
  }, [saving, onClose]);

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Health Alert Configuration"
      subtitle="Configure email notifications for service health issues"
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Admin Email Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Admin Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={formData.adminEmail}
            onChange={(e) => handleChange('adminEmail', e.target.value)}
            disabled={saving}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition ${
              errors.adminEmail
                ? 'border-red-300 focus:ring-red-200 focus:border-red-500'
                : 'border-gray-300 focus:ring-blue-200 focus:border-blue-500'
            } ${saving ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            placeholder="admin@example.com"
          />
          {errors.adminEmail && (
            <p className="mt-1 text-sm text-red-600">{errors.adminEmail}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Email address to receive health alert notifications
          </p>
        </div>

        {/* Throttle Minutes Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Throttle Window: {formData.throttleMinutes} minute{formData.throttleMinutes !== 1 ? 's' : ''}
          </label>
          <input
            type="range"
            min="1"
            max="60"
            step="1"
            value={formData.throttleMinutes}
            onChange={(e) => handleChange('throttleMinutes', parseInt(e.target.value))}
            disabled={saving}
            className={`w-full ${saving ? 'cursor-not-allowed opacity-50' : ''}`}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1 min</span>
            <span>30 min</span>
            <span>60 min</span>
          </div>
          {errors.throttleMinutes && (
            <p className="mt-1 text-sm text-red-600">{errors.throttleMinutes}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Minimum time between alerts for the same service (prevents spam)
          </p>
        </div>

        {/* Alert Type Preferences */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alert Types
          </label>
          <div className="space-y-2">
            {/* Alert on Unhealthy */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.alertOnUnhealthy}
                onChange={(e) => handleChange('alertOnUnhealthy', e.target.checked)}
                disabled={saving}
                className={`w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
                  saving ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
              />
              <span className="text-sm">
                <span className="font-medium text-red-600">Unhealthy</span>
                <span className="text-gray-500 ml-1">- Service is down or failing</span>
              </span>
            </label>

            {/* Alert on Degraded */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.alertOnDegraded}
                onChange={(e) => handleChange('alertOnDegraded', e.target.checked)}
                disabled={saving}
                className={`w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
                  saving ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
              />
              <span className="text-sm">
                <span className="font-medium text-yellow-600">Degraded</span>
                <span className="text-gray-500 ml-1">- Service is slow or partially failing</span>
              </span>
            </label>

            {/* Alert on Recovered */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.alertOnRecovered}
                onChange={(e) => handleChange('alertOnRecovered', e.target.checked)}
                disabled={saving}
                className={`w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
                  saving ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
              />
              <span className="text-sm">
                <span className="font-medium text-green-600">Recovered</span>
                <span className="text-gray-500 ml-1">- Service returned to healthy</span>
              </span>
            </label>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Select which health state changes should trigger email notifications
          </p>
        </div>

        {/* Save Error */}
        {saveError && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            {saveError}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <BizModalButton variant="secondary" onClick={handleClose} disabled={saving}>
            Cancel
          </BizModalButton>
          <BizModalButton variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Configuration'}
          </BizModalButton>
        </div>
      </div>
    </BizModal>
  );
});

export default HealthAlertConfigModal;
