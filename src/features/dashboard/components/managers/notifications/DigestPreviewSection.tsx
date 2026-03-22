/**
 * DigestPreviewSection - Preview of next digest email content
 *
 * Shows the user what their next digest email will contain based on
 * their category subscriptions. Grouped by category.
 *
 * @tier SIMPLE
 * @phase Phase 3B
 * @authority docs/pages/layouts/listings/features/phases/PHASE_3B_BRAIN_PLAN.md
 */
'use client';

import { useState, useEffect } from 'react';
import { Mail, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';
import type { DigestPreviewData } from '@core/services/ListingDigestService';

// ============================================================================
// Props
// ============================================================================

interface DigestPreviewSectionProps {
  userId?: number;
}

// ============================================================================
// DigestPreviewSection Component
// ============================================================================

export function DigestPreviewSection({ userId: _userId }: DigestPreviewSectionProps) {
  const [preview, setPreview] = useState<DigestPreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const res = await fetch('/api/notifications/digest-preview', {
          credentials: 'include'
        });
        if (!res.ok) return;
        const data = await res.json();
        setPreview(data.data?.preview ?? null);
      } catch {
        // Silent failure
      } finally {
        setIsLoading(false);
      }
    };

    void fetchPreview();
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-orange-50 rounded-lg">
          <Mail className="w-5 h-5 text-[#ed6437]" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Digest Email Preview</h3>
          <p className="text-sm text-gray-500">New listings in your subscribed categories</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded" />
          ))}
        </div>
      ) : !preview || !preview.hasSubscriptions ? (
        /* Empty state */
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Mail className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Subscribe to categories to receive digest emails
          </p>
          <Link
            href="/listings" as="/listings"
            className="inline-flex items-center gap-1 text-sm text-[#ed6437] hover:underline"
          >
            Browse categories
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      ) : preview.totalListings === 0 ? (
        /* Has subscriptions but no new listings */
        <div className="text-center py-6">
          <p className="text-sm text-gray-500">
            No new listings in your subscribed categories since your last digest.
          </p>
          {preview.nextDigestAt && (
            <p className="text-xs text-gray-400 mt-2">
              Next digest: {new Date(preview.nextDigestAt).toLocaleDateString(undefined, {
                weekday: 'long',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          )}
        </div>
      ) : (
        /* Has content to preview */
        <div className="space-y-4">
          {preview.nextDigestAt && (
            <p className="text-xs text-gray-400">
              Next digest scheduled for{' '}
              {new Date(preview.nextDigestAt).toLocaleDateString(undefined, {
                weekday: 'long',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          )}

          {preview.categories.map((category) => (
            <div key={category.categoryId}>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                {category.categoryName}
                <span className="ml-2 text-xs text-gray-400">
                  ({category.listings.length} new)
                </span>
              </h4>
              <div className="space-y-2">
                {category.listings.slice(0, 3).map((listing) => (
                  <Link
                    key={listing.id}
                    href={`/listings/${listing.slug}` as Route}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg
                               text-sm hover:bg-gray-100 transition-colors group"
                  >
                    <span className="text-gray-900 group-hover:text-[#ed6437] transition-colors truncate">
                      {listing.business_name}
                    </span>
                    <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0 ml-2" />
                  </Link>
                ))}
              </div>
            </div>
          ))}

          <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
            {preview.totalListings} total listing{preview.totalListings !== 1 ? 's' : ''} in your digest
          </p>
        </div>
      )}
    </div>
  );
}

export default DigestPreviewSection;
