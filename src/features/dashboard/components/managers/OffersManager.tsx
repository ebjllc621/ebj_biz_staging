/**
 * OffersManager - Offers Management
 *
 * @description Manage offers with CRUD operations via /api/offers
 * @component Client Component
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Phase 8 - Features Section Pages
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_8_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use ErrorBoundary (ADVANCED tier requirement)
 * - Orange theme (#ed6437) for action buttons
 * - BizModal for all modals (MANDATORY)
 * - fetchWithCsrf for all mutations
 * - Tier limits enforced by OfferService
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Loader2, AlertCircle, Tag, X, Users, Package, BarChart2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useListingData } from '@features/dashboard/hooks/useListingData';
import { fetchWithCsrf } from '@core/utils/csrf';
import { EmptyState } from '../shared/EmptyState';
import { TierLimitBanner } from '../shared/TierLimitBanner';
import { ConfirmDeleteModal } from '../shared/ConfirmDeleteModal';
import { OfferCard } from './offers/OfferCard';
import { OfferFormModal } from './offers/OfferFormModal';
import { OfferShareAnalyticsPanel } from './offers/OfferShareAnalyticsPanel';
import { BusinessSharePerformanceCard } from './offers/BusinessSharePerformanceCard';
import { TemplateListPanel } from './offers/templates/TemplateListPanel';
import { LoyalCustomersPanel } from './offers/LoyalCustomersPanel';
import { LoyaltyMetricsCard } from './offers/LoyaltyMetricsCard';
import { BundleCreatorModal } from './offers/BundleCreatorModal';
import { OfferAnalyticsDashboard } from './offers/analytics/OfferAnalyticsDashboard';
import { OfferComparisonPanel } from './offers/OfferComparisonPanel';
import type { MediaItem } from '@features/media/types/shared-media';

// ============================================================================
// TYPES
// ============================================================================

interface Offer {
  id: number;
  listing_id: number;
  title: string;
  slug: string;
  description: string | null;
  offer_type: 'product' | 'service' | 'discount' | 'bundle';
  original_price: number | null;
  discounted_price: number | null;
  discount_percentage: number | null;
  quantity_total: number | null;
  quantity_sold: number;
  start_date: string | null;
  end_date: string | null;
  terms_conditions: string | null;
  redemption_instructions: string | null;
  image_url: string | null;
  status: 'active' | 'expired' | 'sold_out';
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

interface TierLimits {
  essentials: number;
  plus: number;
  preferred: number;
  premium: number;
}

const OFFER_LIMITS: TierLimits = {
  essentials: 4,
  plus: 10,
  preferred: 25,
  premium: 50
};

// ============================================================================
// COMPONENT
// ============================================================================

function OffersManagerContent() {
  const { selectedListingId } = useListingContext();
  const { listing } = useListingData(selectedListingId);
  const searchParams = useSearchParams();

  // State
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Auto-open create modal when ?create=true is in the URL (from Quick Actions)
  useEffect(() => {
    if (searchParams.get('create') === 'true' && !isLoading) {
      setShowCreateModal(true);
    }
  }, [searchParams, isLoading]);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [deletingOffer, setDeletingOffer] = useState<Offer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [analyticsOffer, setAnalyticsOffer] = useState<Offer | null>(null);
  const [activeTab, setActiveTab] = useState<'offers' | 'templates' | 'loyalty' | 'bundles' | 'analytics'>('offers');
  const [showBundleModal, setShowBundleModal] = useState(false);

  const tier = listing?.tier || 'essentials';
  const limit = OFFER_LIMITS[tier as keyof TierLimits] || 4;
  const canAddMore = offers.length < limit;
  const isAdvancedTier = tier === 'preferred' || tier === 'premium';

  // Upload pending media after offer creation
  const uploadPendingOfferMedia = useCallback(async (
    offerId: number,
    mediaItems: MediaItem[]
  ): Promise<{ succeeded: number; failed: number }> => {
    let succeeded = 0;
    let failed = 0;
    let firstImageUrl: string | null = null;

    for (const item of mediaItems) {
      try {
        if (item.media_type === 'video' && item.source === 'embed') {
          await fetchWithCsrf(`/api/offers/${offerId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              media_type: 'video',
              file_url: item.file_url,
              embed_url: item.embed_url,
              platform: item.platform,
              source: 'embed',
            })
          });
          succeeded++;
        } else if (item.media_type === 'image' && typeof item.file_url === 'string') {
          const blob = await fetch(item.file_url).then(r => r.blob());
          const file = new File([blob], `offer-image-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });

          const formData = new FormData();
          formData.append('file', file);
          formData.append('entityType', 'offers');
          formData.append('entityId', offerId.toString());
          formData.append('mediaType', 'gallery');

          const uploadResponse = await fetchWithCsrf('/api/media/upload', {
            method: 'POST',
            body: formData
          });

          if (!uploadResponse.ok) { failed++; continue; }

          const uploadData = await uploadResponse.json();
          const fileUrl = uploadData.data?.file?.url;
          if (!fileUrl) { failed++; continue; }

          // Track first image for offer image column
          if (!firstImageUrl) {
            firstImageUrl = fileUrl;
          }

          await fetchWithCsrf(`/api/offers/${offerId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              media_type: 'image',
              file_url: fileUrl,
              alt_text: item.alt_text,
              source: 'upload',
            })
          });
          succeeded++;
        }
      } catch {
        failed++;
        // Non-blocking — offer is already created
      }
    }

    // Set image on offer from first uploaded image
    if (firstImageUrl) {
      try {
        await fetchWithCsrf(`/api/offers/${offerId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: firstImageUrl })
        });
      } catch {
        console.error('[OffersManager] Failed to set image on offer');
      }
    }

    return { succeeded, failed };
  }, []);

  // Fetch offers
  const fetchOffers = useCallback(async () => {
    if (!selectedListingId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/offers?listingId=${selectedListingId}&limit=100`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch offers');
      }

      const result = await response.json();
      if (result.success) {
        setOffers(result.data.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load offers');
    } finally {
      setIsLoading(false);
    }
  }, [selectedListingId]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  // Handle create
  const handleCreate = useCallback(async (data: Record<string, unknown>) => {
    if (!selectedListingId) return;

    setIsSubmitting(true);
    setError(null);

    // Extract pending media before sending to API
    const pendingMedia = data._pendingMedia as MediaItem[] | undefined;
    const apiData = { ...data };
    delete apiData._pendingMedia;

    try {
      const response = await fetchWithCsrf('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...apiData,
          listing_id: selectedListingId
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to create offer');
      }

      const result = await response.json();
      const newOfferId = result.data?.offer?.id;

      if (!newOfferId && pendingMedia && pendingMedia.length > 0) {
        console.warn(`[OffersManager] Offer created but ID is falsy. Response shape: ${JSON.stringify(result).substring(0, 200)}`);
      }

      // Upload pending media if offer was created successfully
      if (newOfferId && pendingMedia && pendingMedia.length > 0) {
        const { failed } = await uploadPendingOfferMedia(newOfferId, pendingMedia);
        if (failed > 0) {
          setError(`Offer created, but ${failed} of ${pendingMedia.length} media items failed to upload. You can add them from the edit view.`);
        }
      }

      await fetchOffers();
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create offer');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedListingId, fetchOffers, uploadPendingOfferMedia]);

  // Handle update
  const handleUpdate = useCallback(async (data: Record<string, unknown>) => {
    if (!editingOffer) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(`/api/offers/${editingOffer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to update offer');
      }

      await fetchOffers();
      setEditingOffer(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update offer');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [editingOffer, fetchOffers]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!deletingOffer) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(`/api/offers/${deletingOffer.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to delete offer');
      }

      await fetchOffers();
      setDeletingOffer(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete offer');
    } finally {
      setIsDeleting(false);
    }
  }, [deletingOffer, fetchOffers]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Offers</h2>
          <p className="text-sm text-gray-600 mt-1">
            {offers.length} of {limit} offers used
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdvancedTier && offers.length >= 2 && (
            <button
              onClick={() => setShowBundleModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Package className="w-4 h-4" />
              Create Bundle
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={!canAddMore}
            className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Create Offer
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('offers')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'offers'
                ? 'border-[#ed6437] text-[#ed6437]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            My Offers
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-[#ed6437] text-[#ed6437]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveTab('loyalty')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'loyalty'
                ? 'border-[#ed6437] text-[#ed6437]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-4 h-4" />
            Loyalty
          </button>
          {isAdvancedTier && (
            <button
              onClick={() => setActiveTab('bundles')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'bundles'
                  ? 'border-[#ed6437] text-[#ed6437]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Package className="w-4 h-4" />
              Bundles
            </button>
          )}
          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'border-[#ed6437] text-[#ed6437]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            Analytics
          </button>
        </nav>
      </div>

      {/* Tier Limit Banner */}
      {activeTab === 'offers' && (
        <TierLimitBanner
          current={offers.length}
          limit={limit}
          itemType="offers"
          tier={tier}
        />
      )}

      {/* Offers Tab Content */}
      {activeTab === 'offers' && (
        <>
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-sm hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Offers List */}
          {offers.length === 0 ? (
            <EmptyState
              icon={Tag}
              title="No Offers Yet"
              description="Create your first offer to attract customers with special deals and promotions"
              action={{
                label: 'Create First Offer',
                onClick: () => setShowCreateModal(true)
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {offers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  onEdit={() => setEditingOffer(offer)}
                  onDelete={() => setDeletingOffer(offer)}
                  onViewAnalytics={() => setAnalyticsOffer(offer)}
                  canABTest={isAdvancedTier}
                />
              ))}
            </div>
          )}

          {/* Analytics Panel for Selected Offer */}
          {analyticsOffer && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Analytics: {analyticsOffer.title}
                </h3>
                <button
                  onClick={() => setAnalyticsOffer(null)}
                  className="p-1 text-gray-500 hover:text-gray-700 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <OfferShareAnalyticsPanel
                offerId={analyticsOffer.id}
                offerTitle={analyticsOffer.title}
              />
            </div>
          )}

          {/* Business-Wide Share Performance */}
          {offers.length > 0 && selectedListingId && (
            <BusinessSharePerformanceCard listingId={selectedListingId} />
          )}
        </>
      )}

      {/* Templates Tab Content */}
      {activeTab === 'templates' && selectedListingId && (
        <TemplateListPanel
          listingId={selectedListingId}
          onSelect={() => {
            // Template selection handler - will pre-fill form with template data
            setShowCreateModal(true);
          }}
        />
      )}

      {/* Loyalty Tab Content */}
      {activeTab === 'loyalty' && selectedListingId && (
        <div className="space-y-6">
          {/* Loyalty Metrics Overview */}
          <LoyaltyMetricsCard listingId={selectedListingId} />

          {/* Loyal Customers List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <LoyalCustomersPanel
              listingId={selectedListingId}
              maxDisplay={20}
            />
          </div>
        </div>
      )}

      {/* Analytics Tab Content */}
      {activeTab === 'analytics' && selectedListingId && (
        <>
          <OfferAnalyticsDashboard
            offers={offers.map((o) => ({ id: o.id, title: o.title }))}
            listingId={selectedListingId}
          />
          <div className="mt-6">
            <OfferComparisonPanel listingId={selectedListingId} />
          </div>
        </>
      )}

      {/* Bundles Tab Content */}
      {activeTab === 'bundles' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Offer Bundles</h3>
              <p className="text-sm text-gray-600 mb-6">
                Combine multiple offers into attractive bundles to increase customer value
              </p>
              {offers.length >= 2 && (
                <button
                  onClick={() => setShowBundleModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Package className="w-4 h-4" />
                  Create Your First Bundle
                </button>
              )}
              {offers.length < 2 && (
                <p className="text-sm text-gray-500">
                  Create at least 2 offers before bundling them together
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <OfferFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
        listingCoordinates={listing?.latitude && listing?.longitude ? { lat: listing.latitude, lng: listing.longitude } : null}
        canUseGeoFence={isAdvancedTier}
        listingTier={tier}
      />

      {/* Edit Modal */}
      {editingOffer && (
        <OfferFormModal
          isOpen={true}
          onClose={() => setEditingOffer(null)}
          onSubmit={handleUpdate}
          isSubmitting={isSubmitting}
          listingCoordinates={listing?.latitude && listing?.longitude ? { lat: listing.latitude, lng: listing.longitude } : null}
          canUseGeoFence={isAdvancedTier}
          offerId={editingOffer.id}
          listingTier={tier}
          initialData={{
            title: editingOffer.title,
            description: editingOffer.description || '',
            offer_type: editingOffer.offer_type,
            original_price: editingOffer.original_price?.toString() || '',
            discounted_price: editingOffer.discounted_price?.toString() || '',
            discount_percentage: editingOffer.discount_percentage?.toString() || '',
            quantity_total: editingOffer.quantity_total?.toString() || '',
            start_date: editingOffer.start_date || '',
            end_date: editingOffer.end_date || '',
            terms_conditions: editingOffer.terms_conditions || '',
            redemption_instructions: editingOffer.redemption_instructions || '',
            status: editingOffer.status === 'sold_out' ? 'active' : editingOffer.status as 'active' | 'expired',
            is_featured: editingOffer.is_featured
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingOffer && (
        <ConfirmDeleteModal
          isOpen={true}
          onClose={() => setDeletingOffer(null)}
          onConfirm={handleDelete}
          itemType="offer"
          itemName={deletingOffer.title}
          isDeleting={isDeleting}
        />
      )}

      {/* Bundle Creator Modal */}
      {selectedListingId && (
        <BundleCreatorModal
          isOpen={showBundleModal}
          onClose={() => setShowBundleModal(false)}
          listingId={selectedListingId}
          availableOffers={offers.filter(offer => offer.status === 'active').map(offer => ({
            id: offer.id,
            listing_id: offer.listing_id,
            title: offer.title,
            slug: offer.slug,
            description: offer.description,
            offer_type: offer.offer_type,
            original_price: offer.original_price,
            sale_price: offer.discounted_price,
            discount_percentage: offer.discount_percentage,
            image: offer.image_url,
            thumbnail: offer.image_url,
            start_date: new Date(offer.start_date || Date.now()),
            end_date: new Date(offer.end_date || Date.now()),
            quantity_total: offer.quantity_total,
            quantity_remaining: offer.quantity_total ? offer.quantity_total - offer.quantity_sold : null,
            max_per_user: 1,
            status: offer.status as 'draft' | 'active' | 'paused' | 'expired' | 'sold_out',
            is_featured: offer.is_featured,
            created_at: new Date(offer.created_at),
            updated_at: new Date(offer.updated_at)
          }))}
          onSuccess={() => {
            setShowBundleModal(false);
            // Optionally switch to bundles tab
            setActiveTab('bundles');
          }}
        />
      )}
    </div>
  );
}

/**
 * OffersManager - Wrapped with ErrorBoundary
 */
export function OffersManager() {
  return (
    <ErrorBoundary componentName="OffersManager">
      <OffersManagerContent />
    </ErrorBoundary>
  );
}

export default OffersManager;
