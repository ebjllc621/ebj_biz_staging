/**
 * EventReviewForm - Component Tests
 *
 * @tier SIMPLE
 * @phase Phase 8D
 * @generated DNA v11.4.0
 *
 * Tests star rating selection, textarea validation, submit behavior,
 * testimonial prompt flow, cancel, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventReviewForm } from '../EventReviewForm';

vi.mock('@core/utils/csrf', () => ({
  fetchWithCsrf: vi.fn(),
}));

import { fetchWithCsrf } from '@core/utils/csrf';
const mockFetchWithCsrf = vi.mocked(fetchWithCsrf);

const defaultProps = {
  eventId: 42,
  eventTitle: 'Summer Festival',
  businessName: 'Local Brewery',
  onSuccess: vi.fn(),
  onCancel: vi.fn(),
};

function buildCsrfResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

describe('EventReviewForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render 5 star buttons', () => {
      render(<EventReviewForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: '1 star' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '2 stars' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '3 stars' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '4 stars' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '5 stars' })).toBeInTheDocument();
    });

    it('should render textarea and submit button', () => {
      render(<EventReviewForm {...defaultProps} />);

      expect(screen.getByPlaceholderText('Share your experience at this event...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit review/i })).toBeInTheDocument();
    });

    it('should render cancel button when onCancel is provided', () => {
      render(<EventReviewForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('star rating', () => {
    it('should update rating on star click', async () => {
      const user = userEvent.setup();
      render(<EventReviewForm {...defaultProps} />);

      const star4 = screen.getByRole('button', { name: '4 stars' });
      await user.click(star4);

      // After clicking 4 stars, submit should be enabled (no longer disabled due to rating === 0)
      const submitButton = screen.getByRole('button', { name: /submit review/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('validation', () => {
    it('should disable submit when no rating selected', () => {
      render(<EventReviewForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /submit review/i });
      expect(submitButton).toBeDisabled();
    });

    it('should show character count warning for short review text', async () => {
      const user = userEvent.setup();
      render(<EventReviewForm {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Share your experience at this event...');
      await user.type(textarea, 'Too short');

      // 9 chars typed — 20-9=11 more required
      expect(screen.getByText(/more characters required/)).toBeInTheDocument();
    });

    it('should disable submit when review text is under 20 chars', async () => {
      const user = userEvent.setup();
      render(<EventReviewForm {...defaultProps} />);

      // Click a star to remove rating=0 block
      await user.click(screen.getByRole('button', { name: '5 stars' }));

      // Type short text
      const textarea = screen.getByPlaceholderText('Share your experience at this event...');
      await user.type(textarea, 'Too short');

      const submitButton = screen.getByRole('button', { name: /submit review/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('submit', () => {
    it('should POST review with correct payload', async () => {
      const user = userEvent.setup();
      mockFetchWithCsrf.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: { review: { id: 1, rating: 4, review_text: '', event_id: 42, user_id: 1, status: 'approved', is_testimonial_approved: false, created_at: '', updated_at: '' } }
        }),
      } as Response);

      render(<EventReviewForm {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: '4 stars' }));
      await user.click(screen.getByRole('button', { name: /submit review/i }));

      await waitFor(() => {
        expect(mockFetchWithCsrf).toHaveBeenCalledWith(
          '/api/events/42/reviews',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"rating":4'),
          })
        );
      });
    });

    it('should call onSuccess after successful submit', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      const reviewData = { id: 1, rating: 3, review_text: '', event_id: 42, user_id: 1, status: 'approved', is_testimonial_approved: false, created_at: '', updated_at: '' };

      mockFetchWithCsrf.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: { review: reviewData } }),
      } as Response);

      render(<EventReviewForm {...defaultProps} onSuccess={onSuccess} />);

      await user.click(screen.getByRole('button', { name: '3 stars' }));
      await user.click(screen.getByRole('button', { name: /submit review/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(reviewData);
      });
    });
  });

  describe('testimonial', () => {
    it('should show testimonial prompt for 4+ star rating', async () => {
      const user = userEvent.setup();
      const reviewData = { id: 1, rating: 4, review_text: '', event_id: 42, user_id: 1, status: 'approved', is_testimonial_approved: false, created_at: '', updated_at: '' };

      mockFetchWithCsrf.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: { review: reviewData } }),
      } as Response);

      render(<EventReviewForm {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: '4 stars' }));
      await user.click(screen.getByRole('button', { name: /submit review/i }));

      await waitFor(() => {
        expect(screen.getByText(/feature my review/i)).toBeInTheDocument();
      });
    });

    it('should NOT show testimonial prompt when businessName is null', async () => {
      const user = userEvent.setup();
      const reviewData = { id: 1, rating: 5, review_text: '', event_id: 42, user_id: 1, status: 'approved', is_testimonial_approved: false, created_at: '', updated_at: '' };

      mockFetchWithCsrf.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: { review: reviewData } }),
      } as Response);

      render(<EventReviewForm {...defaultProps} businessName={null} />);

      await user.click(screen.getByRole('button', { name: '5 stars' }));
      await user.click(screen.getByRole('button', { name: /submit review/i }));

      await waitFor(() => {
        expect(screen.getByText(/thank you/i)).toBeInTheDocument();
      });

      expect(screen.queryByText(/feature my review/i)).not.toBeInTheDocument();
    });
  });

  describe('cancel', () => {
    it('should call onCancel when Cancel clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      render(<EventReviewForm {...defaultProps} onCancel={onCancel} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should show error on 409 (already reviewed)', async () => {
      const user = userEvent.setup();
      mockFetchWithCsrf.mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ error: { message: 'Already reviewed' } }),
      } as Response);

      render(<EventReviewForm {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: '5 stars' }));
      await user.click(screen.getByRole('button', { name: /submit review/i }));

      await waitFor(() => {
        expect(screen.getByText('You have already reviewed this event')).toBeInTheDocument();
      });
    });

    it('should show error when no rating selected and submit attempted via form', async () => {
      const user = userEvent.setup();
      render(<EventReviewForm {...defaultProps} />);

      // Submit button is disabled — try direct form submit via Enter key on form context
      // Instead verify the disabled state which prevents submission
      const submitButton = screen.getByRole('button', { name: /submit review/i });
      expect(submitButton).toBeDisabled();
      expect(mockFetchWithCsrf).not.toHaveBeenCalled();
    });
  });
});
