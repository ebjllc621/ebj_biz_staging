/**
 * EventSaveButton - Save/bookmark button with API persistence
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 2 - RSVP & Engagement UI
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '@core/hooks/useAuth';
import { fetchWithCsrf } from '@core/utils/csrf';

interface EventSaveButtonProps {
  eventId: number;
  initialSaved?: boolean;
  onSaveChange?: (_saved: boolean) => void;
  variant?: 'hero' | 'compact';
  className?: string;
}

export function EventSaveButton({
  eventId,
  initialSaved = false,
  onSaveChange,
  variant = 'hero',
  className = ''
}: EventSaveButtonProps) {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (!user) {
      alert('Please sign in to save events');
      return;
    }

    if (isLoading) return;

    // Optimistic update
    const newSaved = !isSaved;
    setIsSaved(newSaved);
    onSaveChange?.(newSaved);

    try {
      setIsLoading(true);
      const method = newSaved ? 'POST' : 'DELETE';
      const res = await fetchWithCsrf(`/api/events/${eventId}/save`, {
        method,
        credentials: 'include'
      });

      if (!res.ok) {
        // Revert on error
        setIsSaved(!newSaved);
        onSaveChange?.(!newSaved);
      }
    } catch {
      // Revert on error
      setIsSaved(!newSaved);
      onSaveChange?.(!newSaved);
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === 'compact') {
    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        aria-label={isSaved ? 'Unsave event' : 'Save event'}
        className={`inline-flex items-center justify-center p-2 rounded-lg border-2 transition-colors ${
          isSaved
            ? 'border-biz-orange text-biz-orange bg-orange-50 hover:bg-orange-100'
            : 'border-gray-300 text-gray-500 hover:border-biz-orange hover:text-biz-orange'
        } ${isLoading ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
      >
        <Heart
          className="w-4 h-4"
          fill={isSaved ? 'currentColor' : 'none'}
        />
      </button>
    );
  }

  // Hero variant: full button with text
  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`inline-flex items-center justify-center whitespace-nowrap gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-colors ${
        isSaved
          ? 'border-biz-orange text-biz-orange bg-orange-50 hover:bg-orange-100'
          : 'border-gray-300 text-gray-700 hover:border-biz-orange hover:text-biz-orange'
      } ${isLoading ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
    >
      <Heart
        className="w-4 h-4 flex-shrink-0"
        fill={isSaved ? 'currentColor' : 'none'}
      />
      <span>{isSaved ? 'Saved' : 'Save Event'}</span>
    </button>
  );
}

export default EventSaveButton;
