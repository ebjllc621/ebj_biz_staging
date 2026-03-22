/**
 * NewsletterSubscribeForm - Inline subscribe form for newsletter sidebar and list page
 *
 * - Anonymous users: email input + optional name → pending + confirmation email
 * - Authenticated users: one-click subscribe (pre-filled email)
 * - Shows subscription status (subscribed / pending confirmation)
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Tier 2 - Phase N5
 * @governance Build Map v2.1 ENHANCED
 *
 * @see src/features/events/components/EventSidebarFollowButton.tsx - Canonical follow pattern
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Mail, Check, Loader2, Bell } from 'lucide-react';
import { useAuth } from '@core/context/AuthContext';
import { fetchWithCsrf } from '@core/utils/csrf';

interface NewsletterSubscribeFormProps {
  listingId: number;
  listingName?: string;
  className?: string;
  /** Compact mode for list page banner (no card wrapper) */
  compact?: boolean;
}

type SubscribeState = 'idle' | 'subscribed' | 'pending' | 'loading';

export function NewsletterSubscribeForm({
  listingId,
  listingName,
  className = '',
  compact = false,
}: NewsletterSubscribeFormProps) {
  const { user } = useAuth();
  const [state, setState] = useState<SubscribeState>('idle');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);

  // Check subscription status on mount for authenticated users
  useEffect(() => {
    if (!user?.email || !listingId) return;

    fetch(`/api/newsletters/subscribe/status?listing_id=${listingId}&email=${encodeURIComponent(user.email)}`, {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        if (data.data?.status === 'active') {
          setState('subscribed');
        } else if (data.data?.status === 'pending') {
          setState('pending');
        }
        if (data.data?.subscriberCount !== undefined) {
          setSubscriberCount(data.data.subscriberCount);
        }
      })
      .catch(() => { /* silently fail */ });
  }, [user?.email, listingId]);

  // Load subscriber count for anonymous users (no email to check status)
  useEffect(() => {
    if (user?.email || !listingId) return;

    fetch(`/api/newsletters/subscribe/status?listing_id=${listingId}`)
      .then(res => res.json())
      .then(data => {
        if (data.data?.subscriberCount !== undefined) {
          setSubscriberCount(data.data.subscriberCount);
        }
      })
      .catch(() => { /* silently fail */ });
  }, [user?.email, listingId]);

  // Pre-fill email for authenticated users
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user?.email]);

  const handleSubscribe = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setState('loading');
    setError('');

    try {
      const response = await fetch('/api/newsletters/subscribe', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          email: email.trim().toLowerCase(),
          name: name.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to subscribe');
      }

      if (data.data?.subscribed) {
        setState('subscribed');
        setMessage(data.data.message || 'You are now subscribed!');
      } else if (data.data?.requiresConfirmation) {
        setState('pending');
        setMessage(data.data.message || 'Check your email to confirm.');
      }
    } catch (err) {
      setState('idle');
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }, [email, name, listingId]);

  const handleUnsubscribe = useCallback(async () => {
    if (!user?.email) return;
    setState('loading');

    try {
      const response = await fetchWithCsrf('/api/newsletters/subscribe', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          email: user.email,
        }),
      });

      if (response.ok) {
        setState('idle');
        setMessage('');
      }
    } catch {
      setState('subscribed');
    }
  }, [user?.email, listingId]);

  // === SUBSCRIBED STATE ===
  if (state === 'subscribed') {
    const content = (
      <>
        <div className="flex items-center gap-2 text-green-700 mb-2">
          <Check className="w-5 h-5" />
          <span className="font-medium text-sm">Subscribed</span>
        </div>
        {message && <p className="text-xs text-gray-500 mb-2">{message}</p>}
        {user && (
          <button
            onClick={handleUnsubscribe}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Unsubscribe
          </button>
        )}
      </>
    );

    if (compact) return <div className={className}>{content}</div>;
    return (
      <div className={`bg-green-50 rounded-xl border border-green-200 p-5 ${className}`}>
        {content}
      </div>
    );
  }

  // === PENDING STATE ===
  if (state === 'pending') {
    const content = (
      <>
        <div className="flex items-center gap-2 text-amber-700 mb-2">
          <Mail className="w-5 h-5" />
          <span className="font-medium text-sm">Confirmation Pending</span>
        </div>
        <p className="text-xs text-gray-500">
          {message || 'Check your email and click the confirmation link.'}
        </p>
      </>
    );

    if (compact) return <div className={className}>{content}</div>;
    return (
      <div className={`bg-amber-50 rounded-xl border border-amber-200 p-5 ${className}`}>
        {content}
      </div>
    );
  }

  // === IDLE / LOADING STATE (Subscribe Form) ===
  const isAuthUser = !!user?.email;
  const isDisabled = state === 'loading';

  const formContent = (
    <>
      {!compact && (
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Subscribe to Newsletter
        </h3>
      )}

      {subscriberCount !== null && subscriberCount > 0 && (
        <p className="text-xs text-gray-500 mb-3">
          <Bell className="w-3 h-3 inline mr-1" />
          {subscriberCount.toLocaleString()} subscriber{subscriberCount !== 1 ? 's' : ''}
        </p>
      )}

      {isAuthUser ? (
        // One-click subscribe for authenticated users
        <button
          onClick={() => handleSubscribe()}
          disabled={isDisabled}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
            isDisabled
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-biz-navy text-white hover:bg-biz-navy/90'
          }`}
        >
          {isDisabled ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Subscribing...
            </>
          ) : (
            <>
              <Mail className="w-4 h-4" />
              Subscribe with {user.email}
            </>
          )}
        </button>
      ) : (
        // Email form for anonymous users
        <form onSubmit={handleSubscribe} className="space-y-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
            required
            disabled={isDisabled}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-biz-orange/50 focus:border-biz-orange disabled:bg-gray-100"
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name (optional)"
            disabled={isDisabled}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-biz-orange/50 focus:border-biz-orange disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={isDisabled}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
              isDisabled
                ? 'bg-gray-400 cursor-not-allowed text-white'
                : 'bg-biz-navy text-white hover:bg-biz-navy/90'
            }`}
          >
            {isDisabled ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Subscribing...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                Subscribe
              </>
            )}
          </button>
        </form>
      )}

      {error && (
        <p className="text-xs text-red-600 mt-2">{error}</p>
      )}

      <p className="text-xs text-gray-400 mt-3">
        {isAuthUser
          ? 'Get newsletters delivered to your inbox.'
          : 'We\'ll send a confirmation email. No spam, unsubscribe anytime.'}
      </p>
    </>
  );

  if (compact) return <div className={className}>{formContent}</div>;
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${className}`}>
      {formContent}
    </div>
  );
}

export default NewsletterSubscribeForm;
