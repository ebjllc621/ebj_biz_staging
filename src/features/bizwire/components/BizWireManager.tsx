/**
 * BizWireManager - Client component for listing manager BizWire page
 *
 * @authority docs/components/contactListing/phases/PHASE_5_PLAN.md T5.10
 * @tier ADVANCED
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@core/context/AuthContext';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useBizWireThreads } from '../hooks/useBizWireThreads';
import { useBizWireThread } from '../hooks/useBizWireThread';
import { BizWireThreadList } from './BizWireThreadList';
import { BizWireConversation } from './BizWireConversation';
import { BizWireAnalyticsBar } from './BizWireAnalyticsBar';
import type { BizWireThread } from '../types';

export function BizWireManager() {
  const { user } = useAuth();
  const { selectedListingId } = useListingContext();

  const listingId = selectedListingId ?? 0;

  // Thread list state
  const {
    threads,
    isLoading: threadsLoading,
    error: threadsError,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    refresh: refreshThreads
  } = useBizWireThreads({ listingId: listingId || undefined });

  // Selected thread state
  const [selectedThread, setSelectedThread] = useState<BizWireThread | null>(null);

  // Thread conversation state
  const {
    messages,
    isLoading: messagesLoading,
    error: messagesError,
    sendReply,
    isReplying,
    replyError,
    archiveThread,
    isArchiving,
    refresh: refreshMessages
  } = useBizWireThread({
    listingId,
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

  const handleArchive = useCallback(async () => {
    const success = await archiveThread();
    if (success) {
      await refreshThreads();
    }
    return success;
  }, [archiveThread, refreshThreads]);

  // Mark bizwire notifications as read when visiting the page (clears sidebar badge)
  useEffect(() => {
    if (!selectedListingId) return;
    fetch('/api/dashboard/notifications/mark-read', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationType: 'bizwire' })
    }).catch(() => { /* best-effort */ });
  }, [selectedListingId]);

  if (!selectedListingId) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
        Please select a listing to manage BizWire messages.
      </div>
    );
  }

  const currentUserId = user ? parseInt(user.id, 10) : 0;

  return (
    <div className="space-y-4">
      {/* Analytics bar */}
      <BizWireAnalyticsBar listingId={listingId} />

      {/* Two-column inbox */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden" style={{ height: 'calc(100vh - 340px)', minHeight: '400px' }}>
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
              variant="listing"
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
                  onArchive={handleArchive}
                  isArchiving={isArchiving}
                  onBack={handleBackToThreads}
                  onToggleThreads={handleToggleThreads}
                  threadsPanelOpen={threadsPanelOpen}
                  variant="listing"
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
