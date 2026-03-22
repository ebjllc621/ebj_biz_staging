/**
 * CampaignStatusBadge - Status Badge for Campaigns
 *
 * @tier SIMPLE
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * Color-coded status indicators for campaign lifecycle
 */
'use client';

import React from 'react';
import type { CampaignStatus } from '@core/services/CampaignService';

export interface CampaignStatusBadgeProps {
  /** Campaign status */
  status: CampaignStatus;
}

const statusConfig: Record<
  CampaignStatus,
  { label: string; className: string }
> = {
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-800 border-gray-300'
  },
  pending: {
    label: 'Pending Approval',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300'
  },
  approved: {
    label: 'Approved',
    className: 'bg-blue-100 text-blue-800 border-blue-300'
  },
  active: {
    label: 'Active',
    className: 'bg-green-100 text-green-800 border-green-300'
  },
  paused: {
    label: 'Paused',
    className: 'bg-orange-100 text-orange-800 border-orange-300'
  },
  completed: {
    label: 'Completed',
    className: 'bg-purple-100 text-purple-800 border-purple-300'
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-800 border-red-300'
  }
};

export function CampaignStatusBadge({ status }: CampaignStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`
        inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border
        ${config.className}
      `}
    >
      {config.label}
    </span>
  );
}

export default CampaignStatusBadge;
