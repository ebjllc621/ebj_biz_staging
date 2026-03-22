/**
 * useProfileContact - Hook for sending profile contact proposals
 *
 * @authority Tier3_Phases/PHASE_5_CONTACT_PROPOSAL_SYSTEM.md
 * @tier STANDARD
 * @reference src/features/bizwire/hooks/useBizWireSend.ts - Exact pattern replicated
 *
 * GOVERNANCE:
 * - CSRF protection via fetchWithCsrf (mandatory)
 * - Client Component ('use client')
 * - Fire-and-forget error handling (never blocks main flow)
 */

'use client';

import { useState, useCallback } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { CreateContactProposalInput, ProfileContactType } from '@core/types/content-contact-proposal';

// ============================================================================
// Return Type
// ============================================================================

interface UseProfileContactReturn {
  sendProposal: (
    profileType: ProfileContactType,
    profileSlug: string,
    payload: CreateContactProposalInput
  ) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useProfileContact(): UseProfileContactReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
  }, []);

  const sendProposal = useCallback(async (
    profileType: ProfileContactType,
    profileSlug: string,
    payload: CreateContactProposalInput
  ): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      // Map profile type to URL segment
      const typeSegmentMap: Record<ProfileContactType, string> = {
        affiliate_marketer: 'affiliate-marketers',
        internet_personality: 'internet-personalities',
        podcaster: 'podcasters',
      };
      const typeSegment = typeSegmentMap[profileType];

      const response = await fetchWithCsrf(
        `/api/content/${typeSegment}/${profileSlug}/contact`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: payload.subject.trim(),
            message: payload.message.trim(),
            proposal_type: payload.proposal_type,
            budget_range: payload.budget_range || undefined,
            timeline: payload.timeline || undefined,
            company_name: payload.company_name || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || errorData.error || 'Failed to send proposal'
        );
      }

      return true;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'An error occurred while sending your proposal';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { sendProposal, isLoading, error, reset };
}
