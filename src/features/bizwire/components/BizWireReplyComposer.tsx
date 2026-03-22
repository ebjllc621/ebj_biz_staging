/**
 * BizWireReplyComposer - Reply textarea with send functionality
 *
 * @authority docs/components/contactListing/phases/PHASE_5_PLAN.md T5.7
 * @tier SIMPLE
 */

'use client';

import { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

const MAX_LENGTH = 2000;
const MIN_LENGTH = 10;

interface BizWireReplyComposerProps {
  onSendReply: (content: string) => Promise<boolean>;
  isReplying: boolean;
  error: string | null;
  disabled?: boolean;
}

export function BizWireReplyComposer({ onSendReply, isReplying, error, disabled = false }: BizWireReplyComposerProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = content.trim().length >= MIN_LENGTH && content.length <= MAX_LENGTH && !isReplying && !disabled;

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    const success = await onSendReply(content);
    if (success) {
      setContent('');
      textareaRef.current?.focus();
    }
  }, [canSend, content, onSendReply]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const charCount = content.length;
  const trimmedLength = content.trim().length;
  const isOverLimit = charCount > MAX_LENGTH;
  const isBelowMin = trimmedLength > 0 && trimmedLength < MIN_LENGTH;

  return (
    <div className="border-t border-gray-200 p-3 bg-white">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write your reply... (Ctrl+Enter to send)"
          disabled={isReplying || disabled}
          rows={3}
          className={`w-full px-3 py-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all ${
            isOverLimit ? 'border-red-400 bg-red-50' : 'border-gray-300'
          } ${(isReplying || disabled) ? 'bg-gray-50 text-gray-400' : ''}`}
        />
      </div>

      {/* Footer: char count + send */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs ${isOverLimit ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
            {charCount}/{MAX_LENGTH}
          </span>
          {isBelowMin && (
            <span className="text-xs text-gray-400">
              {MIN_LENGTH - trimmedLength} more characters needed
            </span>
          )}
        </div>
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isReplying ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {isReplying ? 'Sending...' : 'Send'}
        </button>
      </div>

      {/* Disabled message */}
      {disabled && !error && (
        <p className="text-xs text-gray-500 mt-1.5">This thread is archived and cannot receive new replies.</p>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-500 mt-1.5">{error}</p>
      )}
    </div>
  );
}
