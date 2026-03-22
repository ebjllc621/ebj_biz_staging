/**
 * ComposeMessageModal - Modal for composing new messages with recipient selection
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @brain-plan docs/pages/layouts/home/user/user_dash/COMPOSE_MESSAGE_RECIPIENT_SELECTION.md
 *
 * GOVERNANCE:
 * - Uses branded BizModal from @/components/BizModal (gradient header + logo)
 * - CSRF protection via fetchWithCsrf (in useMessageSend hook)
 * - Client Component ('use client')
 * - Tailwind CSS styling
 * - ErrorBoundary wrapped at page level
 *
 * Features:
 * - Recipient selection from contacts or connection groups
 * - Manual username input option
 * - Optional subject field (100 char max)
 * - Message field (500 char max)
 * - Character counter
 * - Loading state during submission
 * - Error display
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import BizModal from '@/components/BizModal';
import { useMessageSend } from '../hooks/useMessageSend';
import { RecipientSelector, type RecipientUser } from './RecipientSelector';
import { fetchWithCsrf } from '@core/utils/csrf';

interface ConnectionGroupOption {
  id: number;
  name: string;
  color: string;
  memberCount: number;
}

interface InitialGroupOption {
  id: number;
  name: string;
  color: string;
  memberCount: number;
}

interface ComposeMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Optional pre-selected recipient (for "message this user" flows) */
  initialRecipient?: RecipientUser;
  /** Optional pre-selected group (for "message this group" flows) */
  initialGroup?: InitialGroupOption;
  onMessageSent?: () => void;
}

