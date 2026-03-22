/**
 * FlashOfferCard - Component Tests
 *
 * @tier STANDARD
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests rendering of flash card with FlashOfferBadge, FlashOfferCountdown, and flash card styling.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FlashOfferCard } from '../FlashOfferCard';
import type { Offer } from '@features/offers/types';

const mockOffer: Offer & {
  flash_end_time?: string;
  flash_urgency_level?: 'normal' | 'high' | 'critical';
  listing_name?: string;
} = {
  id: 1,
  listing_id: 1,
  title: 'Flash Summer Sale',
  slug: 'flash-summer-sale',
  listing_name: 'Flash Store',
  offer_type: 'discount',
  original_price: 100.00,
  sale_price: 50.00,
  discount_percentage: 50,
  image: 'https://example.com/flash.jpg',
  start_date: '2026-01-01',
  end_date: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
  flash_end_time: new Date(Date.now() + 3600000).toISOString(),
  flash_urgency_level: 'normal',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('FlashOfferCard', () => {
  describe('rendering', () => {
    it('renders FLASH DEAL badge', () => {
      render(<FlashOfferCard offer={mockOffer} />);

      expect(screen.getByText('FLASH DEAL')).toBeInTheDocument();
    });

    it('renders FlashOfferCountdown component', () => {
      const { container } = render(<FlashOfferCard offer={mockOffer} />);

      // Check for countdown timer role
      const timer = container.querySelector('[role="timer"]');
      expect(timer).toBeInTheDocument();
    });

    it('renders offer title', () => {
      render(<FlashOfferCard offer={mockOffer} />);

      expect(screen.getByText('Flash Summer Sale')).toBeInTheDocument();
    });

    it('renders listing/business name', () => {
      render(<FlashOfferCard offer={mockOffer} />);

      expect(screen.getByText('Flash Store')).toBeInTheDocument();
    });
  });

  describe('links', () => {
    it('links to offer detail page', () => {
      const { container } = render(<FlashOfferCard offer={mockOffer} />);

      const link = container.querySelector('a');
      expect(link).toHaveAttribute('href', '/offers/flash-summer-sale');
    });
  });

  describe('flash card styling', () => {
    it('applies flash card border based on urgency (normal)', () => {
      const { container } = render(
        <FlashOfferCard offer={{ ...mockOffer, flash_urgency_level: 'normal' }} />
      );

      const link = container.querySelector('a');
      expect(link).toHaveClass('border-orange-300');
    });

    it('applies flash card border based on urgency (high)', () => {
      const { container } = render(
        <FlashOfferCard offer={{ ...mockOffer, flash_urgency_level: 'high' }} />
      );

      const link = container.querySelector('a');
      expect(link).toHaveClass('border-red-300');
    });

    it('applies flash card border based on urgency (critical)', () => {
      const { container } = render(
        <FlashOfferCard offer={{ ...mockOffer, flash_urgency_level: 'critical' }} />
      );

      const link = container.querySelector('a');
      expect(link).toHaveClass('border-red-400');
    });

    it('defaults to normal urgency when not specified', () => {
      const offerNoUrgency = { ...mockOffer };
      delete offerNoUrgency.flash_urgency_level;

      const { container } = render(<FlashOfferCard offer={offerNoUrgency} />);

      const link = container.querySelector('a');
      expect(link).toHaveClass('border-orange-300');
    });
  });

  describe('pricing', () => {
    it('renders sale price', () => {
      render(<FlashOfferCard offer={mockOffer} />);

      expect(screen.getByText('$50.00')).toBeInTheDocument();
    });

    it('renders original price with strikethrough', () => {
      render(<FlashOfferCard offer={mockOffer} />);

      const originalPrice = screen.getByText('$100.00');
      expect(originalPrice).toBeInTheDocument();
      expect(originalPrice).toHaveClass('line-through');
    });

    it('renders discount percentage badge', () => {
      render(<FlashOfferCard offer={mockOffer} />);

      expect(screen.getByText('-50%')).toBeInTheDocument();
    });
  });

  describe('urgency indicators', () => {
    it('shows "Almost gone!" for critical urgency', () => {
      render(
        <FlashOfferCard offer={{ ...mockOffer, flash_urgency_level: 'critical' }} />
      );

      expect(screen.getByText('Almost gone!')).toBeInTheDocument();
    });

    it('shows "Ending soon!" for high urgency', () => {
      render(
        <FlashOfferCard offer={{ ...mockOffer, flash_urgency_level: 'high' }} />
      );

      expect(screen.getByText('Ending soon!')).toBeInTheDocument();
    });

    it('does not show urgency indicator for normal urgency', () => {
      render(
        <FlashOfferCard offer={{ ...mockOffer, flash_urgency_level: 'normal' }} />
      );

      expect(screen.queryByText('Almost gone!')).not.toBeInTheDocument();
      expect(screen.queryByText('Ending soon!')).not.toBeInTheDocument();
    });
  });

  describe('image handling', () => {
    it('renders offer image', () => {
      render(<FlashOfferCard offer={mockOffer} />);

      const image = screen.getByAltText('Flash Summer Sale');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', expect.stringContaining('flash.jpg'));
    });

    it('handles missing image gracefully', () => {
      const offerNoImage = { ...mockOffer, image: undefined };
      const { container } = render(<FlashOfferCard offer={offerNoImage} />);

      // Should not have image element
      expect(screen.queryByAltText('Flash Summer Sale')).not.toBeInTheDocument();
    });
  });
});
