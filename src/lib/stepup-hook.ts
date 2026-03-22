/**
 * React Hook for Step-Up Authentication
 *
 * This is separated into its own file to avoid useState import issues in the main stepup.ts
 * Import this in React components that need step-up authentication.
 */

'use client';

import { useState } from 'react';
import { StepUpResult } from '@core/types/auth/mfa';
import { fetchWithCsrf } from '@core/utils/csrf';

/**
 * React hook for step-up authentication
 */
export function useStepUp(operation: string) {
  const [stepUpStatus, setStepUpStatus] = useState<StepUpResult | null>(null);
  const [loading, setLoading] = useState(false);

  const checkStepUp = async () => {
    setLoading(true);
    try {
      // @governance MANDATORY - CSRF protection for POST requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf('/api/auth/stepup/check', {
        method: 'POST',
        body: JSON.stringify({ operation })
      });

      if (response.ok) {
        const data = await response.json();
        setStepUpStatus(data.data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const verifyStepUp = async (code: string) => {
    setLoading(true);
    try {
      // @governance MANDATORY - CSRF protection for POST requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf('/api/auth/stepup/verify', {
        method: 'POST',
        body: JSON.stringify({ operation, code })
      });

      if (response.ok) {
        const data = await response.json();
        setStepUpStatus(data.data);
        return data.data;
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  return {
    stepUpStatus,
    loading,
    checkStepUp,
    verifyStepUp
  };
}