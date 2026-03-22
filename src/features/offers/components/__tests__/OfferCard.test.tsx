/**
 * OfferCard - Component Tests
 *
 * @tier STANDARD
 * @phase Phase 9 - Testing & Validation
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests rendering, links, days remaining formatting, and accessibility for OfferCard component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OfferCard } from '../OfferCard';
import type { OfferWithCoordinates } from '@/features/offers/types';

// Create a future end date (10 days from now) for consistent test behavior
const futureEndDate = new Date();
futureEndDate.setDate(futureEndDate.getDate() + 10);
const futureEndDateStr = futureEndDate.toISOString().split('T')[0];

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
  end_date: futureEndDateStr,
  quantity_remaining: 5,
  is_featured: true,
  latitude: 47.6062,
  longitude: -122.3321,
  listing_tier: 'premium',
  listing_claimed: true,
};

describe('OfferCard', () => {
  describe('rendering', () => {
    it('should render offer title', () => {
      render(<OfferCard offer={mockOffer} />);

      expect(screen.getByText('Summer Sale - 50% Off')).toBeInTheDocument();
    });

    it('should render listing/business name', () => {
      render(<OfferCard offer={mockOffer} />);

      expect(screen.getByText('Local Business')).toBeInTheDocument();
    });

    it('should render discount badge when discount exists', () => {
      render(<OfferCard offer={mockOffer} />);

      expect(screen.getByText('-50%')).toBeInTheDocument();
    });

    it('should not render discount badge when no discount', () => {
      const offerNoDiscount = { ...mockOffer, discount_percentage: undefined };
      render(<OfferCard offer={offerNoDiscount} />);

      expect(screen.queryByText(/-\d+%/)).not.toBeInTheDocument();
    });

    it('should render featured badge when featured', () => {
      render(<OfferCard offer={mockOffer} />);

      expect(screen.getByText('Featured')).toBeInTheDocument();
    });

    it('should not render featured badge when not featured', () => {
      const offerNotFeatured = { ...mockOffer, is_featured: false };
      render(<OfferCard offer={offerNotFeatured} />);

      expect(screen.queryByText('Featured')).not.toBeInTheDocument();
    });

    it('should render original price with strikethrough', () => {
      render(<OfferCard offer={mockOffer} />);

      const originalPrice = screen.getByText('$100.00');
      expect(originalPrice).toBeInTheDocument();
      expect(originalPrice).toHaveClass('line-through');
    });

    it('should render sale price', () => {
      render(<OfferCard offer={mockOffer} />);

      expect(screen.getByText('$50.00 USD')).toBeInTheDocument();
    });

    it('should not render prices when not provided', () => {
      const offerNoPrice = { ...mockOffer, original_price: undefined, sale_price: undefined };
      render(<OfferCard offer={offerNoPrice} />);

      expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    });

    it('should render days remaining', () => {
      render(<OfferCard offer={mockOffer} />);

      expect(screen.getByText(/days left/)).toBeInTheDocument();
    });

    it('should show "Ends today" for today expiration', () => {
      const today = new Date().toISOString().split('T')[0];
      const todayOffer = { ...mockOffer, end_date: today };
      render(<OfferCard offer={todayOffer} />);

      expect(screen.getByText('Ends today')).toBeInTheDocument();
    });

    it('should show "Ends tomorrow" for tomorrow expiration', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toISOString().split('T')[0];
      const tomorrowOffer = { ...mockOffer, end_date: tomorrowDate };
      render(<OfferCard offer={tomorrowOffer} />);

      expect(screen.getByText('Ends tomorrow')).toBeInTheDocument();
    });

    it('should render quantity warning when low stock', () => {
      render(<OfferCard offer={mockOffer} />);

      expect(screen.getByText('Only 5 remaining')).toBeInTheDocument();
    });

    it('should not render quantity warning when stock > 10', () => {
      const highStockOffer = { ...mockOffer, quantity_remaining: 50 };
      render(<OfferCard offer={highStockOffer} />);

      expect(screen.queryByText(/remaining/)).not.toBeInTheDocument();
    });

    it('should not render quantity warning when no stock data', () => {
      const noStockOffer = { ...mockOffer, quantity_remaining: undefined };
      render(<OfferCard offer={noStockOffer} />);

      expect(screen.queryByText(/remaining/)).not.toBeInTheDocument();
    });

    it('should render offer image', () => {
      render(<OfferCard offer={mockOffer} />);

      const image = screen.getByAltText('Summer Sale - 50% Off');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', expect.stringContaining('offer.jpg'));
    });

    it('should handle missing image gracefully', () => {
      const offerNoImage = { ...mockOffer, image: undefined, thumbnail: undefined };
      const { container } = render(<OfferCard offer={offerNoImage} />);

      // Should show gradient background with tag icon
      const gradientDiv = container.querySelector('.bg-gradient-to-br');
      expect(gradientDiv).toBeInTheDocument();
    });
  });

  describe('links', () => {
    it('should link to offer detail page', () => {
      const { container } = render(<OfferCard offer={mockOffer} />);

      const link = container.querySelector('a');
      expect(link).toHaveAttribute('href', '/offers/summer-sale-50-off');
    });

    it('should have correct href attribute', () => {
      const { container } = render(<OfferCard offer={mockOffer} />);

      const link = container.querySelector('a');
      expect(link?.getAttribute('href')).toBe('/offers/summer-sale-50-off');
    });
  });

  describe('days remaining', () => {
    it('should calculate days remaining correctly', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const futureOffer = { ...mockOffer, end_date: futureDate.toISOString().split('T')[0] };
      render(<OfferCard offer={futureOffer} />);

      expect(screen.getByText(/5 days left/)).toBeInTheDocument();
    });

    it('should handle today correctly', () => {
      const today = new Date().toISOString().split('T')[0];
      const todayOffer = { ...mockOffer, end_date: today };
      render(<OfferCard offer={todayOffer} />);

      expect(screen.getByText('Ends today')).toBeInTheDocument();
    });

    it('should handle tomorrow correctly', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toISOString().split('T')[0];
      const tomorrowOffer = { ...mockOffer, end_date: tomorrowDate };
      render(<OfferCard offer={tomorrowOffer} />);

      expect(screen.getByText('Ends tomorrow')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have alt text on images', () => {
      render(<OfferCard offer={mockOffer} />);

      const image = screen.getByAltText('Summer Sale - 50% Off');
      expect(image).toBeInTheDocument();
    });

    it('should have semantic HTML structure', () => {
      const { container } = render(<OfferCard offer={mockOffer} />);

      // Should use article element
      const article = container.querySelector('article');
      expect(article).toBeInTheDocument();
    });

    it('should be keyboard navigable (link)', () => {
      const { container } = render(<OfferCard offer={mockOffer} />);

      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();
      expect(link?.tagName).toBe('A');
    });
  });

  describe('styling', () => {
    it('should apply card styling', () => {
      const { container } = render(<OfferCard offer={mockOffer} />);

      const article = container.querySelector('article');
      expect(article).toHaveClass('bg-white');
      expect(article).toHaveClass('rounded-xl');
      expect(article).toHaveClass('shadow-sm');
    });

    it('should apply hover effects', () => {
      const { container } = render(<OfferCard offer={mockOffer} />);

      const article = container.querySelector('article');
      expect(article).toHaveClass('hover:shadow-md');
    });

    it('should be responsive', () => {
      const { container } = render(<OfferCard offer={mockOffer} />);

      // Should have full height
      const article = container.querySelector('article');
      expect(article).toHaveClass('h-full');
    });

    it('should apply custom className', () => {
      const { container } = render(<OfferCard offer={mockOffer} className="custom-class" />);

      const link = container.querySelector('a');
      expect(link).toHaveClass('custom-class');
    });
  });
});
