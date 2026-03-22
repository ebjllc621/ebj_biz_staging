/**
 * ThankYouModal - Modal for sending thank you message
 *
 * BizModal-wrapped form for sending personalized thank you messages to recommendation senders.
 * Includes character limit and API integration.
 *
 * @tier STANDARD
 * @phase Phase 4 - Feedback Loop
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/components/BizModal/BizModal.tsx
 *
 * @example
 * ```tsx
 * import { ThankYouModal } from '@features/sharing/components';
 *
 * function RecommendationActions({ recommendation }) {
 *   const [showThankYou, setShowThankYou] = useState(false);
 *
 *   return (
 *     <>
 *       <Button onClick={() => setShowThankYou(true)}>Say Thanks</Button>
 *       <ThankYouModal
 *         isOpen={showThankYou}
 *         onClose={() => setShowThankYou(false)}
 *         recommendationId={recommendation.id}
 *         senderName={recommendation.sender.display_name}
 *         onSuccess={() => {
 *           toast.success('Thank you sent!');
 *           setShowThankYou(false);
 *         }}
 *       />
 *     </>
 *   );
 * }
 * ```
 */

'use client';

import { useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import BizModal from '@/components/BizModal/BizModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

interface ThankYouModalProps {
  isOpen: boolean;
  onClose: () => void;
  senderName: string;
  entityTitle: string;
  onSendThank: (_message: string) => Promise<void>;
}

const QUICK_MESSAGES = [
  "Thanks for the great recommendation!",
  "Really helpful, appreciate it!",
  "Exactly what I was looking for!",
  "You always have great suggestions!"
];

function ThankYouModalContent({
  isOpen,
  onClose,
  senderName,
  entityTitle,
  onSendThank
}: ThankYouModalProps) {
  const [thankMessage, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!thankMessage.trim()) {
      setError('Please enter a message');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSendThank(thankMessage);
      setMessage('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send thank you');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickMessage = (msg: string) => {
    setMessage(msg);
  };

  const handleClose = () => {
    setMessage('');
    setError(null);
    onClose();
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Say Thanks to ${senderName}`}
      size="medium"
    >
      <div className="space-y-4">
        {/* Context */}
        <p className="text-sm text-gray-600">
          Send a thank you message for recommending <strong>{entityTitle}</strong>
        </p>

        {/* Quick Messages */}
        <div className="flex flex-wrap gap-2">
          {QUICK_MESSAGES.map((msg, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickMessage(msg)}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
            >
              {msg}
            </button>
          ))}
        </div>

        {/* Message Input */}
        <div>
          <textarea
            value={thankMessage}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your thank you message..."
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
          />
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-400">{thankMessage.length}/500</span>
            {error && <span className="text-xs text-red-500">{error}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !thankMessage.trim()}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Heart className="w-4 h-4" />
                Send Thanks
              </>
            )}
          </button>
        </div>
      </div>
    </BizModal>
  );
}

export function ThankYouModal(props: ThankYouModalProps) {
  return (
    <ErrorBoundary componentName="ThankYouModal">
      <ThankYouModalContent {...props} />
    </ErrorBoundary>
  );
}

export default ThankYouModal;
