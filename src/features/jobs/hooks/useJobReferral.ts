/**
 * useJobReferral Hook
 *
 * Hook for managing job referral actions and tracking
 *
 * GOVERNANCE COMPLIANCE:
 * - Hook pattern with useState, useCallback
 * - fetchWithCsrf for mutations
 * - Import aliases: @core/, @features/
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 * @reference src/features/contacts/services/ReferralService.ts - Referral pattern
 */

import { useState, useCallback } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';

interface JobReferralInput {
  job_id: number;
  recipient_email: string;
  personal_message?: string;
}

interface JobReferral {
  id: number;
  referrer_user_id: number;
  referred_email: string;
  referral_code: string;
  referral_link: string;
  job_id: number;
  job_title?: string;
  status: string;
  created_at: Date;
}

interface UseJobReferralResult {
  sending: boolean;
  error: string | null;
  sendReferral: (data: JobReferralInput) => Promise<JobReferral | null>;
  getReferrals: (jobId?: number) => Promise<JobReferral[]>;
}

/**
 * Hook for managing job referrals
 */
export function useJobReferral(): UseJobReferralResult {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendReferral = useCallback(
    async (data: JobReferralInput): Promise<JobReferral | null> => {
      setSending(true);
      setError(null);

      try {
        const response = await fetchWithCsrf('/api/jobs/refer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_id: data.job_id,
            referred_email: data.recipient_email,
            personal_message: data.personal_message || null
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to send referral');
        }

        const result = await response.json();
        return result.data?.referral || null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        console.error('Failed to send job referral:', err);
        throw err;
      } finally {
        setSending(false);
      }
    },
    []
  );

  const getReferrals = useCallback(
    async (jobId?: number): Promise<JobReferral[]> => {
      setError(null);

      try {
        const params = new URLSearchParams();
        if (jobId) params.append('job_id', jobId.toString());

        const response = await fetch(`/api/jobs/refer?${params.toString()}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to load referrals');
        }

        const result = await response.json();
        return result.data?.referrals || [];
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        console.error('Failed to fetch job referrals:', err);
        return [];
      }
    },
    []
  );

  return {
    sending,
    error,
    sendReferral,
    getReferrals
  };
}
