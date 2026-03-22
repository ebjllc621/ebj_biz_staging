/**
 * MFA Settings Page
 *
 * User interface for managing multi-factor authentication settings.
 * Provides TOTP enrollment, verification, recovery code management, and MFA disable.
 *
 * Security Features:
 * - Client-side state management for MFA flow
 * - QR code display for TOTP enrollment
 * - Recovery code display with copy functionality
 * - Confirmation dialogs for destructive actions
 * - Real-time status updates
 *
 * @see src/core/services/auth/MfaService.ts
 * @see src/app/api/auth/mfa/totp/*
 */

'use client';

import { fetchWithCsrf } from '@core/utils/csrf';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Types
interface MfaStatus {
  isEnabled: boolean;
  isVerified: boolean;
  availableMethods: string[];
  activeMethods: string[];
  recoveryCodesRemaining: number;
  lastUsedAt: string | null;
  isLocked: boolean;
  lockedUntil: string | null;
}

interface EnrollmentData {
  secret: string;
  qrCodeUrl: string;
  recoveryCodes: string[];
  serviceName: string;
  userIdentifier: string;
}

interface VerificationResult {
  success: boolean;
  error: string | null;
  usedRecoveryCode: boolean;
  recoveryCodesRemaining: number;
  isLocked: boolean;
  failureCount: number;
}

