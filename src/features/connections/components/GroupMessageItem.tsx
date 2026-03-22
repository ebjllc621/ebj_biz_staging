/**
 * GroupMessageItem Component
 * Single message display in a group conversation
 *
 * @tier STANDARD
 * @phase Connection Groups Feature - Phase 2
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/3-5-26/phases/PHASE_2_BRAIN_PLAN.md
 *
 * FEATURES:
 * - Avatar and sender info
 * - @mention highlighting
 * - Right-click context menu with emoji reactions + reply
 * - Reaction display badges
 * - Reply-to preview
 * - Pinned indicator
 */

'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { Pin, CornerDownRight } from 'lucide-react';
import { getAvatarInitials, getAvatarBgColor } from '@core/utils/avatar';
import { fetchWithCsrf } from '@core/utils/csrf';
import { MessageContextMenu } from '@features/messaging/components/MessageContextMenu';
import { ReactionDisplay } from '@features/messaging/components/ReactionDisplay';
import type { GroupMessage, GroupMessageReactionSummary } from '../types/group-actions';

export interface GroupMessageItemProps {
  message: GroupMessage;
  isOwnMessage?: boolean;
  groupId: number;
  onReply?: (message: GroupMessage) => void;
  className?: string;
}

function renderMessageContent(content: string): React.ReactNode {
  const parts = content.split(/(\B@[a-zA-Z0-9_]+)/g);
  return parts.map((part, index) => {
    if (/^\B@[a-zA-Z0-9_]+$/.test(part)) {
      return (
        <span key={index} className="text-blue-600 font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
}

function formatMessageTime(date: Date): string {
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
  return messageDate.toLocaleDateString();
}

function GroupMessageItemComponent({
  message,
  isOwnMessage = false,
  groupId,
  onReply,
  className = ''
}: GroupMessageItemProps) {
  const initials = getAvatarInitials(message.senderDisplayName, message.senderUsername);
  const bgColor = getAvatarBgColor(message.senderAvatarBgColor);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [localReactions, setLocalReactions] = useState<GroupMessageReactionSummary[] | null>(null);

  // Use server-provided reactions, then overlay with local state after toggling
  const displayReactions = localReactions ?? message.reactions ?? [];

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const loadReactions = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/users/connections/groups/${groupId}/messages/${message.id}/reactions`,
        { credentials: 'include' }
      );
      const data = await res.json();
      if (data.success) {
        setLocalReactions(data.data.reactions || []);
      }
    } catch { /* silent */ }
  }, [groupId, message.id]);

  const handleReact = useCallback(async (emoji: string) => {
    const existing = displayReactions.find(r => r.emoji === emoji);
    const isRemoving = !!existing?.reactedByMe;

    // Optimistic update — show/hide reaction immediately
    setLocalReactions(prev => {
      const current = prev ?? displayReactions;
      if (isRemoving) {
        return current
          .map(r => r.emoji === emoji ? { ...r, count: r.count - 1, reactedByMe: false } : r)
          .filter(r => r.count > 0);
      }
      const found = current.find(r => r.emoji === emoji);
      if (found) {
        return current.map(r => r.emoji === emoji ? { ...r, count: r.count + 1, reactedByMe: true } : r);
      }
      return [...current, { emoji, count: 1, reactedByMe: true, users: [] }];
    });

    try {
      await fetchWithCsrf(
        `/api/users/connections/groups/${groupId}/messages/${message.id}/reactions`,
        {
          method: isRemoving ? 'DELETE' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emoji })
        }
      );
      // Sync with server after mutation
      void loadReactions();
    } catch {
      // Revert optimistic update on failure
      void loadReactions();
    }
  }, [groupId, message.id, displayReactions, loadReactions]);

  const handleToggleReaction = useCallback((emoji: string) => {
    void handleReact(emoji);
  }, [handleReact]);

  const reactionBadges = displayReactions.map(r => ({
    emoji: r.emoji,
    count: r.count,
    reactedByMe: r.reactedByMe
  }));

  const avatar = message.senderAvatarUrl ? (
    <Image
      src={message.senderAvatarUrl}
      alt={message.senderDisplayName || message.senderUsername}
      width={36}
      height={36}
      className="w-9 h-9 rounded-full object-cover flex-shrink-0"
    />
  ) : (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
      style={{ backgroundColor: bgColor }}
    >
      {initials}
    </div>
  );

  const replyPreview = message.replyToId && message.replyToSenderUsername ? (
    <div className="flex items-start gap-1.5 mb-1.5 pl-2 border-l-2 border-blue-300">
      <CornerDownRight className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="text-xs text-gray-500 min-w-0">
        <span className="font-medium text-gray-700">
          {message.replyToSenderDisplayName || message.replyToSenderUsername}
        </span>
        <span className="ml-1 truncate block">
          {message.replyToContent?.substring(0, 80)}
          {message.replyToContent && message.replyToContent.length > 80 ? '...' : ''}
        </span>
      </div>
    </div>
  ) : null;

  if (isOwnMessage) {
    return (
      <div
        className={`flex justify-end p-2 ${className}`}
        onContextMenu={handleContextMenu}
      >
        <div className="max-w-[75%]">
          {replyPreview}
          <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-br-sm">
            {message.subject && (
              <div className="font-medium mb-1">{message.subject}</div>
            )}
            <div className="whitespace-pre-wrap break-words">
              {renderMessageContent(message.content)}
            </div>
          </div>
          <ReactionDisplay reactions={reactionBadges} onToggleReaction={handleToggleReaction} align="right" />
          <div className="flex items-center justify-end gap-1.5 mt-1 px-1">
            <span className="text-xs text-gray-500">
              {formatMessageTime(message.createdAt)}
            </span>
            {!!message.isPinned && <Pin className="w-3 h-3 text-amber-500" />}
          </div>
        </div>

        {contextMenu && (
          <MessageContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onReact={handleReact}
            onReply={onReply ? () => onReply(message) : undefined}
            onClose={() => setContextMenu(null)}
            existingReactions={displayReactions.filter(r => r.reactedByMe).map(r => r.emoji)}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex gap-3 p-2 rounded-lg hover:bg-gray-50 ${className}`}
      onContextMenu={handleContextMenu}
    >
      <div className="flex-shrink-0 mt-1">{avatar}</div>

      <div className="flex-1 min-w-0 max-w-[75%]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-gray-600">
            {message.senderDisplayName || message.senderUsername}
          </span>
          <span className="text-xs text-gray-500">
            {formatMessageTime(message.createdAt)}
          </span>
          {!!message.isPinned && <Pin className="w-3 h-3 text-amber-500" />}
        </div>

        {replyPreview}

        <div className="bg-gray-100 text-gray-900 p-3 rounded-2xl rounded-bl-sm">
          {message.subject && (
            <div className="font-medium text-gray-800 mb-1">{message.subject}</div>
          )}
          <div className="whitespace-pre-wrap break-words">
            {renderMessageContent(message.content)}
          </div>
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded"
              >
                {attachment.name}
              </a>
            ))}
          </div>
        )}

        <ReactionDisplay reactions={reactionBadges} onToggleReaction={handleToggleReaction} />
      </div>

      {contextMenu && (
        <MessageContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onReact={handleReact}
          onReply={onReply ? () => onReply(message) : undefined}
          onClose={() => setContextMenu(null)}
          existingReactions={displayReactions.filter(r => r.reactedByMe).map(r => r.emoji)}
        />
      )}
    </div>
  );
}

export const GroupMessageItem = React.memo(GroupMessageItemComponent);
GroupMessageItem.displayName = 'GroupMessageItem';
