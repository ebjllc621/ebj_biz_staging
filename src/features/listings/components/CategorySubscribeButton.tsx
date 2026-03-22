/**
 * CategorySubscribeButton - Subscribe to category notifications
 *
 * Allows authenticated users to subscribe to listing category notifications.
 * Replicates OfferFollowButton pattern with hook-based state management.
 *
 * @tier STANDARD
 * @phase Listings Phase 3A - Category Subscriptions & Follower Broadcast
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/listings/features/phases/PHASE_3A_BRAIN_PLAN.md
 * @reference src/features/offers/components/OfferFollowButton.tsx
 */

'use client';

import { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useCategorySubscription } from '@features/listings/hooks/useCategorySubscription';
import { useAuth } from '@core/context/AuthContext';

// ============================================================================
// Types
// ============================================================================

interface CategorySubscribeButtonProps {
  categoryId: number;
  categoryName: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button';
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function CategorySubscribeButton({
  categoryId,
  categoryName,
  size = 'md',
  variant = 'button',
  className = ''
}: CategorySubscribeButtonProps) {
  const { user } = useAuth();
  const { isSubscribed, frequency, isLoading, toggleSubscription, updateFrequency } =
    useCategorySubscription(categoryId);

  const [isHovered, setIsHovered] = useState(false);
  const [showFrequencyMenu, setShowFrequencyMenu] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-5 py-2.5 text-lg'
  }[size];

  const handleClick = async () => {
    if (!user) {
      setShowLoginPrompt(true);
      setTimeout(() => setShowLoginPrompt(false), 3000);
      return;
    }
    await toggleSubscription();
  };

  const handleFrequencyChange = async (newFreq: 'realtime' | 'daily' | 'weekly') => {
    setShowFrequencyMenu(false);
    await updateFrequency(newFreq);
  };

  // Icon-only variant
  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        title={isSubscribed ? `Unsubscribe from ${categoryName}` : `Subscribe to ${categoryName}`}
        className={`p-2 rounded-full transition-colors disabled:opacity-50 ${
          isSubscribed
            ? 'text-[#ed6437] hover:text-red-600'
            : 'text-gray-400 hover:text-[#ed6437]'
        } ${className}`}
      >
        {isSubscribed ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
      </button>
    );
  }

  // Login prompt
  if (showLoginPrompt) {
    return (
      <div className={`${sizeClasses} flex items-center gap-2 bg-gray-100 text-gray-600 rounded-md text-sm ${className}`}>
        <Bell className="w-4 h-4" />
        <span>Sign in to subscribe</span>
      </div>
    );
  }

  if (!isSubscribed) {
    // Not subscribed — show subscribe button
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={handleClick}
          disabled={isLoading}
          className={`${sizeClasses} flex items-center gap-2 bg-[#ed6437] text-white rounded-md hover:bg-[#d55830] disabled:opacity-50 font-medium transition-colors`}
        >
          <Bell className="w-4 h-4" />
          <span>{isLoading ? 'Subscribing...' : `Subscribe to ${categoryName}`}</span>
        </button>
      </div>
    );
  }

  // Subscribed — show subscribed state with frequency dropdown
  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-0">
        <button
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleClick}
          disabled={isLoading}
          className={`${sizeClasses} flex items-center gap-2 rounded-l-md border font-medium transition-colors disabled:opacity-50 ${
            isHovered
              ? 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {isHovered ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          <span>{isLoading ? '...' : isHovered ? 'Unsubscribe' : 'Subscribed'}</span>
        </button>

        <button
          onClick={() => setShowFrequencyMenu(!showFrequencyMenu)}
          disabled={isLoading}
          className={`${sizeClasses} rounded-r-md border border-l-0 font-medium transition-colors disabled:opacity-50 ${
            isHovered
              ? 'bg-red-50 border-red-300 text-red-600'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          ▼
        </button>
      </div>

      {showFrequencyMenu && (
        <div className="absolute top-full mt-1 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[200px]">
          <div className="p-2">
            <div className="text-xs font-semibold text-gray-500 px-2 py-1">Notification Frequency</div>
            <button
              onClick={() => handleFrequencyChange('realtime')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                frequency === 'realtime'
                  ? 'bg-[#ed6437] text-white'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div className="font-medium">Realtime</div>
              <div className="text-xs opacity-80">Notify immediately</div>
            </button>
            <button
              onClick={() => handleFrequencyChange('daily')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                frequency === 'daily'
                  ? 'bg-[#ed6437] text-white'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div className="font-medium">Daily</div>
              <div className="text-xs opacity-80">Once per day digest</div>
            </button>
            <button
              onClick={() => handleFrequencyChange('weekly')}
              className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                frequency === 'weekly'
                  ? 'bg-[#ed6437] text-white'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div className="font-medium">Weekly</div>
              <div className="text-xs opacity-80">Once per week digest</div>
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close frequency menu */}
      {showFrequencyMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowFrequencyMenu(false)}
        />
      )}
    </div>
  );
}

export default CategorySubscribeButton;