export default function MfaSettingsPage() {
  const _router = useRouter();

  // State management
  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null);
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [step, setStep] = useState<'status' | 'enroll' | 'verify' | 'complete'>('status');

  // Load MFA status on component mount
  useEffect(() => {
    loadMfaStatus();
  }, []);

  /**
   * Load current MFA status
   */
  const loadMfaStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/mfa/totp/disable', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load MFA status');
      }

      const data = await response.json();
      setMfaStatus(data);

      if (data.isEnabled && !data.isVerified) {
        setStep('verify');
      } else {
        setStep('status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load MFA status');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Start TOTP enrollment
   */
  const startEnrollment = async () => {
    try {
      setLoading(true);
      setError(null);

      // @governance MANDATORY - CSRF protection for POST requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf('/api/auth/mfa/totp/enroll', {method: 'POST'});

      if (!response.ok) {
        throw new Error('Failed to start MFA enrollment');
      }

      const data = await response.json();
      setEnrollmentData(data.data);
      setStep('enroll');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start enrollment');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verify TOTP code
   */
  const verifyTotpCode = async (isEnrollment = false) => {
    try {
      setLoading(true);
      setError(null);

      // @governance MANDATORY - CSRF protection for POST requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf('/api/auth/mfa/totp/verify', {method: 'POST', body: JSON.stringify({
          code: verificationCode,
          isEnrollment
        })});

      if (!response.ok) {
        throw new Error('Failed to verify TOTP code');
      }

      const data = await response.json();
      const result: VerificationResult = data.data;

      if (result.success) {
        if (isEnrollment) {
          setStep('complete');
        }
        await loadMfaStatus();
        setVerificationCode('');
      } else {
        setError(result.error || 'Verification failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Disable MFA
   */
  const disableMfa = async () => {
    if (!confirm('Are you sure you want to disable MFA? This will make your account less secure.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // @governance MANDATORY - CSRF protection for POST requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf('/api/auth/mfa/totp/disable', {method: 'POST', body: JSON.stringify({
          confirm: true,
          reason: 'User requested disable'
        })});

      if (!response.ok) {
        throw new Error('Failed to disable MFA');
      }

      await loadMfaStatus();
      setStep('status');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable MFA');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Regenerate recovery codes
   */
  const regenerateRecoveryCodes = async () => {
    if (!confirm('Are you sure you want to regenerate recovery codes? All existing codes will be invalidated.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // @governance MANDATORY - CSRF protection for POST requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf('/api/auth/mfa/totp/recovery', {method: 'POST', body: JSON.stringify({
          recoveryCode: 'REGENERATE',
          action: 'regenerate'
        })});

      if (!response.ok) {
        throw new Error('Failed to regenerate recovery codes');
      }

      const data = await response.json();
      if (data.data.recoveryCodes) {
        setEnrollmentData(prev => prev ? {
          ...prev,
          recoveryCodes: data.data.recoveryCodes
        } : null);
        setShowRecoveryCodes(true);
      }

      await loadMfaStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate recovery codes');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Copy recovery codes to clipboard
   */
  const copyRecoveryCodes = async () => {
    if (!enrollmentData?.recoveryCodes) return;

    try {
      await navigator.clipboard.writeText(enrollmentData.recoveryCodes.join('\n'));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    } catch (err) {
      setError('Failed to copy recovery codes');
    }
  };

  if (loading && !mfaStatus) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center">Loading MFA settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Multi-Factor Authentication</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="text-red-700 text-sm">{error}</div>
            <button
              onClick={() => setError(null)}
              className="text-red-500 text-sm underline mt-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* MFA Status Display */}
        {step === 'status' && mfaStatus && (
          <div className="space-y-6">
            <div className="border rounded-md p-4">
              <h2 className="text-lg font-semibold mb-3">Current Status</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Status:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    mfaStatus.isEnabled
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {mfaStatus.isEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Recovery Codes:</span>
                  <span className="ml-2">{mfaStatus.recoveryCodesRemaining} remaining</span>
                </div>
                {mfaStatus.lastUsedAt && (
                  <div className="col-span-2">
                    <span className="font-medium">Last Used:</span>
                    <span className="ml-2">{new Date(mfaStatus.lastUsedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {!mfaStatus.isEnabled ? (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Multi-factor authentication adds an extra layer of security to your account.
                  You'll need your phone or authenticator app to sign in.
                </p>
                <button
                  onClick={startEnrollment}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Setting up...' : 'Enable MFA'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-green-600">
                  MFA is enabled and protecting your account.
                </p>
                <div className="flex space-x-4">
                  <button
                    onClick={regenerateRecoveryCodes}
                    disabled={loading}
                    className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                  >
                    {loading ? 'Regenerating...' : 'Regenerate Recovery Codes'}
                  </button>
                  <button
                    onClick={disableMfa}
                    disabled={loading}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {loading ? 'Disabling...' : 'Disable MFA'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Enrollment Flow */}
        {step === 'enroll' && enrollmentData && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Set Up Authenticator App</h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Step 1: Scan QR Code</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                <div className="bg-white p-4 border-2 border-gray-200 rounded-lg inline-block">
                  <div className="text-center text-gray-500">
                    [QR Code would be generated here]<br/>
                    URL: {enrollmentData.qrCodeUrl}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Manual Entry (Optional)</h3>
                <p className="text-sm text-gray-600 mb-2">
                  If you can't scan the QR code, enter this secret manually:
                </p>
                <div className="bg-gray-50 p-3 rounded border font-mono text-sm break-all">
                  {enrollmentData.secret}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Step 2: Enter Verification Code</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Enter the 6-digit code from your authenticator app:
                </p>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="border border-gray-300 rounded px-3 py-2 text-center font-mono text-lg w-32"
                    maxLength={6}
                  />
                  <button
                    onClick={() => verifyTotpCode(true)}
                    disabled={loading || verificationCode.length !== 6}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </div>
            </div>

            {enrollmentData.recoveryCodes.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="font-medium mb-2">Recovery Codes</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Save these recovery codes in a safe place. You can use them to access your account if you lose your authenticator device.
                </p>
                <div className="bg-gray-50 p-4 rounded border">
                  <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                    {enrollmentData.recoveryCodes.map((code, index: number) => (
                      <div key={index} className="text-center py-1">
                        {code}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={copyRecoveryCodes}
                      className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                    >
                      {copiedCodes ? 'Copied!' : 'Copy Codes'}
                    </button>
                    <button
                      onClick={() => setShowRecoveryCodes(!showRecoveryCodes)}
                      className="text-gray-600 text-sm underline"
                    >
                      {showRecoveryCodes ? 'Hide' : 'Show'} Codes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Verification Step */}
        {step === 'verify' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Complete MFA Setup</h2>
            <p className="text-gray-600">
              Enter a verification code from your authenticator app to complete the setup:
            </p>
            <div className="flex space-x-2">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="border border-gray-300 rounded px-3 py-2 text-center font-mono text-lg w-32"
                maxLength={6}
              />
              <button
                onClick={() => verifyTotpCode(true)}
                disabled={loading || verificationCode.length !== 6}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Complete Setup'}
              </button>
            </div>
          </div>
        )}

        {/* Completion Step */}
        {step === 'complete' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-green-600 text-4xl mb-4">✓</div>
              <h2 className="text-lg font-semibold text-green-800">MFA Successfully Enabled!</h2>
              <p className="text-gray-600 mt-2">
                Your account is now protected with multi-factor authentication.
              </p>
              <button
                onClick={() => setStep('status')}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                View Settings
              </button>
            </div>
          </div>
        )}

        {/* Recovery Codes Display */}
        {showRecoveryCodes && enrollmentData && (
          <div className="border-t pt-6">
            <h3 className="font-medium mb-2">Your Recovery Codes</h3>
            <div className="bg-gray-50 p-4 rounded border">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {enrollmentData.recoveryCodes.map((code, index: number) => (
                  <div key={index} className="text-center py-1">
                    {code}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowRecoveryCodes(false)}
                className="mt-4 text-gray-600 text-sm underline"
              >
                Hide Codes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}