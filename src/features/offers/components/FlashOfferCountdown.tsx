/**
 * FlashOfferCountdown Component
 * Live countdown timer for flash offers
 *
 * @tier STANDARD
 * @phase Phase 4 - Advanced Features
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import React, { useState, useEffect } from 'react';

interface FlashOfferCountdownProps {
  endDate: Date;
  className?: string;
}

/**
 * Countdown timer with live updates
 * @component
 */
export default function FlashOfferCountdown({ endDate, className = '' }: FlashOfferCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      const end = new Date(endDate);
      const diffMs = end.getTime() - now.getTime();

      if (diffMs <= 0) {
        return null;
      }

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      return { hours, minutes, seconds };
    };

    // Initial calculation
    setTimeRemaining(calculateTimeRemaining());

    // Update every second
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      // Stop interval when expired
      if (!remaining) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endDate]);

  if (!timeRemaining) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        Expired
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`} role="timer" aria-live="polite">
      <svg
        className="w-4 h-4 text-red-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span className="font-mono font-medium">
        {String(timeRemaining.hours).padStart(2, '0')}:
        {String(timeRemaining.minutes).padStart(2, '0')}:
        {String(timeRemaining.seconds).padStart(2, '0')}
      </span>
    </div>
  );
}
