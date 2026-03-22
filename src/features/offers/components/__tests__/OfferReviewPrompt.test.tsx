/**
 * OfferReviewPrompt - Component Tests
 *
 * @tier SIMPLE
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfferReviewPrompt } from '../OfferReviewPrompt';

global.fetch = vi.fn();

describe('OfferReviewPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when user can review', () => {
    beforeEach(() => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ canReview: true }),
      });
    });

    it('renders review prompt text', async () => {
      render(<OfferReviewPrompt claimId={1} offerId={1} offerTitle="Test Offer" />);

      await waitFor(() => {
        expect(screen.getByText(/How was your experience/i)).toBeInTheDocument();
      });
    });

    it('renders Leave Review button', async () => {
      render(<OfferReviewPrompt claimId={1} offerId={1} offerTitle="Test Offer" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Leave Review/i })).toBeInTheDocument();
      });
    });

    it('renders Not now button', async () => {
      render(<OfferReviewPrompt claimId={1} offerId={1} offerTitle="Test Offer" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Not now/i })).toBeInTheDocument();
      });
    });

    it('calls onDismiss when Not now clicked', async () => {
      const mockOnDismiss = vi.fn();
      const user = userEvent.setup();
      render(<OfferReviewPrompt claimId={1} offerId={1} offerTitle="Test Offer" onDismiss={mockOnDismiss} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Not now/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Not now/i }));

      expect(mockOnDismiss).toHaveBeenCalled();
    });

    it('shows form when Leave Review clicked', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ canReview: true }),
      });

      const user = userEvent.setup();
      render(<OfferReviewPrompt claimId={1} offerId={1} offerTitle="Test Offer" />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Leave Review/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Leave Review/i }));

      // Form should now be visible
      expect(screen.getByText(/How would you rate this offer/i)).toBeInTheDocument();
    });
  });

  describe('when user cannot review', () => {
    it('renders nothing when canReview is false', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ canReview: false }),
      });

      const { container } = render(<OfferReviewPrompt claimId={1} offerId={1} offerTitle="Test Offer" />);

      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });
  });
});
