/**
 * ConversationView - Conversation history display component
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @brain-plan docs/pages/layouts/home/user/phases/troubleshooting/sendmessage/phases/PHASE_4_DASHBOARD_MESSAGES_BRAIN_PLAN.md
 *
 * FEATURES:
 * - Header with other user info
 * - Scrollable message list (newest at bottom)
 * - MessageBubble components for each message
 * - ComposeReply input at bottom
 * - Loading and error states
 * - Auto-scroll to newest message
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { Message } from '../types';
import { MessageBubble } from './MessageBubble';
import { ComposeReply } from './ComposeReply';
import { useConversation } from '../hooks/useMessages';

interface ConversationViewProps {
  otherUserId: number;
  otherUser: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  currentUserId: number;
  onMessageSent: () => void;
  onBack?: () => void;
  onToggleThreads?: () => void;
  threadsPanelOpen?: boolean;
}

export function ConversationView({
  otherUserId,
  otherUser,
  currentUserId,
  onMessageSent,
  onBack,
  onToggleThreads,
  threadsPanelOpen = true
}: ConversationViewProps) {
  const { messages, isLoading, error, refresh } = useConversation(otherUserId);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const displayName = otherUser.display_name || otherUser.username;
  const avatarUrl = otherUser.avatar_url;

  // Auto-scroll to bottom when messages change (within container only, not entire page)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      // Scroll container to bottom without affecting page scroll
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const handleMessageSent = () => {
    refresh();
    onMessageSent();
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-3">
          {/* Chevron button: mobile = back to threads, desktop = toggle threads panel */}
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.innerWidth < 768) {
                onBack?.();
              } else {
                onToggleThreads?.();
              }
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={threadsPanelOpen ? 'Collapse threads' : 'Show threads'}
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={threadsPanelOpen ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
            </svg>
          </button>

          {/* Avatar */}
          <div className="flex-shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <span className="text-lg font-semibold text-orange-600">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* User info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 truncate">
              {displayName}
            </h2>
            <p className="text-sm text-gray-500">
              @{otherUser.username}
            </p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
              <p className="text-gray-500 mt-2">Loading conversation...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-red-800">Error loading conversation</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">No messages yet</p>
              <p className="text-sm text-gray-600 mt-1">Start the conversation below</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.sender_user_id === currentUserId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Reply input */}
      <div className="flex-shrink-0">
        <ComposeReply
          receiverId={otherUserId}
          onMessageSent={handleMessageSent}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
