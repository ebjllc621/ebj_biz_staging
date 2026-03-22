/**
 * SendMessageModal - Modal for sending direct messages to users
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @brain-plan docs/pages/layouts/home/user/phases/troubleshooting/sendmessage/phases/PHASE_2_SENDMESSAGEMODAL_BRAIN_PLAN.md
 *
 * GOVERNANCE:
 * - Uses branded BizModal from @/components/BizModal (gradient header + logo)
 * - CSRF protection via fetchWithCsrf (in useMessageSend hook)
 * - Client Component ('use client')
 * - Tailwind CSS styling
 *
 * Features:
 * - Target user preview with avatar
 * - Optional subject field (100 char max)
 * - Message field (500 char max)
 * - Character counter
 * - Loading state during submission
 * - Error display
 */

'use client';

import React, { useState } from 'react';
import BizModal from '@/components/BizModal';
import { useMessageSend } from '../hooks/useMessageSend';

interface SendMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: {
    id: number;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  onMessageSent?: () => void;
}

export function SendMessageModal({
  isOpen,
  onClose,
  targetUser,
  onMessageSent
}: SendMessageModalProps) {
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const { sendMessage, isLoading, error, reset } = useMessageSend();

  const MAX_MESSAGE_LENGTH = 500;
  const MAX_SUBJECT_LENGTH = 100;
  const remainingChars = MAX_MESSAGE_LENGTH - message.length;

  const displayName = targetUser.display_name || targetUser.username;
  const avatarUrl = targetUser.avatar_url;

  const handleSubmit = async () => {
    if (!message.trim()) return;

    const success = await sendMessage({
      receiver_user_id: targetUser.id,
      content: message,
      subject: subject || undefined
    });

    if (success) {
      onMessageSent?.();
      handleClose();
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setMessage('');
      setSubject('');
      reset();
      onClose();
    }
  };

  const isSubmitDisabled = isLoading || !message.trim() || message.length > MAX_MESSAGE_LENGTH;

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Send Message"
      subtitle={`Message to ${displayName}`}
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
      <div className="space-y-6">
        {/* Target User Display */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex-shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
                <span className="text-2xl font-semibold text-orange-600">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {displayName}
            </h3>
            <p className="text-sm text-gray-500">
              @{targetUser.username}
            </p>
          </div>
        </div>

        {/* Subject (Optional) */}
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
            Subject (Optional)
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={MAX_SUBJECT_LENGTH}
            placeholder="Enter a subject..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            {MAX_SUBJECT_LENGTH - subject.length} characters remaining
          </p>
        </div>

        {/* Message */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            id="message"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="Write your message..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
          />
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-500">
              Required field
            </p>
            <p className={`text-xs font-medium ${remainingChars < 50 ? 'text-orange-600' : 'text-gray-500'}`}>
              {remainingChars} characters remaining
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
