/**
 * MessagesManager - Business Inquiry Inbox Manager
 *
 * @description Manage business inquiries sent TO the listing
 * @component Client Component
 * @tier ADVANCED
 * @generated FIXFLOW - Phase 9 Remediation
 * @phase Phase 9 - Communication/Reputation Pages
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_9_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use ErrorBoundary (ADVANCED tier requirement)
 * - Orange theme (#ed6437) for action buttons
 * - BizModal for all modals (MANDATORY)
 * - fetchWithCsrf for all mutations
 *
 * DATA ISOLATION: Shows messages TO the listing (business inquiries),
 * NOT personal user-to-user messages.
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  MailOpen,
  Loader2,
  AlertCircle,
  Send,
  Archive,
  Filter,
  ChevronDown,
  Clock,
  User
} from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { fetchWithCsrf } from '@core/utils/csrf';
import { EmptyState } from '../shared/EmptyState';
import BizModal from '@/components/BizModal/BizModal';

// ============================================================================
// TYPES
// ============================================================================

interface ListingMessage {
  id: number;
  listing_id: number;
  sender_user_id: number;
  subject: string | null;
  content: string;
  message_type: 'inquiry' | 'quote_request' | 'appointment' | 'feedback' | 'other';
  is_read: boolean;
  read_at: string | null;
  reply_id: number | null;
  thread_id: string | null;
  status: 'new' | 'read' | 'replied' | 'archived';
  created_at: string;
  updated_at: string;
  sender_first_name?: string | null;
  sender_last_name?: string | null;
  sender_email?: string;
  sender_avatar_url?: string | null;
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

interface MessageCardProps {
  message: ListingMessage;
  onView: () => void;
  onArchive: () => void;
}

function MessageCard({ message, onView, onArchive }: MessageCardProps) {
  const senderName = message.sender_first_name && message.sender_last_name
    ? `${message.sender_first_name} ${message.sender_last_name}`
    : message.sender_email || 'Unknown Sender';

  const initials = senderName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const typeColors: Record<string, string> = {
    inquiry: 'bg-blue-100 text-blue-700',
    quote_request: 'bg-purple-100 text-purple-700',
    appointment: 'bg-green-100 text-green-700',
    feedback: 'bg-yellow-100 text-yellow-700',
    other: 'bg-gray-100 text-gray-700'
  };

  const statusIcons: Record<string, React.ReactNode> = {
    new: <Mail className="w-4 h-4 text-[#ed6437]" />,
    read: <MailOpen className="w-4 h-4 text-gray-400" />,
    replied: <Send className="w-4 h-4 text-green-500" />,
    archived: <Archive className="w-4 h-4 text-gray-400" />
  };

  return (
    <div
      className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
        !message.is_read ? 'border-[#ed6437] border-l-4' : 'border-gray-200'
      }`}
      onClick={onView}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        {message.sender_avatar_url ? (
          <img
            src={message.sender_avatar_url}
            alt={senderName}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ed6437] to-[#d55a31] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            {initials}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-medium ${!message.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
              {senderName}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[message.message_type]}`}>
              {message.message_type.replace('_', ' ')}
            </span>
            {statusIcons[message.status]}
          </div>

          {message.subject && (
            <h4 className={`text-sm mb-1 ${!message.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
              {message.subject}
            </h4>
          )}

          <p className="text-sm text-gray-600 line-clamp-2">{message.content}</p>

          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(message.created_at).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {message.status !== 'archived' && (
            <button
              onClick={onArchive}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Archive"
            >
              <Archive className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MESSAGE DETAIL MODAL
// ============================================================================

interface MessageDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: ListingMessage | null;
  onReply: (content: string) => Promise<void>;
  onMarkRead: () => Promise<void>;
  isReplying: boolean;
}

function MessageDetailModal({
  isOpen,
  onClose,
  message,
  onReply,
  onMarkRead,
  isReplying
}: MessageDetailModalProps) {
  const [replyContent, setReplyContent] = useState('');

  // Mark as read when opening
  useEffect(() => {
    if (message && !message.is_read) {
      onMarkRead();
    }
  }, [message, onMarkRead]);

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    await onReply(replyContent.trim());
    setReplyContent('');
  };

  if (!message) return null;

  const senderName = message.sender_first_name && message.sender_last_name
    ? `${message.sender_first_name} ${message.sender_last_name}`
    : message.sender_email || 'Unknown Sender';

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={message.subject || 'Message'}
      size="large"
    >
      <div className="space-y-4">
        {/* Sender Info */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#ed6437] to-[#d55a31] flex items-center justify-center text-white font-semibold">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{senderName}</div>
            <div className="text-sm text-gray-500">{message.sender_email}</div>
            <div className="text-xs text-gray-400">
              {new Date(message.created_at).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Message Content */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-gray-700 whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Reply Form */}
        <form onSubmit={handleSubmitReply} className="space-y-4 pt-4 border-t border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reply to this message
            </label>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Type your reply..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-[#ed6437] resize-none"
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isReplying || !replyContent.trim()}
              className="px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isReplying && <Loader2 className="w-4 h-4 animate-spin" />}
              <Send className="w-4 h-4" />
              Send Reply
            </button>
          </div>
        </form>
      </div>
    </BizModal>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function MessagesManagerContent() {
  const { selectedListingId } = useListingContext();

  // State
  const [messages, setMessages] = useState<ListingMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ListingMessage | null>(null);
  const [isReplying, setIsReplying] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const limit = 20;

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!selectedListingId) return;

    setIsLoading(true);
    setError(null);

    try {
      let url = `/api/listings/${selectedListingId}/messages?page=${page}&limit=${limit}`;
      if (filterStatus) url += `&status=${filterStatus}`;

      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const result = await response.json();
      if (result.success) {
        setMessages(result.data?.data || []);
        setTotalPages(result.data?.pagination?.totalPages || 1);

        // Count unread
        const unread = (result.data?.data || []).filter((m: ListingMessage) => !m.is_read).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [selectedListingId, page, filterStatus]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Mark message as read
  const handleMarkRead = useCallback(async () => {
    if (!selectedMessage || selectedMessage.is_read) return;

    try {
      await fetchWithCsrf(`/api/listings/${selectedListingId}/messages/${selectedMessage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: true })
      });
      await fetchMessages();
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }, [selectedMessage, selectedListingId, fetchMessages]);

  // Reply to message
  const handleReply = useCallback(async (content: string) => {
    if (!selectedMessage) return;

    setIsReplying(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/listings/${selectedListingId}/messages/${selectedMessage.id}/reply`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to send reply');
      }

      await fetchMessages();
      setSelectedMessage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
      throw err;
    } finally {
      setIsReplying(false);
    }
  }, [selectedMessage, selectedListingId, fetchMessages]);

  // Archive message
  const handleArchive = useCallback(async (messageId: number) => {
    try {
      await fetchWithCsrf(`/api/listings/${selectedListingId}/messages/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' })
      });
      await fetchMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive message');
    }
  }, [selectedListingId, fetchMessages]);

  // Loading state
  if (isLoading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            Messages
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-sm bg-[#ed6437] text-white rounded-full">
                {unreadCount} new
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Business inquiries and messages sent to your listing
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Filter className="w-4 h-4" />
          Filters
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437]"
            >
              <option value="">All messages</option>
              <option value="new">New</option>
              <option value="read">Read</option>
              <option value="replied">Replied</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <button
            onClick={() => setFilterStatus('')}
            className="self-end px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-sm hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Messages List */}
      {messages.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No Messages Yet"
          description="When customers send inquiries to your listing, they'll appear here"
        />
      ) : (
        <div className="space-y-3">
          {messages.map((message) => (
            <MessageCard
              key={message.id}
              message={message}
              onView={() => setSelectedMessage(message)}
              onArchive={() => handleArchive(message.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Message Detail Modal */}
      <MessageDetailModal
        isOpen={!!selectedMessage}
        onClose={() => setSelectedMessage(null)}
        message={selectedMessage}
        onReply={handleReply}
        onMarkRead={handleMarkRead}
        isReplying={isReplying}
      />
    </div>
  );
}

/**
 * MessagesManager - Wrapped with ErrorBoundary
 */
export function MessagesManager() {
  return (
    <ErrorBoundary componentName="MessagesManager">
      <MessagesManagerContent />
    </ErrorBoundary>
  );
}

export default MessagesManager;
