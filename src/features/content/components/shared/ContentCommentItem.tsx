/**
 * ContentCommentItem - Single comment display with avatar, timestamp, and actions
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 3B - Share Modal + Comment Section + Analytics Integration
 * @governance Build Map v2.1 ENHANCED
 *
 * Displays a single comment with user avatar, display name, relative timestamp,
 * comment text, reply button, and delete button (own comments only).
 * Used for both top-level and reply comments (replies get ml-8 indent).
 */
'use client';

import { Trash2, MessageCircle } from 'lucide-react';
import { getAvatarInitials } from '@core/utils/avatar';
import type { ContentCommentWithUser } from '@core/services/ContentInteractionService';

// ============================================================================
// Types
// ============================================================================

interface ContentCommentItemProps {
  comment: ContentCommentWithUser;
  currentUserId?: number;
  onDelete: (_commentId: number) => void;
  onReply: (_commentId: number) => void;
  isReply?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format a date as a relative string ("2h ago", "3d ago", "Jan 5")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDisplayName(comment: ContentCommentWithUser): string {
  if (comment.first_name && comment.last_name) {
    return `${comment.first_name} ${comment.last_name}`;
  }
  if (comment.first_name) return comment.first_name;
  if (comment.email) return comment.email;
  return 'Anonymous';
}

// ============================================================================
// Component
// ============================================================================

export function ContentCommentItem({
  comment,
  currentUserId,
  onDelete,
  onReply,
  isReply = false,
}: ContentCommentItemProps) {
  const displayName = getDisplayName(comment);
  const initials = getAvatarInitials(
    comment.first_name && comment.last_name
      ? `${comment.first_name} ${comment.last_name}`
      : null,
    comment.email
  );
  const isOwnComment = currentUserId !== undefined && comment.user_id === currentUserId;

  return (
    <div className={`flex gap-3 ${isReply ? 'ml-8' : ''}`}>
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold text-white"
        style={{ backgroundColor: '#022641' }}
      >
        {initials}
      </div>

      {/* Comment Body */}
      <div className="flex-1 min-w-0">
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-gray-900">{displayName}</span>
            <span className="text-xs text-gray-400">{formatRelativeTime(comment.created_at)}</span>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
            {comment.comment_text}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-1 ml-1">
          {!isReply && (
            <button
              onClick={() => onReply(comment.id)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-biz-navy transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Reply</span>
            </button>
          )}
          {isOwnComment && (
            <button
              onClick={() => onDelete(comment.id)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
              aria-label="Delete comment"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContentCommentItem;
