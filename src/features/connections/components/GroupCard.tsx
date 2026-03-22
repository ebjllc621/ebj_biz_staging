/**
 * GroupCard Component
 * Displays a single connection group with basic info
 *
 * GOVERNANCE COMPLIANCE:
 * - SIMPLE tier component (<100 lines)
 * - No ErrorBoundary required for SIMPLE tier
 * - Props interface with clear types
 *
 * @tier SIMPLE
 * @phase Connection Groups Feature - Phase 1, Phase 4C Performance Optimization
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/3-5-26/phases/PHASE_1_BRAIN_PLAN.md
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Users, Archive, ChevronRight, MessageCircle } from 'lucide-react';
import type { ConnectionGroup } from '../types/groups';

export interface GroupCardProps {
  group: ConnectionGroup;
  onClick?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  onMessage?: () => void;
  isOwner?: boolean;
  className?: string;
}

function GroupCardComponent({
  group,
  onClick,
  onEdit,
  onArchive,
  onMessage,
  isOwner = true,
  className = ''
}: GroupCardProps) {
  const Icon = Users;

  return (
    <div
      className={`relative bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer ${className}`}
      onClick={onClick}
    >
      {/* Group Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-lg flex items-center justify-center"
            style={{ backgroundColor: group.color + '20' }}
          >
            <Icon className="w-6 h-6" style={{ color: group.color }} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{group.name}</h3>
            <p className="text-sm text-gray-500">
              {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
            </p>
          </div>
        </div>

        {group.isArchived && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            <Archive className="w-3 h-3 mr-1" />
            Archived
          </span>
        )}
      </div>

      {/* Description */}
      {group.description && (
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {group.description}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <Link
          href={`/dashboard/connections/groups/${group.id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 px-3 py-2 sm:py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors min-h-[44px] sm:min-h-0 flex items-center justify-center gap-1"
        >
          View Group
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
        {isOwner && onArchive && !group.isArchived && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onArchive();
            }}
            className="flex-1 px-3 py-2 sm:py-1.5 text-sm font-medium text-gray-700 bg-gray-50 rounded hover:bg-gray-100 transition-colors min-h-[44px] sm:min-h-0"
          >
            Archive
          </button>
        )}
        {onMessage && !group.isArchived && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMessage();
            }}
            className="flex-1 px-3 py-2 sm:py-1.5 text-sm font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 transition-colors min-h-[44px] sm:min-h-0 flex items-center justify-center gap-1"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Message
          </button>
        )}
      </div>
    </div>
  );
}

export const GroupCard = React.memo(GroupCardComponent);
GroupCard.displayName = 'GroupCard';
