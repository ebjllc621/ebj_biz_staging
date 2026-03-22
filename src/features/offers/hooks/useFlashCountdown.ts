/**
 * useFlashCountdown - Hook for flash offer countdown timer
 *
 * @hook Client Hook
 * @tier SIMPLE
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

interface CountdownState {
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  totalSeconds: number;
}

interface UseFlashCountdownOptions {
  expiresAt: string | Date;
  onExpire?: () => void;
}

interface UseFlashCountdownReturn extends CountdownState {
  formattedTime: string;
  percentageRemaining: number;
}

export function useFlashCountdown({
  expiresAt,
  onExpire,
}: UseFlashCountdownOptions): UseFlashCountdownReturn {
  const [state, setState] = useState<CountdownState>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
    totalSeconds: 0,
  });

  const calculateTimeRemaining = useCallback(() => {
    const now = new Date().getTime();
    const expires = new Date(expiresAt).getTime();
    const diff = expires - now;

    if (diff <= 0) {
      return {
        hours: 0,
        minutes: 0,
        seconds: 0,
        isExpired: true,
        totalSeconds: 0,
      };
    }

    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
      hours,
      minutes,
      seconds,
      isExpired: false,
      totalSeconds,
    };
  }, [expiresAt]);

  useEffect(() => {
    // Initial calculation
    const initialState = calculateTimeRemaining();
    setState(initialState);

    if (initialState.isExpired) {
      onExpire?.();
      return;
    }

    // Update every second
    const interval = setInterval(() => {
      const newState = calculateTimeRemaining();
      setState(newState);

      if (newState.isExpired) {
        onExpire?.();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, calculateTimeRemaining, onExpire]);

  // Calculate initial duration for percentage
  const initialDuration = useCallback(() => {
    // Assume max flash duration is 24 hours
    const maxDuration = 24 * 60 * 60; // 24 hours in seconds
    return Math.min(state.totalSeconds, maxDuration);
  }, [state.totalSeconds]);

  const formattedTime = `${String(state.hours).padStart(2, '0')}:${String(
    state.minutes
  ).padStart(2, '0')}:${String(state.seconds).padStart(2, '0')}`;

  // Calculate percentage remaining (rough estimate)
  const percentageRemaining = state.isExpired
    ? 0
    : Math.min(100, Math.max(0, (state.totalSeconds / (24 * 60 * 60)) * 100));

  return {
    ...state,
    formattedTime,
    percentageRemaining,
  };
}
