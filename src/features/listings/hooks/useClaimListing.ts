'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@core/hooks/useAuth';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { Listing } from '@core/services/ListingService';
import type {
  ClaimType,
  VerificationMethod,
  ListingClaim,
} from '@core/services/ClaimListingService';

// Types
export type ClaimStep = 'select-type' | 'verification' | 'enter-code' | 'confirmation';

export interface ClaimFormData {
  claimType: ClaimType;
  verificationMethod: VerificationMethod | null;
  verificationCode: string;
  claimantDescription: string;
}

export interface ClaimUIStatus {
  isClaimed: boolean;
  isOwner: boolean;
  hasActiveClaim: boolean;
  activeClaim: ListingClaim | null;
  canClaim: boolean;
  isAuthenticated: boolean;
}

export interface UseClaimListingReturn {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  currentStep: ClaimStep;
  goToStep: (_step: ClaimStep) => void;
  goBack: () => void;
  canGoBack: boolean;
  formData: ClaimFormData;
  updateFormData: (_field: keyof ClaimFormData, _value: string) => void;
  setClaimType: (_type: ClaimType) => void;
  setVerificationMethod: (_method: VerificationMethod) => void;
  initiateClaim: () => Promise<boolean>;
  sendVerificationCode: () => Promise<boolean>;
  submitVerificationCode: () => Promise<boolean>;
  claimStatus: ClaimUIStatus;
  isSubmitting: boolean;
  error: string | null;
  clearError: () => void;
  availableVerificationMethods: VerificationMethod[];
}

const STEP_ORDER: ClaimStep[] = ['select-type', 'verification', 'enter-code', 'confirmation'];

export function useClaimListing(listing: Listing | null): UseClaimListingReturn {
  const { user } = useAuth();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<ClaimStep>('select-type');

  // Form state
  const [formData, setFormData] = useState<ClaimFormData>({
    claimType: 'owner',
    verificationMethod: null,
    verificationCode: '',
    claimantDescription: '',
  });

  // Active claim state (fetched from API)
  const [activeClaim, setActiveClaim] = useState<ListingClaim | null>(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived claim status
  const claimStatus = useMemo<ClaimUIStatus>(() => ({
    isClaimed: listing?.claimed === true,
    isOwner: user && listing ? listing.user_id === Number(user.id) : false,
    hasActiveClaim: activeClaim !== null,
    activeClaim,
    canClaim: listing
      ? (!listing.claimed && !!user && user.role !== 'visitor' && !activeClaim)
      : false,
    isAuthenticated: !!user,
  }), [listing, user, activeClaim]);

  // Available verification methods based on listing data
  const availableVerificationMethods = useMemo<VerificationMethod[]>(() => {
    if (!listing) return [];

    const methods: VerificationMethod[] = [];
    if (listing.email) methods.push('email');
    if (listing.phone) methods.push('phone');
    if (listing.website) methods.push('domain');
    methods.push('manual'); // Always available
    return methods;
  }, [listing]);

  // Modal controls
  const openModal = useCallback(() => {
    setIsModalOpen(true);
    setCurrentStep('select-type');
    setError(null);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setCurrentStep('select-type');
    setFormData({
      claimType: 'owner',
      verificationMethod: null,
      verificationCode: '',
      claimantDescription: '',
    });
    setError(null);
  }, []);

  // Step navigation
  const goToStep = useCallback((step: ClaimStep) => {
    setCurrentStep(step);
    setError(null);
  }, []);

  const goBack = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex > 0) {
      const prevStep = STEP_ORDER[currentIndex - 1];
      if (prevStep) {
        setCurrentStep(prevStep);
        setError(null);
      }
    }
  }, [currentStep]);

  const canGoBack = useMemo(() => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    return currentIndex > 0 && currentStep !== 'confirmation';
  }, [currentStep]);

  // Form updates
  const updateFormData = useCallback((field: keyof ClaimFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  }, []);

  const setClaimType = useCallback((type: ClaimType) => {
    setFormData(prev => ({ ...prev, claimType: type }));
  }, []);

  const setVerificationMethod = useCallback((method: VerificationMethod) => {
    setFormData(prev => ({ ...prev, verificationMethod: method }));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // API calls
  const initiateClaim = useCallback(async (): Promise<boolean> => {
    if (!listing) return false;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf('/api/listings/claim/initiate', {
        method: 'POST',
        body: JSON.stringify({
          listing_id: listing.id,
          claim_type: formData.claimType,
          claimant_description: formData.claimantDescription || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || data.error || 'Failed to initiate claim');
        return false;
      }

      if (data.success === true) {
        const claim = data.data?.claim ?? null;
        if (claim) {
          setActiveClaim(claim);
        }
        goToStep('verification');
        return true;
      } else {
        setError(data.error?.message || 'Failed to initiate claim');
        return false;
      }
    } catch (err) {
      setError('Network error. Please try again.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [listing, formData.claimType, formData.claimantDescription, goToStep]);

  const sendVerificationCode = useCallback(async (): Promise<boolean> => {
    if (!listing || !formData.verificationMethod) return false;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf('/api/listings/claim/verify/send', {
        method: 'POST',
        body: JSON.stringify({
          listing_id: listing.id,
          verification_method: formData.verificationMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || data.error || 'Failed to send verification code');
        return false;
      }

      if (data.success === true) {
        // Manual verification goes to confirmation, others go to enter-code
        if (formData.verificationMethod === 'manual' || data.data?.submitted === true) {
          goToStep('confirmation');
        } else {
          goToStep('enter-code');
        }
        return true;
      } else {
        setError(data.error?.message || 'Failed to send verification code');
        return false;
      }
    } catch (err) {
      setError('Network error. Please try again.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [listing, formData.verificationMethod, goToStep]);

  const submitVerificationCode = useCallback(async (): Promise<boolean> => {
    if (!listing || !formData.verificationCode) {
      setError('Please enter the verification code');
      return false;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf('/api/listings/claim/verify/confirm', {
        method: 'POST',
        body: JSON.stringify({
          listing_id: listing.id,
          verification_code: formData.verificationCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error?.message || data.error || 'Invalid verification code');
        return false;
      }

      if (data.success === true) {
        const verified = data.data?.verified;
        if (verified === false) {
          setError(data.data?.message || 'Invalid verification code. Please try again.');
          return false;
        }
        goToStep('confirmation');
        return true;
      } else {
        setError(data.error?.message || 'Invalid verification code');
        return false;
      }
    } catch (err) {
      setError('Network error. Please try again.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [listing, formData.verificationCode, goToStep]);

  return {
    isModalOpen,
    openModal,
    closeModal,
    currentStep,
    goToStep,
    goBack,
    canGoBack,
    formData,
    updateFormData,
    setClaimType,
    setVerificationMethod,
    initiateClaim,
    sendVerificationCode,
    submitVerificationCode,
    claimStatus,
    isSubmitting,
    error,
    clearError,
    availableVerificationMethods,
  };
}
