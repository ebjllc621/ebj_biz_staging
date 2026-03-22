/**
 * Newsletter Subscription Confirmation Page
 *
 * /newsletters/confirm?token=xxx
 *
 * Landing page for email confirmation links.
 * States: loading → success → error
 *
 * @component Client Component (needs useSearchParams)
 * @tier SIMPLE
 * @phase Tier 2 - Phase N5
 * @governance Build Map v2.1 ENHANCED
 *
 * @see src/app/notifications/unsubscribe/page.tsx - Canonical multi-state pattern
 */
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';

type ConfirmState = 'loading' | 'success' | 'error';

export default function NewsletterConfirmPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState<ConfirmState>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('No confirmation token provided.');
      return;
    }

    fetch(`/api/newsletters/confirm?token=${encodeURIComponent(token)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.confirmed) {
          setState('success');
          setEmail(data.data.email || '');
          setMessage(data.data.message || 'Your subscription is confirmed!');
        } else {
          setState('error');
          setMessage(data.error?.message || 'This confirmation link is invalid or expired.');
        }
      })
      .catch(() => {
        setState('error');
        setMessage('Unable to confirm subscription. Please try again later.');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        {state === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-biz-orange mx-auto mb-4 animate-spin" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Confirming Subscription</h1>
            <p className="text-gray-600">Please wait...</p>
          </>
        )}

        {state === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Subscription Confirmed!</h1>
            <p className="text-gray-600 mb-1">{message}</p>
            {email && (
              <p className="text-sm text-gray-500 mb-6">
                Newsletters will be sent to <strong>{email}</strong>
              </p>
            )}
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
            <h1 className="text-xl font-bold text-gray-900 mb-2">Confirmation Failed</h1>
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
