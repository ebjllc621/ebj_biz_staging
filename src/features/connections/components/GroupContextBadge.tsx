/**
 * GroupContextBadge Component
 * Displays context badge for shared group connections in PYMK
 *
 * GOVERNANCE COMPLIANCE:
 * - SIMPLE tier component (<100 lines)
 * - No ErrorBoundary required for SIMPLE tier
 * - Props interface with clear types
 *
 * @tier SIMPLE
 * @phase Connection Groups Feature - Phase 1
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/3-5-26/phases/PHASE_1_BRAIN_PLAN.md
 */

'use client';

import React from 'react';
import { UsersRound } from 'lucide-react';

export interface GroupContextBadgeProps {
  groupName: string;
  curatorUsername: string;
  curatorDisplayName?: string | null;
  totalSharedGroups?: number;
  className?: string;
}

export function GroupContextBadge({
  groupName,
  curatorUsername,
  curatorDisplayName,
  totalSharedGroups,
  className = ''
}: GroupContextBadgeProps) {
  const curatorName = curatorDisplayName || curatorUsername;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium ${className}`}
    >
      <UsersRound className="w-3.5 h-3.5" />
      <span>
        In <span className="font-semibold">{groupName}</span> by {curatorName}
      </span>
      {totalSharedGroups && totalSharedGroups > 1 && (
        <span className="ml-1 px-1.5 py-0.5 bg-blue-100 rounded-full text-xs">
          +{totalSharedGroups - 1}
        </span>
      )}
    </div>
  );
}
