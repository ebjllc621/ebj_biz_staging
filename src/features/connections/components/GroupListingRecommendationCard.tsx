/**
 * GroupListingRecommendationCard Component
 * Displays a listing recommendation shared in a group
 *
 * GOVERNANCE COMPLIANCE:
 * - SIMPLE tier component (<100 lines)
 * - Uses avatar utilities from @core/utils/avatar
 * - Client Component ('use client')
 *
 * @tier SIMPLE
 * @phase Connection Groups Feature - Phase 2, Phase 4C Performance Optimization
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/3-5-26/phases/PHASE_2_BRAIN_PLAN.md
 */

'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, MousePointer, ExternalLink } from 'lucide-react';
import { getAvatarInitials, getAvatarBgColor } from '@core/utils/avatar';
import type { GroupListingRecommendation } from '../types/group-actions';

export interface GroupListingRecommendationCardProps {
  recommendation: GroupListingRecommendation;
  className?: string;
}

function formatTime(date: Date): string {
  const now = new Date();
  const recDate = new Date(date);
  const diffMs = now.getTime() - recDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return recDate.toLocaleDateString();
}

function GroupListingRecommendationCardComponent({
  recommendation,
  className = ''
}: GroupListingRecommendationCardProps) {
  const initials = getAvatarInitials(recommendation.senderDisplayName, recommendation.senderUsername);
  const bgColor = getAvatarBgColor(recommendation.senderAvatarUrl);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow ${className}`}>
      {/* Sender Info */}
      <div className="flex items-center gap-2 mb-3">
        {recommendation.senderAvatarUrl ? (
          <Image
            src={recommendation.senderAvatarUrl}
            alt={recommendation.senderDisplayName || recommendation.senderUsername}
            width={24}
            height={24}
            className="w-6 h-6 rounded-full object-cover"
          />
        ) : (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
            style={{ backgroundColor: bgColor }}
          >
            {initials}
          </div>
        )}
        <span className="text-sm text-gray-600">
          <span className="font-medium text-gray-900">
            {recommendation.senderDisplayName || recommendation.senderUsername}
          </span>
          {' '}recommended
        </span>
        <span className="text-xs text-gray-400 ml-auto">
          {formatTime(recommendation.createdAt)}
        </span>
      </div>

      {/* Listing Preview */}
      <Link
        href={`/listings/${recommendation.listingSlug}`}
        className="flex gap-3 group"
      >
        {recommendation.listingImageUrl ? (
          <Image
            src={recommendation.listingImageUrl}
            alt={recommendation.listingTitle}
            width={80}
            height={80}
            className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <ExternalLink className="w-6 h-6 text-gray-400" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
            {recommendation.listingTitle}
          </h4>
          {recommendation.listingCategory && (
            <p className="text-xs text-gray-500 mt-0.5">{recommendation.listingCategory}</p>
          )}
          {recommendation.message && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{recommendation.message}</p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Eye className="w-3 h-3" />
              {recommendation.viewCount} views
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <MousePointer className="w-3 h-3" />
              {recommendation.clickCount} clicks
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}

export const GroupListingRecommendationCard = React.memo(GroupListingRecommendationCardComponent);
GroupListingRecommendationCard.displayName = 'GroupListingRecommendationCard';
