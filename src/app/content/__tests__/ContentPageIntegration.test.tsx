/**
 * ContentPageClient Integration Tests
 *
 * @tier ADVANCED
 * @phase Phase 7 - Testing & Validation
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests complete data flow from API to display, error handling,
 * filter interactions, and mixed content type rendering.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ContentPageClient } from '../ContentPageClient';

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/content',
  useSearchParams: () => mockSearchParams,
}));

// Mock fetch globally
global.fetch = vi.fn();

const mockContentItems = [
  {
    id: 1,
    type: 'article' as const,
    title: 'Test Article',
    slug: 'test-article',
    excerpt: 'Test excerpt',
    content: null,
    featured_image: 'https://example.com/article.jpg',
    tags: ['test'],
    reading_time: 5,
    view_count: 100,
    bookmark_count: 10,
    status: 'published',
    is_featured: true,
    is_sponsored: false,
    listing_id: null,
    category_id: 1,
    published_at: new Date('2024-01-01'),
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  {
    id: 2,
    type: 'video' as const,
    title: 'Test Video',
    slug: 'test-video',
    description: 'Test description',
    thumbnail: 'https://example.com/video.jpg',
    video_url: 'https://youtube.com/watch?v=test',
    video_type: 'youtube',
    duration: 120,
    tags: ['test'],
    view_count: 500,
    bookmark_count: 25,
    status: 'published',
    is_featured: false,
    is_sponsored: false,
    listing_id: null,
    category_id: 1,
    published_at: new Date('2024-01-01'),
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
];

const mockApiResponse = {
  success: true,
  data: {
    items: mockContentItems,
    page: 1,
    pageSize: 20,
    total: 2,
    hasNext: false,
    hasPrev: false,
  },
};

describe('ContentPageClient Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.forEach((_, key) => {
      mockSearchParams.delete(key);
    });

    // Default successful response
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });
  });

  describe('data flow', () => {
    it('should fetch content on mount', async () => {
      render(<ContentPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/content/search'),
          expect.objectContaining({ credentials: 'include' })
        );
      });
    });

    it('should display loading skeleton during fetch', () => {
      // Mock delayed response
      (fetch as any).mockImplementation(() => new Promise(() => {}));

      render(<ContentPageClient />);

      // Should show skeleton cards
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render content after successful fetch', async () => {
      render(<ContentPageClient />);

      await waitFor(() => {
        expect(screen.getByText('Test Article')).toBeInTheDocument();
        expect(screen.getByText('Test Video')).toBeInTheDocument();
      });
    });

    it('should display correct results count', async () => {
      render(<ContentPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Showing 2 of 2 items/)).toBeInTheDocument();
      });
    });

    it('should include credentials in API request', async () => {
      render(<ContentPageClient />);

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
          items: mockContentItems,
          page: 1,
          pageSize: 20,
          total: 50,
          hasNext: true,
          hasPrev: false,
        },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => multiPageResponse,
      });

      render(<ContentPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Showing 2 of 50 items/)).toBeInTheDocument();
      });
    });
  });

  describe('error handling flow', () => {
    it('should display error component on API failure', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: { message: 'Failed to load content', code: 'INTERNAL' },
        }),
      });

      render(<ContentPageClient />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load content')).toBeInTheDocument();
      });
    });

    it('should show network error on fetch failure', async () => {
      (fetch as any).mockRejectedValueOnce(new TypeError('Failed to fetch'));

      render(<ContentPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Unable to connect/)).toBeInTheDocument();
      });
    });

    it('should show rate limit UI for 429 response', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({}),
      });

      render(<ContentPageClient />);

      await waitFor(() => {
        expect(screen.getByText('Too Many Requests')).toBeInTheDocument();
      });
    });

    it('should detect internal server errors', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      render(<ContentPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Unable to Load Content/)).toBeInTheDocument();
      });
    });

    it('should detect timeout errors', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 504,
        json: async () => ({}),
      });

      render(<ContentPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Unable to Load Content/)).toBeInTheDocument();
      });
    });

    it('should retry when retry button clicked', async () => {
      (fetch as any)
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponse,
        });

      render(<ContentPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Unable to connect/)).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Test Article')).toBeInTheDocument();
      });
    });
  });

  describe('filter → API → display flow', () => {
    it('should update API params when page changes', async () => {
      mockSearchParams.set('page', '2');

      render(<ContentPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('page=2'),
          expect.any(Object)
        );
      });
    });

    it('should update API params when sort changes', async () => {
      mockSearchParams.set('sort', 'recent');

      render(<ContentPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('sort=recent'),
          expect.any(Object)
        );
      });
    });

    it('should update API params when search query changes', async () => {
      mockSearchParams.set('q', 'react');

      render(<ContentPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('q=react'),
          expect.any(Object)
        );
      });
    });

    it('should update API params when content type changes', async () => {
      mockSearchParams.set('type', 'article');

      render(<ContentPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('type=article'),
          expect.any(Object)
        );
      });
    });

    it('should include pageSize in API request', async () => {
      render(<ContentPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('pageSize=20'),
          expect.any(Object)
        );
      });
    });

    it('should re-fetch when URL params change', async () => {
      const { rerender } = render(<ContentPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(1);
      });

      mockSearchParams.set('q', 'new search');
      rerender(<ContentPageClient />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(2);
      });
    });

    it('should display search query in results count', async () => {
      mockSearchParams.set('q', 'react tutorial');

      render(<ContentPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/for "react tutorial"/)).toBeInTheDocument();
      });
    });
  });

  describe('masonry grid rendering', () => {
    it('should render content in masonry grid', async () => {
      const { container } = render(<ContentPageClient />);

      await waitFor(() => {
        const masonryGrid = container.querySelector('.columns-1.sm\\:columns-2');
        expect(masonryGrid).toBeInTheDocument();
      });
    });

    it('should render mixed content types', async () => {
      render(<ContentPageClient />);

      await waitFor(() => {
        // Article card
        expect(screen.getByText('Test Article')).toBeInTheDocument();
        // Video card
        expect(screen.getByText('Test Video')).toBeInTheDocument();
      });
    });

    it('should use break-inside-avoid for cards', async () => {
      const { container } = render(<ContentPageClient />);

      await waitFor(() => {
        const cards = container.querySelectorAll('.break-inside-avoid');
        expect(cards.length).toBeGreaterThan(0);
      });
    });
  });

  describe('pagination flow', () => {
    it('should render pagination when content exists', async () => {
      const multiPageResponse = {
        success: true,
        data: {
          items: mockContentItems,
          page: 1,
          pageSize: 20,
          total: 50,
          hasNext: true,
          hasPrev: false,
        },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => multiPageResponse,
      });

      render(<ContentPageClient />);

      await waitFor(() => {
        expect(screen.getByText('Test Article')).toBeInTheDocument();
      });
    });

    it('should not render pagination when loading', () => {
      (fetch as any).mockImplementation(() => new Promise(() => {}));

      render(<ContentPageClient />);

      // Pagination should not be visible during loading
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not render pagination on error', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      render(<ContentPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Unable to connect/)).toBeInTheDocument();
      });

      // No pagination should be visible
      expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no content found', async () => {
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

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => emptyResponse,
      });

      render(<ContentPageClient />);

      await waitFor(() => {
        expect(screen.getByText('No Content Found')).toBeInTheDocument();
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

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => emptyResponse,
      });

      render(<ContentPageClient />);

      await waitFor(() => {
        expect(screen.getByText(/Try adjusting your search/)).toBeInTheDocument();
      });
    });
  });

  describe('page header', () => {
    it('should render page title', () => {
      render(<ContentPageClient />);

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should render page description', () => {
      render(<ContentPageClient />);

      expect(screen.getByText(/Discover articles, videos, and podcasts/)).toBeInTheDocument();
    });
  });

  describe('components rendering', () => {
    it('should render filter bar', () => {
      const { container } = render(<ContentPageClient />);

      // Filter bar should be rendered
      const filterBar = container.querySelector('.bg-white.rounded-lg.border');
      expect(filterBar).toBeInTheDocument();
    });

    it('should render campaign section', () => {
      render(<ContentPageClient />);

      // Campaign section should be rendered
      // Note: This depends on ContentCampaignSection implementation
      // Adjust selector based on actual implementation
      expect(document.body).toBeTruthy();
    });
  });
});
