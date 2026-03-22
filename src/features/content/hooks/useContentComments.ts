/**
 * useContentComments - Comment data hook for content items
 *
 * @tier STANDARD
 * @phase Phase 3B - Share Modal + Comment Section + Analytics Integration
 * @governance Build Map v2.1 ENHANCED
 *
 * Fetches, adds, deletes, and paginates comments for a content item.
 * Optimistic UI for add/delete with server-sync revert on error.
 * Auth-gated writes via useAuth() + fetchWithCsrf.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@core/hooks/useAuth';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { ContentType } from '@core/services/ContentInteractionService';
import type { ContentCommentWithUser } from '@core/services/ContentInteractionService';

const PAGE_SIZE = 20;

interface UseContentCommentsReturn {
  comments: ContentCommentWithUser[];
  total: number;
  isLoading: boolean;
  hasMore: boolean;
  isAuthenticated: boolean;
  addComment: (_text: string, _parentId?: number) => Promise<void>;
  deleteComment: (_commentId: number) => Promise<void>;
  loadMore: () => Promise<void>;
}

export function useContentComments(
  contentType: ContentType,
  contentId: number
): UseContentCommentsReturn {
  const { user } = useAuth();
  const [comments, setComments] = useState<ContentCommentWithUser[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Fetch first page on mount
  useEffect(() => {
    if (!contentId) return;

    let cancelled = false;

    const fetchComments = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/content/${contentType}/${contentId}/comments?page=1&pageSize=${PAGE_SIZE}`,
          { credentials: 'include' }
        );
        if (response.ok && !cancelled) {
          const data = await response.json() as {
            data?: {
              comments: ContentCommentWithUser[];
              total: number;
              hasMore: boolean;
            };
          };
          const payload = data.data;
          if (payload) {
            setComments(payload.comments ?? []);
            setTotal(payload.total ?? 0);
            setHasMore(payload.hasMore ?? false);
            setPage(1);
          }
        }
      } catch {
        // Non-critical — comments section loads empty on error
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchComments();
    return () => { cancelled = true; };
  }, [contentType, contentId]);

  const addComment = useCallback(async (text: string, parentId?: number) => {
    if (!user || !contentId) return;

    const userId = parseInt(user.id, 10);
    if (isNaN(userId)) return;

    // Optimistic: create a temporary comment and append it
    const tempId = -Date.now();
    // Split name into first/last for display (name is "First Last" format from useAuth User)
    const nameParts = (user.name ?? '').trim().split(' ');
    const optimisticComment: ContentCommentWithUser = {
      id: tempId,
      content_type: contentType,
      content_id: contentId,
      user_id: userId,
      parent_id: parentId ?? null,
      comment_text: text,
      status: 'active',
      is_edited: false,
      created_at: new Date(),
      updated_at: new Date(),
      first_name: nameParts[0] ?? null,
      last_name: nameParts.length > 1 ? nameParts.slice(1).join(' ') : null,
      email: user.email ?? '',
      avatar_url: user.avatarUrl ?? null,
    };

    setComments(prev => [...prev, optimisticComment]);
    setTotal(prev => prev + 1);

    try {
      const response = await fetchWithCsrf(
        `/api/content/${contentType}/${contentId}/comments`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            ...(parentId !== undefined && { parentId }),
          }),
        }
      );

      const data = await response.json() as {
        data?: { comment: ContentCommentWithUser };
      };
      const realComment = data.data?.comment;

      if (realComment) {
        // Replace optimistic with real comment from server
        setComments(prev => prev.map(c => c.id === tempId ? realComment : c));
      } else {
        // Revert on unexpected response
        setComments(prev => prev.filter(c => c.id !== tempId));
        setTotal(prev => prev - 1);
      }
    } catch {
      // Revert optimistic on error
      setComments(prev => prev.filter(c => c.id !== tempId));
      setTotal(prev => prev - 1);
    }
  }, [user, contentType, contentId]);

  const deleteComment = useCallback(async (commentId: number) => {
    if (!user || !contentId || isNaN(parseInt(user.id, 10))) return;

    // Optimistic: remove immediately
    const previousComments = comments;
    setComments(prev => prev.filter(c => c.id !== commentId));
    setTotal(prev => Math.max(0, prev - 1));

    try {
      await fetchWithCsrf(
        `/api/content/${contentType}/${contentId}/comments/${commentId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
    } catch {
      // Revert on error
      setComments(previousComments);
      setTotal(prev => prev + 1);
    }
  }, [user, contentType, contentId, comments]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || !contentId) return;

    const nextPage = page + 1;
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/content/${contentType}/${contentId}/comments?page=${nextPage}&pageSize=${PAGE_SIZE}`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json() as {
          data?: {
            comments: ContentCommentWithUser[];
            total: number;
            hasMore: boolean;
          };
        };
        const payload = data.data;
        if (payload) {
          setComments(prev => [...prev, ...(payload.comments ?? [])]);
          setTotal(payload.total ?? total);
          setHasMore(payload.hasMore ?? false);
          setPage(nextPage);
        }
      }
    } catch {
      // Non-critical — retain current page
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, isLoading, contentType, contentId, page, total]);

  return {
    comments,
    total,
    isLoading,
    hasMore,
    isAuthenticated: !!user,
    addComment,
    deleteComment,
    loadMore,
  };
}
