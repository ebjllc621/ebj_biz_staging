/**
 * GroupMessageComposer Component
 * Compose and send group messages
 *
 * GOVERNANCE COMPLIANCE:
 * - STANDARD tier component (100-300 lines)
 * - ErrorBoundary wrapper (MANDATORY)
 * - Uses fetchWithCsrf for POST requests
 * - Client Component ('use client')
 *
 * @tier STANDARD
 * @phase Connection Groups Feature - Phase 2
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/3-5-26/phases/PHASE_2_BRAIN_PLAN.md
 * @reference src/features/connections/components/CreateGroupModal.tsx
 */

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Loader2, X, CornerDownRight } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { GroupMessage, SendGroupMessageInput } from '../types/group-actions';
import type { GroupMember } from '../types/groups';

export interface GroupMessageComposerProps {
  groupId: number;
  onMessageSent?: (message: GroupMessage) => void;
  members?: GroupMember[];
  replyTo?: GroupMessage | null;
  onClearReply?: () => void;
  className?: string;
}

const MAX_CONTENT_LENGTH = 5000;

function GroupMessageComposerContent({
  groupId,
  onMessageSent,
  members = [],
  replyTo,
  onClearReply,
  className = ''
}: GroupMessageComposerProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number>(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when replying
  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  // Compute filtered mention suggestions
  const mentionSuggestions = mentionQuery !== null
    ? members.filter(m =>
        m.username.toLowerCase().startsWith(mentionQuery.toLowerCase()) ||
        (m.displayName ?? '').toLowerCase().startsWith(mentionQuery.toLowerCase())
      ).slice(0, 6)
    : [];

  const handleMentionSelect = useCallback((member: GroupMember) => {
    if (mentionStart < 0) return;
    const before = content.slice(0, mentionStart);
    const after = content.slice(mentionStart + 1 + (mentionQuery?.length ?? 0));
    const newContent = `${before}@${member.username} ${after}`;
    setContent(newContent);
    setMentionQuery(null);
    setMentionStart(-1);
    // Re-focus textarea and move cursor to end of inserted mention
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = before.length + member.username.length + 2; // +2 for '@' and ' '
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  }, [content, mentionStart, mentionQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setError('Message cannot be empty');
      return;
    }

    if (trimmedContent.length > MAX_CONTENT_LENGTH) {
      setError(`Message must be ${MAX_CONTENT_LENGTH} characters or less`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const input: Omit<SendGroupMessageInput, 'groupId'> = {
        content: trimmedContent,
        contentType: 'text',
        ...(replyTo ? { replyToId: replyTo.id } : {})
      };

      const response = await fetchWithCsrf(
        `/api/users/connections/groups/${groupId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input)
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to send message');
      }

      // Success
      setContent('');
      onClearReply?.();
      onMessageSent?.(result.data.message);

      // Focus back on textarea
      textareaRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter to send
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const charCount = content.length;
  const isOverLimit = charCount > MAX_CONTENT_LENGTH;
  const canSend = content.trim().length > 0 && !isOverLimit && !isLoading;

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursor = e.target.selectionStart ?? newValue.length;
    setContent(newValue);
    setError(null);

    // Detect if cursor is inside an @mention
    const textUpToCursor = newValue.slice(0, cursor);
    const atMatch = textUpToCursor.match(/@([a-zA-Z0-9_]*)$/);
    if (atMatch) {
      const atIndex = textUpToCursor.lastIndexOf('@');
      setMentionStart(atIndex);
      setMentionQuery(atMatch[1] ?? '');
    } else {
      setMentionQuery(null);
      setMentionStart(-1);
    }
  };

  return (
    <div className={`bg-white border-t border-gray-200 p-4 ${className}`}>
      <form onSubmit={handleSubmit}>
        {/* Reply preview bar */}
        {replyTo && (
          <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <CornerDownRight className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <div className="flex-1 min-w-0 text-sm">
              <span className="font-medium text-blue-700">
                {replyTo.senderDisplayName || replyTo.senderUsername}
              </span>
              <span className="text-blue-600 ml-1 truncate block">
                {replyTo.content.substring(0, 100)}
                {replyTo.content.length > 100 ? '...' : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={onClearReply}
              className="p-1 text-blue-400 hover:text-blue-600 transition-colors flex-shrink-0"
              aria-label="Cancel reply"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyDown={(e) => {
              // Close mention dropdown on Escape
              if (e.key === 'Escape' && mentionQuery !== null) {
                e.preventDefault();
                setMentionQuery(null);
                setMentionStart(-1);
                return;
              }
              // Select first suggestion on Tab when dropdown open
              if (e.key === 'Tab' && mentionSuggestions.length > 0) {
                e.preventDefault();
                handleMentionSelect(mentionSuggestions[0]!);
                return;
              }
              handleKeyDown(e);
            }}
            placeholder="Type a message... (use @ to mention members)"
            rows={3}
            disabled={isLoading}
            className={`w-full px-4 py-3 pr-16 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-300' : 'border-gray-300'
            }`}
          />

          {/* @mention autocomplete dropdown */}
          {mentionQuery !== null && mentionSuggestions.length > 0 && (
            <div className="absolute bottom-full left-0 mb-1 w-full max-w-xs bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
              {mentionSuggestions.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent textarea blur
                    handleMentionSelect(member);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-blue-50 transition-colors text-left"
                >
                  <span className="font-medium text-gray-900">{member.displayName || member.username}</span>
                  <span className="text-gray-500 text-xs">@{member.username}</span>
                </button>
              ))}
            </div>
          )}

          {/* Send Button */}
          <button
            type="submit"
            disabled={!canSend}
            className="absolute right-3 bottom-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs text-gray-500">
            Press Ctrl+Enter to send
          </div>
          <div className={`text-xs ${isOverLimit ? 'text-red-600' : 'text-gray-500'}`}>
            {charCount}/{MAX_CONTENT_LENGTH}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}

export function GroupMessageComposer(props: GroupMessageComposerProps) {
  return (
    <ErrorBoundary
      componentName="GroupMessageComposer"
      fallback={
        <div className="p-4 text-center text-gray-500">
          Unable to load message composer. Please refresh the page.
        </div>
      }
    >
      <GroupMessageComposerContent {...props} />
    </ErrorBoundary>
  );
}
