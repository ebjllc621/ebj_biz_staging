/**
 * User Dashboard BizWire Page
 * Route: /dashboard/bizwire
 *
 * @authority docs/components/contactListing/phases/PHASE_5_PLAN.md T5.11
 * @tier STANDARD
 *
 * Client component following the pattern from /dashboard/messages/page.tsx.
 * Shows user's sent inquiries and conversations with listing owners.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useAuth } from '@core/context/AuthContext';
import { useBizWireThreads } from '@features/bizwire/hooks/useBizWireThreads';
import { useBizWireThread } from '@features/bizwire/hooks/useBizWireThread';
import { BizWireThreadList } from '@features/bizwire/components/BizWireThreadList';
import { BizWireConversation } from '@features/bizwire/components/BizWireConversation';
import type { BizWireThread } from '@features/bizwire/types';

function BizWirePageContent() {
  const { user } = useAuth();

  // Thread list for user's sent inquiries
  const {
    threads,
    isLoading: threadsLoading,
    error: threadsError,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    refresh: refreshThreads,
    pagination
  } = useBizWireThreads({ userView: true });

  // Selected thread state
  const [selectedThread, setSelectedThread] = useState<BizWireThread | null>(null);

  // Thread conversation — uses listing_id from selected thread
  const {
    messages,
    isLoading: messagesLoading,
    error: messagesError,
    sendReply,
    isReplying,
    replyError,
    refresh: refreshMessages
  } = useBizWireThread({
    listingId: selectedThread?.listing_id ?? 0,
    threadId: selectedThread?.thread_id ?? null
  });

  // View mode for mobile
  const [viewMode, setViewMode] = useState<'threads' | 'conversation'>('threads');
  const [threadsPanelOpen, setThreadsPanelOpen] = useState(true);

  const handleSelectThread = useCallback((thread: BizWireThread) => {
    setSelectedThread(thread);
    setViewMode('conversation');
    setThreadsPanelOpen(false);
  }, []);

  const handleBackToThreads = useCallback(() => {
    setViewMode('threads');
    setSelectedThread(null);
    setThreadsPanelOpen(true);
  }, []);

  const handleToggleThreads = useCallback(() => {
    setThreadsPanelOpen((prev) => !prev);
  }, []);

  // Mark bizwire notifications as read when visiting the page (clears sidebar badge)
  useEffect(() => {
    if (!user) return;
    fetch('/api/dashboard/notifications/mark-read', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationType: 'bizwire' })
    }).catch(() => { /* best-effort */ });
  }, [user]);

  if (!user) {
    return (
      <div className="p-6 text-center text-gray-500 text-sm">
        Please log in to view your BizWire messages.
      </div>
    );
  }

  const currentUserId = parseInt(user.id, 10);
  const unreadCount = threads.reduce((sum, t) => sum + Number(t.unread_count), 0);
  const totalCount = pagination?.total ?? threads.length;

  return (
    <div className="space-y-6 h-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">BizWire</h1>
        <p className="text-gray-600 mt-1">
          {unreadCount > 0
            ? `${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}`
            : totalCount > 0
              ? `${totalCount} conversation${totalCount !== 1 ? 's' : ''}`
              : 'Your inquiries and conversations'
          }
        </p>
      </div>

      {/* Two-column inbox */}
      <div
        className="bg-white rounded-xl border border-gray-200 overflow-hidden"
        style={{ height: 'calc(100vh - 240px)' }}
      >
        <div className="h-full flex">
          {/* Thread list panel */}
          <div className={`h-full flex-col border-r border-gray-200 flex-shrink-0 transition-all duration-200 ${
            viewMode === 'conversation' ? 'hidden' : 'w-full'
          } ${threadsPanelOpen ? 'md:flex md:w-80 lg:w-96' : 'md:hidden'}`}>
            <BizWireThreadList
              threads={threads}
              selectedThreadId={selectedThread?.thread_id ?? null}
              onSelectThread={handleSelectThread}
              isLoading={threadsLoading}
              error={threadsError}
              variant="user"
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              onRefresh={refreshThreads}
            />
          </div>

          {/* Conversation panel */}
          <div className={`h-full flex-1 min-w-0 ${
            viewMode === 'threads' ? 'hidden md:flex' : 'flex'
          }`}>
            {selectedThread ? (
              <div className="flex flex-col h-full w-full">
                <BizWireConversation
                  thread={selectedThread}
                  messages={messages}
                  isLoading={messagesLoading}
                  error={messagesError}
                  currentUserId={currentUserId}
                  onSendReply={sendReply}
                  isReplying={isReplying}
                  replyError={replyError}
                  onBack={handleBackToThreads}
                  onToggleThreads={handleToggleThreads}
                  threadsPanelOpen={threadsPanelOpen}
                  variant="user"
                  onRefresh={refreshMessages}
                />
              </div>
            ) : (
              <div className="hidden md:flex flex-col items-center justify-center w-full h-full bg-gray-50">
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">Select a conversation</p>
                  <p className="text-sm text-gray-400 mt-1">Choose a thread from the left to view messages</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BizWirePage() {
  return (
    <ErrorBoundary componentName="DashboardBizWirePage">
      <BizWirePageContent />
    </ErrorBoundary>
  );
}
