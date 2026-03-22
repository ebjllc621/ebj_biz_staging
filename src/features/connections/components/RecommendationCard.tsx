'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { RecommendedConnection } from '../types';
import { UserPlus, X, Users, MapPin, Briefcase, MessageCircle } from 'lucide-react';
import { getAvatarInitials } from '@/core/utils/avatar';
import BizButton from '@/components/BizButton/BizButton';

interface RecommendationCardProps {
  recommendation: RecommendedConnection;
  onConnect: (userId: number) => void;
  onDismiss: (userId: number) => void;
  onNotInterested: (userId: number) => void;
  onSendMessage?: (userId: number) => void;
  isConnecting?: boolean;
}

/**
 * RecommendationCard
 *
 * Displays a single connection recommendation with:
 * - User information and avatar
 * - Mutual connections count and sample
 * - Industry and location
 * - Recommendation score and reason
 * - Connect, dismiss, and not interested actions
 *
 * @phase ConnectP2 Phase 2
 */
export function RecommendationCard({
  recommendation,
  onConnect,
  onDismiss,
  onNotInterested,
  onSendMessage,
  isConnecting = false
}: RecommendationCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleConnect = () => {
    onConnect(recommendation.userId);
  };

  const handleDismiss = () => {
    onDismiss(recommendation.userId);
  };

  const handleNotInterested = () => {
    onNotInterested(recommendation.userId);
  };

  const handleSendMessage = () => {
    if (onSendMessage) {
      onSendMessage(recommendation.userId);
    }
  };

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with avatar and info */}
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar - clickable to profile */}
        <Link
          href={`/profile/${recommendation.username}` as Route}
          className="flex-shrink-0"
        >
          {recommendation.avatarUrl ? (
            <img
              src={recommendation.avatarUrl}
              alt={recommendation.displayName || recommendation.username}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-transparent hover:ring-biz-orange transition-all"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold ring-2 ring-transparent hover:ring-biz-orange transition-all">
              {getAvatarInitials(recommendation.displayName || recommendation.username)}
            </div>
          )}
        </Link>

        {/* User info - clickable to profile */}
        <div className="flex-1 min-w-0">
          <Link
            href={`/profile/${recommendation.username}` as Route}
            className="group"
          >
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-biz-orange transition-colors">
              {recommendation.displayName || recommendation.username}
            </h3>
          </Link>
          {recommendation.headline && (
            <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">
              {recommendation.headline}
            </p>
          )}
        </div>

        {/* Dismiss button */}
        {isHovered && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            title="Dismiss recommendation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Metadata */}
      <div className="space-y-2 mb-3">
        {/* Mutual connections */}
        {recommendation.mutualConnectionCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4 text-blue-600" />
            <span>
              {recommendation.mutualConnectionCount} mutual connection{recommendation.mutualConnectionCount > 1 ? 's' : ''}
            </span>
            {recommendation.mutualConnections.length > 0 && recommendation.mutualConnections[0] && (
              <span className="text-gray-600">
                (including {recommendation.mutualConnections[0].displayName || recommendation.mutualConnections[0].username}
                {recommendation.mutualConnections.length > 1 && ` +${recommendation.mutualConnections.length - 1}`})
              </span>
            )}
          </div>
        )}

        {/* Industry */}
        {recommendation.industry && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Briefcase className="w-4 h-4 text-gray-600" />
            <span>{recommendation.industry}</span>
          </div>
        )}

        {/* Location */}
        {recommendation.location && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-gray-600" />
            <span>{recommendation.location}</span>
          </div>
        )}
      </div>

      {/* Reasons */}
      {recommendation.reasons && recommendation.reasons.length > 0 && (
        <p className="text-xs text-gray-500 mb-3 italic">
          {recommendation.reasons.join(' • ')}
        </p>
      )}

      {/* Recommendation score badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
          Match Score: {Math.round(recommendation.score)}%
        </div>
      </div>

      {/* Actions - Light versions by default, full colors on hover */}
      <div className="flex gap-2">
        <BizButton
          variant="primary"
          size="sm"
          onClick={handleConnect}
          disabled={isConnecting}
          loading={isConnecting}
          leftIcon={<UserPlus className="w-4 h-4" />}
          className="!bg-bizconekt-primaryLight !text-bizconekt-primary !border-bizconekt-primaryLight hover:!bg-bizconekt-primary hover:!text-white hover:!border-bizconekt-primary"
        >
          Connect
        </BizButton>
        {onSendMessage && (
          <BizButton
            variant="secondary"
            size="sm"
            onClick={handleSendMessage}
            leftIcon={<MessageCircle className="w-4 h-4" />}
            className="!bg-bizconekt-navyLight !text-bizconekt-navy !border-bizconekt-navyLight hover:!bg-bizconekt-navy hover:!text-white hover:!border-bizconekt-navy"
          >
            Message
          </BizButton>
        )}
        <BizButton
          variant="neutral"
          size="sm"
          onClick={handleNotInterested}
          className="!bg-bizconekt-grayishLight !text-bizconekt-grayish !border-bizconekt-grayishLight hover:!bg-bizconekt-grayish hover:!text-white hover:!border-bizconekt-grayish"
        >
          Not Interested
        </BizButton>
      </div>
    </div>
  );
}
