/**
 * ThreadsList - List of message threads for inbox view
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @brain-plan docs/pages/layouts/home/user/phases/troubleshooting/sendmessage/phases/PHASE_4_DASHBOARD_MESSAGES_BRAIN_PLAN.md
 * @reference src/app/dashboard/connections/page.tsx - List pattern
 *
 * FEATURES:
 * - Renders list of ThreadItem components
 * - Handles thread selection
 * - Loading state display
 * - Empty state display
 * - Error state display
 */

'use client';

import React from 'react';
import { MessageThread } from '../types';
import { ThreadItem } from './ThreadItem';

interface ThreadsListProps {
  threads: MessageThread[];
  selectedThreadId: string | null;
  onSelectThread: (thread: MessageThread) => void;
  isLoading: boolean;
  error: string | null;
}

export function ThreadsList({
  threads,
  selectedThreadId,
  onSelectThread,
  isLoading,
  error
}: ThreadsListProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
        <p className="text-gray-500 mt-2">Loading messages...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800">Error loading messages</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (threads.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <p className="text-gray-500 font-medium">No messages yet</p>
        <p className="text-sm text-gray-600 mt-1">Start a conversation by sending a message</p>
      </div>
    );
  }

  // Thread list
  return (
    <div className="divide-y divide-gray-200">
      {threads.map((thread) => (
        <ThreadItem
          key={thread.thread_id}
          thread={thread}
          isSelected={selectedThreadId === thread.thread_id}
          onSelect={() => onSelectThread(thread)}
        />
      ))}
    </div>
  );
}
