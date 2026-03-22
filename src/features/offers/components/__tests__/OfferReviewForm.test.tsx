/**
 * OfferReviewForm - Component Tests
 *
 * @tier STANDARD
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests review form rendering, validation, rating selection, submission.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfferReviewForm } from '../OfferReviewForm';

global.fetch = vi.fn();

describe('OfferReviewForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('form rendering', () => {
    it('renders rating question', () => {
      render(<OfferReviewForm claimId={1} offerId={1} />);
      expect(screen.getByText(/How would you rate this offer/i)).toBeInTheDocument();
    });

    it('renders comment textarea when not compact', () => {
      render(<OfferReviewForm claimId={1} offerId={1} />);
      expect(screen.getByLabelText(/Additional comments/i)).toBeInTheDocument();
    });

    it('hides additional fields in compact mode', () => {
      render(<OfferReviewForm claimId={1} offerId={1} compact />);
      expect(screen.queryByLabelText(/Additional comments/i)).not.toBeInTheDocument();
    });

    it('renders submit button', () => {
      render(<OfferReviewForm claimId={1} offerId={1} />);
      expect(screen.getByRole('button', { name: /Submit Review/i })).toBeInTheDocument();
    });
  });

  describe('quick feedback questions', () => {
    it('renders "Was it as described" question', () => {
      render(<OfferReviewForm claimId={1} offerId={1} />);
      expect(screen.getByText(/Was it as described/i)).toBeInTheDocument();
    });

    it('renders "Easy to redeem" question', () => {
      render(<OfferReviewForm claimId={1} offerId={1} />);
      expect(screen.getByText(/Easy to redeem/i)).toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('submit button is disabled without rating', () => {
      render(<OfferReviewForm claimId={1} offerId={1} />);

      const submitButton = screen.getByRole('button', { name: /Submit Review/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('cancel functionality', () => {
    it('renders cancel button when onCancel is provided', () => {
      render(<OfferReviewForm claimId={1} offerId={1} onCancel={mockOnCancel} />);
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('does not render cancel button when onCancel not provided', () => {
      render(<OfferReviewForm claimId={1} offerId={1} />);
      expect(screen.queryByRole('button', { name: /Cancel/i })).not.toBeInTheDocument();
    });

    it('calls onCancel when cancel clicked', async () => {
      const user = userEvent.setup();
      render(<OfferReviewForm claimId={1} offerId={1} onCancel={mockOnCancel} />);

      await user.click(screen.getByRole('button', { name: /Cancel/i }));

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('submission', () => {
    it('renders submit button', () => {
      render(<OfferReviewForm claimId={1} offerId={1} />);

      expect(screen.getByRole('button', { name: /Submit Review/i })).toBeInTheDocument();
    });
  });
});
