/**
 * ContentCommentSection - Threaded comment section for content detail pages
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 3B - Share Modal + Comment Section + Analytics Integration
 * @governance Build Map v2.1 ENHANCED
 *
 * Displays paginated comments, add-comment form (auth-gated), delete own comments,
 * and single-level reply support. ErrorBoundary wrapped.
 */
'use client';

import { useState, useCallback, useRef } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ContentCommentItem } from '@features/content/components/shared/ContentCommentItem';
import { useContentComments } from '@features/content/hooks/useContentComments';
import { useAuth } from '@core/hooks/useAuth';
import type { ContentType } from '@core/services/ContentInteractionService';
import type { ContentCommentWithUser } from '@core/services/ContentInteractionService';

// ============================================================================
// Types
// ============================================================================

interface ContentCommentSectionProps {
  contentType: ContentType;
  contentId: number;
  contentTitle: string;
}

// ============================================================================
// Inner component
// ============================================================================

function ContentCommentSectionInner({
  contentType,
  contentId,
}: ContentCommentSectionProps) {
  const { user } = useAuth();
  const {
    comments,
    total,
    isLoading,
    hasMore,
    addComment,
    deleteComment,
    loadMore,
  } = useContentComments(contentType, contentId);

  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reply state — tracks which comment is being replied to
  const [replyToId, setReplyToId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmitComment = useCallback(async () => {
    const text = newCommentText.trim();
    if (!text || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await addComment(text);
      setNewCommentText('');
    } catch {
      setSubmitError('Failed to post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [newCommentText, isSubmitting, addComment]);

  const handleSubmitReply = useCallback(async () => {
    if (!replyToId || !replyText.trim() || isSubmittingReply) return;

    setIsSubmittingReply(true);
    try {
      await addComment(replyText.trim(), replyToId);
      setReplyText('');
      setReplyToId(null);
    } catch {
      // Non-critical — optimistic revert handled in hook
    } finally {
      setIsSubmittingReply(false);
    }
  }, [replyToId, replyText, isSubmittingReply, addComment]);

  const handleReply = useCallback((commentId: number) => {
    setReplyToId(prev => prev === commentId ? null : commentId);
    setReplyText('');
    setTimeout(() => replyTextareaRef.current?.focus(), 50);
  }, []);

  const handleDelete = useCallback((commentId: number) => {
    deleteComment(commentId);
  }, [deleteComment]);

  const handleKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    submitFn: () => void
  ) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submitFn();
    }
  }, []);

  // Group top-level comments and their replies
  const topLevelComments = comments.filter(c => !c.parent_id);
  const repliesMap: Record<number, ContentCommentWithUser[]> = {};
  comments.forEach(c => {
    if (c.parent_id) {
      if (!repliesMap[c.parent_id]) {
        repliesMap[c.parent_id] = [];
      }
      repliesMap[c.parent_id]!.push(c);
    }
  });

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">
          Comments
          {total > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">({total})</span>
          )}
        </h2>
      </div>

      {/* Add Comment Form */}
      {user ? (
        <div className="mb-6">
          <textarea
            ref={textareaRef}
            value={newCommentText}
            onChange={e => setNewCommentText(e.target.value.slice(0, 2000))}
            onKeyDown={e => handleKeyDown(e, handleSubmitComment)}
            placeholder="Share your thoughts... (Ctrl+Enter to submit)"
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-biz-orange focus:border-transparent resize-none"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">{newCommentText.length}/2000</span>
            <button
              onClick={handleSubmitComment}
              disabled={!newCommentText.trim() || isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-biz-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Posting...' : 'Post Comment'}</span>
            </button>
          </div>
          {submitError && (
            <p className="mt-2 text-sm text-red-600">{submitError}</p>
          )}
        </div>
      ) : (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-sm text-gray-600">
            <a href="/auth/login" className="font-medium text-biz-orange hover:underline">
              Sign in
            </a>
            {' '}to join the conversation.
          </p>
        </div>
      )}

      {/* Comment List */}
      {isLoading && comments.length === 0 ? (
        /* Loading skeleton */
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(n => (
            <div key={n} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-32" />
                <div className="h-12 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : topLevelComments.length === 0 ? (
        /* Empty state */
        <div className="text-center py-10">
          <MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Be the first to comment!</p>
          <p className="text-sm text-gray-400 mt-1">Share your thoughts about this content.</p>
        </div>
      ) : (
        /* Comment list */
        <div className="space-y-5">
          {topLevelComments.map(comment => (
            <div key={comment.id}>
              <ContentCommentItem
                comment={comment}
                currentUserId={user?.id ? parseInt(user.id, 10) : undefined}
                onDelete={handleDelete}
                onReply={handleReply}
                isReply={false}
              />

              {/* Replies */}
              {(repliesMap[comment.id] ?? []).length > 0 && (
                <div className="mt-3 space-y-3">
                  {(repliesMap[comment.id] ?? []).map(reply => (
                    <ContentCommentItem
                      key={reply.id}
                      comment={reply}
                      currentUserId={user?.id ? parseInt(user.id, 10) : undefined}
                      onDelete={handleDelete}
                      onReply={handleReply}
                      isReply
                    />
                  ))}
                </div>
              )}

              {/* Reply form */}
              {replyToId === comment.id && user && (
                <div className="ml-8 mt-3">
                  <textarea
                    ref={replyTextareaRef}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value.slice(0, 2000))}
                    onKeyDown={e => handleKeyDown(e, handleSubmitReply)}
                    placeholder="Write a reply... (Ctrl+Enter to submit)"
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-biz-orange focus:border-transparent resize-none"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => { setReplyToId(null); setReplyText(''); }}
                      className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitReply}
                      disabled={!replyText.trim() || isSubmittingReply}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-biz-orange text-white rounded-lg text-xs font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-3 h-3" />
                      <span>{isSubmittingReply ? 'Posting...' : 'Reply'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={loadMore}
                disabled={isLoading}
                className="px-5 py-2 text-sm font-medium text-biz-navy border border-biz-navy rounded-lg hover:bg-biz-navy hover:text-white transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Load more comments'}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ============================================================================
// Exported component with ErrorBoundary wrapper
// ============================================================================

export function ContentCommentSection(props: ContentCommentSectionProps) {
  return (
    <ErrorBoundary componentName="ContentCommentSection">
      <ContentCommentSectionInner {...props} />
    </ErrorBoundary>
  );
}

export default ContentCommentSection;
