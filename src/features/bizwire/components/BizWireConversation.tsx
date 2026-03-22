/**
 * BizWireConversation - Full conversation view panel
 *
 * @authority docs/components/contactListing/phases/PHASE_5_PLAN.md T5.8
 * @tier STANDARD
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Archive } from 'lucide-react';
import { BizWireMessageBubble } from './BizWireMessageBubble';
import { BizWireReplyComposer } from './BizWireReplyComposer';
import type { BizWireThread, BizWireMessage } from '../types';

interface BizWireConversationProps {
  thread: BizWireThread;
  messages: BizWireMessage[];
  isLoading: boolean;
  error: string | null;
  currentUserId: number;
  onSendReply: (content: string) => Promise<boolean>;
  isReplying: boolean;
  replyError: string | null;
  onArchive?: () => Promise<boolean>;
  isArchiving?: boolean;
  onBack: () => void;
  onToggleThreads: () => void;
  threadsPanelOpen: boolean;
  variant: 'listing' | 'user';
  onRefresh?: () => void;
}

export function BizWireConversation({
  thread,
  messages,
  isLoading,
  error,
  currentUserId,
  onSendReply,
  isReplying,
  replyError,
  onArchive,
  isArchiving = false,
  onBack,
  onToggleThreads,
  threadsPanelOpen,
  variant,
  onRefresh
}: BizWireConversationProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const initialLoadRef = useRef(true);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const isArchived = thread.status === 'archived';

  // Scroll within the messages container only (not the whole page)
  // On initial load: jump to bottom instantly. After that: smooth scroll for new messages.
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || messages.length === 0) return;

    if (initialLoadRef.current) {
      // First load — jump to bottom without smooth scroll (no page jump)
      container.scrollTop = container.scrollHeight;
      initialLoadRef.current = false;
    } else {
      // New message added — smooth scroll within the container
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  // Reset initial-load flag when switching threads
  useEffect(() => {
    initialLoadRef.current = true;
  }, [thread.thread_id]);

  const handleArchiveClick = () => {
    if (archiveConfirm) {
      // Confirmed - execute archive
      if (onArchive) {
        onArchive().then((success) => {
          if (success) setArchiveConfirm(false);
        });
      }
    } else {
      setArchiveConfirm(true);
    }
  };

  const subject = thread.subject || 'No subject';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Back / toggle button */}
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.innerWidth < 768) {
                onBack();
              } else {
                onToggleThreads();
              }
            }}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            aria-label={threadsPanelOpen ? 'Collapse threads' : 'Show threads'}
          >
            {threadsPanelOpen
              ? <ChevronLeft className="w-5 h-5 text-gray-600" />
              : <ChevronRight className="w-5 h-5 text-gray-600" />
            }
          </button>

          {/* Subject + meta */}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 truncate">{subject}</h2>
            <p className="text-xs text-gray-500">
              {variant === 'listing'
                ? `From: ${thread.last_message_sender_name}`
                : `Re: ${thread.listing_name}`
              }
              {' · '}{Number(thread.message_count)} message{Number(thread.message_count) !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Archive button (listing variant only) */}
          {variant === 'listing' && onArchive && !isArchived && (
            <button
              onClick={handleArchiveClick}
              disabled={isArchiving}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex-shrink-0 ${
                archiveConfirm
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'text-gray-600 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              {isArchiving ? (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Archive className="w-3.5 h-3.5" />
              )}
              {archiveConfirm ? 'Confirm?' : 'Archive'}
            </button>
          )}

          {archiveConfirm && (
            <button
              onClick={() => setArchiveConfirm(false)}
              className="text-xs text-gray-500 hover:text-gray-700 flex-shrink-0"
            >
              Cancel
            </button>
          )}

          {isArchived && (
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-full flex-shrink-0">
              Archived
            </span>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-red-600 mb-2">{error}</p>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                Try again
              </button>
            )}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">No messages in this thread.</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <BizWireMessageBubble
              key={message.id}
              message={message}
              isOwnMessage={message.sender_user_id === currentUserId}
              isFirst={index === 0}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply composer */}
      <BizWireReplyComposer
        onSendReply={onSendReply}
        isReplying={isReplying}
        error={replyError}
        disabled={isArchived}
      />
    </div>
  );
}
