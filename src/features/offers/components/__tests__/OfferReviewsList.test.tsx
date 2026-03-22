/**
 * OfferReviewsList - Component Tests
 *
 * @tier STANDARD
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfferReviewsList } from '../OfferReviewsList';

global.fetch = vi.fn();

const mockReviews = [
  { id: 1, rating: 5, comment: 'Great offer!', reviewer_name: 'User 1', created_at: '2026-01-01' },
  { id: 2, rating: 4, comment: 'Good deal', reviewer_name: 'User 2', created_at: '2026-01-15' },
];

describe('OfferReviewsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders review list after fetching', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockReviews, pagination: { page: 1, totalPages: 1 } }),
    });

    render(<OfferReviewsList offerId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Great offer!')).toBeInTheDocument();
    });
  });

  it('displays empty state when no reviews', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], pagination: { page: 1, totalPages: 1 } }),
    });

    render(<OfferReviewsList offerId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/No reviews yet/i)).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    (global.fetch as any).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { container } = render(<OfferReviewsList offerId={1} />);

    // Should show loading spinner
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows error message on fetch failure', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Failed to fetch reviews'));

    render(<OfferReviewsList offerId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch reviews/i)).toBeInTheDocument();
    });
  });

  it('shows load more button when there are more reviews', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockReviews, pagination: { page: 1, totalPages: 2 } }),
    });

    render(<OfferReviewsList offerId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Load More Reviews')).toBeInTheDocument();
    });
  });

  it('loads more reviews when button is clicked', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockReviews, pagination: { page: 1, totalPages: 2 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 3, rating: 3, comment: 'OK', reviewer_name: 'User 3', created_at: '2026-01-20' }], pagination: { page: 2, totalPages: 2 } }),
      });

    const user = userEvent.setup();
    render(<OfferReviewsList offerId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Load More Reviews')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Load More Reviews'));

    await waitFor(() => {
      expect(screen.getByText('OK')).toBeInTheDocument();
    });
  });

  it('displays reviewer name', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockReviews, pagination: { page: 1, totalPages: 1 } }),
    });

    render(<OfferReviewsList offerId={1} />);

    await waitFor(() => {
      expect(screen.getByText('User 1')).toBeInTheDocument();
    });
  });
});