export function ComposeMessageModal({
  isOpen,
  onClose,
  initialRecipient,
  initialGroup,
  onMessageSent
}: ComposeMessageModalProps) {
  const [mode, setMode] = useState<'contact' | 'group'>(initialGroup ? 'group' : 'contact');
  const [recipient, setRecipient] = useState<RecipientUser | null>(initialRecipient || null);
  const [selectedGroup, setSelectedGroup] = useState<ConnectionGroupOption | null>(
    initialGroup ? { id: initialGroup.id, name: initialGroup.name, color: initialGroup.color, memberCount: initialGroup.memberCount } : null
  );
  const [groups, setGroups] = useState<ConnectionGroupOption[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [groupSendMode, setGroupSendMode] = useState<'group' | 'individual'>('group');
  const [groupSendLoading, setGroupSendLoading] = useState(false);
  const [groupSendError, setGroupSendError] = useState<string | null>(null);
  const { sendMessage, isLoading, error, reset } = useMessageSend();

  const MAX_MESSAGE_LENGTH = 500;
  const MAX_SUBJECT_LENGTH = 100;
  const remainingChars = MAX_MESSAGE_LENGTH - message.length;

  // Load groups when switching to group mode
  useEffect(() => {
    if (mode === 'group' && groups.length === 0 && isOpen) {
      setIsLoadingGroups(true);
      fetch('/api/users/connections/groups', { credentials: 'include' })
        .then(r => r.json())
        .then(result => {
          if (result.success && result.data) {
            setGroups(result.data.groups || []);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingGroups(false));
    }
  }, [mode, isOpen, groups.length]);

  const handleSubmit = async () => {
    if (!message.trim()) return;

    if (mode === 'group' && selectedGroup) {
      setGroupSendLoading(true);
      setGroupSendError(null);
      try {
        if (groupSendMode === 'individual') {
          // Send individual 1:1 messages to each group member
          const membersRes = await fetch(
            `/api/users/connections/groups/${selectedGroup.id}/members`,
            { credentials: 'include' }
          );
          const membersResult = await membersRes.json();
          if (!membersResult.success) {
            throw new Error('Failed to load group members');
          }
          const members = membersResult.data.members || [];
          if (members.length === 0) {
            throw new Error('No members in this group');
          }
          // Send to each member individually
          const results = await Promise.allSettled(
            members.map((member: { memberUserId: number }) =>
              fetchWithCsrf('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  receiver_user_id: member.memberUserId,
                  content: message,
                  subject: subject || undefined
                })
              })
            )
          );
          const failures = results.filter(r => r.status === 'rejected');
          if (failures.length === members.length) {
            throw new Error('Failed to send messages to all members');
          }
        } else {
          // Send as group message
          const response = await fetchWithCsrf(
            `/api/users/connections/groups/${selectedGroup.id}/messages`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: message })
            }
          );
          const result = await response.json();
          if (!response.ok || !result.success) {
            throw new Error(result.error?.message || 'Failed to send group message');
          }
        }
        onMessageSent?.();
        handleClose();
      } catch (err) {
        setGroupSendError(err instanceof Error ? err.message : 'Failed to send');
      } finally {
        setGroupSendLoading(false);
      }
    } else if (mode === 'contact' && recipient) {
      const success = await sendMessage({
        receiver_user_id: recipient.id,
        content: message,
        subject: subject || undefined
      });
      if (success) {
        onMessageSent?.();
        handleClose();
      }
    }
  };

  const handleClose = () => {
    if (!isLoading && !groupSendLoading) {
      setRecipient(initialRecipient || null);
      setSelectedGroup(initialGroup ? { id: initialGroup.id, name: initialGroup.name, color: initialGroup.color, memberCount: initialGroup.memberCount } : null);
      setMessage('');
      setSubject('');
      setGroupSendError(null);
      setGroupSendMode('group');
      setMode(initialGroup ? 'group' : 'contact');
      reset();
      onClose();
    }
  };

  const currentlyLoading = isLoading || groupSendLoading;
  const currentError = mode === 'group' ? groupSendError : error;
  const hasRecipient = mode === 'contact' ? !!recipient : !!selectedGroup;
  const isSubmitDisabled = currentlyLoading || !hasRecipient || !message.trim() || message.length > MAX_MESSAGE_LENGTH;

  const recipientDisplayName = mode === 'contact'
    ? (recipient ? (recipient.display_name || recipient.username) : null)
    : (selectedGroup ? `${selectedGroup.name} (${selectedGroup.memberCount} members)` : null);

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Compose Message"
      subtitle={recipientDisplayName ? `To ${recipientDisplayName}` : 'Select a recipient'}
      maxWidth="lg"
      footer={
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={currentlyLoading}
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
            {currentlyLoading
              ? 'Sending...'
              : mode === 'group'
                ? groupSendMode === 'individual'
                  ? 'Send to Each Member'
                  : 'Send to Group'
                : 'Send Message'}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Mode Toggle: Contact vs Group */}
        {!initialRecipient && !initialGroup && (
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => { setMode('contact'); setSelectedGroup(null); }}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                mode === 'contact'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Contact
            </button>
            <button
              type="button"
              onClick={() => { setMode('group'); setRecipient(null); }}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                mode === 'group'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Users className="w-4 h-4" />
              Connection Group
            </button>
          </div>
        )}

        {/* Contact Recipient Selector */}
        {mode === 'contact' && (
          <RecipientSelector
            selectedRecipient={recipient}
            onSelectRecipient={setRecipient}
            disabled={currentlyLoading}
          />
        )}

        {/* Group Selector */}
        {mode === 'group' && !selectedGroup && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Select a Group
            </label>
            {isLoadingGroups ? (
              <div className="text-center py-6 text-gray-500">Loading groups...</div>
            ) : groups.length === 0 ? (
              <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No connection groups yet</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setSelectedGroup(group)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: group.color + '20' }}
                    >
                      <Users className="w-5 h-5" style={{ color: group.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{group.name}</p>
                      <p className="text-xs text-gray-500">{group.memberCount} members</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Selected Group Display */}
        {mode === 'group' && selectedGroup && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">To</label>
            <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: selectedGroup.color + '20' }}
                >
                  <Users className="w-5 h-5" style={{ color: selectedGroup.color }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedGroup.name}</p>
                  <p className="text-xs text-gray-500">{selectedGroup.memberCount} members</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                Change
              </button>
            </div>
          </div>
        )}

        {/* Group Send Mode Toggle */}
        {mode === 'group' && selectedGroup && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Send as</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setGroupSendMode('group')}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  groupSendMode === 'group'
                    ? 'bg-orange-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Group Message
              </button>
              <button
                type="button"
                onClick={() => setGroupSendMode('individual')}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  groupSendMode === 'individual'
                    ? 'bg-orange-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Individual Messages
              </button>
            </div>
            <p className="text-xs text-gray-500">
              {groupSendMode === 'group'
                ? 'Message will be sent to the group conversation visible to all members.'
                : 'Separate 1:1 messages will be sent privately to each member.'}
            </p>
          </div>
        )}

        {/* Show message form when recipient or group is selected */}
        {hasRecipient && (
          <>
            {/* Subject (Optional) - only for individual/1:1 messages */}
            {(mode === 'contact' || (mode === 'group' && groupSendMode === 'individual')) && (
              <div>
                <label htmlFor="compose-subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Subject (Optional)
                </label>
                <input
                  id="compose-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={MAX_SUBJECT_LENGTH}
                  placeholder="Enter a subject..."
                  disabled={currentlyLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {MAX_SUBJECT_LENGTH - subject.length} characters remaining
                </p>
              </div>
            )}

            {/* Message */}
            <div>
              <label htmlFor="compose-message" className="block text-sm font-medium text-gray-700 mb-2">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                id="compose-message"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder={mode === 'group' ? 'Write a message to the group...' : 'Write your message...'}
                disabled={currentlyLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
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
          </>
        )}

        {/* Prompt to select recipient if not selected */}
        {!hasRecipient && mode === 'contact' && (
          <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
            <p className="text-sm">Select a recipient to compose your message</p>
          </div>
        )}

        {/* Error Display */}
        {currentError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700 mt-1">{currentError}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </BizModal>
  );
}

export default ComposeMessageModal;
