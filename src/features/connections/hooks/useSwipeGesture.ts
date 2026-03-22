/**
 * useSwipeGesture - Touch swipe gesture detection hook
 *
 * Provides touch-based swipe detection with:
 * - Direction detection (left/right/up/down)
 * - Velocity calculation for quick swipes
 * - Configurable thresholds
 * - Haptic feedback integration
 *
 * @pattern hook/useSwipeGesture
 * @category gesture
 * @reusable true
 * @mobile-compatible true
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @phase Phase 8E
 */

'use client';

import { useRef, useCallback, TouchEvent } from 'react';
import { SwipeDirection, SwipeActionConfig, DEFAULT_SWIPE_CONFIG } from '../types';

interface SwipeState {
  startX: number;
  startY: number;
  startTime: number;
  currentX: number;
  currentY: number;
  isSwiping: boolean;
}

interface UseSwipeGestureResult {
  handlers: {
    onTouchStart: (e: TouchEvent) => void;
    onTouchMove: (e: TouchEvent) => void;
    onTouchEnd: (e: TouchEvent) => void;
  };
  swipeOffset: { x: number; y: number };
  isSwiping: boolean;
}

interface UseSwipeGestureOptions {
  config?: Partial<SwipeActionConfig>;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeProgress?: (direction: SwipeDirection, progress: number) => void;
  enableHaptic?: boolean;
}

export function useSwipeGesture({
  config = {},
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onSwipeProgress,
  enableHaptic = true
}: UseSwipeGestureOptions = {}): UseSwipeGestureResult {
  const fullConfig: SwipeActionConfig = { ...DEFAULT_SWIPE_CONFIG, ...config };

  const stateRef = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    currentX: 0,
    currentY: 0,
    isSwiping: false
  });

  const triggerHaptic = useCallback(() => {
    if (enableHaptic && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, [enableHaptic]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    stateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      currentX: touch.clientX,
      currentY: touch.clientY,
      isSwiping: false
    };
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    const state = stateRef.current;
    state.currentX = touch.clientX;
    state.currentY = touch.clientY;

    const deltaX = state.currentX - state.startX;
    const deltaY = state.currentY - state.startY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Determine if this is a horizontal or vertical swipe
    if (!state.isSwiping && (absDeltaX > 10 || absDeltaY > 10)) {
      state.isSwiping = true;
    }

    if (state.isSwiping && onSwipeProgress) {
      // Calculate progress (0-1) based on threshold
      if (absDeltaX > absDeltaY) {
        const direction: SwipeDirection = deltaX > 0 ? 'right' : 'left';
        const progress = Math.min(absDeltaX / fullConfig.threshold, 1);
        onSwipeProgress(direction, progress);
      } else {
        const direction: SwipeDirection = deltaY > 0 ? 'down' : 'up';
        const progress = Math.min(absDeltaY / fullConfig.threshold, 1);
        onSwipeProgress(direction, progress);
      }
    }
  }, [fullConfig.threshold, onSwipeProgress]);

  const handleTouchEnd = useCallback(() => {
    const state = stateRef.current;
    const deltaX = state.currentX - state.startX;
    const deltaY = state.currentY - state.startY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    const duration = Date.now() - state.startTime;

    // Calculate velocity (px/ms)
    const velocityX = absDeltaX / duration;
    const velocityY = absDeltaY / duration;

    // Determine if swipe meets threshold
    const meetsDistanceThreshold = absDeltaX >= fullConfig.threshold || absDeltaY >= fullConfig.threshold;
    const meetsVelocityThreshold = velocityX >= fullConfig.velocityThreshold || velocityY >= fullConfig.velocityThreshold;

    if (state.isSwiping && (meetsDistanceThreshold || meetsVelocityThreshold)) {
      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0) {
          triggerHaptic();
          onSwipeRight?.();
        } else {
          triggerHaptic();
          onSwipeLeft?.();
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          triggerHaptic();
          onSwipeDown?.();
        } else {
          triggerHaptic();
          onSwipeUp?.();
        }
      }
    }

    // Reset progress
    if (onSwipeProgress) {
      onSwipeProgress('left', 0);
    }

    // Reset state
    stateRef.current.isSwiping = false;
  }, [fullConfig.threshold, fullConfig.velocityThreshold, triggerHaptic, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onSwipeProgress]);

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    },
    swipeOffset: {
      x: stateRef.current.currentX - stateRef.current.startX,
      y: stateRef.current.currentY - stateRef.current.startY
    },
    isSwiping: stateRef.current.isSwiping
  };
}
