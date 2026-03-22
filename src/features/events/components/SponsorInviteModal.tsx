/**
 * SponsorInviteModal - Business owner invites another business to sponsor an event
 *
 * Flow:
 * 1. Search listings by name (autocomplete)
 * 2. Select listing from results
 * 3. Choose sponsor tier
 * 4. Optional: custom message (title/gold tiers)
 * 5. Submit via fetchWithCsrf
 *
 * Uses BizModal wrapper, fetchWithCsrf for mutation.
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 5 - Task 5.10: SponsorInviteModal
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import BizModal from '@/components/BizModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';
import { Search, Loader2, CheckCircle } from 'lucide-react';
import type { EventSponsor, EventSponsorTier } from '@features/events/types';

interface ListingSearchResult {
  id: number;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  tier: string | null;
}

interface SponsorInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  eventTitle: string;
  onSponsorAdded?: (_sponsor: EventSponsor) => void;
}

const TIER_OPTIONS: { value: EventSponsorTier; label: string; description: string }[] = [
  { value: 'title', label: 'Title Sponsor', description: 'Full-width featured placement with logo and message' },
  { value: 'gold', label: 'Gold Sponsor', description: 'Medium card placement with logo' },
  { value: 'silver', label: 'Silver Sponsor', description: 'Small card placement with logo' },
  { value: 'bronze', label: 'Bronze Sponsor', description: 'Text link in bronze section' },
  { value: 'community', label: 'Community Sponsor', description: 'Text link in community section' },
];

function SponsorInviteModalContent({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  onSponsorAdded,
}: SponsorInviteModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ListingSearchResult[]>([]);
  const [selectedListing, setSelectedListing] = useState<ListingSearchResult | null>(null);
  const [selectedTier, setSelectedTier] = useState<EventSponsorTier>('gold');
  const [message, setMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSelectingRef = useRef(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedListing(null);
      setSelectedTier('gold');
      setMessage('');
      setError(null);
      setSuccess(false);
      isSelectingRef.current = false;
    }
  }, [isOpen]);

  // Autocomplete search with debounce
  useEffect(() => {
    // Skip search if a listing was just selected
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      return;
    }

    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/listings/search?q=${encodeURIComponent(searchQuery)}&pageSize=5`,
          { credentials: 'include' }
        );
        if (res.ok) {
          const data = await res.json();
          const listings = data?.data?.items || [];
          setSearchResults(Array.isArray(listings) ? listings : []);
        }
      } catch {
        // Silently fail search
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  const handleSelectListing = (listing: ListingSearchResult) => {
    isSelectingRef.current = true;
    setSelectedListing(listing);
    setSearchQuery(listing.name);
    setSearchResults([]);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!selectedListing) {
      setError('Please select a business to invite as sponsor');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetchWithCsrf(`/api/events/${eventId}/sponsors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sponsor_listing_id: selectedListing.id,
          sponsor_tier: selectedTier,
          sponsor_message: message.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || 'Failed to add sponsor');
        return;
      }

      setSuccess(true);
      if (onSponsorAdded && data?.data?.sponsor) {
        onSponsorAdded(data.data.sponsor);
      }

      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showMessage = selectedTier === 'title' || selectedTier === 'gold';

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Invite Sponsor for "${eventTitle}"`}
      maxWidth="md"
    >
      {success ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-500" />
          <p className="text-lg font-semibold text-gray-900">Sponsor Added!</p>
          <p className="text-sm text-gray-600">{selectedListing?.name} has been added as a sponsor.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Listing search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search for a Business <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                {isSearching ? (
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (selectedListing && e.target.value !== selectedListing.name) {
                    setSelectedListing(null);
                  }
                }}
                placeholder="Type business name..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-biz-orange focus:border-biz-orange"
              />
            </div>

            {/* Search results dropdown */}
            {searchResults.length > 0 && (
              <div className="mt-1 border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                {searchResults.map((listing) => (
                  <button
                    key={listing.id}
                    type="button"
                    onClick={() => handleSelectListing(listing)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <p className="text-sm font-medium text-gray-900">{listing.name}</p>
                    {(listing.city || listing.state) && (
                      <p className="text-xs text-gray-500">
                        {[listing.city, listing.state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {selectedListing && (
              <p className="mt-1.5 text-xs text-green-600">
                Selected: {selectedListing.name}
              </p>
            )}
          </div>

          {/* Tier selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sponsor Tier <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {TIER_OPTIONS.map((tier) => (
                <label
                  key={tier.value}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedTier === tier.value
                      ? 'border-biz-orange bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="sponsor_tier"
                    value={tier.value}
                    checked={selectedTier === tier.value}
                    onChange={() => setSelectedTier(tier.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tier.label}</p>
                    <p className="text-xs text-gray-500">{tier.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Optional message (title/gold only) */}
          {showMessage && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sponsor Message <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g., Proud supporter of this community event..."
                maxLength={500}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-biz-orange focus:border-biz-orange resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">{message.length}/500 characters</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedListing}
              className="flex-1 px-4 py-2 bg-biz-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Sponsor'
              )}
            </button>
          </div>
        </div>
      )}
    </BizModal>
  );
}

export function SponsorInviteModal(props: SponsorInviteModalProps) {
  return (
    <ErrorBoundary>
      <SponsorInviteModalContent {...props} />
    </ErrorBoundary>
  );
}
