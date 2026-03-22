/**
 * Purchase Success Page
 * /events/[slug]/purchase/success?session_id=...
 *
 * Landing page after successful Stripe checkout.
 * Fetches purchase details and shows confirmation.
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 5A - Native Ticketing
 */
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Route } from 'next';
import { CheckCircle, ArrowLeft, Calendar } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

interface PurchaseDetails {
  id: number;
  event_id: number;
  ticket_id: number;
  quantity: number;
  total_amount: number;
  currency: string;
  payment_status: string;
  event_title?: string;
  ticket_name?: string;
}

function PurchaseSuccessInner({ params }: { params: { slug: string } }) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [purchase, setPurchase] = useState<PurchaseDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setIsLoading(false);
      return;
    }

    const fetchPurchase = async () => {
      try {
        const res = await fetch(`/api/events/purchase/verify?session_id=${sessionId}`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setPurchase(data.data);
        }
      } catch {
        // Non-critical — show generic success
      } finally {
        setIsLoading(false);
      }
    };

    fetchPurchase();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="mb-6">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Ticket Purchased Successfully!
        </h1>

        <p className="text-gray-600 mb-6">
          Your payment has been confirmed and your ticket is ready.
        </p>

        {isLoading ? (
          <div className="animate-pulse space-y-2 mb-6">
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
          </div>
        ) : purchase ? (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            {purchase.event_title && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Event:</span> {purchase.event_title}
              </p>
            )}
            {purchase.ticket_name && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Ticket:</span> {purchase.ticket_name}
              </p>
            )}
            <p className="text-sm text-gray-600">
              <span className="font-medium">Quantity:</span> {purchase.quantity}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Total:</span> ${purchase.total_amount.toFixed(2)} {purchase.currency.toUpperCase()}
            </p>
          </div>
        ) : null}

        {!isLoading && error && (
          <p className="text-sm text-amber-600 mb-4">
            {error}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={`/events/${params.slug}` as Route}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a30] transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            View Event
          </Link>
          <Link
            href={'/dashboard/events' as Route}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            <Calendar className="w-4 h-4" />
            My Events
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PurchaseSuccessPage({ params }: { params: { slug: string } }) {
  return (
    <ErrorBoundary componentName="PurchaseSuccessPage">
      <PurchaseSuccessInner params={params} />
    </ErrorBoundary>
  );
}
