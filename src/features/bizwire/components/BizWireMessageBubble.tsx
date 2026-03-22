/**
 * BizWireMessageBubble - Email-chain style message display
 *
 * @authority docs/components/contactListing/phases/PHASE_5_PLAN.md T5.6
 * @tier SIMPLE
 */

'use client';

import type { BizWireMessage } from '../types';

interface BizWireMessageBubbleProps {
  message: BizWireMessage;
  isOwnMessage: boolean;
  isFirst: boolean;
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatMessageType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatSourcePage(source: string | null): string | null {
  if (!source) return null;
  return source.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function BizWireMessageBubble({ message, isOwnMessage, isFirst }: BizWireMessageBubbleProps) {
  const senderName = [message.sender_first_name, message.sender_last_name]
    .filter(Boolean)
    .join(' ') || message.sender_email || 'Unknown';

  if (isFirst) {
    return (
      <div className={`border rounded-lg p-4 ${isOwnMessage ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
        {/* Full header for first message */}
        <div className="text-sm text-gray-600 space-y-1 mb-3 pb-3 border-b border-gray-200">
          <div>
            <span className="font-medium text-gray-700">From:</span>{' '}
            {senderName}
            {message.sender_email && ` (${message.sender_email})`}
          </div>
          <div>
            <span className="font-medium text-gray-700">Date:</span>{' '}
            {formatFullDate(message.created_at)}
          </div>
          <div>
            <span className="font-medium text-gray-700">Type:</span>{' '}
            {formatMessageType(message.message_type)}
          </div>
          {message.source_page && (
            <div>
              <span className="font-medium text-gray-700">Source:</span>{' '}
              {formatSourcePage(message.source_page)}
            </div>
          )}
        </div>
        <p className="text-sm text-gray-800 whitespace-pre-wrap">{message.content}</p>
      </div>
    );
  }

  // Reply message: condensed header
  return (
    <div className={`rounded-lg p-4 ${isOwnMessage ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50 border border-gray-200'}`}>
      <div className="text-xs text-gray-500 mb-2">
        Reply from <span className="font-medium text-gray-700">{senderName}</span>
        {' · '}
        {formatShortDate(message.created_at)}
      </div>
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{message.content}</p>
    </div>
  );
}
