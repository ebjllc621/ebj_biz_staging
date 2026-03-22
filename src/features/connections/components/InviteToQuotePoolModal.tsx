/**
 * InviteToQuotePoolModal Component
 * BizModal for sending email invitations to non-users to join a quote pool
 *
 * GOVERNANCE COMPLIANCE:
 * - STANDARD tier component (100-300 lines) with ErrorBoundary
 * - Uses BizModal for branded modal experience
 * - CSRF protection via fetchWithCsrf
 * - Client Component ('use client')
 *
 * @tier STANDARD
 * @phase Connection Groups Feature - Phase 3B
 * @generated ComponentBuilder
 */

'use client';

import React, { useState } from 'react';
import BizModal from '@/components/BizModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';
import { Mail, X, UserPlus, Loader2 } from 'lucide-react';
import type { QuotePoolInvitation } from '../types/groups';

export interface InviteToQuotePoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: number;
  groupName: string;
  quoteId?: number;
  onInvited?: (invitations: QuotePoolInvitation[]) => void;
}

function InviteToQuotePoolModalContent({
  isOpen,
  onClose,
  groupId,
  groupName,
  quoteId,
  onInvited
}: InviteToQuotePoolModalProps) {
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleAddEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();

    if (!trimmed) return;

    if (!emailRegex.test(trimmed)) {
      setError('Please enter a valid email address');
      return;
    }

    if (emails.includes(trimmed)) {
      setError('This email has already been added');
      return;
    }

    if (emails.length >= 20) {
      setError('Maximum 20 invitations at once');
      return;
    }

    setEmails([...emails, trimmed]);
    setEmailInput('');
    setError(null);
  };

  const handleRemoveEmail = (email: string) => {
    setEmails(emails.filter((e) => e !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const handleSend = async () => {
    if (emails.length === 0) {
      setError('Add at least one email address');
      return;
    }

    setError(null);
    setIsSending(true);
    setSuccessCount(null);

    try {
      const response = await fetchWithCsrf(
        `/api/users/connections/groups/${groupId}/quote-pool/invitations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emails,
            message: message.trim() || undefined,
            quoteId: quoteId || undefined
          })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to send invitations');
      }

      const sent = result.data.sent as number;
      setSuccessCount(sent);
      onInvited?.(result.data.invitations as QuotePoolInvitation[]);

      // Auto-close after success
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitations');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setEmailInput('');
    setEmails([]);
    setMessage('');
    setError(null);
    setSuccessCount(null);
    onClose();
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Invite to ${groupName}`}
      size="medium"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Invite people by email to join this quote pool group. They'll receive a link to
          register and join.
        </p>

        {successCount !== null ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
            <UserPlus className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-800">
              {successCount} invitation{successCount !== 1 ? 's' : ''} sent successfully!
            </p>
          </div>
        ) : (
          <>
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Addresses *
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="name@example.com"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSending}
                />
                <button
                  type="button"
                  onClick={handleAddEmail}
                  disabled={isSending || !emailInput.trim()}
                  className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Mail className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Press Enter or comma to add multiple emails. Max 20 per batch.
              </p>
            </div>

            {/* Email Tags */}
            {emails.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {emails.map((email) => (
                  <div
                    key={email}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                      className="hover:text-blue-900 transition-colors"
                      disabled={isSending}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Optional Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Personal Message (optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Why should they join this group?"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={isSending}
              />
            </div>
          </>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {successCount === null && (
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSending}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || emails.length === 0}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Send {emails.length > 0 ? `${emails.length} ` : ''}Invitation
                  {emails.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </BizModal>
  );
}

export function InviteToQuotePoolModal(props: InviteToQuotePoolModalProps) {
  return (
    <ErrorBoundary
      componentName="InviteToQuotePoolModal"
      fallback={
        <div className="p-4 text-red-600 text-sm">
          Error loading invitation form. Please close and try again.
        </div>
      }
    >
      <InviteToQuotePoolModalContent {...props} />
    </ErrorBoundary>
  );
}
