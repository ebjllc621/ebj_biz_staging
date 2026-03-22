/**
 * Dashboard Messages Page - Full Messaging Center
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @brain-plan docs/pages/layouts/home/user/phases/troubleshooting/sendmessage/phases/PHASE_4_DASHBOARD_MESSAGES_BRAIN_PLAN.md
 * @reference src/app/dashboard/connections/page.tsx - CANONICAL dashboard page pattern
 *
 * FEATURES:
 * - Inbox view with thread list
 * - Conversation view with message history (1:1 and group)
 * - Compose new message modal
 * - Responsive layout (stacked mobile, side-by-side desktop)
 * - Unread indicators
 * - Auto-mark as read on conversation view
 * - Inline group messaging (no redirect to group page)
 */
'use client';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Users, X } from 'lucide-react';
import { useAuth } from '@core/context/AuthContext';
import { fetchWithCsrf } from '@core/utils/csrf';
import { MessageThread } from '@features/messaging/types';
import { useThreads } from '@features/messaging/hooks/useMessages';
import { ThreadsList } from '@features/messaging/components/ThreadsList';
import { ConversationView } from '@features/messaging/components/ConversationView';
import { ComposeMessageModal } from '@features/messaging/components/ComposeMessageModal';
import { GroupMessagesPanel } from '@features/connections/components/GroupMessagesPanel';
import { ErrorService } from '@core/services/ErrorService';
import type { RecipientUser } from '@features/messaging/components/RecipientSelector';
import type { GroupMember } from '@features/connections/types/groups';

function MessagesPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { threads, unreadCount, isLoading, error, refresh } = useThreads();

  // Thread selection state
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);

  // Compose modal state
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);

  // Pre-selected compose targets from URL params
  const [composeInitialRecipient, setComposeInitialRecipient] = useState<RecipientUser | undefined>(undefined);
  const [composeInitialGroup, setComposeInitialGroup] = useState<{ id: number; name: string; color: string; memberCount: number } | undefined>(undefined);

  // View mode for mobile (threads list or conversation)
  const [viewMode, setViewMode] = useState<'threads' | 'conversation'>('threads');

  // Desktop: collapse threads panel when conversation is open
  const [threadsPanelOpen, setThreadsPanelOpen] = useState(true);

  // Group members for @mention autocomplete in group conversations
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Filter threads by search query (display name, username, message content)
  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    const q = searchQuery.toLowerCase();
    return threads.filter(t => {
      const name = (t.other_display_name || '').toLowerCase();
      const username = (t.other_username || '').toLowerCase();
      const content = (t.last_message_content || '').toLowerCase();
      const groupName = (t.group_name || '').toLowerCase();
      return name.includes(q) || username.includes(q) || content.includes(q) || groupName.includes(q);
    });
  }, [threads, searchQuery]);

  // Handle URL param-based compose modal auto-open
  useEffect(() => {
    const composeType = searchParams.get('compose');
    if (composeType === 'user') {
      const userId = searchParams.get('userId');
      const username = searchParams.get('username');
      if (userId && username) {
        setComposeInitialRecipient({
          id: parseInt(userId, 10),
          username: decodeURIComponent(username),
          display_name: searchParams.get('displayName') ? decodeURIComponent(searchParams.get('displayName')!) : null,
          avatar_url: searchParams.get('avatarUrl') ? decodeURIComponent(searchParams.get('avatarUrl')!) : null
        });
        setComposeInitialGroup(undefined);
        setIsComposeModalOpen(true);
        // Clean URL params without navigation
        router.replace('/dashboard/messages', { scroll: false });
      }
    } else if (composeType === 'group') {
      const groupId = searchParams.get('groupId');
      const groupName = searchParams.get('groupName');
      if (groupId && groupName) {
        setComposeInitialGroup({
          id: parseInt(groupId, 10),
          name: decodeURIComponent(groupName),
          color: searchParams.get('groupColor') ? decodeURIComponent(searchParams.get('groupColor')!) : '#3B82F6',
          memberCount: parseInt(searchParams.get('groupMemberCount') || '0', 10)
        });
        setComposeInitialRecipient(undefined);
        setIsComposeModalOpen(true);
        router.replace('/dashboard/messages', { scroll: false });
      }
    }
  }, [searchParams, router]);

  useEffect(() => {
    // Mark message notifications as read when user visits this page
    markMessageNotificationsRead();
  }, []);

  // Fetch group members when a group thread is selected
  useEffect(() => {
    if (selectedThread?.is_group_thread && selectedThread.group_id) {
      const groupId = selectedThread.group_id;
      fetch(`/api/users/connections/groups/${groupId}/members`, {
        credentials: 'include'
      })
        .then(r => r.json())
        .then(result => {
          if (result.success) {
            setGroupMembers(result.data.members || []);
          }
        })
        .catch(() => setGroupMembers([]));
    } else {
      setGroupMembers([]);
    }
  }, [selectedThread?.is_group_thread, selectedThread?.group_id]);

  const markMessageNotificationsRead = async () => {
    try {
      await fetchWithCsrf('/api/dashboard/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationType: 'message' })
      });
    } catch (error) {
      // Silent fail - don't interrupt user experience for notification marking
      ErrorService.capture('Failed to mark notifications as read:', error);
    }
  };

  const handleSelectThread = (thread: MessageThread) => {
    setSelectedThread(thread);
    setViewMode('conversation');
    setThreadsPanelOpen(false);
  };

  const handleBackToThreads = () => {
    setViewMode('threads');
    setSelectedThread(null);
    setThreadsPanelOpen(true);
  };

  const handleToggleThreadsPanel = () => {
    setThreadsPanelOpen(!threadsPanelOpen);
  };

  const handleMessageSent = () => {
    // Refresh threads after sending message
    refresh();
  };

  const handleComposeComplete = () => {
    setIsComposeModalOpen(false);
    setComposeInitialRecipient(undefined);
    setComposeInitialGroup(undefined);
    refresh();
  };

  const handleComposeClose = () => {
    setIsComposeModalOpen(false);
    setComposeInitialRecipient(undefined);
    setComposeInitialGroup(undefined);
  };

  if (!user) {
    return (
      <div className="p-6 text-center text-gray-500">
        Please log in to view messages
      </div>
    );
  }

  const isGroupThread = selectedThread?.is_group_thread === true && !!selectedThread.group_id;
  const groupColor = selectedThread?.group_color || '#3B82F6';

  return (
    <div className="space-y-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'Your messages'}
          </p>
        </div>
        <button
          onClick={() => setIsComposeModalOpen(true)}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Compose
        </button>
      </div>

      {/* Main content area */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 240px)' }}>
        <div className="h-full flex">
          {/* Threads list panel */}
          {/* Mobile: show when viewMode='threads', hide when viewing conversation */}
          {/* Desktop: show/hide based on threadsPanelOpen state */}
          <div className={`h-full flex flex-col border-r border-gray-200 flex-shrink-0 transition-all duration-200 ${
            viewMode === 'conversation' ? 'hidden' : 'w-full'
          } ${
            threadsPanelOpen ? 'md:flex md:w-80 lg:w-96' : 'md:hidden'
          }`}>
            {/* Search bar */}
            <div className="flex-shrink-0 p-3 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {searchQuery.trim() && (
                <p className="text-xs text-gray-500 mt-1.5 px-0.5">
                  {filteredThreads.length} of {threads.length} conversations
                </p>
              )}
            </div>

            {/* Threads list */}
            <div className="flex-1 overflow-y-auto">
              <ThreadsList
                threads={filteredThreads}
                selectedThreadId={selectedThread?.thread_id || null}
                onSelectThread={handleSelectThread}
                isLoading={isLoading}
                error={error}
              />
            </div>
          </div>

          {/* Conversation view - takes remaining width */}
          <div className={`h-full flex-1 min-w-0 ${
            viewMode === 'threads' ? 'hidden md:flex' : 'flex'
          }`}>
            {selectedThread ? (
              isGroupThread ? (
                /* Group conversation - inline */
                <div className="flex flex-col h-full w-full">
                  {/* Group header with back/expand chevron */}
                  <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                      {/* Back button: mobile goes back to threads, desktop toggles panel */}
                      <button
                        onClick={() => {
                          // Mobile: full back
                          if (window.innerWidth < 768) {
                            handleBackToThreads();
                          } else {
                            handleToggleThreadsPanel();
                          }
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label={threadsPanelOpen ? 'Collapse threads' : 'Show threads'}
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={threadsPanelOpen ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
                        </svg>
                      </button>

                      {/* Group icon */}
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: groupColor + '20' }}
                      >
                        <Users className="w-5 h-5" style={{ color: groupColor }} />
                      </div>

                      {/* Group info */}
                      <div className="flex-1 min-w-0">
                        <h2 className="text-base font-semibold text-gray-900 truncate">
                          {selectedThread.group_name || 'Group'}
                        </h2>
                        <p className="text-sm text-gray-500">
                          {groupMembers.length > 0 ? `${groupMembers.length} members` : 'Connection Group'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Group messages panel (fills remaining space) */}
                  <div className="flex-1 overflow-hidden">
                    <GroupMessagesPanel
                      groupId={selectedThread.group_id!}
                      currentUserId={parseInt(user.id, 10)}
                      members={groupMembers}
                      className="h-full"
                      onMessagesRead={refresh}
                    />
                  </div>
                </div>
              ) : (
                /* 1:1 conversation */
                <ConversationView
                  otherUserId={selectedThread.other_user_id}
                  otherUser={{
                    username: selectedThread.other_username,
                    display_name: selectedThread.other_display_name,
                    avatar_url: selectedThread.other_avatar_url
                  }}
                  currentUserId={parseInt(user.id, 10)}
                  onMessageSent={handleMessageSent}
                  onBack={handleBackToThreads}
                  onToggleThreads={handleToggleThreadsPanel}
                  threadsPanelOpen={threadsPanelOpen}
                />
              )
            ) : (
              <div className="hidden md:flex flex-col items-center justify-center w-full h-full bg-gray-50">
                <div className="text-center">
                  <div className="mx-auto w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium text-lg">Select a conversation</p>
                  <p className="text-sm text-gray-600 mt-1">Choose a thread from the left to view messages</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compose message modal */}
      {isComposeModalOpen && (
        <ComposeMessageModal
          isOpen={isComposeModalOpen}
          onClose={handleComposeClose}
          onMessageSent={handleComposeComplete}
          initialRecipient={composeInitialRecipient}
          initialGroup={composeInitialGroup}
        />
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <ErrorBoundary componentName="DashboardMessagesPage">
      <MessagesPageContent />
    </ErrorBoundary>
  );
}
