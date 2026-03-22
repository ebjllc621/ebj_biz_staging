// MFA Settings Page - AUTH-P3A-TOTP
// Governance: React 18 Server Components; client separation; path aliases

'use client';

// Force dynamic rendering - required for React Context (useAuth, etc.)
// Prevents 'Cannot read properties of null (reading useContext)' in production build
export const dynamic = 'force-dynamic';

import { fetchWithCsrf } from '@core/utils/csrf';

import { useState, useEffect } from 'react';
import { MfaStatus, MfaSetupResponse } from '@core/types/auth/mfa';

export default function MfaSettingsPage() {
  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null);
  const [setupResponse, setSetupResponse] = useState<MfaSetupResponse | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchMfaStatus();
  }, []);

  const fetchMfaStatus = async () => {
    try {
      const response = await fetch('/api/auth/mfa/status', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch MFA status');
      }

      const data = await response.json();
      setMfaStatus(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleSetupMfa = async () => {
    setLoading(true);
    setError(null);

    try {
      // @governance MANDATORY - CSRF protection for POST requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf('/api/auth/mfa/setup', {method: 'POST'});

      if (!response.ok) {
        throw new Error('Failed to setup MFA');
      }

      const data = await response.json();
      setSetupResponse(data.data);
      setSuccess('MFA setup initiated. Please scan the QR code and verify.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // @governance MANDATORY - CSRF protection for POST requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf('/api/auth/mfa/verify', {method: 'POST', body: JSON.stringify({
          code: verifyCode,
          type: 'totp'
        })});

      if (!response.ok) {
        throw new Error('Verification failed');
      }

      const data = await response.json();

      if (data.success) {
        setSuccess('MFA setup completed successfully!');
        setSetupResponse(null);
        setVerifyCode('');
        await fetchMfaStatus();
      } else {
        setError(data.message || 'Verification failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!confirm('Are you sure you want to disable MFA? This will reduce your account security.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // @governance MANDATORY - CSRF protection for POST requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf('/api/auth/mfa/disable', {method: 'POST'});

      if (!response.ok) {
        throw new Error('Failed to disable MFA');
      }

      setSuccess('MFA disabled successfully');
      await fetchMfaStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (!mfaStatus) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">Loading MFA settings...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Multi-Factor Authentication (MFA)
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Add an extra layer of security to your account with TOTP authentication.
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {/* Error/Success Messages */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="text-sm text-green-700">{success}</div>
              </div>
            )}

            {/* Current Status */}
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-3">Current Status</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      Status: {mfaStatus.enabled ? (
                        <span className="text-green-600">Enabled</span>
                      ) : (
                        <span className="text-red-600">Disabled</span>
                      )}
                    </div>
                    {mfaStatus.enabled && (
                      <div className="text-sm text-gray-600 mt-1">
                        Method: TOTP • Recovery codes: {mfaStatus.recovery_codes_remaining}
                      </div>
                    )}
                    {mfaStatus.last_used_at && (
                      <div className="text-sm text-gray-600 mt-1">
                        Last used: {new Date(mfaStatus.last_used_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                  {mfaStatus.enabled && (
                    <button
                      onClick={handleDisableMfa}
                      disabled={loading}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      {loading ? 'Disabling...' : 'Disable MFA'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Setup MFA */}
            {!mfaStatus.enabled && !setupResponse && (
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-3">Setup MFA</h2>
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <div className="text-sm text-blue-700">
                    <strong>Why enable MFA?</strong>
                    <ul className="mt-2 list-disc list-inside">
                      <li>Protects your account even if your password is compromised</li>
                      <li>Required for admin accounts and high-value operations</li>
                      <li>Uses industry-standard TOTP (Time-based One-Time Password)</li>
                    </ul>
                  </div>
                </div>
                <button
                  onClick={handleSetupMfa}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Setting up...' : 'Setup MFA'}
                </button>
              </div>
            )}

            {/* MFA Setup Process */}
            {setupResponse && (
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-3">Complete MFA Setup</h2>

                {/* Step 1: QR Code */}
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">Step 1: Scan QR Code</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-center mb-4">
                      <img
                        src={setupResponse.qr_code}
                        alt="MFA QR Code"
                        className="mx-auto"
                      />
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
                      <p className="mt-2">
                        <strong>Manual entry:</strong> {setupResponse.secret}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 2: Verify */}
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">Step 2: Verify Setup</h3>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                      placeholder="Enter 6-digit code"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      maxLength={6}
                    />
                    <button
                      onClick={handleVerifyCode}
                      disabled={loading || verifyCode.length !== 6}
                      className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {loading ? 'Verifying...' : 'Verify'}
                    </button>
                  </div>
                </div>

                {/* Recovery Codes */}
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">Recovery Codes</h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="text-sm text-yellow-700 mb-3">
                      <strong>Important:</strong> Save these recovery codes in a safe place.
                      You can use them to access your account if you lose your authenticator app.
                    </div>
                    <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                      {setupResponse.recovery_codes.map((code, index: number) => (
                        <div key={index} className="bg-white p-2 rounded border">
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}