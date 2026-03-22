/**
 * ContactListingModal - Modal for sending BizWire contact messages to listings
 *
 * @authority docs/components/contactListing/phases/PHASE_2_PLAN.md
 * @tier STANDARD
 * @reference src/features/messaging/components/SendMessageModal.tsx
 *
 * GOVERNANCE:
 * - Uses branded BizModal from @/components/BizModal (gradient header + logo)
 * - CSRF protection via fetchWithCsrf (in useBizWireSend hook)
 * - Client Component ('use client')
 * - Tailwind CSS styling
 */

'use client';

import { useState, useEffect } from 'react';
import BizModal from '@/components/BizModal';
import { useAuth } from '@core/hooks/useAuth';
import { useBizWireSend } from '../hooks/useBizWireSend';
import type { BizWireListing, BizWireSourcePage, BizWireMessageType } from '../types';
import { CheckCircle } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

// ============================================================================
// PROPS
// ============================================================================

interface ContactListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: BizWireListing;
  sourcePage: BizWireSourcePage;
  sourceEntityType?: string;
  sourceEntityId?: number;
  onSuccess?: () => void;
}

// ============================================================================
// MESSAGE TYPE OPTIONS
// ============================================================================

const MESSAGE_TYPE_OPTIONS: Array<{ value: BizWireMessageType; label: string }> = [
  { value: 'inquiry', label: 'General Inquiry' },
  { value: 'quote_request', label: 'Quote Request' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'other', label: 'Other' },
];

// ============================================================================
// COMPONENT
// ============================================================================

function ContactListingModalContent({
  isOpen,
  onClose,
  listing,
  sourcePage,
  sourceEntityType,
  sourceEntityId,
  onSuccess,
}: ContactListingModalProps) {
  const { user } = useAuth();
  const { sendMessage, isLoading, error, reset } = useBizWireSend();

  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [messageType, setMessageType] = useState<BizWireMessageType>('inquiry');
  const [showSuccess, setShowSuccess] = useState(false);

  const MAX_SUBJECT_LENGTH = 200;
  const MAX_CONTENT_LENGTH = 2000;
  const MIN_SUBJECT_LENGTH = 5;
  const MIN_CONTENT_LENGTH = 10;

  const isValid =
    subject.trim().length >= MIN_SUBJECT_LENGTH &&
    subject.trim().length <= MAX_SUBJECT_LENGTH &&
    content.trim().length >= MIN_CONTENT_LENGTH &&
    content.trim().length <= MAX_CONTENT_LENGTH;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSubject('');
      setContent('');
      setMessageType('inquiry');
      setShowSuccess(false);
      reset();
    }
  }, [isOpen, reset]);

  const handleSubmit = async () => {
    if (!user || !isValid || isLoading) return;

    const success = await sendMessage(listing.id, {
      subject,
      content,
      message_type: messageType,
      source_page: sourcePage,
      source_entity_type: sourceEntityType,
      source_entity_id: sourceEntityId,
    });

    if (success) {
      setShowSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const isSubmitDisabled = isLoading || !isValid || showSuccess;

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Contact ${listing.name}`}
      subtitle="Send a message via BizWire"
      maxWidth="lg"
      footer={
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-md font-medium transition-colors bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            className="px-4 py-2 rounded-md font-medium transition-colors bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Login Prompt */}
        {!user && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Please sign in to send a message to this listing.
            </p>
          </div>
        )}

        {/* Success State */}
        {showSuccess && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm font-medium text-green-800">Message sent!</p>
            </div>
          </div>
        )}

        {/* Sender Info */}
        {user && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">From</p>
            <p className="text-sm font-semibold text-gray-900">{user.name || 'Anonymous'}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        )}

        {/* Message Type */}
        <div>
          <label htmlFor="messageType" className="block text-sm font-medium text-gray-700 mb-2">
            Message Type
          </label>
          <select
            id="messageType"
            value={messageType}
            onChange={(e) => setMessageType(e.target.value as BizWireMessageType)}
            disabled={isLoading || showSuccess}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {MESSAGE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={MAX_SUBJECT_LENGTH}
            placeholder="Enter a subject..."
            disabled={isLoading || showSuccess}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex justify-between items-center mt-1">
            {subject.trim().length > 0 && subject.trim().length < MIN_SUBJECT_LENGTH ? (
              <p className="text-xs text-red-500">Minimum {MIN_SUBJECT_LENGTH} characters</p>
            ) : (
              <span />
            )}
            <p className="text-xs text-gray-500 ml-auto">
              {subject.length}/{MAX_SUBJECT_LENGTH}
            </p>
          </div>
        </div>

        {/* Message */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            id="content"
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={MAX_CONTENT_LENGTH}
            placeholder="Write your message..."
            disabled={isLoading || showSuccess}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex justify-between items-center mt-1">
            {content.trim().length > 0 && content.trim().length < MIN_CONTENT_LENGTH ? (
              <p className="text-xs text-red-500">Minimum {MIN_CONTENT_LENGTH} characters</p>
            ) : (
              <p className="text-xs text-gray-500">Required field</p>
            )}
            <p className={`text-xs font-medium ${content.length > MAX_CONTENT_LENGTH - 100 ? 'text-orange-600' : 'text-gray-500'}`}>
              {content.length}/{MAX_CONTENT_LENGTH}
            </p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </BizModal>
  );
}

export function ContactListingModal(props: ContactListingModalProps) {
  return (
    <ErrorBoundary componentName="ContactListingModal">
      <ContactListingModalContent {...props} />
    </ErrorBoundary>
  );
}
