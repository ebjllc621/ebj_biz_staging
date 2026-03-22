/**
 * EventReviews - Component Tests
 *
 * @tier SIMPLE
 * @phase Phase 7
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 *
 * Tests review fetching, rating distribution, loading skeleton,
 * empty state, reviewer names, pagination, and review text content.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { EventReviews } from '../EventReviews';

vi.mock('@/components/common/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('@core/utils/avatar', () => ({
  getAvatarInitials: (name: string) =>
    name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
}));

const mockReviewsResponse = {
  success: true,
  data: {
    reviews: [
      {
        id: 1,
        event_id: 1,
        user_id: 10,
        rating: 5,
        review_text: 'Amazing event!',
        is_testimonial_approved: false,
        status: 'approved',
        created_at: '2026-01-15T12:00:00Z',
        updated_at: '2026-01-15T12:00:00Z',
        user_name: 'John Doe',
        user_avatar: null
      },
      {
        id: 2,
        event_id: 1,
        user_id: 11,
        rating: 4,
        review_text: 'Great experience',
        is_testimonial_approved: false,
        status: 'approved',
        created_at: '2026-01-14T12:00:00Z',
        updated_at: '2026-01-14T12:00:00Z',
        user_name: 'Jane Smith',
        user_avatar: null
      },
    ],
    pagination: { page: 1, limit: 5, total: 2, totalPages: 1 },
    distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1, total: 2, average: 4.5 }
  }
};

function buildFetchResponse(body: unknown, ok = true) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(body),
  } as Response);
}

describe('EventReviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders review cards with star ratings', async () => {
    global.fetch = vi.fn().mockImplementation(() =>
      buildFetchResponse(mockReviewsResponse)
    );

    render(<EventReviews eventId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Amazing event!')).toBeInTheDocument();
    });
  });

  it('renders rating distribution histogram', async () => {
    global.fetch = vi.fn().mockImplementation(() =>
      buildFetchResponse(mockReviewsResponse)
    );

    render(<EventReviews eventId={1} />);

    await waitFor(() => {
      expect(screen.getByText('4.5')).toBeInTheDocument();
    });
  });

  it('renders "Reviews" heading', async () => {
    global.fetch = vi.fn().mockImplementation(() =>
      buildFetchResponse(mockReviewsResponse)
    );

    render(<EventReviews eventId={1} />);

    expect(screen.getByText('Reviews')).toBeInTheDocument();
  });

  it('renders empty state when no reviews', async () => {
    const emptyResponse = {
      success: true,
      data: {
        reviews: [],
        pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, total: 0, average: 0 }
      }
    };

    global.fetch = vi.fn().mockImplementation(() =>
      buildFetchResponse(emptyResponse)
    );

    render(<EventReviews eventId={1} />);

    await waitFor(() => {
      expect(screen.getByText('No reviews yet')).toBeInTheDocument();
    });
  });

  it('renders reviewer names', async () => {
    global.fetch = vi.fn().mockImplementation(() =>
      buildFetchResponse(mockReviewsResponse)
    );

    render(<EventReviews eventId={1} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('shows review text content', async () => {
    global.fetch = vi.fn().mockImplementation(() =>
      buildFetchResponse(mockReviewsResponse)
    );

    render(<EventReviews eventId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Great experience')).toBeInTheDocument();
    });
  });

  it('renders loading state initially', () => {
    global.fetch = vi.fn().mockImplementation(
      () => new Promise(() => { /* never resolves */ })
    );

    const { container } = render(<EventReviews eventId={1} />);

    // Loading skeleton uses animate-pulse
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('shows pagination when multiple pages exist', async () => {
    const multiPageResponse = {
      success: true,
      data: {
        reviews: [mockReviewsResponse.data.reviews[0]],
        pagination: { page: 1, limit: 5, total: 10, totalPages: 2 },
        distribution: mockReviewsResponse.data.distribution
      }
    };

    global.fetch = vi.fn().mockImplementation(() =>
      buildFetchResponse(multiPageResponse)
    );

    render(<EventReviews eventId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
    });
  });
});
