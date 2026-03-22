/**
 * MobileRecommendationCard - Touch-optimized recommendation card
 *
 * Features:
 * - Swipe-to-dismiss (left) and swipe-to-connect (right)
 * - Compact and full variants
 * - Visual feedback during swipe
 * - 44px minimum touch targets
 * - Haptic feedback on actions
 *
 * @pattern ui/MobileRecommendationCard
 * @category connections
 * @reusable true
 * @mobile-compatible true
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @phase Phase 8E
 */

'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { UserPlus, X, Users, Briefcase, MapPin } from 'lucide-react';
import { MobileRecommendedConnection, MobileCardVariant } from '../types';
import { useSwipeGesture } from '../hooks/useSwipeGesture';
import { getAvatarInitials } from '@/core/utils/avatar';

interface MobileRecommendationCardProps {
  recommendation: MobileRecommendedConnection;
  variant?: MobileCardVariant;
  onConnect: (userId: number) => void;
  onDismiss: (userId: number) => void;
  onNotInterested?: (userId: number) => void;
  isConnecting?: boolean;
}

export function MobileRecommendationCard({
  recommendation,
  variant = 'full',
  onConnect,
  onDismiss,
  onNotInterested,
  isConnecting = false
}: MobileRecommendationCardProps) {
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  const handleSwipeLeft = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(recommendation.userId);
    }, 200);
  }, [recommendation.userId, onDismiss]);

  const handleSwipeRight = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onConnect(recommendation.userId);
    }, 200);
  }, [recommendation.userId, onConnect]);

  const handleSwipeProgress = useCallback((direction: 'left' | 'right' | 'up' | 'down', progress: number) => {
    if (direction === 'left' || direction === 'right') {
      setSwipeDirection(direction);
      setSwipeProgress(progress);
    }
  }, []);

  const { handlers: swipeHandlers } = useSwipeGesture({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    onSwipeProgress: handleSwipeProgress
  });

  // Calculate transform and background based on swipe
  const getSwipeStyles = () => {
    if (isExiting) {
      return {
        transform: `translateX(${swipeDirection === 'left' ? '-100%' : '100%'})`,
        opacity: 0,
        transition: 'transform 0.2s ease-out, opacity 0.2s ease-out'
      };
    }
    if (swipeProgress > 0) {
      const translateX = swipeDirection === 'left'
        ? -swipeProgress * 100
        : swipeProgress * 100;
      return {
        transform: `translateX(${translateX}px)`,
        transition: 'none'
      };
    }
    return {
      transform: 'translateX(0)',
      transition: 'transform 0.2s ease-out'
    };
  };

  const getBackgroundIndicator = () => {
    if (swipeProgress < 0.3) return null;

    if (swipeDirection === 'left') {
      return (
        <div className="absolute inset-0 bg-red-100 flex items-center justify-end pr-6 rounded-lg">
          <X className="w-8 h-8 text-red-500" />
        </div>
      );
    }
    if (swipeDirection === 'right') {
      return (
        <div className="absolute inset-0 bg-green-100 flex items-center justify-start pl-6 rounded-lg">
          <UserPlus className="w-8 h-8 text-green-500" />
        </div>
      );
    }
    return null;
  };

  if (variant === 'minimal') {
    return (
      <div
        className="relative overflow-hidden"
        {...swipeHandlers}
      >
        {getBackgroundIndicator()}
        <div
          className="relative bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3"
          style={getSwipeStyles()}
        >
          {/* Avatar */}
          <Link href={`/profile/${recommendation.username}` as Route}>
            {recommendation.avatarUrl ? (
              <img
                src={recommendation.avatarUrl}
                alt={recommendation.displayName || recommendation.username}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                style={{ backgroundColor: recommendation.avatarBgColor || '#6366f1' }}
              >
                {getAvatarInitials(recommendation.displayName || recommendation.username)}
              </div>
            )}
          </Link>

          {/* Name only */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">
              {recommendation.displayName || recommendation.username}
            </p>
          </div>

          {/* Quick connect */}
          <button
            onClick={() => onConnect(recommendation.userId)}
            disabled={isConnecting}
            className="p-2 bg-biz-orange text-white rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        className="relative overflow-hidden"
        {...swipeHandlers}
      >
        {getBackgroundIndicator()}
        <div
          className="relative bg-white border border-gray-200 rounded-lg p-4"
          style={getSwipeStyles()}
        >
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <Link href={`/profile/${recommendation.username}` as Route}>
              {recommendation.avatarUrl ? (
                <img
                  src={recommendation.avatarUrl}
                  alt={recommendation.displayName || recommendation.username}
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
                  style={{ backgroundColor: recommendation.avatarBgColor || '#6366f1' }}
                >
                  {getAvatarInitials(recommendation.displayName || recommendation.username)}
                </div>
              )}
            </Link>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">
                {recommendation.displayName || recommendation.username}
              </p>
              {recommendation.headline && (
                <p className="text-sm text-gray-600 truncate">
                  {recommendation.headline}
                </p>
              )}
              {recommendation.primaryReason && (
                <p className="text-xs text-gray-500 mt-1">
                  {recommendation.primaryReason}
                </p>
              )}
            </div>

            {/* Quick actions */}
            <button
              onClick={() => onConnect(recommendation.userId)}
              disabled={isConnecting}
              className="p-3 bg-biz-orange text-white rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95 transition-transform"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <div
      className="relative overflow-hidden"
      {...swipeHandlers}
    >
      {getBackgroundIndicator()}
      <div
        className="relative bg-white border border-gray-200 rounded-lg p-4"
        style={getSwipeStyles()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <Link href={`/profile/${recommendation.username}` as Route}>
            {recommendation.avatarUrl ? (
              <img
                src={recommendation.avatarUrl}
                alt={recommendation.displayName || recommendation.username}
                className="w-14 h-14 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-semibold flex-shrink-0"
                style={{ backgroundColor: recommendation.avatarBgColor || '#6366f1' }}
              >
                {getAvatarInitials(recommendation.displayName || recommendation.username)}
              </div>
            )}
          </Link>

          <div className="flex-1 min-w-0">
            <Link href={`/profile/${recommendation.username}` as Route}>
              <h3 className="font-semibold text-gray-900 truncate">
                {recommendation.displayName || recommendation.username}
              </h3>
            </Link>
            {recommendation.headline && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {recommendation.headline}
              </p>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-1.5 mb-3">
          {recommendation.mutualConnectionCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>{recommendation.mutualConnectionCount} mutual connections</span>
            </div>
          )}
          {recommendation.industry && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Briefcase className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{recommendation.industry}</span>
            </div>
          )}
          {recommendation.location && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{recommendation.location}</span>
            </div>
          )}
        </div>

        {/* Primary reason */}
        {recommendation.primaryReason && (
          <p className="text-xs text-gray-500 italic mb-3">
            {recommendation.primaryReason}
          </p>
        )}

        {/* Actions - Touch optimized */}
        <div className="flex gap-2">
          <button
            onClick={() => onConnect(recommendation.userId)}
            disabled={isConnecting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-biz-orange text-white rounded-lg font-medium min-h-[44px] active:scale-95 transition-transform disabled:opacity-50"
          >
            <UserPlus className="w-5 h-5" />
            <span>{isConnecting ? 'Connecting...' : 'Connect'}</span>
          </button>
          <button
            onClick={() => onNotInterested?.(recommendation.userId)}
            className="px-4 py-3 border border-gray-300 text-gray-600 rounded-lg min-h-[44px] active:scale-95 transition-transform"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default MobileRecommendationCard;
