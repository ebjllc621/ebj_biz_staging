/**
 * useMessageSend - Hook for sending messages via API
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @brain-plan docs/pages/layouts/home/user/phases/troubleshooting/sendmessage/phases/PHASE_2_SENDMESSAGEMODAL_BRAIN_PLAN.md
 */

'use client';

import { useState, useCallback } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';

interface SendMessageParams {
  receiver_user_id: number;
  content: string;
  subject?: string;
}

interface UseMessageSendReturn {
  sendMessage: (params: SendMessageParams) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
}

export function useMessageSend(): UseMessageSendReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
  }, []);

  const sendMessage = useCallback(async (params: SendMessageParams): Promise<boolean> => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetchWithCsrf('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_user_id: params.receiver_user_id,
          content: params.content.trim(),
          subject: params.subject?.trim() || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred while sending the message';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { sendMessage, isLoading, error, reset };
}
