/**
 * EventReviewPrompt - Post-event review call-to-action banner
 *
 * Shows a dismissible banner prompting authenticated users who attended
 * a past event to leave a review. Expands inline to show EventReviewForm.
 *
 * Pattern: Follows OfferReviewPrompt (src/features/offers/components/OfferReviewPrompt.tsx)
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4 - Task 4.4: EventReviewPrompt
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import { useState, useEffect } from 'react';
import { Star, X } from 'lucide-react';
import { EventReviewForm } from './EventReviewForm';

interface EventReviewPromptProps {
  eventId: number;
  eventTitle: string;
  businessName: string | null;
  onDismiss?: () => void;
  onSubmit?: () => void;
}

export function EventReviewPrompt({
  eventId,
  eventTitle,
  businessName,
  onDismiss,
  onSubmit,
}: EventReviewPromptProps) {
  const [canReview, setCanReview] = useState<boolean | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkEligibility = async () => {
      try {
        // Check RSVP status — must be confirmed attendee to be eligible to review
        const rsvpResponse = await fetch(`/api/events/${eventId}/rsvp/status`, {
          credentials: 'include',
        });
        if (!rsvpResponse.ok) {
          setCanReview(false);
          return;
        }
        const rsvpData = await rsvpResponse.json();
        const hasRsvped = rsvpData?.data?.has_rsvped && rsvpData?.data?.rsvp_status === 'confirmed';
        setCanReview(hasRsvped);
      } catch {
        setCanReview(false);
      }
    };

    checkEligibility();
  }, [eventId]);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const handleSuccess = () => {
    setDismissed(true);
    onSubmit?.();
  };

  if (canReview === null || !canReview || dismissed) {
    return null;
  }

  if (showForm) {
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-purple-600" />
            <h3 className="font-medium text-gray-900">Review: {eventTitle}</h3>
          </div>
          <button
            onClick={() => setShowForm(false)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            aria-label="Close review form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <EventReviewForm
          eventId={eventId}
          eventTitle={eventTitle}
          businessName={businessName}
          onSuccess={handleSuccess}
          onCancel={() => setShowForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Star className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900">How was {eventTitle}?</p>
          <p className="text-sm text-gray-600">Share your experience with the community</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleDismiss}
          className="px-4 py-2 text-gray-600 hover:bg-purple-100 rounded-lg text-sm transition-colors"
        >
          Not now
        </button>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium transition-colors"
        >
          Leave Review
        </button>
      </div>
    </div>
  );
}
