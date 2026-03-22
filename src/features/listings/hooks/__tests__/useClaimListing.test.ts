/**
 * useClaimListing Hook Unit Tests
 *
 * @phase Claim Listing Phase 8
 * @tier STANDARD
 * @coverage 24 test cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClaimListing } from '../useClaimListing';
import type { Listing } from '@core/services/ListingService';

// Mock dependencies
vi.mock('@core/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser })
}));

vi.mock('@core/utils/csrf', () => ({
  fetchWithCsrf: vi.fn()
}));

let mockUser: any = null;

describe('useClaimListing', () => {
  const mockListing: Listing = {
    id: 1,
    name: 'Test Business',
    slug: 'test-business',
    description: 'Test description',
    address: '123 Test St',
    city: 'Test City',
    state: 'TS',
    zip: '12345',
    phone: '555-1234',
    email: 'test@example.com',
    website: 'https://example.com',
    category_id: 1,
    user_id: 100,
    claimed: false,
    status: 'active' as const,
    business_hours: [],
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    mockUser = { id: 1, role: 'general' };
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('isModalOpen is false initially', () => {
      const { result } = renderHook(() => useClaimListing(mockListing));
      expect(result.current.isModalOpen).toBe(false);
    });

    it('currentStep is "select-type" initially', () => {
      const { result } = renderHook(() => useClaimListing(mockListing));
      expect(result.current.currentStep).toBe('select-type');
    });

    it('formData has correct defaults', () => {
      const { result } = renderHook(() => useClaimListing(mockListing));
      expect(result.current.formData).toEqual({
        claimType: 'owner',
        verificationMethod: null,
        verificationCode: '',
        claimantDescription: '',
      });
    });

    it('isSubmitting is false initially', () => {
      const { result } = renderHook(() => useClaimListing(mockListing));
      expect(result.current.isSubmitting).toBe(false);
    });

    it('error is null initially', () => {
      const { result } = renderHook(() => useClaimListing(mockListing));
      expect(result.current.error).toBeNull();
    });
  });

  describe('Modal Controls', () => {
    it('openModal sets isModalOpen to true', () => {
      const { result } = renderHook(() => useClaimListing(mockListing));

      act(() => {
        result.current.openModal();
      });

      expect(result.current.isModalOpen).toBe(true);
    });

    it('openModal resets currentStep to select-type', () => {
      const { result } = renderHook(() => useClaimListing(mockListing));

      act(() => {
        result.current.goToStep('verification');
        result.current.openModal();
      });

      expect(result.current.currentStep).toBe('select-type');
    });

    it('closeModal resets all state', () => {
      const { result } = renderHook(() => useClaimListing(mockListing));

      act(() => {
        result.current.openModal();
        result.current.updateFormData('claimantDescription', 'Test description');
        result.current.closeModal();
      });

      expect(result.current.isModalOpen).toBe(false);
      expect(result.current.currentStep).toBe('select-type');
      expect(result.current.formData.claimantDescription).toBe('');
      expect(result.current.error).toBeNull();
    });
  });

  describe('Step Navigation', () => {
    it('goToStep updates currentStep', () => {
      const { result } = renderHook(() => useClaimListing(mockListing));

      act(() => {
        result.current.goToStep('verification');
      });

      expect(result.current.currentStep).toBe('verification');
    });

    it('goBack moves to previous step', () => {
      const { result } = renderHook(() => useClaimListing(mockListing));

      act(() => {
        result.current.goToStep('verification');
      });

      act(() => {
        result.current.goBack();
      });

      expect(result.current.currentStep).toBe('select-type');
    });

    it('canGoBack is false on first step', () => {
      const { result } = renderHook(() => useClaimListing(mockListing));
      expect(result.current.canGoBack).toBe(false);
    });

    it('canGoBack is false on confirmation step', () => {
      const { result } = renderHook(() => useClaimListing(mockListing));

      act(() => {
        result.current.goToStep('confirmation');
      });

      expect(result.current.canGoBack).toBe(false);
    });
  });

  describe('Form Updates', () => {
    it('setClaimType updates formData.claimType', () => {
      const { result } = renderHook(() => useClaimListing(mockListing));

      act(() => {
        result.current.setClaimType('manager');
      });

      expect(result.current.formData.claimType).toBe('manager');
    });

    it('setVerificationMethod updates formData.verificationMethod', () => {
      const { result } = renderHook(() => useClaimListing(mockListing));

      act(() => {
        result.current.setVerificationMethod('email');
      });

      expect(result.current.formData.verificationMethod).toBe('email');
    });

    it('updateFormData updates specified field', () => {
      const { result } = renderHook(() => useClaimListing(mockListing));

      act(() => {
        result.current.updateFormData('claimantDescription', 'Test description');
      });

      expect(result.current.formData.claimantDescription).toBe('Test description');
    });
  });

  describe('Claim Status Derivation', () => {
    it('isClaimed reflects listing.claimed', () => {
      const claimedListing = { ...mockListing, claimed: true };
      const { result } = renderHook(() => useClaimListing(claimedListing));

      expect(result.current.claimStatus.isClaimed).toBe(true);
    });

    it('isOwner reflects user ownership', () => {
      mockUser = { id: 100, role: 'listing_member' };
      const { result } = renderHook(() => useClaimListing(mockListing));

      expect(result.current.claimStatus.isOwner).toBe(true);
    });

    it('canClaim is true for unclaimed listing with authenticated non-owner', () => {
      mockUser = { id: 2, role: 'general' };
      const { result } = renderHook(() => useClaimListing(mockListing));

      expect(result.current.claimStatus.canClaim).toBe(true);
    });

    it('canClaim is false for claimed listing', () => {
      const claimedListing = { ...mockListing, claimed: true };
      const { result } = renderHook(() => useClaimListing(claimedListing));

      expect(result.current.claimStatus.canClaim).toBe(false);
    });

    it('canClaim is false for unauthenticated user', () => {
      mockUser = null;
      const { result } = renderHook(() => useClaimListing(mockListing));

      expect(result.current.claimStatus.canClaim).toBe(false);
    });
  });

  describe('Available Verification Methods', () => {
    it('includes email when listing.email exists', () => {
      const { result } = renderHook(() => useClaimListing(mockListing));
      expect(result.current.availableVerificationMethods).toContain('email');
    });

    it('includes phone when listing.phone exists', () => {
      const { result } = renderHook(() => useClaimListing(mockListing));
      expect(result.current.availableVerificationMethods).toContain('phone');
    });

    it('includes domain when listing.website exists', () => {
      const { result } = renderHook(() => useClaimListing(mockListing));
      expect(result.current.availableVerificationMethods).toContain('domain');
    });

    it('always includes manual', () => {
      const listingWithoutContactInfo = { ...mockListing, email: null, phone: null, website: null };
      const { result } = renderHook(() => useClaimListing(listingWithoutContactInfo));
      expect(result.current.availableVerificationMethods).toContain('manual');
    });
  });
});
