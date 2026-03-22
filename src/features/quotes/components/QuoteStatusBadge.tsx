/**
 * QuoteStatusBadge Component
 *
 * SIMPLE tier component - Status indicator with color coding
 *
 * @tier SIMPLE
 * @phase Phase 3A - Quote System Foundation
 * @generated DNA v11.4.0
 */

'use client';

import React from 'react';
import type { QuoteStatus, QuoteRequestStatus, QuoteResponseStatus } from '../types';

type AnyStatus = QuoteStatus | QuoteRequestStatus | QuoteResponseStatus;

interface QuoteStatusBadgeProps {
  status: AnyStatus;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  // QuoteStatus
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
  open: { label: 'Open', className: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-600' },
  expired: { label: 'Expired', className: 'bg-gray-100 text-gray-500' },
  // QuoteRequestStatus
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' },
  viewed: { label: 'Viewed', className: 'bg-blue-100 text-blue-600' },
  responded: { label: 'Responded', className: 'bg-green-100 text-green-700' },
  declined: { label: 'Declined', className: 'bg-red-100 text-red-600' },
  // QuoteResponseStatus
  accepted: { label: 'Accepted', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-600' },
  withdrawn: { label: 'Withdrawn', className: 'bg-gray-100 text-gray-500' }
};

export function QuoteStatusBadge({ status, size = 'sm' }: QuoteStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' };
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${config.className}`}>
      {config.label}
    </span>
  );
}
