/**
 * ChatFAB - Floating Chat Action Button (Mobile/Tablet)
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 8 - Mobile Optimization
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Features:
 * - Fixed bottom-right positioning
 * - Circular button with chat icon
 * - Opens chat modal (Phase 9 integration)
 * - Authentication-gated
 * - Visible on mobile/tablet (< 1024px)
 * - Hidden on desktop (>= 1024px)
 * - Above MobileActionBar (z-index)
 *
 * @see docs/pages/layouts/listings/details/phases/PHASE_8_BRAIN_PLAN.md
 */
'use client';

import { useState, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@core/hooks/useAuth';
import type { Listing } from '@core/services/ListingService';

interface ChatFABProps {
  /** Listing data */
  listing: Listing;
}

export function ChatFAB({ listing }: ChatFABProps) {
  const { user } = useAuth();
  const [unreadCount] = useState(0); // TODO: Connect to real chat system

  /**
   * Handle chat button click
   */
  const handleChatClick = useCallback(() => {
    if (!user || user.role === 'visitor') {
      alert('Please sign in to start a conversation');
      return;
    }

    // Haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    // TODO Phase 9: Open BizModal with chat interface
    // For now, show placeholder alert
    alert(`Chat feature coming soon! Contact ${listing.name} directly via the Contact button.`);
  }, [user, listing.name]);

  return (
    <button
      onClick={handleChatClick}
      className="
        lg:hidden
        fixed
        bottom-20
        right-4
        z-50
        w-14
        h-14
        bg-biz-orange
        text-white
        rounded-full
        shadow-lg
        hover:shadow-xl
        active:scale-95
        transition-all
        flex
        items-center
        justify-center
      "
      aria-label="Start chat with business"
    >
      <MessageCircle className="w-6 h-6" />

      {/* Unread Badge */}
      {unreadCount > 0 && (
        <span
          className="
            absolute
            -top-1
            -right-1
            bg-red-500
            text-white
            text-xs
            font-bold
            rounded-full
            w-5
            h-5
            flex
            items-center
            justify-center
          "
          aria-label={`${unreadCount} unread messages`}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}

export default ChatFAB;
