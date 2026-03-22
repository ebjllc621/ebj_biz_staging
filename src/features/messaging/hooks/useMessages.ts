/**
 * useMessages - Hooks for dashboard messages functionality
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @brain-plan docs/pages/layouts/home/user/phases/troubleshooting/sendmessage/phases/PHASE_4_DASHBOARD_MESSAGES_BRAIN_PLAN.md
 * @reference src/app/dashboard/connections/page.tsx - Data loading pattern
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageThread, Message } from '../types';

interface UseThreadsReturn {
  threads: MessageThread[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * useThreads - Load and manage message threads (inbox view)
 *
 * Fetches all message threads for the current user from /api/messages.
 * Automatically loads on mount and provides refresh functionality.
 *
 * @returns Thread data, loading state, and refresh function
 */
export function useThreads(): UseThreadsReturn {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadThreads = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/messages', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load messages');
      }

      const result = await response.json();
      // Unwrap the data property from createSuccessResponse
      const data = result.data || result;

      setThreads(data.threads || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  return { threads, unreadCount, isLoading, error, refresh: loadThreads };
}

interface UseConversationReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * useConversation - Load and manage conversation with specific user
 *
 * Fetches conversation history from /api/messages/conversations/[otherUserId].
 * API automatically marks thread as read when loaded.
 *
 * @param otherUserId - ID of the other user in conversation (null if none selected)
 * @returns Message history, loading state, and refresh function
 */
export function useConversation(otherUserId: number | null): UseConversationReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversation = useCallback(async () => {
    if (!otherUserId) {
      setMessages([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/messages/conversations/${otherUserId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load conversation');
      }

      const result = await response.json();
      // Unwrap the data property from createSuccessResponse
      const data = result.data || result;

      // Reverse to show oldest first (messages come DESC from API)
      setMessages((data.messages || []).reverse());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  }, [otherUserId]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  return { messages, isLoading, error, refresh: loadConversation };
}
