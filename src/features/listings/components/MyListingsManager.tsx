/**
 * MyListingsManager - User's listing management component
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @phase Phase 8 - Listing Modals Integration
 * @updated Phase 7 - User Dashboard Integration with notification markers
 */
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { NewListingModal } from './NewListingModal';
import { EditListingModal } from './EditListingModal';
import { Plus, Edit2, Eye } from 'lucide-react';

interface UserListing {
  id: number;
  name: string;
  slug: string;
  tier: string;
  status: string;
  approved: string;
  logo_url: string | null;
  last_update: string;
  completeness_percent: number;
  claimed: boolean;
}

function MyListingsManagerContent() {
  const searchParams = useSearchParams();
  const highlightListingId = searchParams.get('highlight');
  const [clearedHighlights, setClearedHighlights] = useState<Set<number>>(new Set());

  const [listings, setListings] = useState<UserListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingListingId, setEditingListingId] = useState<number | null>(null);

  const shouldShowNotification = (listingId: number): boolean => {
    if (!highlightListingId) return false;
    if (clearedHighlights.has(listingId)) return false;
    return listingId === parseInt(highlightListingId);
  };

  const handleEditClick = (listingId: number) => {
    if (highlightListingId && listingId === parseInt(highlightListingId)) {
      setClearedHighlights(prev => new Set(prev).add(listingId));
    }
    setEditingListingId(listingId);
  };

  const fetchMyListings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/listings/mine', { credentials: 'include' });
      if (response.ok) {
        const result = await response.json();
        setListings(result.data?.listings ?? result.listings ?? []);
      } else {
        setError('Failed to load listings');
      }
    } catch {
      setError('Failed to load listings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyListings();
  }, [fetchMyListings]);

  const handleCreateSuccess = () => {
    setCreateModalOpen(false);
    fetchMyListings();
  };

  const handleEditSuccess = () => {
    setEditingListingId(null);
    fetchMyListings();
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'premium': return 'bg-purple-100 text-purple-800';
      case 'preferred': return 'bg-blue-100 text-blue-800';
      case 'plus': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Get CSS class for completeness percentage indicator
   */
  const getCompletenessClass = (percent: number) => {
    if (percent >= 80) return 'text-green-600';
    if (percent >= 60) return 'text-yellow-600';
    if (percent >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#022641]">My Listings</h1>
          <p className="text-gray-600 mt-1">Manage your business listings</p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Listing
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ed6437]" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchMyListings}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      ) : listings.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <h3 className="text-xl font-medium text-gray-900 mb-2">No listings yet</h3>
          <p className="text-gray-600 mb-6">Create your first business listing to get started.</p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Your First Listing
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                {listing.logo_url ? (
                  <img
                    src={listing.logo_url}
                    alt={listing.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 font-medium">
                    {listing.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-medium text-[#022641]">{listing.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getTierBadgeColor(listing.tier)}`}>
                      {listing.tier}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeColor(listing.status)}`}>
                      {listing.status}
                    </span>
                    {shouldShowNotification(listing.id) && (
                      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-[#ed6437] text-white animate-pulse">
                        New!
                      </span>
                    )}
                    {listing.approved === 'approved' && (
                      <span
                        className={`text-xs font-medium ${getCompletenessClass(listing.completeness_percent)}`}
                        title="Listing completeness"
                      >
                        {listing.completeness_percent}% complete
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/listings/${listing.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-500 hover:text-[#022641] hover:bg-gray-100 rounded transition-colors"
                  title="View Listing"
                >
                  <Eye className="w-5 h-5" />
                </a>
                <button
                  onClick={() => handleEditClick(listing.id)}
                  className="p-2 text-gray-500 hover:text-[#ed6437] hover:bg-orange-50 rounded transition-colors"
                  title="Edit Listing"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <NewListingModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
        userRole="listing_member"
      />

      {/* Edit Modal */}
      {editingListingId && (
        <EditListingModal
          isOpen={true}
          onClose={() => setEditingListingId(null)}
          onSuccess={handleEditSuccess}
          listingId={editingListingId}
          userRole="listing_member"
        />
      )}
    </div>
  );
}

export function MyListingsManager() {
  return (
    <Suspense fallback={
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ed6437]" />
        </div>
      </div>
    }>
      <MyListingsManagerContent />
    </Suspense>
  );
}
