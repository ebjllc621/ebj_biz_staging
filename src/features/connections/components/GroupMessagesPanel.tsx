/**
 * GroupMessagesPanel Component
 * Display group messages with infinite scroll
 *
 * GOVERNANCE COMPLIANCE:
 * - STANDARD tier component (100-300 lines)
 * - ErrorBoundary wrapper (MANDATORY)
 * - Uses GroupMessageItem and GroupMessageComposer
 * - Client Component ('use client')
 *
 * @tier STANDARD
 * @phase Connection Groups Feature - Phase 2
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/3-5-26/phases/PHASE_2_BRAIN_PLAN.md
 * @reference src/features/connections/components/ConnectionGroupsPanel.tsx
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Pin, Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';
import { GroupMessageItem } from './GroupMessageItem';
import { GroupMessageComposer } from './GroupMessageComposer';
import type { GroupMessage } from '../types/group-actions';
import type { GroupMember } from '../types/groups';

export interface GroupMessagesPanelProps {
  groupId: number;
  currentUserId?: number;
  members?: GroupMember[];
  className?: string;
  onMessagesRead?: () => void;
}

function GroupMessagesPanelContent({
  groupId,
  currentUserId,
  members = [],
  className = '',
  onMessagesRead
}: GroupMessagesPanelProps) {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<GroupMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<GroupMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async (before?: number) => {
    if (before) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams({ limit: '50' });
      if (before) params.set('before', String(before));

      const response = await fetch(
        `/api/users/connections/groups/${groupId}/messages?${params}`,
        { credentials: 'include' }
      );
      const result = await response.json();

      if (result.success && result.data) {
        // API returns DESC order (newest first), reverse to chronological (oldest first)
        const newMessages: GroupMessage[] = (result.data.messages || []).reverse();

        if (before) {
          // Older messages go to the TOP of the list
          const container = containerRef.current;
          const prevScrollHeight = container?.scrollHeight || 0;

          setMessages((prev) => [...newMessages, ...prev]);

          // Maintain scroll position after prepending older messages
          requestAnimationFrame(() => {
            if (container) {
              const newScrollHeight = container.scrollHeight;
              container.scrollTop = newScrollHeight - prevScrollHeight;
            }
          });
        } else {
          // Separate pinned messages
          const pinned = newMessages.filter((m) => m.isPinned);
          const regular = newMessages.filter((m) => !m.isPinned);
          setPinnedMessages(pinned);
          setMessages(regular);
        }

        setHasMore(result.data.pagination?.hasMore || false);
      }
    } catch (err) {
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [groupId]);

  // Mark group messages as read (updates last_read_message_id)
  const markAsRead = useCallback(async (msgs: GroupMessage[]) => {
    if (msgs.length === 0) return;
    const maxId = Math.max(...msgs.map(m => m.id));
    try {
      await fetchWithCsrf(`/api/users/connections/groups/${groupId}/messages/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastReadMessageId: maxId })
      });
      onMessagesRead?.();
    } catch {
      // Silent fail - don't interrupt UX for read tracking
    }
  }, [groupId, onMessagesRead]);

  // Auto-scroll to bottom on initial load
  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  // Scroll to bottom and mark as read when messages first load
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      const container = containerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
      // Mark all loaded messages as read
      void markAsRead(messages);
    }
  }, [isLoading]); // Only on initial load transition

  const handleLoadMore = () => {
    if (isLoadingMore || !hasMore || messages.length === 0) return;
    // Load messages older than the first (oldest) message in our list
    const oldestMessage = messages[0];
    if (oldestMessage) {
      void loadMessages(oldestMessage.id);
    }
  };

  const handleMessageSent = (message: GroupMessage) => {
    // Append new message to end (bottom of chat)
    setMessages((prev) => [...prev, message]);
    // Scroll to bottom to show new message
    requestAnimationFrame(() => {
      const container = containerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
    // Update read pointer to include the new message
    void markAsRead([message]);
  };

  // Scroll handler - load older messages when scrolling near TOP
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop } = containerRef.current;
    if (scrollTop < 100) {
      handleLoadMore();
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => loadMessages()}
            className="mt-2 text-sm text-red-700 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Pinned Messages */}
      {pinnedMessages.length > 0 && (
        <div className="border-b border-gray-200 bg-amber-50 px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-amber-700 mb-2">
            <Pin className="w-4 h-4" />
            <span className="font-medium">Pinned Messages</span>
          </div>
          <div className="space-y-2">
            {pinnedMessages.map((message) => (
              <GroupMessageItem
                key={message.id}
                message={message}
                isOwnMessage={message.senderUserId === currentUserId}
                groupId={groupId}
                onReply={setReplyTo}
              />
            ))}
          </div>
        </div>
      )}

      {/* Messages List */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <MessageCircle className="w-12 h-12 text-gray-300 mb-3" />
            <p>No messages yet</p>
            <p className="text-sm">Be the first to send a message!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {hasMore && !isLoadingMore && (
              <button
                onClick={handleLoadMore}
                className="w-full py-2 text-sm text-blue-600 hover:text-blue-700"
              >
                Load older messages
              </button>
            )}

            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              </div>
            )}

            {messages.map((message) => (
              <GroupMessageItem
                key={message.id}
                message={message}
                isOwnMessage={message.senderUserId === currentUserId}
                groupId={groupId}
                onReply={setReplyTo}
              />
            ))}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Composer */}
      <GroupMessageComposer
        groupId={groupId}
        onMessageSent={handleMessageSent}
        members={members}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
      />
    </div>
  );
}

export function GroupMessagesPanel(props: GroupMessagesPanelProps) {
  return (
    <ErrorBoundary
      componentName="GroupMessagesPanel"
      fallback={
        <div className="p-8 text-center text-gray-500 bg-white rounded-xl shadow-sm">
          <p>Unable to load messages.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-blue-600 underline"
          >
            Refresh page
          </button>
        </div>
      }
    >
      <GroupMessagesPanelContent {...props} />
    </ErrorBoundary>
  );
}
