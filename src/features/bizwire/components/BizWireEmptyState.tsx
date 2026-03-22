/**
 * BizWireEmptyState - Empty inbox state component
 *
 * @authority docs/components/contactListing/phases/PHASE_5_PLAN.md T5.3
 * @tier SIMPLE
 */

'use client';

import { Inbox } from 'lucide-react';

interface BizWireEmptyStateProps {
  /** 'listing' for listing manager view, 'user' for personal dashboard */
  variant: 'listing' | 'user';
}

export function BizWireEmptyState({ variant }: BizWireEmptyStateProps) {
  const message = variant === 'listing'
    ? 'Your BizWire inbox is empty. Messages from users who contact your listing will appear here.'
    : "You haven't sent any inquiries yet. Contact a listing to start a conversation.";

  return (
    <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Inbox className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">No messages yet</h3>
      <p className="text-sm text-gray-500 max-w-xs">{message}</p>
    </div>
  );
}
