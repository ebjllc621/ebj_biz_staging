/**
 * useProfileReview - Hook for submitting profile reviews
 *
 * @authority Tier3_Phases/PHASE_6_REVIEW_SYSTEM.md
 * @tier STANDARD
 * @reference src/features/content/hooks/useProfileContact.ts - Exact pattern replicated
 *
 * GOVERNANCE:
 * - CSRF protection via fetchWithCsrf (mandatory)
 * - Client Component ('use client')
 * - Fire-and-forget error handling (never blocks main flow)
 */

'use client';

import { useState, useCallback } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { ProfileContactType } from '@core/types/content-contact-proposal';

// ============================================================================
// Return Type
// ============================================================================

interface UseProfileReviewReturn {
  submitReview: (
    profileType: ProfileContactType,
    profileId: number,
    payload: { rating: number; review_text?: string; campaign_type?: string; collaboration_type?: string; episode_reference?: string; images?: string[] }
  ) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useProfileReview(): UseProfileReviewReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
  }, []);

  const submitReview = useCallback(async (
    profileType: ProfileContactType,
    profileId: number,
    payload: { rating: number; review_text?: string; campaign_type?: string; collaboration_type?: string; episode_reference?: string; images?: string[] }
  ): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      const typeSegmentMap: Record<ProfileContactType, string> = {
        affiliate_marketer: 'affiliate-marketers',
        internet_personality: 'internet-personalities',
        podcaster: 'podcasters',
      };
      const typeSegment = typeSegmentMap[profileType];

      const bodyPayload: Record<string, unknown> = {
        rating: payload.rating,
        review_text: payload.review_text?.trim() || undefined,
      };

      // Send the type-specific field
      if (profileType === 'affiliate_marketer' && payload.campaign_type) {
        bodyPayload.campaign_type = payload.campaign_type;
      } else if (profileType === 'internet_personality' && payload.collaboration_type) {
        bodyPayload.collaboration_type = payload.collaboration_type;
      } else if (profileType === 'podcaster' && payload.episode_reference) {
        bodyPayload.episode_reference = payload.episode_reference;
      }

      // Media attachments
      if (payload.images && payload.images.length > 0) {
        bodyPayload.images = payload.images;
      }

      const response = await fetchWithCsrf(
        `/api/content/${typeSegment}/${profileId}/reviews`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || errorData.error || 'Failed to submit review'
        );
      }

      return true;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'An error occurred while submitting your review';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { submitReview, isLoading, error, reset };
}
