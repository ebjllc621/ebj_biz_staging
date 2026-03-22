/**
 * GroupRecommendListingModal Component
 * Modal to recommend a listing to a connection group
 *
 * GOVERNANCE COMPLIANCE:
 * - STANDARD tier component (100-300 lines)
 * - BizModal wrapper (MANDATORY for modals)
 * - ErrorBoundary wrapper (MANDATORY)
 * - Uses fetchWithCsrf for POST requests
 * - Client Component ('use client')
 *
 * @tier STANDARD
 * @phase Connection Groups Feature - Phase 2
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/3-5-26/phases/PHASE_2_BRAIN_PLAN.md
 * @reference src/features/connections/components/CreateGroupModal.tsx
 */

'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Search, BadgeCheck, Loader2, ExternalLink } from 'lucide-react';
import BizModal from '@/components/BizModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { GroupListingRecommendation } from '../types/group-actions';

export interface GroupRecommendListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: number;
  onRecommendationSent?: (recommendation: GroupListingRecommendation) => void;
}

interface Listing {
  id: number;
  name: string;
  slug: string;
  tier: string;
  logo_url: string | null;
  category_name: string | null;
}

const MAX_MESSAGE_LENGTH = 500;

function GroupRecommendListingModalContent({
  isOpen,
  onClose,
  groupId,
  onRecommendationSent
}: GroupRecommendListingModalProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user's listings
  useEffect(() => {
    if (!isOpen) return;

    const loadListings = async () => {
      setIsLoadingListings(true);
      try {
        const response = await fetch('/api/listings/mine', { credentials: 'include' });
        const result = await response.json();

        if (result.success && result.data) {
          setListings(result.data.listings || []);
        }
      } catch {
        setError('Failed to load listings');
      } finally {
        setIsLoadingListings(false);
      }
    };

    void loadListings();
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedListing) {
      setError('Please select a listing to recommend');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/users/connections/groups/${groupId}/recommendations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listingId: selectedListing.id,
            message: message.trim() || undefined
          })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to send recommendation');
      }

      onRecommendationSent?.(result.data.recommendation);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send recommendation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedListing(null);
    setMessage('');
    setSearchQuery('');
    setError(null);
    onClose();
  };

  const filteredListings = listings.filter((listing) =>
    searchQuery
      ? listing.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Recommend a Listing"
      size="medium"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your listings..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Listing Selection */}
        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
          {isLoadingListings ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {listings.length === 0 ? 'No listings available' : 'No listings match your search'}
            </div>
          ) : (
            filteredListings.map((listing) => (
              <button
                key={listing.id}
                type="button"
                onClick={() => setSelectedListing(listing)}
                className={`w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors ${
                  selectedListing?.id === listing.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                {listing.logo_url ? (
                  <Image
                    src={listing.logo_url}
                    alt={listing.name}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <ExternalLink className="w-5 h-5 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{listing.name}</div>
                  {listing.category_name && (
                    <div className="text-xs text-gray-500">{listing.category_name}</div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Message */}
        <div>
          <label htmlFor="recommendation-message" className="block text-sm font-medium text-gray-700 mb-1">
            Add a message (optional)
          </label>
          <textarea
            id="recommendation-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={MAX_MESSAGE_LENGTH}
            rows={3}
            placeholder="Why are you recommending this?"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            disabled={isSubmitting}
          />
          <p className="text-xs text-gray-500 mt-1">
            {message.length}/{MAX_MESSAGE_LENGTH} characters
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={isSubmitting || !selectedListing}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <BadgeCheck className="w-4 h-4" />
                Recommend
              </>
            )}
          </button>
        </div>
      </form>
    </BizModal>
  );
}

export function GroupRecommendListingModal(props: GroupRecommendListingModalProps) {
  return (
    <ErrorBoundary
      componentName="GroupRecommendListingModal"
      fallback={
        <div className="p-4 text-red-600">
          Error loading modal. Please close and try again.
        </div>
      }
    >
      <GroupRecommendListingModalContent {...props} />
    </ErrorBoundary>
  );
}
