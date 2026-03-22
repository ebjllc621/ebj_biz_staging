/**
 * BundleOfferSelector - Select offers for bundle inclusion
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useMemo } from 'react';
import { Search, Tag, CheckCircle } from 'lucide-react';
import type { Offer } from '@features/offers/types';

interface BundleOfferSelectorProps {
  offers: Offer[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  maxSelections?: number;
  className?: string;
}

export function BundleOfferSelector({
  offers,
  selectedIds,
  onChange,
  maxSelections,
  className = '',
}: BundleOfferSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOffers = useMemo(() => {
    if (!searchTerm.trim()) return offers;
    const term = searchTerm.toLowerCase();
    return offers.filter(
      (offer) =>
        offer.title.toLowerCase().includes(term) ||
        offer.description?.toLowerCase().includes(term)
    );
  }, [offers, searchTerm]);

  const toggleOffer = (offerId: number) => {
    if (selectedIds.includes(offerId)) {
      onChange(selectedIds.filter((id) => id !== offerId));
    } else {
      if (maxSelections && selectedIds.length >= maxSelections) {
        return;
      }
      onChange([...selectedIds, offerId]);
    }
  };

  const selectAll = () => {
    const allIds = filteredOffers.map((o) => o.id);
    if (maxSelections) {
      onChange(allIds.slice(0, maxSelections));
    } else {
      onChange(allIds);
    }
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className={className}>
      {/* Search and Actions */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search offers..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
        <button
          type="button"
          onClick={selectAll}
          className="px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg"
        >
          Select All
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          Clear
        </button>
      </div>

      {/* Selection Count */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-600">
          {selectedIds.length} selected
          {maxSelections && ` (max ${maxSelections})`}
        </p>
      </div>

      {/* Offer List */}
      <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
        {filteredOffers.length === 0 ? (
          <div className="p-8 text-center">
            <Tag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">
              {searchTerm ? 'No offers match your search' : 'No offers available'}
            </p>
          </div>
        ) : (
          filteredOffers.map((offer) => {
            const isSelected = selectedIds.includes(offer.id);
            const isDisabled = Boolean(
              !isSelected && maxSelections && selectedIds.length >= maxSelections
            );

            return (
              <label
                key={offer.id}
                className={`flex items-center gap-3 p-3 border-b last:border-b-0 transition-colors ${
                  isDisabled
                    ? 'opacity-50 cursor-not-allowed bg-gray-50'
                    : 'cursor-pointer hover:bg-gray-50'
                } ${isSelected ? 'bg-purple-50' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleOffer(offer.id)}
                  disabled={isDisabled}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 disabled:opacity-50"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">
                      {offer.title}
                    </p>
                    {isSelected && (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                  {offer.description && (
                    <p className="text-sm text-gray-500 truncate">
                      {offer.description}
                    </p>
                  )}
                </div>
                {offer.discount_percentage && (
                  <span className="flex-shrink-0 px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm font-medium">
                    {offer.discount_percentage}%
                  </span>
                )}
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
