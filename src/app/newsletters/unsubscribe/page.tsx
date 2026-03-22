/**
 * Newsletter Unsubscribe Page
 *
 * /newsletters/unsubscribe?token=xxx
 *
 * Landing page for email unsubscribe links.
 * States: loading → confirm → processing → success → error
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Tier 2 - Phase N5
 * @governance Build Map v2.1 ENHANCED
 *
 * @see src/app/notifications/unsubscribe/page.tsx - Canonical pattern
 */
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';

type UnsubState = 'loading' | 'confirm' | 'processing' | 'success' | 'error';

export default function NewsletterUnsubscribePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState<UnsubState>('loading');
  const [email, setEmail] = useState('');
  const [listingName, setListingName] = useState('');
  const [message, setMessage] = useState('');

  // Step 1: Verify token on mount
  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('No unsubscribe token provided.');
      return;
    }

    fetch(`/api/newsletters/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.valid) {
          setState('confirm');
          setEmail(data.data.email || '');
          setListingName(data.data.listingName || 'this business');
        } else {
          setState('error');
          setMessage(data.error?.message || 'This unsubscribe link is invalid or expired.');
        }
      })
      .catch(() => {
        setState('error');
        setMessage('Unable to process your request. Please try again later.');
      });
  }, [token]);

  // Step 2: User confirms unsubscribe
  const handleConfirmUnsubscribe = async () => {
    setState('processing');

    try {
      const response = await fetch('/api/newsletters/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (data.success) {
        setState('success');
        setMessage(data.data?.message || 'You have been unsubscribed.');
      } else {
        setState('error');
        setMessage(data.error?.message || 'Failed to unsubscribe. Please try again.');
      }
    } catch {
      setState('error');
      setMessage('Unable to process your request. Please try again later.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        {state === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-biz-orange mx-auto mb-4 animate-spin" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Processing...</h1>
            <p className="text-gray-600">Verifying your unsubscribe request.</p>
          </>
        )}

        {state === 'confirm' && (
          <>
            <Mail className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Unsubscribe from Newsletter</h1>
            <p className="text-gray-600 mb-1">
              Are you sure you want to unsubscribe from <strong>{listingName}</strong>&apos;s newsletter?
            </p>
            {email && (
              <p className="text-sm text-gray-500 mb-6">
                Email: <strong>{email}</strong>
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleConfirmUnsubscribe}
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Yes, Unsubscribe
              </button>
              <Link
                href={'/content/newsletters' as Route}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </Link>
            </div>
          </>
        )}

        {state === 'processing' && (
          <>
            <Loader2 className="w-12 h-12 text-biz-orange mx-auto mb-4 animate-spin" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Unsubscribing...</h1>
            <p className="text-gray-600">Please wait.</p>
          </>
        )}

        {state === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Unsubscribed</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link
              href={'/content/newsletters' as Route}
              className="inline-block px-6 py-3 bg-biz-navy text-white rounded-lg font-medium hover:bg-biz-navy/90 transition-colors"
            >
              Browse Newsletters
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Something Went Wrong</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link
              href={'/content/newsletters' as Route}
              className="inline-block px-6 py-3 bg-biz-navy text-white rounded-lg font-medium hover:bg-biz-navy/90 transition-colors"
            >
              Browse Newsletters
            </Link>
          </>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Bizconekt. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
