/**
 * SendConfirmationModal - Newsletter Send Confirmation
 *
 * Follows ConfirmDeleteModal pattern exactly, adapted for send action.
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Tier 2 Content Types - Phase N7B
 * @authority docs/pages/layouts/content/3-11-206/consolidatedplans/Tier2_Phases/PHASE_N7B_NEWSLETTER_PREVIEW_SEND.md
 */
'use client';

import React from 'react';
import BizModal from '@/components/BizModal/BizModal';
import { Mail, Loader2 } from 'lucide-react';
import type { Newsletter } from '@core/types/newsletter';

// ============================================================================
// Types
// ============================================================================

export interface SendConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  newsletter: Newsletter;
  subscriberCount: number;
  isSending: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function SendConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  newsletter,
  subscriberCount,
  isSending,
}: SendConfirmationModalProps) {
  const excerpt = newsletter.excerpt
    ? newsletter.excerpt.substring(0, 150) + (newsletter.excerpt.length > 150 ? '...' : '')
    : null;

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Send Newsletter"
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="bg-orange-100 rounded-full p-3">
            <Mail className="w-8 h-8 text-[#ed6437]" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center">
          <p className="text-gray-900 font-medium mb-2">
            Send Newsletter to Subscribers
          </p>
          <p className="text-gray-700 text-lg font-semibold mb-3">
            &ldquo;{newsletter.title}&rdquo;
          </p>
          <p className="text-gray-600 text-sm mb-3">
            This will send to <span className="font-semibold text-gray-900">{subscriberCount}</span> active subscriber{subscriberCount !== 1 ? 's' : ''}.
          </p>
          {excerpt && (
            <p className="text-gray-500 text-xs italic mb-3">
              {excerpt}
            </p>
          )}
          <p className="text-amber-600 text-sm font-medium">
            This action cannot be undone. The newsletter will be published and emailed to all active subscribers.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSending}
            className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors disabled:opacity-50 font-medium"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Newsletter'
            )}
          </button>
        </div>
      </div>
    </BizModal>
  );
}

export default SendConfirmationModal;
