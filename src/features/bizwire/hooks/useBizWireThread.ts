/**
 * useBizWireThread - Hook for fetching a single thread conversation and handling replies
 *
 * @authority docs/components/contactListing/phases/PHASE_5_PLAN.md T5.2
 * @tier STANDARD
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { BizWireMessage } from '../types';

interface UseBizWireThreadOptions {
  listingId: number;
  threadId: string | null;
}

interface UseBizWireThreadReturn {
  messages: BizWireMessage[];
  isLoading: boolean;
  error: string | null;
  sendReply: (content: string) => Promise<boolean>;
  isReplying: boolean;
  replyError: string | null;
  archiveThread: () => Promise<boolean>;
  isArchiving: boolean;
  refresh: () => Promise<void>;
}

export function useBizWireThread({ listingId, threadId }: UseBizWireThreadOptions): UseBizWireThreadReturn {
  const [messages, setMessages] = useState<BizWireMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReplying, setIsReplying] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!threadId || !listingId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/listings/${listingId}/bizwire/${threadId}`,
        { credentials: 'include' }
      );
      const json = await response.json();

      if (!response.ok) {
        const errorMsg = typeof json.error === 'string'
          ? json.error
          : json.error?.message || 'Failed to load conversation';
        throw new Error(errorMsg);
      }

      if (json.success) {
        setMessages(json.data.messages as BizWireMessage[]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load conversation';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [listingId, threadId]);

  // Reset and re-fetch when threadId changes
  useEffect(() => {
    setMessages([]);
    setError(null);
    setReplyError(null);
    if (threadId) {
      fetchMessages();
    }
  }, [threadId, fetchMessages]);

  const sendReply = useCallback(async (content: string): Promise<boolean> => {
    if (!threadId || !listingId) return false;

    setIsReplying(true);
    setReplyError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/listings/${listingId}/bizwire/${threadId}/reply`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: content.trim() })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send reply');
      }

      // Refresh messages after successful reply
      await fetchMessages();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send reply';
      setReplyError(message);
      return false;
    } finally {
      setIsReplying(false);
    }
  }, [listingId, threadId, fetchMessages]);

  const archiveThread = useCallback(async (): Promise<boolean> => {
    if (!threadId || !listingId) return false;

    setIsArchiving(true);

    try {
      const response = await fetchWithCsrf(
        `/api/listings/${listingId}/bizwire/${threadId}/archive`,
        { method: 'PUT' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to archive thread');
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to archive thread';
      setError(message);
      return false;
    } finally {
      setIsArchiving(false);
    }
  }, [listingId, threadId]);

  const refresh = useCallback(async () => {
    await fetchMessages();
  }, [fetchMessages]);

  return {
    messages,
    isLoading,
    error,
    sendReply,
    isReplying,
    replyError,
    archiveThread,
    isArchiving,
    refresh
  };
}
