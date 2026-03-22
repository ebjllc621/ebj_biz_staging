/**
 * ComposeReply - Inline reply input component
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @brain-plan docs/pages/layouts/home/user/phases/troubleshooting/sendmessage/phases/PHASE_4_DASHBOARD_MESSAGES_BRAIN_PLAN.md
 * @reference src/features/connections/components/GroupMessageComposer.tsx - Composer layout pattern
 *
 * FEATURES:
 * - Text input for message composition
 * - Embedded send icon button (matching group messaging style)
 * - Character counter
 * - Ctrl+Enter to send
 * - Uses useMessageSend hook
 * - Error display
 * - Auto-clear on success
 */

'use client';

import React, { useState, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useMessageSend } from '../hooks/useMessageSend';

interface ComposeReplyProps {
  receiverId: number;
  onMessageSent: () => void;
  disabled?: boolean;
}

export function ComposeReply({ receiverId, onMessageSent, disabled = false }: ComposeReplyProps) {
  const [message, setMessage] = useState('');
  const { sendMessage, isLoading, error, reset } = useMessageSend();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const MAX_MESSAGE_LENGTH = 5000;
  const charCount = message.length;
  const isOverLimit = charCount > MAX_MESSAGE_LENGTH;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() || isLoading || disabled) return;

    const success = await sendMessage({
      receiver_user_id: receiverId,
      content: message
    });

    if (success) {
      setMessage('');
      reset();
      onMessageSent();
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter to send
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const canSend = message.trim().length > 0 && !isOverLimit && !isLoading && !disabled;

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <form onSubmit={handleSubmit}>
        {/* Error display */}
        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="Type a message..."
            disabled={disabled || isLoading}
            rows={3}
            className={`w-full px-4 py-3 pr-16 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              isOverLimit ? 'border-red-300' : 'border-gray-300'
            } disabled:bg-gray-100 disabled:cursor-not-allowed`}
          />

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
            {charCount}/{MAX_MESSAGE_LENGTH}
          </div>
        </div>
      </form>
    </div>
  );
}
