/**
 * ConnectionRequestModal - Modal for sending connection requests with optional message
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/pages/layouts/home/user/phases/troubleshooting/connect/CONNECT_SYSTEM_REMEDIATION_BRAIN_PLAN.md
 *
 * GOVERNANCE:
 * - Uses branded BizModal from @/components/BizModal (gradient header + logo)
 * - CSRF protection via fetchWithCsrf
 * - Client Component ('use client')
 * - Tailwind CSS styling
 *
 * Features:
 * - Connection type selection (Professional/Business/Personal)
 * - Optional message field (500 char max)
 * - Character counter
 * - Loading state during submission
 * - Error display
 * - Target user profile preview
 */

'use client';

import React, { useState } from 'react';
import BizModal from '@/components/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';
import { RateLimitStatus } from './RateLimitStatus';
import { INTENT_CONFIG } from './IntentBadge';
import { TemplateSelector } from './TemplateSelector';
import { ConnectionIntentType, RateLimitStatus as RateLimitStatusType, ConnectionTemplate } from '../types';

interface ConnectionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: {
    id: number;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  onRequestSent: () => void;
}

type ConnectionType = 'professional' | 'business' | 'personal';

export function ConnectionRequestModal({
  isOpen,
  onClose,
  targetUser,
  onRequestSent
}: ConnectionRequestModalProps) {
  const [connectionType, setConnectionType] = useState<ConnectionType>('professional');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intentType, setIntentType] = useState<ConnectionIntentType>('networking');
  const [rateLimits, setRateLimits] = useState<RateLimitStatusType | null>(null);
  const [loadingLimits, setLoadingLimits] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | undefined>(undefined);

  const MAX_MESSAGE_LENGTH = 500;
  const remainingChars = MAX_MESSAGE_LENGTH - message.length;

  const displayName = targetUser.display_name || targetUser.username;
  const avatarUrl = targetUser.avatar_url;

  // Fetch rate limits when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setLoadingLimits(true);
      fetch('/api/users/connections/rate-limits', { credentials: 'include' })
        .then(res => res.json())
        .then(response => {
          if (response.success && response.data) {
            // Extract rate limits from API response envelope
            setRateLimits(response.data);
          }
        })
        .catch(console.error)
        .finally(() => setLoadingLimits(false));
    }
  }, [isOpen]);

  const handleTemplateSelect = (template: ConnectionTemplate) => {
    setSelectedTemplateId(template.id);
    setMessage(template.message);
    setConnectionType(template.connection_type);
    setIntentType(template.intent_type);
  };

  const handleSubmit = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetchWithCsrf('/api/users/connections/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_user_id: targetUser.id,
          message: message.trim() || undefined,
          connection_type: connectionType,
          intent_type: intentType
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send connection request');
      }

      // Optionally increment template usage count (fire-and-forget)
      // Note: This would require an additional API endpoint
      // For now, we'll skip this feature or implement it server-side

      // Success - call callback and close modal
      onRequestSent();
      onClose();

      // Reset form state
      setMessage('');
      setConnectionType('professional');
      setIntentType('networking');
      setSelectedTemplateId(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while sending the request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError(null);
      setMessage('');
      setConnectionType('professional');
      setIntentType('networking');
      setSelectedTemplateId(undefined);
      onClose();
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Send Connection Request"
      subtitle={`Connect with ${displayName}`}
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
            disabled={isLoading || message.length > MAX_MESSAGE_LENGTH || !rateLimits?.canSend}
            className="px-4 py-2 rounded-md font-medium transition-colors bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending...' : 'Send Request'}
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

        {/* Rate Limit Status */}
        {loadingLimits ? (
          <div className="animate-pulse h-12 bg-gray-100 rounded-lg" />
        ) : rateLimits && (
          <RateLimitStatus status={rateLimits} variant="compact" />
        )}

        {/* Connection Type Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Connection Type
          </label>
          <div className="space-y-2">
            {[
              { value: 'professional', label: 'Professional', description: 'Work-related connection' },
              { value: 'business', label: 'Business', description: 'Business partnership or collaboration' },
              { value: 'personal', label: 'Personal', description: 'Personal friend or acquaintance' }
            ].map((type) => (
              <label
                key={type.value}
                className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <input
                  type="radio"
                  name="connectionType"
                  value={type.value}
                  checked={connectionType === type.value}
                  onChange={(e) => setConnectionType(e.target.value as ConnectionType)}
                  className="mt-1 w-4 h-4 text-orange-600 focus:ring-orange-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {type.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {type.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Intent Type Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Purpose of Connection <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {(Object.keys(INTENT_CONFIG) as ConnectionIntentType[]).map((type) => {
              const config = INTENT_CONFIG[type];
              const Icon = config.icon;
              return (
                <label
                  key={type}
                  className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="radio"
                    name="intentType"
                    value={type}
                    checked={intentType === type}
                    onChange={(e) => setIntentType(e.target.value as ConnectionIntentType)}
                    className="mt-1 w-4 h-4 text-orange-600 focus:ring-orange-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900">
                        {config.label}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {config.description}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Template Selector */}
        <TemplateSelector
          onSelect={handleTemplateSelect}
          selectedTemplateId={selectedTemplateId}
        />

        {/* Optional Message */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
            Message (Optional)
          </label>
          <textarea
            id="message"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="Add a personal note to your connection request..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
          />
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-500">
              Add a personal message to introduce yourself
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
