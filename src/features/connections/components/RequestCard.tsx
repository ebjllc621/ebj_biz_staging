/**
 * RequestCard - Individual request display with accept/decline actions
 *
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @avatar-governance AVATAR_DISPLAY_GOVERNANCE.md
 * @authority docs/pages/layouts/home/user/phases/troubleshooting/connect/CONNECT_SYSTEM_REMEDIATION_BRAIN_PLAN.md
 * @reference src/features/profile/components/ProfileHeroBanner.tsx:135-150 - Avatar display pattern
 */
'use client';

import React from 'react';
import { ConnectionRequest, ConnectionIntentType } from '../types';
import { getAvatarInitials } from '@/core/utils/avatar';
import { IntentBadge } from './IntentBadge';
import { TrustBadge } from './TrustBadge';
import { QualityIndicator } from './QualityIndicator';

interface RequestCardProps {
  request: ConnectionRequest;
  onAccept: () => void;
  onDecline: () => void;
  isLoading: boolean;
  type: 'incoming' | 'sent';
  // Phase 3: Optional trust/quality data
  senderTrustTier?: 'gold' | 'silver' | 'bronze' | 'none';
  requestQualityLevel?: 'high' | 'medium' | 'low';
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
function getRelativeTime(date: Date): string {
  const now = new Date();
  const created = new Date(date);
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays < 30) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;

  return created.toLocaleDateString();
}

/**
 * Get connection type badge color
 */
function getConnectionTypeBadgeColor(type: string | null): string {
  if (!type) return '';

  switch (type.toLowerCase()) {
    case 'business':
      return 'bg-blue-100 text-blue-700';
    case 'professional':
      return 'bg-purple-100 text-purple-700';
    case 'personal':
      return 'bg-green-100 text-green-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

/**
 * RequestCard component
 * Displays connection request with sender info and action buttons
 */
export function RequestCard({
  request,
  onAccept,
  onDecline,
  isLoading,
  type,
  senderTrustTier,
  requestQualityLevel
}: RequestCardProps) {
  const displayName = request.sender_display_name || request.sender_username || 'Unknown User';
  const initials = getAvatarInitials(request.sender_display_name, request.sender_username);
  const relativeTime = getRelativeTime(request.created_at);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
      {/* Header Row - Avatar and User Info */}
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar - @governance AVATAR_DISPLAY_GOVERNANCE.md */}
        <div className="flex-shrink-0">
          {request.sender_avatar_url ? (
            <img
              src={request.sender_avatar_url}
              alt={displayName}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full text-white flex items-center justify-center text-sm font-semibold"
              style={{ backgroundColor: request.sender_avatar_bg_color || '#022641' }}
            >
              {initials}
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-biz-navy truncate">{displayName}</h3>
            {/* Phase 3: Trust Badge (incoming requests only) */}
            {type === 'incoming' && senderTrustTier && (
              <TrustBadge tier={senderTrustTier} size="sm" showLabel={false} />
            )}
          </div>
          <p className="text-sm text-gray-500">@{request.sender_username}</p>
          <p className="text-xs text-gray-600 mt-1">{relativeTime}</p>
        </div>

        {/* Badges Container */}
        <div className="flex flex-col gap-1 items-end">
          {/* Phase 3: Quality Indicator (incoming requests only) */}
          {type === 'incoming' && requestQualityLevel && (
            <QualityIndicator level={requestQualityLevel} size="sm" />
          )}

          {/* Connection Type Badge */}
          {request.connection_type && (
            <span
              className={`
                flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium capitalize
                ${getConnectionTypeBadgeColor(request.connection_type)}
              `}
            >
              {request.connection_type}
            </span>
          )}

          {/* Intent Badge */}
          {request.intent_type && (
            <IntentBadge
              intentType={request.intent_type as ConnectionIntentType}
              size="sm"
            />
          )}
        </div>
      </div>

      {/* Request Message */}
      {request.message && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700 italic">"{request.message}"</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {type === 'incoming' ? (
          <>
            {/* Accept Button */}
            <button
              onClick={onAccept}
              disabled={isLoading}
              className={`
                flex-1 px-4 py-2 rounded-lg font-medium text-sm
                bg-green-600 text-white
                hover:bg-green-700 active:bg-green-800
                disabled:bg-gray-300 disabled:cursor-not-allowed
                transition-colors
              `}
            >
              {isLoading ? 'Processing...' : 'Accept'}
            </button>

            {/* Decline Button */}
            <button
              onClick={onDecline}
              disabled={isLoading}
              className={`
                flex-1 px-4 py-2 rounded-lg font-medium text-sm
                bg-gray-200 text-gray-700
                hover:bg-gray-300 active:bg-gray-400
                disabled:bg-gray-100 disabled:cursor-not-allowed
                transition-colors
              `}
            >
              {isLoading ? 'Processing...' : 'Decline'}
            </button>
          </>
        ) : (
          <>
            {/* Cancel Button (for sent requests) */}
            <button
              onClick={onDecline}
              disabled={isLoading}
              className={`
                flex-1 px-4 py-2 rounded-lg font-medium text-sm
                bg-gray-200 text-gray-700
                hover:bg-gray-300 active:bg-gray-400
                disabled:bg-gray-100 disabled:cursor-not-allowed
                transition-colors
              `}
            >
              {isLoading ? 'Canceling...' : 'Cancel Request'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default RequestCard;
