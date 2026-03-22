/**
 * BundleCard - Component Tests
 *
 * @tier STANDARD
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests bundle card rendering, pricing, offer count, and savings display.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BundleCard } from '../BundleCard';
import type { OfferBundle } from '@features/offers/types';

const mockBundle: OfferBundle = {
  id: 1,
  name: 'Summer Bundle',
  slug: 'summer-bundle',
  description: '3 great offers together',
  total_value: 100.00,
  bundle_price: 80.00,
  start_date: new Date('2026-01-01'),
  end_date: new Date('2026-12-31'),
  max_claims: 100,
  claims_count: 25,
  status: 'active',
  created_by: 1,
  offers: [
    { id: 1 } as any,
    { id: 2 } as any,
    { id: 3 } as any,
  ],
  created_at: new Date(),
  updated_at: new Date(),
};

describe('BundleCard', () => {
  describe('rendering', () => {
    it('renders bundle name', () => {
      render(<BundleCard bundle={mockBundle} />);

      expect(screen.getByText('Summer Bundle')).toBeInTheDocument();
    });

    it('renders bundle description', () => {
      render(<BundleCard bundle={mockBundle} />);

      expect(screen.getByText('3 great offers together')).toBeInTheDocument();
    });

    it('renders offer count', () => {
      render(<BundleCard bundle={mockBundle} />);

      expect(screen.getByText('3 offers')).toBeInTheDocument();
    });

    it('renders View Details CTA', () => {
      render(<BundleCard bundle={mockBundle} />);

      expect(screen.getByText('View Details')).toBeInTheDocument();
    });
  });

  describe('pricing', () => {
    it('renders bundle price', () => {
      render(<BundleCard bundle={mockBundle} />);

      expect(screen.getByText('$80.00')).toBeInTheDocument();
    });

    it('renders original price with strikethrough', () => {
      render(<BundleCard bundle={mockBundle} />);

      const originalPrice = screen.getByText('$100.00');
      expect(originalPrice).toBeInTheDocument();
      expect(originalPrice).toHaveClass('line-through');
    });

    it('renders discount percentage badge', () => {
      render(<BundleCard bundle={mockBundle} />);

      // Component calculates 20% savings from 100 - 80 / 100
      expect(screen.getByText('-20%')).toBeInTheDocument();
    });

    it('handles free bundle', () => {
      const freeBundle = { ...mockBundle, bundle_price: null };
      render(<BundleCard bundle={freeBundle} />);

      expect(screen.getByText('Free')).toBeInTheDocument();
    });
  });

  describe('claims info', () => {
    it('renders claims count', () => {
      render(<BundleCard bundle={mockBundle} />);

      expect(screen.getByText(/25 claimed/)).toBeInTheDocument();
    });

    it('renders max claims when set', () => {
      render(<BundleCard bundle={mockBundle} />);

      expect(screen.getByText(/\/ 100/)).toBeInTheDocument();
    });

    it('does not show max claims when null', () => {
      const unlimitedBundle = { ...mockBundle, max_claims: null };
      render(<BundleCard bundle={unlimitedBundle} />);

      expect(screen.queryByText(/\/ /)).not.toBeInTheDocument();
    });
  });

  describe('links', () => {
    it('links to bundle detail page', () => {
      const { container } = render(<BundleCard bundle={mockBundle} />);

      const link = container.querySelector('a');
      expect(link).toHaveAttribute('href', '/bundles/summer-bundle');
    });
  });

  describe('styling', () => {
    it('applies card styling', () => {
      const { container } = render(<BundleCard bundle={mockBundle} />);

      const link = container.querySelector('a');
      expect(link).toHaveClass('bg-white', 'rounded-xl', 'shadow-sm');
    });

    it('applies gradient header', () => {
      const { container } = render(<BundleCard bundle={mockBundle} />);

      const header = container.querySelector('.bg-gradient-to-r');
      expect(header).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty offers array', () => {
      const emptyBundle = { ...mockBundle, offers: [] };
      render(<BundleCard bundle={emptyBundle} />);

      expect(screen.getByText('0 offers')).toBeInTheDocument();
    });

    it('handles undefined offers', () => {
      const noOffersBundle = { ...mockBundle, offers: undefined };
      render(<BundleCard bundle={noOffersBundle} />);

      expect(screen.getByText('0 offers')).toBeInTheDocument();
    });

    it('handles no description', () => {
      const noDescBundle = { ...mockBundle, description: null };
      const { container } = render(<BundleCard bundle={noDescBundle} />);

      // Should render without description paragraph
      expect(container.querySelector('.line-clamp-2')).not.toBeInTheDocument();
    });
  });
});
