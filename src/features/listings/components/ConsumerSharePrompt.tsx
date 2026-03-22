/**
 * ConsumerSharePrompt - Fixed toast prompt to encourage listing sharing
 *
 * Slides up from the bottom after a user has interacted with a listing.
 * Dismissed state is persisted in localStorage for 7 days.
 * Auto-dismisses after 15 seconds.
 *
 * @tier SIMPLE
 * @phase Phase 4B - SEO & Discovery
 */
'use client';

import { useEffect, useRef } from 'react';
import { Share2, X } from 'lucide-react';

const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface ConsumerSharePromptProps {
  isVisible: boolean;
  listing: {
    id: number;
    slug: string;
    name: string;
    image?: string;
  };
  onDismiss: () => void;
  onShare: () => void;
}

/**
 * ConsumerSharePrompt component
 * Fixed toast at the bottom of the viewport that slides up when visible.
 * Handles localStorage-based dismiss tracking and auto-dismiss after 15 seconds.
 */
export function ConsumerSharePrompt({ isVisible, listing, onDismiss, onShare }: ConsumerSharePromptProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageKey = `bk_share_prompt_dismissed_${listing.id}`;

  // Auto-dismiss after 15 seconds
  useEffect(() => {
    if (!isVisible) return;

    timerRef.current = setTimeout(() => {
      onDismiss();
    }, 15000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isVisible, onDismiss]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(storageKey, String(Date.now() + DISMISS_TTL_MS));
    } catch {
      // localStorage may be unavailable (private mode, storage full) — ignore
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onDismiss();
  };

  const handleShare = () => {
    try {
      localStorage.setItem(storageKey, String(Date.now() + DISMISS_TTL_MS));
    } catch {
      // localStorage may be unavailable — ignore
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onShare();
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-slide-up"
      role="status"
      aria-live="polite"
    >
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-biz-orange/10 rounded-full flex items-center justify-center">
          <Share2 className="w-5 h-5 text-biz-orange" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-biz-navy line-clamp-1">
            Know someone who needs {listing.name}?
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Share this listing with your network
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleShare}
            className="text-sm font-medium text-white bg-biz-orange hover:bg-biz-orange/90 px-3 py-1.5 rounded-lg transition-colors"
          >
            Share
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss share prompt"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConsumerSharePrompt;
