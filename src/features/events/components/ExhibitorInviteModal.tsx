/**
 * ExhibitorInviteModal - Business owner invites another business as exhibitor
 *
 * Flow:
 * 1. Search listings by name (autocomplete)
 * 2. Select listing from results
 * 3. Optional: booth number, booth size, exhibitor description
 * 4. Optional: invitation message
 * 5. Submit via fetchWithCsrf
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 6B - Exhibitor System
 * @governance Build Map v2.1 ENHANCED
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import BizModal from '@/components/BizModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';
import { Search, Loader2, CheckCircle } from 'lucide-react';
import type { EventExhibitor, ExhibitorBoothSize } from '@features/events/types';

interface ListingSearchResult {
  id: number;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  tier: string | null;
}

interface ExhibitorInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  eventTitle: string;
  onExhibitorAdded?: (_exhibitor: EventExhibitor) => void;
}

const BOOTH_SIZE_OPTIONS: { value: ExhibitorBoothSize; label: string; description: string }[] = [
  { value: 'small', label: 'Small', description: 'Standard small booth space' },
  { value: 'medium', label: 'Medium', description: 'Standard medium booth space' },
  { value: 'large', label: 'Large', description: 'Larger booth with extra display area' },
  { value: 'premium', label: 'Premium', description: 'Premium booth in a prime location' },
];

function ExhibitorInviteModalContent({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  onExhibitorAdded,
}: ExhibitorInviteModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ListingSearchResult[]>([]);
  const [selectedListing, setSelectedListing] = useState<ListingSearchResult | null>(null);
  const [boothNumber, setBoothNumber] = useState('');
  const [boothSize, setBoothSize] = useState<ExhibitorBoothSize>('medium');
  const [exhibitorDescription, setExhibitorDescription] = useState('');
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
      setBoothNumber('');
      setBoothSize('medium');
      setExhibitorDescription('');
      setMessage('');
      setError(null);
      setSuccess(false);
      isSelectingRef.current = false;
    }
  }, [isOpen]);

  // Autocomplete search with debounce
  useEffect(() => {
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
      setError('Please select a business to invite as exhibitor');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetchWithCsrf(`/api/events/${eventId}/exhibitors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exhibitor_listing_id: selectedListing.id,
          booth_number: boothNumber.trim() || undefined,
          booth_size: boothSize,
          exhibitor_description: exhibitorDescription.trim() || undefined,
          invitation_message: message.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || 'Failed to invite exhibitor');
        return;
      }

      setSuccess(true);
      if (onExhibitorAdded && data?.data?.exhibitor) {
        onExhibitorAdded(data.data.exhibitor);
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

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Invite Exhibitor for "${eventTitle}"`}
      maxWidth="md"
    >
      {success ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-500" />
          <p className="text-lg font-semibold text-gray-900">Exhibitor Invited!</p>
          <p className="text-sm text-gray-600">{selectedListing?.name} has been invited as an exhibitor.</p>
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

          {/* Booth number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Booth Number <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={boothNumber}
              onChange={(e) => setBoothNumber(e.target.value)}
              placeholder="e.g., A-12, Main Hall 3"
              maxLength={50}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-biz-orange focus:border-biz-orange"
            />
          </div>

          {/* Booth size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Booth Size <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {BOOTH_SIZE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-2 p-3 border rounded-lg cursor-pointer transition-all ${
                    boothSize === option.value
                      ? 'border-biz-orange bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="booth_size"
                    value={option.value}
                    checked={boothSize === option.value}
                    onChange={() => setBoothSize(option.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{option.label}</p>
                    <p className="text-xs text-gray-500">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Exhibitor description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What will they showcase? <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={exhibitorDescription}
              onChange={(e) => setExhibitorDescription(e.target.value)}
              placeholder="e.g., Showcasing their latest product line and offering exclusive event discounts..."
              maxLength={1000}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-biz-orange focus:border-biz-orange resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">{exhibitorDescription.length}/1000 characters</p>
          </div>

          {/* Invitation message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invitation Message <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g., We'd love to have you exhibit at our upcoming event..."
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-biz-orange focus:border-biz-orange resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">{message.length}/500 characters</p>
          </div>

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
                  Inviting...
                </>
              ) : (
                'Invite Exhibitor'
              )}
            </button>
          </div>
        </div>
      )}
    </BizModal>
  );
}

export function ExhibitorInviteModal(props: ExhibitorInviteModalProps) {
  return (
    <ErrorBoundary>
      <ExhibitorInviteModalContent {...props} />
    </ErrorBoundary>
  );
}
