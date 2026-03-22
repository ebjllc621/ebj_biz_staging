/**
 * Unsubscribe Page
 *
 * One-click email unsubscribe confirmation page.
 *
 * @authority docs/notificationService/phases/PHASE_4_BRAIN_PLAN.md
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Mail, CheckCircle, XCircle, Loader2 } from 'lucide-react';

type UnsubscribeState = 'loading' | 'confirm' | 'success' | 'error';

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [state, setState] = useState<UnsubscribeState>('loading');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('Invalid unsubscribe link. Please check your email and try again.');
      return;
    }

    // Verify token
    fetch(`/api/notifications/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setState('confirm');
          setMessage(data.data.message);
          setCategory(data.data.category);
        } else {
          setState('error');
          setMessage(
            data.error === 'expired'
              ? 'This unsubscribe link has expired. Please use the link in a more recent email.'
              : data.error === 'consumed'
              ? 'This unsubscribe link has already been used.'
              : 'Invalid unsubscribe link. Please check your email and try again.'
          );
        }
      })
      .catch(() => {
        setState('error');
        setMessage('Failed to verify unsubscribe link. Please try again later.');
      });
  }, [token]);

  const handleUnsubscribe = async () => {
    setState('loading');

    try {
      const res = await fetch('/api/notifications/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const data = await res.json();

      if (data.success) {
        setState('success');
        setMessage(data.message);
      } else {
        setState('error');
        setMessage(data.error || 'Failed to unsubscribe. Please try again.');
      }
    } catch {
      setState('error');
      setMessage('Failed to unsubscribe. Please try again later.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <Mail className="w-12 h-12 text-[#ed6437] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Email Preferences</h1>
        </div>

        {/* Loading State */}
        {state === 'loading' && (
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Processing...</p>
          </div>
        )}

        {/* Confirm State */}
        {state === 'confirm' && (
          <div className="text-center">
            <p className="text-gray-700 mb-6">{message}</p>
            <p className="text-sm text-gray-500 mb-6">
              Click the button below to confirm. You can re-enable email notifications
              anytime in your account settings.
            </p>
            <button
              onClick={handleUnsubscribe}
              className="w-full bg-[#ed6437] text-white py-3 px-6 rounded-md font-medium hover:bg-[#d55730] transition-colors"
            >
              Confirm Unsubscribe
            </button>
          </div>
        )}

        {/* Success State */}
        {state === 'success' && (
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-700 mb-4">{message}</p>
            <p className="text-sm text-gray-500 mb-6">
              You can re-enable email notifications anytime in your account settings.
            </p>
            <a
              href="/settings/notifications"
              className="inline-block text-[#ed6437] font-medium hover:underline"
            >
              Manage Notification Preferences
            </a>
          </div>
        )}

        {/* Error State */}
        {state === 'error' && (
          <div className="text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-700 mb-4">{message}</p>
            <a
              href="/settings/notifications"
              className="inline-block text-[#ed6437] font-medium hover:underline"
            >
              Go to Notification Settings
            </a>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} Bizconekt. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
