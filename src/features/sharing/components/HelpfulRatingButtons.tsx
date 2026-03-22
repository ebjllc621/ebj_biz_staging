/**
 * HelpfulRatingButtons - Thumbs up/down rating buttons
 *
 * Interactive helpful/not helpful rating with loading states.
 * Once rated, buttons are disabled to prevent duplicate ratings.
 *
 * @tier SIMPLE
 * @phase Phase 4 - Feedback Loop
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 *
 * @example
 * ```tsx
 * import { HelpfulRatingButtons } from '@features/sharing/components';
 *
 * function RecommendationCard({ recommendation }) {
 *   const handleRate = async (isHelpful: boolean) => {
 *     await fetch('/api/sharing/recommendations/${recommendation.id}/helpful', {
 *       method: 'POST',
 *       body: JSON.stringify({ is_helpful: isHelpful })
 *     });
 *   };
 *
 *   return (
 *     <HelpfulRatingButtons
 *       currentRating={recommendation.is_helpful}
 *       onRate={handleRate}
 *     />
 *   );
 * }
 * ```
 */

'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';

interface HelpfulRatingButtonsProps {
  currentRating: boolean | null; // null = not rated
  onRate: (_isHelpful: boolean) => Promise<void>;
  disabled?: boolean;
}

export function HelpfulRatingButtons({
  currentRating,
  onRate,
  disabled = false
}: HelpfulRatingButtonsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleRate = async (isHelpful: boolean) => {
    if (disabled || currentRating !== null || isLoading) return;

    setIsLoading(true);
    try {
      await onRate(isHelpful);
    } finally {
      setIsLoading(false);
    }
  };

  // Already rated - show result
  if (currentRating !== null) {
    return (
      <div className="flex items-center gap-2 text-sm">
        {currentRating ? (
          <span className="flex items-center gap-1 text-green-600">
            <ThumbsUp className="w-4 h-4 fill-current" />
            Marked as helpful
          </span>
        ) : (
          <span className="flex items-center gap-1 text-gray-500">
            <ThumbsDown className="w-4 h-4" />
            Rated
          </span>
        )}
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Rating...</span>
      </div>
    );
  }

  // Rating buttons
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-500">Was this helpful?</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleRate(true)}
          disabled={disabled}
          className="p-1.5 rounded-full text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
          title="Yes, helpful"
        >
          <ThumbsUp className="w-5 h-5" />
        </button>
        <button
          onClick={() => handleRate(false)}
          disabled={disabled}
          className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
          title="Not helpful"
        >
          <ThumbsDown className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default HelpfulRatingButtons;
