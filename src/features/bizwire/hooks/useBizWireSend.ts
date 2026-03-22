/**
 * useBizWireSend - Hook for sending BizWire contact messages
 *
 * @authority docs/components/contactListing/phases/PHASE_2_PLAN.md
 * @tier STANDARD
 * @reference src/features/messaging/hooks/useMessageSend.ts
 */

'use client';

import { useState, useCallback } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { BizWireSendPayload, UseBizWireSendReturn } from '../types';

export function useBizWireSend(): UseBizWireSendReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
  }, []);

  const sendMessage = useCallback(async (
    listingId: number,
    payload: BizWireSendPayload
  ): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetchWithCsrf(`/api/listings/${listingId}/bizwire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: payload.subject.trim(),
          content: payload.content.trim(),
          message_type: payload.message_type || 'inquiry',
          source_page: payload.source_page,
          source_url: payload.source_url || (typeof window !== 'undefined' ? window.location.href : undefined),
          source_entity_type: payload.source_entity_type,
          source_entity_id: payload.source_entity_id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred while sending your message';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { sendMessage, isLoading, error, reset };
}
