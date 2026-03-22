/**
 * MessageBubble - Individual message display component
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @brain-plan docs/pages/layouts/home/user/phases/troubleshooting/sendmessage/phases/PHASE_4_DASHBOARD_MESSAGES_BRAIN_PLAN.md
 * @reference src/features/connections/components/GroupMessageItem.tsx - Card/row layout pattern
 *
 * FEATURES:
 * - Chat-style bubbles (own = right/blue, other = left/gray)
 * - Right-click context menu with emoji reactions
 * - Reaction display below messages
 * - Status indicators for own messages
 * - Subject display
 */

'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { getAvatarInitials, getAvatarBgColor } from '@core/utils/avatar';
import { fetchWithCsrf } from '@core/utils/csrf';
import { Message } from '../types';
import type { ReactionSummary } from '../types';
import { MessageContextMenu } from './MessageContextMenu';
import { ReactionDisplay } from './ReactionDisplay';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

/**
 * Format timestamp as relative time or date
 */
function formatTimestamp(date: Date): string {
  const now = new Date();
  const messageDate = new Date(date);
  const diffMs = now.getTime() - messageDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const senderName = message.sender_display_name || message.sender_username || 'Unknown';
  const avatarUrl = message.sender_avatar_url;
  const initials = getAvatarInitials(senderName, message.sender_username || null);
  const bgColor = getAvatarBgColor(null);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [reactions, setReactions] = useState<ReactionSummary[]>([]);
  const [reactionsLoaded, setReactionsLoaded] = useState(false);

  const loadReactions = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages/${message.id}/reactions`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setReactions(data.data.reactions || []);
      }
    } catch { /* silent */ }
    setReactionsLoaded(true);
  }, [message.id]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
    if (!reactionsLoaded) void loadReactions();
  }, [reactionsLoaded, loadReactions]);

  const handleReact = useCallback(async (emoji: string) => {
    const existing = reactions.find(r => r.emoji === emoji);
    const isRemoving = !!existing?.reacted_by_me;

    // Optimistic update — show/hide reaction immediately
    setReactions(prev => {
      if (isRemoving) {
        return prev
          .map(r => r.emoji === emoji ? { ...r, count: r.count - 1, reacted_by_me: false } : r)
          .filter(r => r.count > 0);
      }
      const found = prev.find(r => r.emoji === emoji);
      if (found) {
        return prev.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, reacted_by_me: true } : r);
      }
      return [...prev, { emoji, count: 1, reacted_by_me: true, users: [] }];
    });

    try {
      await fetchWithCsrf(`/api/messages/${message.id}/reactions`, {
        method: isRemoving ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      });
      void loadReactions();
    } catch {
      void loadReactions();
    }
  }, [message.id, reactions, loadReactions]);

  const handleToggleReaction = useCallback((emoji: string) => {
    void handleReact(emoji);
  }, [handleReact]);

  const reactionBadges = reactions.map(r => ({
    emoji: r.emoji,
    count: r.count,
    reactedByMe: r.reacted_by_me
  }));

  if (isOwn) {
    return (
      <div className="flex justify-end" onContextMenu={handleContextMenu}>
        <div className="max-w-[75%]">
          <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-br-sm">
            {message.subject && (
              <div className="font-medium mb-1">{message.subject}</div>
            )}
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          </div>
          {/* Reactions */}
          <ReactionDisplay reactions={reactionBadges} onToggleReaction={handleToggleReaction} align="right" />
          {/* Timestamp + status */}
          <div className="flex items-center justify-end gap-1.5 mt-1 px-1">
            <span className="text-xs text-gray-500">
              {formatTimestamp(message.created_at)}
            </span>
            <span className="text-xs text-gray-400">
              {message.status === 'read' && '\u2713\u2713'}
              {message.status === 'delivered' && '\u2713'}
              {message.status === 'sent' && '\u2022'}
            </span>
          </div>
        </div>

        {contextMenu && (
          <MessageContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onReact={handleReact}
            onClose={() => setContextMenu(null)}
            existingReactions={reactions.filter(r => r.reacted_by_me).map(r => r.emoji)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex justify-start" onContextMenu={handleContextMenu}>
      <div className="flex gap-3 max-w-[75%]">
        {/* Avatar */}
        <div className="flex-shrink-0 mt-1">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={senderName}
              width={36}
              height={36}
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold"
              style={{ backgroundColor: bgColor }}
            >
              {initials}
            </div>
          )}
        </div>

        <div>
          {/* Sender name */}
          <div className="text-xs font-medium text-gray-600 mb-1 px-1">
            {senderName}
          </div>
          {/* Message bubble */}
          <div className="bg-gray-100 text-gray-900 p-3 rounded-2xl rounded-bl-sm">
            {message.subject && (
              <div className="font-medium text-gray-800 mb-1">{message.subject}</div>
            )}
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          </div>
          {/* Reactions */}
          <ReactionDisplay reactions={reactionBadges} onToggleReaction={handleToggleReaction} align="left" />
          {/* Timestamp */}
          <div className="mt-1 px-1">
            <span className="text-xs text-gray-500">
              {formatTimestamp(message.created_at)}
            </span>
          </div>
        </div>
      </div>

      {contextMenu && (
        <MessageContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onReact={handleReact}
          onClose={() => setContextMenu(null)}
          existingReactions={reactions.filter(r => r.reacted_by_me).map(r => r.emoji)}
        />
      )}
    </div>
  );
}
