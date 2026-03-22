/**
 * BundleClaimButton - Component Tests
 *
 * @tier STANDARD
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests bundle claim button states, loading, success, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BundleClaimButton } from '../BundleClaimButton';

global.fetch = vi.fn();

describe('BundleClaimButton', () => {
  const mockOnSuccess = vi.fn();
  const mockOnAuthRequired = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('button states', () => {
    it('renders claim button for authenticated users', () => {
      render(<BundleClaimButton bundleSlug="test-bundle" isAuthenticated={true} />);

      expect(screen.getByText('Claim All Offers')).toBeInTheDocument();
    });

    it('renders sign in prompt for unauthenticated users', () => {
      render(<BundleClaimButton bundleSlug="test-bundle" isAuthenticated={false} />);

      expect(screen.getByText('Sign In to Claim Bundle')).toBeInTheDocument();
    });

    it('shows claimed state when alreadyClaimed is true', () => {
      render(<BundleClaimButton bundleSlug="test-bundle" alreadyClaimed={true} />);

      expect(screen.getByText('Bundle Claimed')).toBeInTheDocument();
    });

    it('shows expired state when isExpired is true', () => {
      render(<BundleClaimButton bundleSlug="test-bundle" isExpired={true} />);

      expect(screen.getByText('Bundle Expired')).toBeInTheDocument();
    });

    it('shows unavailable state when isInactive is true', () => {
      render(<BundleClaimButton bundleSlug="test-bundle" isInactive={true} />);

      expect(screen.getByText('Bundle Unavailable')).toBeInTheDocument();
    });

    it('shows loading state during claim', async () => {
      (global.fetch as any).mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      const user = userEvent.setup();
      render(<BundleClaimButton bundleSlug="test-bundle" isAuthenticated={true} />);

      const button = screen.getByText('Claim All Offers');
      await user.click(button);

      expect(screen.getByText('Claiming Bundle...')).toBeInTheDocument();
    });

    it('disables button during claim', async () => {
      (global.fetch as any).mockImplementationOnce(
        () => new Promise(() => {})
      );

      const user = userEvent.setup();
      render(<BundleClaimButton bundleSlug="test-bundle" isAuthenticated={true} />);

      await user.click(screen.getByText('Claim All Offers'));

      await waitFor(() => {
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
      });
    });
  });

  describe('claim functionality', () => {
    it('calls API endpoint on click', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ claimIds: [1, 2, 3] }),
      });

      const user = userEvent.setup();
      render(<BundleClaimButton bundleSlug="my-bundle" isAuthenticated={true} />);

      await user.click(screen.getByText('Claim All Offers'));

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/bundles/my-bundle/claim',
        expect.objectContaining({ method: 'POST', credentials: 'include' })
      );
    });

    it('calls onSuccess callback after successful claim', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ claimIds: [1, 2] }),
      });

      const user = userEvent.setup();
      render(
        <BundleClaimButton
          bundleSlug="test-bundle"
          isAuthenticated={true}
          onSuccess={mockOnSuccess}
        />
      );

      await user.click(screen.getByText('Claim All Offers'));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith([1, 2]);
      });
    });

    it('shows Bundle Claimed after successful claim', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ claimIds: [1] }),
      });

      const user = userEvent.setup();
      render(<BundleClaimButton bundleSlug="test-bundle" isAuthenticated={true} />);

      await user.click(screen.getByText('Claim All Offers'));

      await waitFor(() => {
        expect(screen.getByText('Bundle Claimed')).toBeInTheDocument();
      });
    });

    it('shows error message on failure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Bundle not found' }),
      });

      const user = userEvent.setup();
      render(<BundleClaimButton bundleSlug="test-bundle" isAuthenticated={true} />);

      await user.click(screen.getByText('Claim All Offers'));

      await waitFor(() => {
        expect(screen.getByText('Bundle not found')).toBeInTheDocument();
      });
    });

    it('shows default error on network failure', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const user = userEvent.setup();
      render(<BundleClaimButton bundleSlug="test-bundle" isAuthenticated={true} />);

      await user.click(screen.getByText('Claim All Offers'));

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('authentication behavior', () => {
    it('calls onAuthRequired when unauthenticated user clicks', async () => {
      const user = userEvent.setup();
      render(
        <BundleClaimButton
          bundleSlug="test-bundle"
          isAuthenticated={false}
          onAuthRequired={mockOnAuthRequired}
        />
      );

      await user.click(screen.getByText('Sign In to Claim Bundle'));

      expect(mockOnAuthRequired).toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('disabled states', () => {
    it('claimed button is disabled', () => {
      render(<BundleClaimButton bundleSlug="test-bundle" alreadyClaimed={true} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('expired button is disabled', () => {
      render(<BundleClaimButton bundleSlug="test-bundle" isExpired={true} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('inactive button is disabled', () => {
      render(<BundleClaimButton bundleSlug="test-bundle" isInactive={true} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('custom className', () => {
    it('applies custom className when authenticated', () => {
      const { container } = render(
        <BundleClaimButton
          bundleSlug="test-bundle"
          isAuthenticated={true}
          className="custom-class"
        />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('applies custom className when not authenticated', () => {
      const { container } = render(
        <BundleClaimButton
          bundleSlug="test-bundle"
          isAuthenticated={false}
          className="my-button"
        />
      );

      expect(container.querySelector('.my-button')).toBeInTheDocument();
    });
  });
});
