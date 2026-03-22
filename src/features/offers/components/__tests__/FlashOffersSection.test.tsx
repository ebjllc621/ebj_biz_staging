/**
 * FlashOffersSection - Component Tests
 *
 * @tier STANDARD
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests section rendering, FlashOfferCard rendering for each offer, and empty state.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FlashOffersSection } from '../FlashOffersSection';

// Mock fetch
global.fetch = vi.fn();

const mockOffers = [
  {
    id: 1,
    listing_id: 1,
    title: 'Flash Deal 1',
    slug: 'flash-deal-1',
    offer_type: 'discount',
    sale_price: 50.00,
    start_date: '2026-01-01',
    end_date: new Date(Date.now() + 3600000).toISOString(),
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    listing_id: 2,
    title: 'Flash Deal 2',
    slug: 'flash-deal-2',
    offer_type: 'discount',
    sale_price: 30.00,
    start_date: '2026-01-01',
    end_date: new Date(Date.now() + 3600000).toISOString(),
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

describe('FlashOffersSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders section title "Flash Deals"', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ offers: mockOffers }),
      });

      render(<FlashOffersSection />);

      await waitFor(() => {
        expect(screen.getByText('Flash Deals')).toBeInTheDocument();
      });
    });

    it('renders FlashOfferCard for each offer', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ offers: mockOffers }),
      });

      render(<FlashOffersSection />);

      await waitFor(() => {
        expect(screen.getByText('Flash Deal 1')).toBeInTheDocument();
        expect(screen.getByText('Flash Deal 2')).toBeInTheDocument();
      });
    });

    it('renders "View All" link', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ offers: mockOffers }),
      });

      const { container } = render(<FlashOffersSection />);

      await waitFor(() => {
        const viewAllLink = screen.getByText('View All').closest('a');
        expect(viewAllLink).toHaveAttribute('href', '/offers?flash=true');
      });
    });
  });

  describe('empty state', () => {
    it('shows nothing when no flash offers', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ offers: [] }),
      });

      const { container } = render(<FlashOffersSection />);

      await waitFor(() => {
        // Section should be hidden
        expect(container.querySelector('section')).not.toBeInTheDocument();
      });
    });

    it('shows nothing when API error occurs', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

      const { container } = render(<FlashOffersSection />);

      await waitFor(() => {
        // Section should be hidden
        expect(container.querySelector('section')).not.toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('shows loading spinner initially', () => {
      (global.fetch as any).mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      const { container } = render(<FlashOffersSection />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('API integration', () => {
    it('fetches flash offers on mount', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ offers: mockOffers }),
      });

      render(<FlashOffersSection />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/offers/flash?limit=6',
          expect.objectContaining({ credentials: 'include' })
        );
      });
    });

    it('respects maxOffers prop', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ offers: [] }),
      });

      render(<FlashOffersSection maxOffers={3} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/offers/flash?limit=3',
          expect.any(Object)
        );
      });
    });
  });
});
