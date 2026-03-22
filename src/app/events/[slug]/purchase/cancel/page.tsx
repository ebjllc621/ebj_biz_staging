/**
 * Purchase Cancel Page
 * /events/[slug]/purchase/cancel
 *
 * Landing page when user cancels Stripe checkout.
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 5A - Native Ticketing
 */
'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { XCircle, ArrowLeft } from 'lucide-react';

export default function PurchaseCancel({ params }: { params: { slug: string } }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="mb-6">
          <XCircle className="w-16 h-16 text-gray-400 mx-auto" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Cancelled
        </h1>

        <p className="text-gray-600 mb-6">
          Your ticket purchase was cancelled. No payment has been processed.
        </p>

        <Link
          href={`/events/${params.slug}` as Route}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a30] transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Event
        </Link>
      </div>
    </div>
  );
}
