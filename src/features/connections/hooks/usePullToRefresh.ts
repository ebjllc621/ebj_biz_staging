/**
 * usePullToRefresh - Pull-to-refresh gesture hook
 *
 * Provides native-like pull-to-refresh functionality with:
 * - Pull distance tracking
 * - Refresh threshold detection
 * - Haptic feedback at threshold
 * - Loading state management
 *
 * @pattern hook/usePullToRefresh
 * @category gesture
 * @reusable true
 * @mobile-compatible true
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @phase Phase 8E
 */

'use client';

import { useState, useRef, useCallback, TouchEvent } from 'react';
import { PullToRefreshState } from '../types';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
  enableHaptic?: boolean;
}

interface UsePullToRefreshResult {
  state: PullToRefreshState;
  handlers: {
    onTouchStart: (e: TouchEvent) => void;
    onTouchMove: (e: TouchEvent) => void;
    onTouchEnd: (e: TouchEvent) => void;
  };
  containerStyle: React.CSSProperties;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
  enableHaptic = true
}: UsePullToRefreshOptions): UsePullToRefreshResult {
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    pullDistance: 0,
    isRefreshing: false,
    canRefresh: false
  });

  const startY = useRef(0);
  const hapticTriggered = useRef(false);

  const triggerHaptic = useCallback(() => {
    if (enableHaptic && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, [enableHaptic]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only allow pull-to-refresh when at top of scroll
    const target = e.target as HTMLElement;
    const scrollContainer = target.closest('[data-pull-to-refresh]');
    if (scrollContainer && scrollContainer.scrollTop > 0) return;

    const touch = e.touches[0];
    if (!touch) return;

    startY.current = touch.clientY;
    hapticTriggered.current = false;
    setState(prev => ({ ...prev, isPulling: true }));
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!state.isPulling || state.isRefreshing) return;

    const touch = e.touches[0];
    if (!touch) return;

    const deltaY = touch.clientY - startY.current;

    // Only pull down
    if (deltaY <= 0) {
      setState(prev => ({ ...prev, pullDistance: 0, canRefresh: false }));
      return;
    }

    // Apply resistance
    const resistance = 0.5;
    const pullDistance = Math.min(deltaY * resistance, maxPull);
    const canRefresh = pullDistance >= threshold;

    // Trigger haptic at threshold
    if (canRefresh && !hapticTriggered.current) {
      triggerHaptic();
      hapticTriggered.current = true;
    }

    setState(prev => ({ ...prev, pullDistance, canRefresh }));
  }, [state.isPulling, state.isRefreshing, threshold, maxPull, triggerHaptic]);

  const handleTouchEnd = useCallback(async () => {
    if (!state.isPulling) return;

    if (state.canRefresh && !state.isRefreshing) {
      setState(prev => ({ ...prev, isRefreshing: true }));

      try {
        await onRefresh();
      } finally {
        setState({
          isPulling: false,
          pullDistance: 0,
          isRefreshing: false,
          canRefresh: false
        });
      }
    } else {
      setState({
        isPulling: false,
        pullDistance: 0,
        isRefreshing: false,
        canRefresh: false
      });
    }
  }, [state.isPulling, state.canRefresh, state.isRefreshing, onRefresh]);

  const containerStyle: React.CSSProperties = {
    transform: `translateY(${state.pullDistance}px)`,
    transition: state.isPulling ? 'none' : 'transform 0.2s ease-out'
  };

  return {
    state,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    },
    containerStyle
  };
}
