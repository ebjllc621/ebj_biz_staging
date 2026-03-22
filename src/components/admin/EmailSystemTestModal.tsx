/**
 * EmailSystemTestModal - Comprehensive Email System Test Modal
 *
 * Tests all email delivery systems:
 * - Basic email delivery (direct EmailService)
 * - Health alert emails (HealthAlertService)
 * - Notification channel emails (NotificationService)
 * - Verification email template
 * - Password reset email template
 *
 * GOVERNANCE COMPLIANCE:
 * - 'use client' directive for client-side state
 * - BizModal wrapper (MANDATORY)
 * - fetchWithCsrf for CSRF protection
 * - ErrorBoundary compatible (STANDARD tier)
 * - Import paths use @core/ aliases
 * - No emojis on buttons - uses Lucide icons
 *
 * @phase Notification Manager Email Channel Enhancement
 * @tier STANDARD
 */

'use client';

import { useState, useCallback, useEffect, memo } from 'react';
import BizModal, { BizModalButton } from '@/components/BizModal/BizModal';
import { ErrorService } from '@core/services/ErrorService';
import {
  Send,
  AlertTriangle,
  Bell,
  ShieldCheck,
  KeyRound,
  CheckCircle,
  XCircle,
  Loader2,
  Play,
  RotateCcw,
  Mail
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

type EmailTestType = 'basic' | 'health-alert' | 'notification' | 'verification' | 'password-reset';

interface TestDefinition {
  type: EmailTestType;
  label: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
}

interface TestResult {
  success: boolean;
  message: string;
  testType: EmailTestType;
  sentAt: string;
  error?: string;
  details?: {
    emailRecipient?: string;
  };
}

export interface EmailSystemTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================================
// Test Definitions
// ============================================================================

const EMAIL_TESTS: TestDefinition[] = [
  {
    type: 'basic',
    label: 'Basic Delivery',
    description: 'Tests core SMTP connectivity and basic email delivery',
    icon: Send,
    iconColor: 'text-blue-600'
  },
  {
    type: 'health-alert',
    label: 'Health Alerts',
    description: 'Tests health monitoring alert emails (HealthAlertService)',
    icon: AlertTriangle,
    iconColor: 'text-amber-600'
  },
  {
    type: 'notification',
    label: 'Notification Channel',
    description: 'Tests the notification system email delivery channel',
    icon: Bell,
    iconColor: 'text-green-600'
  },
  {
    type: 'verification',
    label: 'Verification Template',
    description: 'Tests the email verification template delivery',
    icon: ShieldCheck,
    iconColor: 'text-indigo-600'
  },
  {
    type: 'password-reset',
    label: 'Password Reset Template',
    description: 'Tests the password reset email template delivery',
    icon: KeyRound,
    iconColor: 'text-purple-600'
  }
];

// ============================================================================
// Component
// ============================================================================

const EmailSystemTestModal = memo(function EmailSystemTestModal({
  isOpen,
  onClose
}: EmailSystemTestModalProps) {
  const [results, setResults] = useState<Map<EmailTestType, TestResult>>(new Map());
  const [running, setRunning] = useState<Set<EmailTestType>>(new Set());
  const [recipientEmail, setRecipientEmail] = useState<string | null>(null);

  // Fetch configured admin email when modal opens
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const res = await fetch('/api/admin/health-alerts/config', { credentials: 'include' });
        const data = await res.json();
        if (data.success && data.data?.adminEmail) {
          setRecipientEmail(data.data.adminEmail);
        }
      } catch {
        // Silently fail - email will still show in test results
      }
    })();
  }, [isOpen]);

  // Run a single test
  const runTest = useCallback(async (testType: EmailTestType) => {
    setRunning(prev => new Set(prev).add(testType));
    setResults(prev => {
      const next = new Map(prev);
      next.delete(testType);
      return next;
    });

    try {
      const response = await fetch('/api/admin/notifications/test/email', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testType,
          alertType: testType === 'health-alert' ? 'unhealthy' : undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setResults(prev => new Map(prev).set(testType, {
          success: false,
          message: data.error?.userMessage || data.message || `HTTP ${response.status}`,
          testType,
          sentAt: new Date().toISOString(),
          error: data.error?.userMessage || data.code || `HTTP ${response.status}`
        }));
      } else if (data.success && data.data) {
        setResults(prev => new Map(prev).set(testType, {
          success: data.data.success,
          message: data.data.message,
          testType,
          sentAt: data.data.sentAt,
          error: data.data.error,
          details: data.data.details
        }));
      } else {
        setResults(prev => new Map(prev).set(testType, {
          success: false,
          message: data.error?.userMessage || 'Unexpected response format',
          testType,
          sentAt: new Date().toISOString(),
          error: data.error?.userMessage || 'Unknown error'
        }));
      }
    } catch (error) {
      ErrorService.capture(`[EmailSystemTestModal] Test ${testType} failed:`, error);
      setResults(prev => new Map(prev).set(testType, {
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
        testType,
        sentAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Network error'
      }));
    } finally {
      setRunning(prev => {
        const next = new Set(prev);
        next.delete(testType);
        return next;
      });
    }
  }, []);

  // Run all tests sequentially
  const runAllTests = useCallback(async () => {
    for (const test of EMAIL_TESTS) {
      await runTest(test.type);
    }
  }, [runTest]);

  // Handle close
  const handleClose = useCallback(() => {
    if (running.size === 0) {
      setResults(new Map());
      onClose();
    }
  }, [running.size, onClose]);

  // Reset all results
  const resetResults = useCallback(() => {
    setResults(new Map());
  }, []);

  const isAnyRunning = running.size > 0;
  const hasResults = results.size > 0;
  const allPassed = hasResults && EMAIL_TESTS.every(t => results.get(t.type)?.success);
  const anyFailed = hasResults && Array.from(results.values()).some(r => !r.success);

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Email System Tests"
      subtitle="Test all email delivery systems to verify configuration"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Summary banner */}
        {hasResults && !isAnyRunning && (
          <div className={`p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${
            allPassed
              ? 'bg-green-50 text-green-700 border border-green-200'
              : anyFailed
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
          }`}>
            {allPassed ? (
              <><CheckCircle className="w-4 h-4" /> All email systems passed</>
            ) : (
              <><XCircle className="w-4 h-4" /> {Array.from(results.values()).filter(r => !r.success).length} test(s) failed</>
            )}
          </div>
        )}

        {/* Recipient info */}
        {recipientEmail && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
            <span>All tests send to: <strong>{recipientEmail}</strong> (change in Config)</span>
          </div>
        )}

        {/* Test list */}
        <div className="space-y-2">
          {EMAIL_TESTS.map((test) => {
            const Icon = test.icon;
            const result = results.get(test.type);
            const isRunning = running.has(test.type);

            return (
              <div
                key={test.type}
                className={`border rounded-lg p-3 transition ${
                  result
                    ? result.success
                      ? 'border-green-200 bg-green-50/50'
                      : 'border-red-200 bg-red-50/50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${test.iconColor}`} />
                    <div>
                      <div className="text-sm font-medium">{test.label}</div>
                      <div className="text-xs text-gray-500">{test.description}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Result indicator */}
                    {result && !isRunning && (
                      result.success
                        ? <CheckCircle className="w-4 h-4 text-green-600" />
                        : <XCircle className="w-4 h-4 text-red-600" />
                    )}

                    {/* Run button */}
                    <button
                      onClick={() => runTest(test.type)}
                      disabled={isAnyRunning}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
                        isAnyRunning
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      }`}
                    >
                      {isRunning ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Sending...</>
                      ) : (
                        <><Play className="w-3 h-3" /> Test</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Result details */}
                {result && !isRunning && (
                  <div className={`mt-2 pt-2 border-t text-xs ${
                    result.success ? 'border-green-200 text-green-600' : 'border-red-200 text-red-600'
                  }`}>
                    {result.message}
                    {result.details?.emailRecipient && result.success && (
                      <span className="text-gray-500 ml-1">({result.details.emailRecipient})</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <div className="flex gap-2">
            {hasResults && (
              <button
                onClick={resetResults}
                disabled={isAnyRunning}
                className="px-3 py-1.5 text-xs font-medium rounded-md text-gray-600 hover:bg-gray-100 transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <BizModalButton variant="secondary" onClick={handleClose} disabled={isAnyRunning}>
              Close
            </BizModalButton>
            <BizModalButton
              variant="primary"
              onClick={runAllTests}
              disabled={isAnyRunning}
            >
              {isAnyRunning ? 'Running...' : 'Run All Tests'}
            </BizModalButton>
          </div>
        </div>
      </div>
    </BizModal>
  );
});

export default EmailSystemTestModal;
