/**
 * FlashOffersSection - Homepage flash offers scroller
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Zap, ArrowRight, Loader2, Clock } from 'lucide-react';
import { FlashOfferCard } from './FlashOfferCard';
import type { Offer } from '@features/offers/types';

interface FlashOffersSectionProps {
  maxOffers?: number;
}

export function FlashOffersSection({ maxOffers = 6 }: FlashOffersSectionProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFlashOffers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/offers/flash?limit=${maxOffers}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch flash offers');
      }

      const data = await response.json();
      setOffers(data.offers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [maxOffers]);

  useEffect(() => {
    fetchFlashOffers();

    // Refresh every minute to update countdowns
    const interval = setInterval(fetchFlashOffers, 60000);
    return () => clearInterval(interval);
  }, [fetchFlashOffers]);

  if (loading) {
    return (
      <section className="py-12 bg-gradient-to-r from-orange-50 to-yellow-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  if (error || offers.length === 0) {
    return null; // Hide section if no flash offers
  }

  return (
    <section className="py-12 bg-gradient-to-r from-orange-50 to-yellow-50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center animate-pulse">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Flash Deals</h2>
              <p className="text-orange-600 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Limited time only!
              </p>
            </div>
          </div>

          <Link
            href="/offers?flash=true"
            className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Offers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer) => (
            <FlashOfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      </div>
    </section>
  );
}
