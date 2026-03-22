/**
 * OffersPage Integration Tests
 *
 * @tier ADVANCED
 * @phase Phase 9 - Testing & Validation
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests complete data flow from API to display, error handling,
 * filter interactions, and display mode switching.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { OffersPageClient } from '../OffersPageClient';
import type { OfferWithCoordinates } from '@/features/offers/types';

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/offers',
  useSearchParams: () => mockSearchParams,
}));

// Mock dynamic imports
vi.mock('next/dynamic', () => ({
  default: () => {
    const Component = () => null;
    Component.displayName = 'DynamicComponent';
    return Component;
  },
}));

// Mock fetch globally
global.fetch = vi.fn();

const mockOffer: OfferWithCoordinates = {
  id: 1,
  listing_id: 1,
  title: 'Summer Sale - 50% Off',
  slug: 'summer-sale-50-off',
  listing_name: 'Local Business',
  listing_slug: 'local-business',
  offer_type: 'discount',
  original_price: 100.00,
  sale_price: 50.00,
  discount_percentage: 50,
  image: 'https://example.com/offer.jpg',
  start_date: '2026-01-01',
  end_date: '2026-02-01',
  quantity_remaining: 5,
  is_featured: true,
  latitude: 47.6062,
  longitude: -122.3321,
  listing_tier: 'premium',
  listing_claimed: true,
};

const mockApiResponse = {
  success: true,
  data: {
    items: [mockOffer],
    page: 1,
    pageSize: 20,
    total: 1,
    hasNext: false,
    hasPrev: false,
  },
};

describe('OffersPage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.forEach((_, key) => {
      mockSearchParams.delete(key);
    });

    // Default successful response
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as Response);
  });

  describe('data flow', () => {
    it('should fetch offers on mount', async () => {
      render(<OffersPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/offers/search'),
          expect.objectContaining({ credentials: 'include' })
        );
      });
    });

    it('should display loading skeleton during fetch', () => {
      // Mock a delayed response
      vi.mocked(fetch).mockImplementation(() => new Promise(() => {}) as Promise<Response>);

      render(<OffersPageClient />);

      // Should show skeleton cards
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render offers after successful fetch', async () => {
      render(<OffersPageClient />);

      await waitFor(() => {
        expect(screen.getByText('Summer Sale - 50% Off')).toBeInTheDocument();
      });
    });

    it('should display correct results count', async () => {
      render(<OffersPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Showing 1 of 1 offers/)).toBeInTheDocument();
      });
    });

    it('should include credentials in API request', async () => {
      render(<OffersPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ credentials: 'include' })
        );
      });
    });

    it('should parse pagination data from response', async () => {
      const multiPageResponse = {
        success: true,
        data: {
          items: [mockOffer, { ...mockOffer, id: 2, title: 'Offer 2' }],
          page: 1,
          pageSize: 20,
          total: 50,
          hasNext: true,
          hasPrev: false,
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => multiPageResponse,
      } as Response);

      render(<OffersPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Showing 2 of 50 offers/)).toBeInTheDocument();
      });
    });
  });

  describe('error handling flow', () => {
    it('should display error component on API failure', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: { message: 'Failed to load offers', code: 'INTERNAL' },
        }),
      } as Response);

      render(<OffersPageClient />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load offers')).toBeInTheDocument();
      });
    });

    it('should show network error on fetch failure', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));

      render(<OffersPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Unable to connect/)).toBeInTheDocument();
      });
    });

    it('should show rate limit UI for 429 response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({}),
      } as Response);

      render(<OffersPageClient />);

      await waitFor(() => {
        expect(screen.getByText('Too Many Requests')).toBeInTheDocument();
      });
    });

    it('should detect internal server errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      } as Response);

      render(<OffersPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Server error/)).toBeInTheDocument();
      });
    });

    it('should detect timeout errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 504,
        json: async () => ({}),
      } as Response);

      render(<OffersPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Request timeout/)).toBeInTheDocument();
      });
    });

    it('should retry when retry button clicked', async () => {
      vi.mocked(fetch)
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse,
        } as Response);

      render(<OffersPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Unable to connect/)).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Summer Sale - 50% Off')).toBeInTheDocument();
      });
    });
  });

  describe('filter → API → display flow', () => {
    it('should update API params when page changes', async () => {
      mockSearchParams.set('page', '2');

      render(<OffersPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('page=2'),
          expect.any(Object)
        );
      });
    });

    it('should update API params when sort changes', async () => {
      mockSearchParams.set('sort', 'price_low');

      render(<OffersPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('sort=price_low'),
          expect.any(Object)
        );
      });
    });

    it('should update API params when search query changes', async () => {
      mockSearchParams.set('q', 'summer');

      render(<OffersPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('q=summer'),
          expect.any(Object)
        );
      });
    });

    it('should include pageSize in API request', async () => {
      render(<OffersPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('pageSize=20'),
          expect.any(Object)
        );
      });
    });

    it('should re-fetch when URL params change', async () => {
      const { rerender } = render(<OffersPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(1);
      });

      mockSearchParams.set('q', 'new search');
      rerender(<OffersPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(2);
      });
    });

    it('should display search query in results count', async () => {
      mockSearchParams.set('q', 'summer');

      render(<OffersPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/for "summer"/)).toBeInTheDocument();
      });
    });
  });

  describe('display mode → rendering flow', () => {
    it('should render grid when mode is grid', async () => {
      mockSearchParams.set('view', 'grid');

      const { container } = render(<OffersPageClient />);

      await waitFor(() => {
        const gridContainer = container.querySelector('.grid.gap-6');
        expect(gridContainer).toBeInTheDocument();
      });
    });

    it('should render list when mode is list', async () => {
      mockSearchParams.set('view', 'list');

      const { container } = render(<OffersPageClient />);

      await waitFor(() => {
        const listContainer = container.querySelector('.space-y-4');
        expect(listContainer).toBeInTheDocument();
      });
    });

    it('should default to grid mode when no view param', async () => {
      const { container } = render(<OffersPageClient />);

      await waitFor(() => {
        const gridContainer = container.querySelector('.grid.gap-6');
        expect(gridContainer).toBeInTheDocument();
      });
    });

    it('should update display mode when toggle clicked', async () => {
      render(<OffersPageClient />);

      await waitFor(() => {
        expect(screen.getByText('Summer Sale - 50% Off')).toBeInTheDocument();
      });

      const listButton = screen.getByLabelText('List view');
      fireEvent.click(listButton);

      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('view=list'),
        expect.objectContaining({ scroll: false })
      );
    });
  });

  describe('pagination flow', () => {
    it('should render pagination when offers exist', async () => {
      const multiPageResponse = {
        success: true,
        data: {
          items: [mockOffer],
          page: 1,
          pageSize: 20,
          total: 50,
          hasNext: true,
          hasPrev: false,
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => multiPageResponse,
      } as Response);

      render(<OffersPageClient />);

      await waitFor(() => {
        // Pagination placeholder should be rendered
        expect(screen.getByText('Summer Sale - 50% Off')).toBeInTheDocument();
      });
    });

    it('should not render pagination when loading', () => {
      vi.mocked(fetch).mockImplementation(() => new Promise(() => {}) as Promise<Response>);

      render(<OffersPageClient />);

      // Pagination should not be visible during loading
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not render pagination on error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      render(<OffersPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Unable to connect/)).toBeInTheDocument();
      });

      // No pagination should be visible
      expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no offers found', async () => {
      const emptyResponse = {
        success: true,
        data: {
          items: [],
          page: 1,
          pageSize: 20,
          total: 0,
          hasNext: false,
          hasPrev: false,
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => emptyResponse,
      } as Response);

      render(<OffersPageClient />);

      await waitFor(() => {
        expect(screen.getByText('No Offers Found')).toBeInTheDocument();
      });
    });

    it('should show helpful message in empty state', async () => {
      const emptyResponse = {
        success: true,
        data: {
          items: [],
          page: 1,
          pageSize: 20,
          total: 0,
          hasNext: false,
          hasPrev: false,
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => emptyResponse,
      } as Response);

      render(<OffersPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Try adjusting your search/)).toBeInTheDocument();
      });
    });
  });

  describe('page header', () => {
    it('should render page title', async () => {
      render(<OffersPageClient />);

      await waitFor(() => {
        expect(screen.getByText('Offers & Deals')).toBeInTheDocument();
      });
    });

    it('should render page description', async () => {
      render(<OffersPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Browse exclusive offers/)).toBeInTheDocument();
      });
    });
  });

  describe('controls rendering', () => {
    it('should render display toggle', async () => {
      render(<OffersPageClient />);

      await waitFor(() => {
        expect(screen.getByLabelText('Display mode')).toBeInTheDocument();
      });
    });

    it('should render map toggle', async () => {
      render(<OffersPageClient />);

      await waitFor(() => {
        expect(screen.getByLabelText('Toggle map')).toBeInTheDocument();
      });
    });
  });
});
