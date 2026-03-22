// @ts-nocheck - Disabled type checking for legacy component being removed in Phase 8
/**
 * Listing Creation Modal - Multi-step wizard for creating listings
 *
 * 4-step wizard:
 * 1. Basic Details (name, type, year, employees, revenue)
 * 2. Classification (categories, hours, contact)
 * 3. Contact & Location (address, phone, email, social)
 * 4. Media & Description (logo, cover, gallery, description)
 *
 * @authority PHASE_5.4_BRAIN_PLAN.md
 * @complexity ADVANCED
 * @governance 100% UMM compliance
 * @governance Tier-based limits enforced (categories, images, videos)
 * @deprecated Use NewListingModal from ./components/NewListingModal instead
 */

'use client';

import React, { useState } from 'react';
import { BizModal } from '@/components/ui/BizModal';
import { useAuth } from '@core/hooks/useAuth';
import { fetchWithCsrf } from '@core/utils/csrf';
import { Step1BasicDetails } from './components/Step1BasicDetails';
import { Step2Classification } from './components/Step2Classification';
import { Step3ContactLocation } from './components/Step3ContactLocation';
import { Step4MediaDescription } from './components/Step4MediaDescription';
// @ts-nocheck - Disabled type checking for legacy component
// @deprecated This component will be removed in Phase 8 - replaced by NewListingModal
// Using local types to avoid conflict with new listing-form.types.ts
import { ListingTier } from './types/listing-form.types';

// Local types for legacy 4-step wizard (to be removed in Phase 8)
interface LegacyListingFormData {
  name: string;
  type: string | number;
  category_ids: number[];
  gallery_images: string[];
  country: string;
  tier: ListingTier;
  status: string;
  [key: string]: unknown; // Allow additional fields
}

interface LegacyTierLimits {
  categories: number;
  images: number;
  videos: number;
  offers: number;
  events: number;
  htmlDescription: boolean;
  quoteRequests: boolean;
  storage: string;
}

interface LegacyListingCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (listingId: number) => void;
}

// Alias for component use
type ListingFormData = LegacyListingFormData;
type TierLimits = LegacyTierLimits;
type ListingCreationModalProps = LegacyListingCreationModalProps;

const TIER_LIMITS: Record<ListingTier, TierLimits> = {
  essentials: {
    categories: 6,
    images: 6,
    videos: 1,
    offers: 4,
    events: 4,
    htmlDescription: false,
    quoteRequests: false,
    storage: 'LOCAL'
  },
  plus: {
    categories: 12,
    images: 12,
    videos: 10,
    offers: 10,
    events: 10,
    htmlDescription: true,
    quoteRequests: true,
    storage: 'LOCAL'
  },
  preferred: {
    categories: 20,
    images: 100,
    videos: 50,
    offers: 50,
    events: 50,
    htmlDescription: true,
    quoteRequests: true,
    storage: 'CLOUDINARY'
  },
  premium: {
    categories: 20,
    images: 100,
    videos: 50,
    offers: 50,
    events: 50,
    htmlDescription: true,
    quoteRequests: true,
    storage: 'CLOUDINARY'
  }
};

/**
 * ListingCreationModal - Multi-step wizard for creating listings
 *
 * @param {object} props - Component props
 * @param {boolean} props.isOpen - Modal open state
 * @param {function} props.onClose - Close handler
 * @param {function} props.onSuccess - Success callback with listing ID
 * @returns {JSX.Element}
 */
export function ListingCreationModal({ isOpen, onClose, onSuccess }: ListingCreationModalProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ListingFormData>({
    name: '',
    type: '',
    category_ids: [],
    gallery_images: [],
    country: 'US',
    tier: 'essentials',
    status: 'draft'
  });

  // GOVERNANCE: Account type check - only listing_member and admin
  if (!user || (user.role !== 'listing_member' && user.role !== 'admin')) {
    return (
      <BizModal isOpen={isOpen} onClose={onClose} title="Access Denied">
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">
            Only listing members can create listings. Please upgrade your account.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Close
          </button>
        </div>
      </BizModal>
    );
  }

  const updateFormData = (updates: Partial<ListingFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const tierLimits = TIER_LIMITS[formData.tier];

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!formData.name.trim()) {
        alert('Business name is required');
        return false;
      }
      if (!formData.type) {
        alert('Business type is required');
        return false;
      }
    }

    if (step === 2) {
      if (formData.category_ids.length === 0) {
        alert('Please select at least one category');
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      return;
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (publishNow: boolean) => {
    if (!validateStep(currentStep)) {
      return;
    }

    setSubmitting(true);
    try {
      // Update status based on user choice
      const submissionData = {
        ...formData,
        status: publishNow ? 'published' : 'draft'
      };

      // Create listing via API
      // @governance MANDATORY - CSRF protection for POST requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf('/api/listings', {
        method: 'POST',
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to create listing');
      }

      const result = await response.json();
      const listingId = result.data?.listing?.id;

      if (!listingId) {
        throw new Error('Listing ID not returned from server');
      }

      // Success
      onSuccess(listingId);
      onClose();

      // Reset form
      setFormData({
        name: '',
        type: '',
        category_ids: [],
        gallery_images: [],
        country: 'US',
        tier: 'essentials',
        status: 'draft'
      });
      setCurrentStep(1);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    const stepProps = {
      formData,
      updateFormData,
      tierLimits
    };

    switch (currentStep) {
      case 1:
        return <Step1BasicDetails {...stepProps} />;
      case 2:
        return <Step2Classification {...stepProps} />;
      case 3:
        return <Step3ContactLocation {...stepProps} />;
      case 4:
        return <Step4MediaDescription {...stepProps} />;
      default:
        return null;
    }
  };

  const footer = (
    <div className="flex items-center justify-between">
      <div className="text-sm text-gray-600">
        Step {currentStep} of 4
      </div>
      <div className="flex gap-3">
        {currentStep > 1 && (
          <button
            onClick={handleBack}
            disabled={submitting}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Back
          </button>
        )}
        {currentStep < 4 ? (
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Next
          </button>
        ) : (
          <>
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={submitting}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {submitting ? 'Publishing...' : 'Publish Listing'}
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Listing"
      size="large"
      footer={footer}
      closeOnBackdropClick={false}
    >
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`flex items-center ${
                step <= currentStep ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step <= currentStep
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300'
                }`}
              >
                {step}
              </div>
              {step < 4 && (
                <div
                  className={`w-16 h-0.5 ${
                    step < currentStep ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-600">
          <span>Basic</span>
          <span>Classify</span>
          <span>Contact</span>
          <span>Media</span>
        </div>
      </div>

      {/* Tier Selection */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Subscription Tier
        </label>
        <select
          value={formData.tier}
          onChange={(e) => updateFormData({ tier: e.target.value as ListingTier })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="essentials">Essentials (FREE) - 6 categories, 6 images, 1 video</option>
          <option value="plus">Plus ($49/mo) - 12 categories, 12 images, 10 videos</option>
          <option value="preferred">
            Preferred ($129/mo) - 20 categories, 100 images, 50 videos
          </option>
          <option value="premium">
            Premium ($299/mo) - 20 categories, 100 images, 50 videos + Featured
          </option>
        </select>
      </div>

      {/* Step Content */}
      <div className="max-h-96 overflow-y-auto">{renderStep()}</div>
    </BizModal>
  );
}
