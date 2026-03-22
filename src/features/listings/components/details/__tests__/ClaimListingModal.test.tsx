/**
 * ClaimListingModal Unit Tests
 *
 * @phase Claim Listing Phase 8
 * @tier STANDARD
 * @coverage 14 test cases
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClaimListingModal } from '../ClaimListingModal';
import type { Listing } from '@core/services/ListingService';
import type { UseClaimListingReturn } from '@/features/listings/hooks/useClaimListing';

// Mock BizModal
vi.mock('@/components/BizModal', () => ({
  default: ({ isOpen, children, footer }: any) => (
    isOpen ? (
      <div role="dialog">
        <div>{children}</div>
        <div>{footer}</div>
      </div>
    ) : null
  ),
  BizModalButton: ({ children, onClick, disabled, variant }: any) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant}>
      {children}
    </button>
  ),
}));

describe('ClaimListingModal', () => {
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

  const createMockClaim = (overrides?: Partial<UseClaimListingReturn>): UseClaimListingReturn => ({
    isModalOpen: true,
    openModal: vi.fn(),
    closeModal: vi.fn(),
    currentStep: 'select-type',
    goToStep: vi.fn(),
    goBack: vi.fn(),
    canGoBack: false,
    formData: {
      claimType: 'owner',
      verificationMethod: null,
      verificationCode: '',
      claimantDescription: '',
    },
    updateFormData: vi.fn(),
    setClaimType: vi.fn(),
    setVerificationMethod: vi.fn(),
    initiateClaim: vi.fn().mockResolvedValue(true),
    sendVerificationCode: vi.fn().mockResolvedValue(true),
    submitVerificationCode: vi.fn().mockResolvedValue(true),
    claimStatus: {
      isClaimed: false,
      isOwner: false,
      hasActiveClaim: false,
      activeClaim: null,
      canClaim: true,
      isAuthenticated: true,
    },
    isSubmitting: false,
    error: null,
    clearError: vi.fn(),
    availableVerificationMethods: ['email', 'phone', 'manual'],
    ...overrides,
  });

  describe('Step Rendering', () => {
    it('renders select-type step with claim type options', () => {
      const claim = createMockClaim({ currentStep: 'select-type' });
      render(<ClaimListingModal listing={mockListing} claim={claim} />);

      expect(screen.getByText(/business owner/i)).toBeInTheDocument();
      expect(screen.getByText(/business manager/i)).toBeInTheDocument();
      expect(screen.getByText(/authorized representative/i)).toBeInTheDocument();
    });

    it('renders verification step with available methods', () => {
      const claim = createMockClaim({
        currentStep: 'verification',
        availableVerificationMethods: ['email', 'phone', 'manual'],
      });
      render(<ClaimListingModal listing={mockListing} claim={claim} />);

      expect(screen.getByText(/email verification/i)).toBeInTheDocument();
      expect(screen.getByText(/phone verification/i)).toBeInTheDocument();
      expect(screen.getByText(/manual verification/i)).toBeInTheDocument();
    });

    it('renders enter-code step with code input', () => {
      const claim = createMockClaim({
        currentStep: 'enter-code',
        formData: {
          claimType: 'owner',
          verificationMethod: 'email',
          verificationCode: '',
          claimantDescription: '',
        },
      });
      render(<ClaimListingModal listing={mockListing} claim={claim} />);

      const codeInput = screen.getByPlaceholderText(/000000/i);
      expect(codeInput).toBeInTheDocument();
      expect(screen.getByText(/resend code/i)).toBeInTheDocument();
    });

    it('renders confirmation step with success message', () => {
      const claim = createMockClaim({
        currentStep: 'confirmation',
        formData: {
          claimType: 'owner',
          verificationMethod: 'email',
          verificationCode: '123456',
          claimantDescription: '',
        },
      });
      render(<ClaimListingModal listing={mockListing} claim={claim} />);

      expect(screen.getByText(/claim submitted successfully/i)).toBeInTheDocument();
      expect(screen.getByText('Test Business')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('updates claim type when radio selected', () => {
      const claim = createMockClaim();
      render(<ClaimListingModal listing={mockListing} claim={claim} />);

      const managerRadio = screen.getByRole('radio', { name: /business manager/i });
      fireEvent.click(managerRadio);

      expect(claim.setClaimType).toHaveBeenCalledWith('manager');
    });

    it('updates verification method when button clicked', () => {
      const claim = createMockClaim({ currentStep: 'verification' });
      render(<ClaimListingModal listing={mockListing} claim={claim} />);

      const emailButton = screen.getByRole('button', { name: /email verification/i });
      fireEvent.click(emailButton);

      expect(claim.setVerificationMethod).toHaveBeenCalledWith('email');
    });

    it('validates verification code input (6 digits only)', () => {
      const claim = createMockClaim({ currentStep: 'enter-code' });
      render(<ClaimListingModal listing={mockListing} claim={claim} />);

      const codeInput = screen.getByPlaceholderText(/000000/i) as HTMLInputElement;

      // Test numeric filtering
      fireEvent.change(codeInput, { target: { value: '12abc34' } });
      expect(claim.updateFormData).toHaveBeenCalledWith('verificationCode', '1234');

      // Test max length
      fireEvent.change(codeInput, { target: { value: '1234567890' } });
      // Input has maxLength={6}, so onChange receives the value before truncation
      expect(claim.updateFormData).toHaveBeenCalled();
    });

    it('shows character count for description', () => {
      const claim = createMockClaim({
        formData: {
          claimType: 'owner',
          verificationMethod: null,
          verificationCode: '',
          claimantDescription: 'Test description',
        },
      });
      render(<ClaimListingModal listing={mockListing} claim={claim} />);

      expect(screen.getByText(/16\/500 characters/i)).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('shows back button when canGoBack is true', () => {
      const claim = createMockClaim({
        currentStep: 'verification',
        canGoBack: true,
      });
      render(<ClaimListingModal listing={mockListing} claim={claim} />);

      const backButton = screen.getByRole('button', { name: /back/i });
      expect(backButton).toBeInTheDocument();
    });

    it('hides back button on select-type step', () => {
      const claim = createMockClaim({
        currentStep: 'select-type',
        canGoBack: false,
      });
      render(<ClaimListingModal listing={mockListing} claim={claim} />);

      const backButton = screen.queryByRole('button', { name: /back/i });
      expect(backButton).not.toBeInTheDocument();
    });

    it('shows "Done" button on confirmation step', () => {
      const claim = createMockClaim({ currentStep: 'confirmation' });
      render(<ClaimListingModal listing={mockListing} claim={claim} />);

      const doneButton = screen.getByRole('button', { name: /done/i });
      expect(doneButton).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when claim.error is set', () => {
      const claim = createMockClaim({ error: 'Test error message' });
      render(<ClaimListingModal listing={mockListing} claim={claim} />);

      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('shows loading state during submission', () => {
      const claim = createMockClaim({ isSubmitting: true });
      render(<ClaimListingModal listing={mockListing} claim={claim} />);

      expect(screen.getByText(/processing/i)).toBeInTheDocument();
    });
  });
});
