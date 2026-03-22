/**
 * Event Self Check-In Page
 *
 * Public page for attendee self check-in via QR code link.
 * URL: /events/[slug]/check-in?code=UUID&rsvp=ID
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4 - Check-In System
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchWithCsrf } from '@core/utils/csrf';
import { CheckCircle, XCircle, Loader2, QrCode } from 'lucide-react';

interface PageProps {
  params: { slug: string };
}

type PageState = 'loading' | 'ready' | 'submitting' | 'success' | 'error' | 'already_checked_in';

export default function EventCheckInPage({ params }: PageProps) {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const rsvpStr = searchParams.get('rsvp');

  const [pageState, setPageState] = useState<PageState>('loading');
  const [eventId, setEventId] = useState<number | null>(null);
  const [eventTitle, setEventTitle] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Resolve slug → event
  useEffect(() => {
    const resolveEvent = async () => {
      try {
        const res = await fetch(`/api/events?slug=${encodeURIComponent(params.slug)}`, {
          credentials: 'include',
        });
        if (!res.ok) {
          setPageState('error');
          setErrorMessage('Event not found.');
          return;
        }
        const data = await res.json();
        const events = data?.data?.data || [];
        const event = events.find((e: { slug: string; id: number; title: string }) => e.slug === params.slug);
        if (!event) {
          setPageState('error');
          setErrorMessage('Event not found.');
          return;
        }
        setEventId(event.id);
        setEventTitle(event.title);

        if (!code || !rsvpStr) {
          setPageState('error');
          setErrorMessage('Invalid check-in link. Please scan the QR code again.');
          return;
        }

        setPageState('ready');
      } catch {
        setPageState('error');
        setErrorMessage('Failed to load event information.');
      }
    };

    resolveEvent();
  }, [params.slug, code, rsvpStr]);

  const handleCheckIn = async () => {
    if (!eventId || !code || !rsvpStr) return;

    const rsvpId = parseInt(rsvpStr);
    if (isNaN(rsvpId)) {
      setPageState('error');
      setErrorMessage('Invalid check-in link.');
      return;
    }

    setPageState('submitting');

    try {
      const res = await fetchWithCsrf(`/api/events/${eventId}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rsvpId,
          method: 'self',
          checkInCode: code,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.error || 'Check-in failed';
        if (msg.toLowerCase().includes('already')) {
          setPageState('already_checked_in');
        } else {
          setPageState('error');
          setErrorMessage(msg);
        }
        return;
      }

      setPageState('success');
    } catch {
      setPageState('error');
      setErrorMessage('Network error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-sm p-8 text-center">

        {/* Loading */}
        {pageState === 'loading' && (
          <>
            <Loader2 className="w-10 h-10 text-biz-orange animate-spin mx-auto mb-4" />
            <p className="text-gray-600 text-sm">Loading event information...</p>
          </>
        )}

        {/* Ready to check in */}
        {pageState === 'ready' && (
          <>
            <QrCode className="w-12 h-12 text-biz-orange mx-auto mb-4" />
            <h1 className="text-xl font-bold text-biz-navy mb-2">Event Check-In</h1>
            {eventTitle && (
              <p className="text-gray-600 text-sm mb-6">{eventTitle}</p>
            )}
            <p className="text-gray-500 text-sm mb-6">
              Tap the button below to confirm your arrival at this event.
            </p>
            <button
              onClick={handleCheckIn}
              className="w-full py-3 px-6 bg-biz-orange text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors"
            >
              Check Me In
            </button>
          </>
        )}

        {/* Submitting */}
        {pageState === 'submitting' && (
          <>
            <Loader2 className="w-10 h-10 text-biz-orange animate-spin mx-auto mb-4" />
            <p className="text-gray-600 text-sm">Checking you in...</p>
          </>
        )}

        {/* Success */}
        {pageState === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">You&apos;re Checked In!</h1>
            {eventTitle && (
              <p className="text-gray-500 text-sm mt-1">{eventTitle}</p>
            )}
            <p className="text-gray-500 text-sm mt-3">
              Welcome! Enjoy the event.
            </p>
          </>
        )}

        {/* Already checked in */}
        {pageState === 'already_checked_in' && (
          <>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-blue-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Already Checked In</h1>
            {eventTitle && (
              <p className="text-gray-500 text-sm mt-1">{eventTitle}</p>
            )}
            <p className="text-gray-500 text-sm mt-3">
              You have already been checked in for this event.
            </p>
          </>
        )}

        {/* Error */}
        {pageState === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Check-In Failed</h1>
            <p className="text-gray-500 text-sm mt-2">{errorMessage}</p>
            <button
              onClick={() => setPageState('ready')}
              className="mt-5 text-sm text-biz-orange underline hover:no-underline"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
