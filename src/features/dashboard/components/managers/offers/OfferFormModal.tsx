/**
 * OfferFormModal - Create/Edit Offer Form
 *
 * @description Form modal for creating or editing offers
 * @component Client Component
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 8 - Features Section Pages
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_8_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use BizModal (MANDATORY)
 * - Orange theme for submit button (#ed6437)
 * - Form validation before submit
 */
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import BizModal from '@/components/BizModal/BizModal';
import { Loader2, Lock, MapPin } from 'lucide-react';
import { FlashOfferToggle } from './FlashOfferToggle';
import { FlashTimeSelector } from './FlashTimeSelector';
import { GeoFenceConfig } from './GeoFenceConfig';
import type { GeoTriggerConfig } from '@features/offers/types';
import MediaUploadSection from '@features/media/components/MediaUploadSection';
import type { MediaItem, MediaLimits } from '@features/media/types/shared-media';

// ============================================================================
// TYPES
// ============================================================================

export interface OfferFormData {
  title: string;
  description: string;
  offer_type: 'product' | 'service' | 'discount' | 'bundle';
  original_price: string;
  discounted_price: string;
  discount_percentage: string;
  quantity_total: string;
  start_date: string;
  end_date: string;
  terms_conditions: string;
  redemption_instructions: string;
  status: 'active' | 'expired';
  is_featured: boolean;
  is_flash: boolean;
  flash_start_time: string;
  flash_end_time: string;
  has_geo_trigger: boolean;
  geo_latitude: number | null;
  geo_longitude: number | null;
  geo_radius_meters: number;
  geo_notification_message: string;
}

export interface OfferFormModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close modal callback */
  onClose: () => void;
  /** Submit callback */
  // eslint-disable-next-line no-unused-vars
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  /** Whether form is submitting */
  isSubmitting: boolean;
  /** Initial data for edit mode */
  initialData?: Partial<OfferFormData>;
  /** Listing coordinates for geo-fence (optional) */
  listingCoordinates?: { lat: number; lng: number } | null;
  /** Can use geo-fence features (tier-gated) */
  canUseGeoFence?: boolean;
  /** Offer ID for edit-mode media operations */
  offerId?: number;
  /** Listing tier for create-mode media limit defaults */
  listingTier?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * OfferFormModal - Offer create/edit form
 */
