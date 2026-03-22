/**
 * SwipeableCard - Card wrapper with swipe gesture actions
 *
 * Adds mobile swipe gestures to any card content:
 * - Swipe left: Reveals danger action (e.g., delete)
 * - Swipe right: Reveals primary action (e.g., favorite)
 *
 * Touch-friendly with momentum scrolling and snap-back behavior.
 *
 * @tier STANDARD
 * @phase Contacts Enhancement Phase 7
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @mobile Gesture-based interactions for touch devices
 */

'use client';

import { memo, useRef, useState, useCallback, useEffect } from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SwipeAction {
  /** Action label */
  label: string;
  /** Lucide icon component */
  icon: React.ReactNode;
  /** Action callback */
  onAction: () => void;
  /** Background color (Tailwind class) */
  bgColor: string;
  /** Text color (Tailwind class) */
  textColor?: string;
}

export interface SwipeableCardProps {
  /** Card content */
  children: React.ReactNode;
  /** Action revealed on swipe left */
  leftAction?: SwipeAction;
  /** Action revealed on swipe right */
  rightAction?: SwipeAction;
  /** Swipe threshold in pixels (default: 80) */
  threshold?: number;
  /** Disable swipe gestures */
  disabled?: boolean;
  /** Additional CSS classes for card */
  className?: string;
  /** Card click handler */
  onClick?: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SWIPE_THRESHOLD_DEFAULT = 80;
const ACTION_WIDTH = 80;

// ============================================================================
// COMPONENT
// ============================================================================

function SwipeableCardComponent({
  children,
  leftAction,
  rightAction,
  threshold = SWIPE_THRESHOLD_DEFAULT,
  disabled = false,
  className = '',
  onClick
}: SwipeableCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);

  // Reset position
  const resetPosition = useCallback(() => {
    setTranslateX(0);
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || !e.touches[0]) return;
    startX.current = e.touches[0].clientX;
    currentX.current = e.touches[0].clientX;
    setIsDragging(true);
  }, [disabled]);

  // Handle touch move
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || disabled || !e.touches[0]) return;

    const touch = e.touches[0];
    const diff = touch.clientX - startX.current;
    currentX.current = touch.clientX;

    // Limit swipe distance
    const maxSwipe = ACTION_WIDTH + 20;
    const clampedDiff = Math.max(-maxSwipe, Math.min(maxSwipe, diff));

    // Only allow swipe if action exists
    if (diff < 0 && !leftAction) return;
    if (diff > 0 && !rightAction) return;

    setTranslateX(clampedDiff);
  }, [isDragging, disabled, leftAction, rightAction]);

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    // Check if swipe exceeded threshold
    if (translateX < -threshold && leftAction) {
      // Snap to reveal left action
      setTranslateX(-ACTION_WIDTH);
    } else if (translateX > threshold && rightAction) {
      // Snap to reveal right action
      setTranslateX(ACTION_WIDTH);
    } else {
      // Snap back
      resetPosition();
    }
  }, [isDragging, translateX, threshold, leftAction, rightAction, resetPosition]);

  // Execute action when fully swiped
  const handleActionClick = useCallback((action: SwipeAction) => {
    action.onAction();
    resetPosition();
  }, [resetPosition]);

  // Handle card click
  const handleCardClick = useCallback(() => {
    if (translateX !== 0) {
      resetPosition();
      return;
    }
    onClick?.();
  }, [translateX, onClick, resetPosition]);

  // Reset on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        resetPosition();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [resetPosition]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
    >
      {/* Left Action (revealed on swipe left) */}
      {leftAction && (
        <div
          className={`absolute right-0 top-0 bottom-0 flex items-center justify-center ${leftAction.bgColor} ${leftAction.textColor || 'text-white'}`}
          style={{ width: ACTION_WIDTH }}
        >
          <button
            onClick={() => handleActionClick(leftAction)}
            className="flex flex-col items-center justify-center gap-1 min-h-[44px] min-w-[44px] p-2"
            aria-label={leftAction.label}
          >
            {leftAction.icon}
            <span className="text-xs">{leftAction.label}</span>
          </button>
        </div>
      )}

      {/* Right Action (revealed on swipe right) */}
      {rightAction && (
        <div
          className={`absolute left-0 top-0 bottom-0 flex items-center justify-center ${rightAction.bgColor} ${rightAction.textColor || 'text-white'}`}
          style={{ width: ACTION_WIDTH }}
        >
          <button
            onClick={() => handleActionClick(rightAction)}
            className="flex flex-col items-center justify-center gap-1 min-h-[44px] min-w-[44px] p-2"
            aria-label={rightAction.label}
          >
            {rightAction.icon}
            <span className="text-xs">{rightAction.label}</span>
          </button>
        </div>
      )}

      {/* Card Content */}
      <div
        className={`relative bg-white transition-transform ${isDragging ? '' : 'duration-200'}`}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleCardClick}
      >
        {children}
      </div>
    </div>
  );
}

export const SwipeableCard = memo(SwipeableCardComponent);
export default SwipeableCard;
