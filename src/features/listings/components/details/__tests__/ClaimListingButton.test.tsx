/**
 * ClaimListingButton Unit Tests
 *
 * @phase Claim Listing Phase 8
 * @tier STANDARD
 * @coverage 12 test cases
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClaimListingButton } from '../ClaimListingButton';
import type { ClaimUIStatus } from '@/features/listings/hooks/useClaimListing';

describe('ClaimListingButton', () => {
  const mockOnClick = vi.fn();

  const defaultClaimStatus: ClaimUIStatus = {
    isClaimed: false,
    isOwner: false,
    hasActiveClaim: false,
    activeClaim: null,
    canClaim: true,
    isAuthenticated: true,
  };

  describe('Desktop Variant', () => {
    it('renders null when isClaimed is true', () => {
      const { container } = render(
        <ClaimListingButton
          claimStatus={{ ...defaultClaimStatus, isClaimed: true }}
          isAuthenticated={true}
          onClaimClick={mockOnClick}
          variant="desktop"
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders disabled button when not authenticated', () => {
      render(
        <ClaimListingButton
          claimStatus={{ ...defaultClaimStatus, canClaim: false }}
          isAuthenticated={false}
          onClaimClick={mockOnClick}
          variant="desktop"
        />
      );

      const button = screen.getByRole('button', { name: /claim this business/i });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'Sign in to claim this business');
    });

    it('renders "Claim In Progress" when hasActiveClaim is true', () => {
      render(
        <ClaimListingButton
          claimStatus={{ ...defaultClaimStatus, hasActiveClaim: true, canClaim: false }}
          isAuthenticated={true}
          onClaimClick={mockOnClick}
          variant="desktop"
        />
      );

      const button = screen.getByRole('button', { name: /claim in progress/i });
      expect(button).toBeDisabled();
      expect(button).toHaveClass('border-yellow-600', 'bg-yellow-50', 'text-yellow-700');
    });

    it('renders active claim button when canClaim is true', () => {
      render(
        <ClaimListingButton
          claimStatus={{ ...defaultClaimStatus, canClaim: true }}
          isAuthenticated={true}
          onClaimClick={mockOnClick}
          variant="desktop"
        />
      );

      const button = screen.getByRole('button', { name: /claim this business/i });
      expect(button).not.toBeDisabled();
      expect(button).toHaveClass('border-green-600', 'bg-green-600', 'text-white');
    });

    it('calls onClaimClick when clicked', () => {
      render(
        <ClaimListingButton
          claimStatus={{ ...defaultClaimStatus, canClaim: true }}
          isAuthenticated={true}
          onClaimClick={mockOnClick}
          variant="desktop"
        />
      );

      const button = screen.getByRole('button', { name: /claim this business/i });
      fireEvent.click(button);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('returns null when canClaim is false and no active claim', () => {
      const { container } = render(
        <ClaimListingButton
          claimStatus={{ ...defaultClaimStatus, canClaim: false, hasActiveClaim: false, isOwner: true }}
          isAuthenticated={true}
          onClaimClick={mockOnClick}
          variant="desktop"
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Mobile Variant', () => {
    it('renders null when isClaimed is true', () => {
      const { container } = render(
        <ClaimListingButton
          claimStatus={{ ...defaultClaimStatus, isClaimed: true }}
          isAuthenticated={true}
          onClaimClick={mockOnClick}
          variant="mobile"
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders disabled button when not authenticated', () => {
      render(
        <ClaimListingButton
          claimStatus={{ ...defaultClaimStatus, canClaim: false }}
          isAuthenticated={false}
          onClaimClick={mockOnClick}
          variant="mobile"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('text-gray-400', 'min-w-[44px]');
    });

    it('renders "Pending" when hasActiveClaim is true', () => {
      render(
        <ClaimListingButton
          claimStatus={{ ...defaultClaimStatus, hasActiveClaim: true, canClaim: false }}
          isAuthenticated={true}
          onClaimClick={mockOnClick}
          variant="mobile"
        />
      );

      const button = screen.getByRole('button', { name: /pending/i });
      expect(button).toBeDisabled();
      expect(button).toHaveClass('text-yellow-600', 'min-w-[44px]');
    });

    it('renders active claim button when canClaim is true', () => {
      render(
        <ClaimListingButton
          claimStatus={{ ...defaultClaimStatus, canClaim: true }}
          isAuthenticated={true}
          onClaimClick={mockOnClick}
          variant="mobile"
        />
      );

      const button = screen.getByRole('button', { name: /claim/i });
      expect(button).not.toBeDisabled();
      expect(button).toHaveClass('text-green-600', 'min-w-[44px]', 'active:scale-95');
    });

    it('has min-w-[44px] for touch target', () => {
      render(
        <ClaimListingButton
          claimStatus={{ ...defaultClaimStatus, canClaim: true }}
          isAuthenticated={true}
          onClaimClick={mockOnClick}
          variant="mobile"
        />
      );

      const button = screen.getByRole('button', { name: /claim/i });
      expect(button).toHaveClass('min-w-[44px]');
    });

    it('calls onClaimClick when clicked', () => {
      mockOnClick.mockClear();

      render(
        <ClaimListingButton
          claimStatus={{ ...defaultClaimStatus, canClaim: true }}
          isAuthenticated={true}
          onClaimClick={mockOnClick}
          variant="mobile"
        />
      );

      const button = screen.getByRole('button', { name: /claim/i });
      fireEvent.click(button);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
  });
});