export function OfferFormModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  initialData,
  listingCoordinates,
  canUseGeoFence = false,
  offerId,
  listingTier
}: OfferFormModalProps) {
  const [formData, setFormData] = useState<OfferFormData>({
    title: '',
    description: '',
    offer_type: 'discount',
    original_price: '',
    discounted_price: '',
    discount_percentage: '',
    quantity_total: '',
    start_date: '',
    end_date: '',
    terms_conditions: '',
    redemption_instructions: '',
    status: 'active',
    is_featured: false,
    is_flash: false,
    flash_start_time: '',
    flash_end_time: '',
    has_geo_trigger: false,
    geo_latitude: null,
    geo_longitude: null,
    geo_radius_meters: 500,
    geo_notification_message: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaLimits, setMediaLimits] = useState<MediaLimits>({
    images: { current: 0, limit: 1, unlimited: false },
    videos: { current: 0, limit: 0, unlimited: false },
  });

  // Initialize form data
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        offer_type: initialData.offer_type || 'discount',
        original_price: initialData.original_price || '',
        discounted_price: initialData.discounted_price || '',
        discount_percentage: initialData.discount_percentage || '',
        quantity_total: initialData.quantity_total || '',
        start_date: initialData.start_date ? initialData.start_date.substring(0, 10) : '',
        end_date: initialData.end_date ? initialData.end_date.substring(0, 10) : '',
        terms_conditions: initialData.terms_conditions || '',
        redemption_instructions: initialData.redemption_instructions || '',
        status: initialData.status || 'active',
        is_featured: initialData.is_featured || false,
        is_flash: initialData.is_flash || false,
        flash_start_time: initialData.flash_start_time || '',
        flash_end_time: initialData.flash_end_time || '',
        has_geo_trigger: initialData.has_geo_trigger || false,
        geo_latitude: initialData.geo_latitude || null,
        geo_longitude: initialData.geo_longitude || null,
        geo_radius_meters: initialData.geo_radius_meters || 500,
        geo_notification_message: initialData.geo_notification_message || ''
      });
    }
  }, [initialData]);

  // Load existing media in edit mode
  useEffect(() => {
    if (!offerId || !isOpen) return;
    const loadMedia = async () => {
      try {
        const response = await fetch(`/api/offers/${offerId}/media`, {
          credentials: 'include'
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setMediaItems((result.data.media || []).map((m: Record<string, unknown>) => ({
              id: m.id as number,
              media_type: m.media_type as 'image' | 'video',
              file_url: m.file_url as string,
              alt_text: (m.alt_text as string) ?? null,
              sort_order: (m.sort_order as number) ?? 0,
              embed_url: (m.embed_url as string) ?? null,
              platform: (m.platform as string) ?? null,
              source: (m.source as string) ?? null,
            })));
            if (result.data.limits) {
              setMediaLimits(result.data.limits);
            }
          }
        }
      } catch {
        // Non-blocking
      }
    };
    loadMedia();
  }, [offerId, isOpen]);

  // Set default media limits in create mode based on listing tier
  useEffect(() => {
    if (offerId || !listingTier) return;
    const imageLimitsByTier: Record<string, number> = {
      essentials: 1, plus: 3, preferred: 6, premium: 6
    };
    const videoLimitsByTier: Record<string, number> = {
      essentials: 0, plus: 1, preferred: 3, premium: 3
    };
    setMediaLimits({
      images: { current: 0, limit: imageLimitsByTier[listingTier] ?? 1, unlimited: false },
      videos: { current: 0, limit: videoLimitsByTier[listingTier] ?? 0, unlimited: false },
    });
  }, [offerId, listingTier]);

  // Reset media state when modal opens in create mode
  useEffect(() => {
    if (isOpen && !offerId) {
      setMediaItems([]);
    }
  }, [isOpen, offerId]);

  const handleMediaChange = useCallback((updatedMedia: MediaItem[]) => {
    setMediaItems(updatedMedia);
  }, []);

  // Validate form
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (formData.original_price && isNaN(parseFloat(formData.original_price))) {
      newErrors.original_price = 'Must be a valid number';
    }

    if (formData.discounted_price && isNaN(parseFloat(formData.discounted_price))) {
      newErrors.discounted_price = 'Must be a valid number';
    }

    if (formData.discount_percentage && (isNaN(parseFloat(formData.discount_percentage)) || parseFloat(formData.discount_percentage) < 0 || parseFloat(formData.discount_percentage) > 100)) {
      newErrors.discount_percentage = 'Must be between 0 and 100';
    }

    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (start >= end) {
        newErrors.end_date = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle submit
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const submitData: Record<string, unknown> = {
      title: formData.title,
      description: formData.description || undefined,
      offer_type: formData.offer_type,
      original_price: formData.original_price ? parseFloat(formData.original_price) : undefined,
      discounted_price: formData.discounted_price ? parseFloat(formData.discounted_price) : undefined,
      discount_percentage: formData.discount_percentage ? parseFloat(formData.discount_percentage) : undefined,
      quantity_total: formData.quantity_total ? parseInt(formData.quantity_total, 10) : undefined,
      start_date: formData.start_date || undefined,
      end_date: formData.end_date || undefined,
      terms_conditions: formData.terms_conditions || undefined,
      redemption_instructions: formData.redemption_instructions || undefined,
      status: formData.status,
      is_featured: formData.is_featured,
      is_flash: formData.is_flash,
      flash_start_time: formData.is_flash ? formData.flash_start_time : undefined,
      flash_end_time: formData.is_flash ? formData.flash_end_time : undefined,
      has_geo_trigger: formData.has_geo_trigger,
      geo_latitude: formData.has_geo_trigger ? formData.geo_latitude : undefined,
      geo_longitude: formData.has_geo_trigger ? formData.geo_longitude : undefined,
      geo_radius_meters: formData.has_geo_trigger ? formData.geo_radius_meters : undefined,
      geo_notification_message: formData.has_geo_trigger ? formData.geo_notification_message : undefined
    };

    // Attach pending media for create-mode (parent handles upload)
    if (!offerId) {
      submitData._pendingMedia = mediaItems;
    }

    try {
      await onSubmit(submitData);
      onClose();
    } catch {
      // Error handled by parent
    }
  }, [formData, validate, onSubmit, onClose, offerId, mediaItems]);

  // Handle field change
  const handleChange = useCallback((field: keyof OfferFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  }, []);

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Offer' : 'Create Offer'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Offer Title <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="20% Off All Products"
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none"
              placeholder="Describe your offer..."
            />
          </div>

          {/* Media Upload Section — replaces old image_url text input */}
          <MediaUploadSection
            entityType="offers"
            entityId={offerId ?? null}
            media={mediaItems}
            limits={mediaLimits}
            onMediaChange={handleMediaChange}
            cropperContext="offer"
            disabled={isSubmitting}
            label="Offer Media"
          />

          {/* Offer Type */}
          <div>
            <label htmlFor="offer_type" className="block text-sm font-medium text-gray-700 mb-1">
              Offer Type
            </label>
            <select
              id="offer_type"
              value={formData.offer_type}
              onChange={(e) => handleChange('offer_type', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
            >
              <option value="discount">Discount</option>
              <option value="product">Product</option>
              <option value="service">Service</option>
              <option value="bundle">Bundle</option>
            </select>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Pricing</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Original Price */}
            <div>
              <label htmlFor="original_price" className="block text-sm font-medium text-gray-700 mb-1">
                Original Price ($)
              </label>
              <input
                type="number"
                id="original_price"
                value={formData.original_price}
                onChange={(e) => handleChange('original_price', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                  errors.original_price ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="100.00"
                step="0.01"
                min="0"
              />
              {errors.original_price && <p className="mt-1 text-sm text-red-600">{errors.original_price}</p>}
            </div>

            {/* Discounted Price */}
            <div>
              <label htmlFor="discounted_price" className="block text-sm font-medium text-gray-700 mb-1">
                Discounted Price ($)
              </label>
              <input
                type="number"
                id="discounted_price"
                value={formData.discounted_price}
                onChange={(e) => handleChange('discounted_price', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                  errors.discounted_price ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="80.00"
                step="0.01"
                min="0"
              />
              {errors.discounted_price && <p className="mt-1 text-sm text-red-600">{errors.discounted_price}</p>}
            </div>

            {/* Discount Percentage */}
            <div>
              <label htmlFor="discount_percentage" className="block text-sm font-medium text-gray-700 mb-1">
                Discount (%)
              </label>
              <input
                type="number"
                id="discount_percentage"
                value={formData.discount_percentage}
                onChange={(e) => handleChange('discount_percentage', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                  errors.discount_percentage ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="20"
                min="0"
                max="100"
              />
              {errors.discount_percentage && <p className="mt-1 text-sm text-red-600">{errors.discount_percentage}</p>}
            </div>
          </div>
        </div>

        {/* Availability Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Availability</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Quantity */}
            <div>
              <label htmlFor="quantity_total" className="block text-sm font-medium text-gray-700 mb-1">
                Total Quantity
              </label>
              <input
                type="number"
                id="quantity_total"
                value={formData.quantity_total}
                onChange={(e) => handleChange('quantity_total', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
                placeholder="100"
                min="1"
              />
            </div>

            {/* Start Date */}
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                id="start_date"
                value={formData.start_date}
                onChange={(e) => handleChange('start_date', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
              />
            </div>

            {/* End Date */}
            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                id="end_date"
                value={formData.end_date}
                onChange={(e) => handleChange('end_date', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent ${
                  errors.end_date ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.end_date && <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>}
            </div>
          </div>
        </div>

        {/* Additional Details Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Additional Details</h3>

          {/* Terms & Conditions */}
          <div>
            <label htmlFor="terms_conditions" className="block text-sm font-medium text-gray-700 mb-1">
              Terms & Conditions
            </label>
            <textarea
              id="terms_conditions"
              value={formData.terms_conditions}
              onChange={(e) => handleChange('terms_conditions', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none"
              placeholder="Enter any terms and conditions..."
            />
          </div>

          {/* Redemption Instructions */}
          <div>
            <label htmlFor="redemption_instructions" className="block text-sm font-medium text-gray-700 mb-1">
              Redemption Instructions
            </label>
            <textarea
              id="redemption_instructions"
              value={formData.redemption_instructions}
              onChange={(e) => handleChange('redemption_instructions', e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent resize-none"
              placeholder="How customers can redeem this offer..."
            />
          </div>

        </div>

        {/* Settings Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Settings</h3>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
            >
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {/* Featured */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_featured}
              onChange={(e) => handleChange('is_featured', e.target.checked)}
              className="w-4 h-4 text-[#ed6437] border-gray-300 rounded focus:ring-[#ed6437]"
            />
            <span className="text-sm text-gray-700">Mark as featured offer</span>
          </label>
        </div>

        {/* Flash Offer Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Flash Offer Settings</h3>

          <FlashOfferToggle
            isFlash={formData.is_flash}
            onChange={(isFlash) => handleChange('is_flash', isFlash)}
          />

          {formData.is_flash && (
            <div className="mt-4">
              <FlashTimeSelector
                startTime={formData.flash_start_time}
                endTime={formData.flash_end_time}
                onStartTimeChange={(time) => handleChange('flash_start_time', time)}
                onEndTimeChange={(time) => handleChange('flash_end_time', time)}
              />
            </div>
          )}
        </div>

        {/* Geo-Fence Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Geo-Fence Settings</h3>
          </div>

          {!canUseGeoFence && (
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-medium text-purple-900">Preferred Feature</p>
                  <p className="text-sm text-purple-700">
                    Upgrade to Preferred or Premium to access geo-fence triggers.
                  </p>
                </div>
              </div>
            </div>
          )}

          {canUseGeoFence && (
            <>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.has_geo_trigger}
                  onChange={(e) => handleChange('has_geo_trigger', e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-600"
                />
                <span className="text-sm text-gray-700">Enable geo-fence trigger for this offer</span>
              </label>

              {formData.has_geo_trigger && (
                <GeoFenceConfig
                  value={{
                    latitude: formData.geo_latitude || 0,
                    longitude: formData.geo_longitude || 0,
                    radius_meters: formData.geo_radius_meters,
                    notification_message: formData.geo_notification_message
                  }}
                  onChange={(config: GeoTriggerConfig) => {
                    setFormData(prev => ({
                      ...prev,
                      geo_latitude: config.latitude,
                      geo_longitude: config.longitude,
                      geo_radius_meters: config.radius_meters || 500,
                      geo_notification_message: config.notification_message || ''
                    }));
                  }}
                  listingCoordinates={listingCoordinates}
                  disabled={false}
                />
              )}
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors disabled:opacity-50 font-medium"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'Saving...' : (initialData ? 'Update Offer' : 'Create Offer')}
          </button>
        </div>
      </form>
    </BizModal>
  );
}

export default OfferFormModal;
