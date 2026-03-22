/**
 * BusinessOffersPreview - Shows active offers from a business on cross-feature pages
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Jobs Phase 4 - Template Integration & Cross-Feature Linking
 *
 * Renders a preview of up to 3 active offers from a listing.
 * Returns null when loading or no offers exist (silent-fail pattern).
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { Tag, ExternalLink } from 'lucide-react';

interface OfferPreview {
  id: number;
  title: string;
  slug: string;
  offer_type: string;
  end_date: string | null;
  discount_percentage: number | null;
  sale_price: number | null;
  original_price: number | null;
}

interface BusinessOffersPreviewProps {
  listingId: number;
  listingName: string | null;
  listingSlug: string | null;
  className?: string;
}

function formatOfferType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatEndDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function BusinessOffersPreview({
  listingId,
  listingName,
  listingSlug,
  className = '',
}: BusinessOffersPreviewProps) {
  const [offers, setOffers] = useState<OfferPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchOffers() {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/offers?listingId=${listingId}&status=active&limit=3`,
          { credentials: 'include' }
        );
        if (!res.ok) {
          if (isMounted) setIsLoading(false);
          return;
        }
        const result = await res.json();
        const offersArr =
          result?.data?.data ||
          result?.data?.items ||
          result?.data ||
          [];
        if (isMounted) {
          setOffers(Array.isArray(offersArr) ? offersArr.slice(0, 3) : []);
          setIsLoading(false);
        }
      } catch {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchOffers();
    return () => {
      isMounted = false;
    };
  }, [listingId]);

  if (isLoading || offers.length === 0) return null;

  return (
    <section className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-biz-navy flex items-center gap-2">
          <Tag className="w-5 h-5 text-biz-orange" />
          Current Offers from {listingName || 'this business'}
        </h2>
        {listingSlug && (
          <Link
            href={`/listings/${listingSlug}/offers` as Route}
            className="text-sm text-biz-orange hover:text-orange-600 flex items-center gap-1 transition-colors"
          >
            View All Offers <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      <div className="space-y-3">
        {offers.map((offer) => (
          <Link
            key={offer.id}
            href={`/offers/${offer.slug}` as Route}
            className="flex items-center gap-4 p-3 border border-gray-100 rounded-lg hover:border-biz-orange hover:shadow-sm transition-all bg-white"
          >
            {/* Tag badge */}
            <div className="flex-shrink-0 w-12 h-12 bg-biz-orange/10 rounded-lg flex flex-col items-center justify-center">
              <Tag className="w-5 h-5 text-biz-orange" />
              {offer.discount_percentage && (
                <span className="text-xs font-bold text-biz-orange leading-none mt-0.5">
                  {offer.discount_percentage}%
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{offer.title}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {formatOfferType(offer.offer_type)}
                </span>
                {offer.end_date && (
                  <span className="text-xs text-gray-400">
                    Ends {formatEndDate(offer.end_date)}
                  </span>
                )}
              </div>
            </div>

            <ExternalLink className="w-4 h-4 text-gray-300 flex-shrink-0" />
          </Link>
        ))}
      </div>
    </section>
  );
}
