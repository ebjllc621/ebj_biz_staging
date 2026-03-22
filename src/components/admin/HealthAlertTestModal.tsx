/**
 * HealthAlertTestModal - Health Alert Test Email Modal
 *
 * Allows administrators to send test health alert emails to verify
 * email configuration and delivery.
 *
 * Features:
 * - Select alert type (unhealthy/degraded/recovered)
 * - Optional custom service name
 * - Send test email with immediate feedback
 * - Success/error result display
 * - CSRF-protected form submission
 *
 * GOVERNANCE COMPLIANCE:
 * - 'use client' directive for client-side state
 * - BizModal wrapper (MANDATORY)
 * - fetchWithCsrf for CSRF protection
 * - ErrorBoundary compatible (STANDARD tier)
 * - Import paths use @core/ aliases
 *
 * @phase Phase 6.3 - Health Alert Admin UI Enhancement
 * @authority HEALTH_ALERT_ADMIN_UI_MASTER_BRAIN_PLAN.md
 * @tier STANDARD
 */

'use client';

import { useState, useCallback, memo } from 'react';
import BizModal, { BizModalButton } from '@/components/BizModal/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';
import { ErrorService } from '@core/services/ErrorService';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export type AlertType = 'unhealthy' | 'degraded' | 'recovered';

interface TestResult {
  success: boolean;
  message: string;
  logId?: number;
  recipientEmail?: string;
  alertType?: AlertType;
  serviceName?: string;
  error?: string;
}

export interface HealthAlertTestModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Current admin email for display (from config) */
  adminEmail?: string;
}

// ============================================================================
// Alert Type Options
// ============================================================================

const ALERT_TYPES: { value: AlertType; label: string; description: string; color: string }[] = [
  {
    value: 'unhealthy',
    label: 'Unhealthy',
    description: 'Simulates a critical service failure',
    color: 'text-red-600'
  },
  {
    value: 'degraded',
    label: 'Degraded',
    description: 'Simulates a warning-level performance issue',
    color: 'text-yellow-600'
  },
  {
    value: 'recovered',
    label: 'Recovered',
    description: 'Simulates a service returning to healthy',
    color: 'text-green-600'
  }
];

// ============================================================================
// Component
// ============================================================================

/**
 * HealthAlertTestModal - Memoized test modal component
 */
const HealthAlertTestModal = memo(function HealthAlertTestModal({
  isOpen,
  onClose,
  adminEmail
}: HealthAlertTestModalProps) {
  // Form state
  const [alertType, setAlertType] = useState<AlertType>('unhealthy');
  const [serviceName, setServiceName] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  // Handle send test
  const handleSendTest = useCallback(async () => {
    setSending(true);
    setResult(null);

    try {
      // @governance MANDATORY - CSRF protection for POST requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf('/api/admin/health-alerts/test', {
        method: 'POST',
        body: JSON.stringify({
          alertType,
          serviceName: serviceName.trim() || undefined
        })
      });

      const data = await response.json();

      if (data.success && data.data) {
        setResult({
          success: true,
          message: data.data.message || 'Test email sent successfully',
          logId: data.data.logId,
          recipientEmail: data.data.recipientEmail,
          alertType: data.data.alertType,
          serviceName: data.data.serviceName
        });
      } else {
        setResult({
          success: false,
          message: 'Failed to send test email',
          error: data.error?.userMessage || data.error?.message || 'Unknown error'
        });
      }
    } catch (error) {
      ErrorService.capture('[HealthAlertTestModal] Send test failed:', error);
      setResult({
        success: false,
        message: 'Failed to send test email',
        error: error instanceof Error ? error.message : 'Network error'
      });
    } finally {
      setSending(false);
    }
  }, [alertType, serviceName]);

  // Handle modal close
  const handleClose = useCallback(() => {
    if (!sending) {
      // Reset state on close
      setResult(null);
      setServiceName('');
      setAlertType('unhealthy');
      onClose();
    }
  }, [sending, onClose]);

  // Get selected alert type info
  const selectedType = ALERT_TYPES.find(t => t.value === alertType);

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Test Health Alert Email"
      subtitle="Send a test email to verify your alert configuration"
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Recipient Info */}
        {adminEmail && (
          <div className="p-3 rounded-lg bg-blue-50 text-blue-700 text-sm">
            <span className="font-medium">Recipient:</span> {adminEmail}
          </div>
        )}

        {/* Alert Type Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alert Type <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {ALERT_TYPES.map((type) => (
              <label
                key={type.value}
                className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition ${
                  alertType === type.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${sending ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name="alertType"
                  value={type.value}
                  checked={alertType === type.value}
                  onChange={(e) => setAlertType(e.target.value as AlertType)}
                  disabled={sending}
                  className="mt-1"
                />
                <div>
                  <span className={`font-medium ${type.color}`}>{type.label}</span>
                  <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Custom Service Name (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Service Name <span className="text-gray-600">(optional)</span>
          </label>
          <input
            type="text"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            disabled={sending}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition ${
              sending ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
            placeholder="test-service (default)"
            maxLength={50}
          />
          <p className="mt-1 text-xs text-gray-500">
            Custom service name to include in the test email
          </p>
        </div>

        {/* Result Display */}
        {result && (
          <div className={`p-4 rounded-lg ${
            result.success
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className={`flex items-center gap-2 font-medium ${
              result.success ? 'text-green-700' : 'text-red-700'
            }`}>
              <span className="text-lg">{result.success ? '✅' : '❌'}</span>
              {result.success ? 'Test Email Sent' : 'Test Failed'}
            </div>
            <div className="mt-2 text-sm">
              {result.success ? (
                <div className="space-y-1 text-green-600">
                  <p>Email sent to <strong>{result.recipientEmail}</strong></p>
                  <p className="text-xs text-green-500">
                    Alert Type: {result.alertType} | Service: {result.serviceName} | Log ID: {result.logId}
                  </p>
                </div>
              ) : (
                <p className="text-red-600">{result.error || result.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Test Email Notice */}
        <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-700">
          <span className="font-medium">Note:</span> Test emails include a{' '}
          <span className="font-medium">[TEST]</span> prefix in the subject and a{' '}
          warning banner to distinguish them from real alerts.
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <BizModalButton variant="secondary" onClick={handleClose} disabled={sending}>
            {result?.success ? 'Close' : 'Cancel'}
          </BizModalButton>
          <BizModalButton
            variant="primary"
            onClick={handleSendTest}
            disabled={sending}
          >
            {sending ? 'Sending...' : result?.success ? 'Send Another' : 'Send Test Email'}
          </BizModalButton>
        </div>
      </div>
    </BizModal>
  );
});

export default HealthAlertTestModal;
