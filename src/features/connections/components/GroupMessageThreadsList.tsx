/**
 * GroupMessageThreadsList Component
 * List of group message threads with unread badges
 *
 * GOVERNANCE COMPLIANCE:
 * - STANDARD tier component (100-300 lines)
 * - ErrorBoundary wrapper (MANDATORY)
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

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageCircle, Users, Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import type { GroupMessageThread } from '../types/group-actions';

export interface GroupMessageThreadsListProps {
  userId: number;
  className?: string;
}

function formatPreviewTime(date: Date | null): string {
  if (!date) return '';
  const now = new Date();
  const messageDate = new Date(date);
  const diffMs = now.getTime() - messageDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ThreadCard({ thread }: { thread: GroupMessageThread }) {
  const latestMessage = thread.latestMessage;
  const previewText = latestMessage?.content || 'No messages yet';
  const truncatedPreview = previewText.length > 60 ? previewText.substring(0, 60) + '...' : previewText;

  return (
    <Link
      href={`/dashboard/connections/groups/${thread.groupId}`}
      className="block p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* Group Icon */}
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-white flex-shrink-0"
          style={{ backgroundColor: thread.groupColor || '#3B82F6' }}
        >
          <Users className="w-6 h-6" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-900 truncate">{thread.groupName}</h3>
            {latestMessage && (
              <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                {formatPreviewTime(latestMessage.createdAt)}
              </span>
            )}
          </div>

          {/* Preview */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 truncate">
              {latestMessage && (
                <span className="font-medium text-gray-800">
                  {latestMessage.senderDisplayName || latestMessage.senderUsername}:{' '}
                </span>
              )}
              {truncatedPreview}
            </p>

            {/* Unread Badge */}
            {thread.unreadCount > 0 && (
              <span className="ml-2 flex-shrink-0 px-2 py-0.5 text-white text-xs font-medium rounded-full" style={{ backgroundColor: '#ed6437' }}>
                {thread.unreadCount > 99 ? '99+' : thread.unreadCount}
              </span>
            )}
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {thread.memberCount} members
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              {thread.totalMessages} messages
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function GroupMessageThreadsListContent({
  className = ''
}: GroupMessageThreadsListProps) {
  const [threads, setThreads] = useState<GroupMessageThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadThreads = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/users/connections/groups/message-threads', {
          credentials: 'include'
        });
        const result = await response.json();

        if (result.success && result.data) {
          setThreads(result.data.threads || []);
        }
      } catch {
        setError('Failed to load message threads');
      } finally {
        setIsLoading(false);
      }
    };

    void loadThreads();
  }, []);

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
        </div>
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
        <MessageCircle className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-gray-500">No group conversations yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Join a group and start messaging!
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Group Messages
        </h2>
      </div>

      <div className="divide-y divide-gray-100">
        {threads.map((thread) => (
          <ThreadCard key={thread.groupId} thread={thread} />
        ))}
      </div>
    </div>
  );
}

export function GroupMessageThreadsList(props: GroupMessageThreadsListProps) {
  return (
    <ErrorBoundary
      componentName="GroupMessageThreadsList"
      fallback={
        <div className="p-8 text-center text-gray-500 bg-white rounded-xl shadow-sm">
          <p>Unable to load message threads.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-blue-600 underline"
          >
            Refresh page
          </button>
        </div>
      }
    >
      <GroupMessageThreadsListContent {...props} />
    </ErrorBoundary>
  );
}
