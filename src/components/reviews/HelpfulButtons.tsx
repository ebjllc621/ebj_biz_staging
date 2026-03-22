/**
 * HelpfulButtons - Helpful/Not Helpful voting buttons for reviews
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 1 - Review System Foundation
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Helpful / Not Helpful vote buttons
 * - Prevents voting on own review
 * - Requires authentication
 * - Optimistic count updates
 * - Configurable endpoint
 *
 * Extracted from src/features/listings/components/details/ReviewCard.tsx (lines 236-267)
 */

'use client';

import { useState, useCallback } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useAuth } from '@core/hooks/useAuth';
import { fetchWithCsrf } from '@core/utils/csrf';
import { ErrorService } from '@core/services/ErrorService';

export interface HelpfulButtonsProps {
  reviewId: number;
  reviewUserId: number;
  helpfulCount: number;
  notHelpfulCount: number;
  endpoint?: string;
  onVote?: () => void;
}

export function HelpfulButtons({
  reviewId,
  reviewUserId,
  helpfulCount,
  notHelpfulCount,
  endpoint,
  onVote,
}: HelpfulButtonsProps) {
  const { user } = useAuth();
  const [isVoting, setIsVoting] = useState(false);
  const [localHelpful, setLocalHelpful] = useState(helpfulCount);
  const [localNotHelpful, setLocalNotHelpful] = useState(notHelpfulCount);

  const resolvedEndpoint = endpoint ?? `/api/reviews/${reviewId}/helpful`;

  const handleVote = useCallback(async (isHelpful: boolean) => {
    if (!user || user.role === 'visitor') {
      alert('Please sign in to vote');
      return;
    }

    if (Number(user.id) === reviewUserId) {
      alert('You cannot vote on your own review');
      return;
    }

    setIsVoting(true);
    try {
      const response = await fetchWithCsrf(resolvedEndpoint, {
        method: 'POST',
        body: JSON.stringify({ isHelpful }),
      });

      if (response.ok) {
        if (isHelpful) {
          setLocalHelpful(prev => prev + 1);
        } else {
          setLocalNotHelpful(prev => prev + 1);
        }
        onVote?.();
      }
    } catch (error) {
      ErrorService.capture('Failed to cast helpful vote:', error);
    } finally {
      setIsVoting(false);
    }
  }, [user, reviewUserId, resolvedEndpoint, onVote]);

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={() => handleVote(true)}
        disabled={isVoting}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-green-600 transition-colors disabled:opacity-50"
        aria-label="Mark as helpful"
      >
        <ThumbsUp className="w-4 h-4" />
        <span>Helpful ({localHelpful})</span>
      </button>

      <button
        onClick={() => handleVote(false)}
        disabled={isVoting}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50"
        aria-label="Mark as not helpful"
      >
        <ThumbsDown className="w-4 h-4" />
        <span>({localNotHelpful})</span>
      </button>
    </div>
  );
}

export default HelpfulButtons;
