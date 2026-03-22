/**
 * ABTestVariantPreview - Component Tests
 *
 * @tier STANDARD
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests variant preview rendering side-by-side comparison.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ABTestVariantPreview } from '../ABTestVariantPreview';

const mockVariantA = {
  id: 'A',
  title: 'Original Offer',
  description: 'Original description',
  image: 'https://example.com/original.jpg',
  price: 50.00,
};

const mockVariantB = {
  id: 'B',
  title: 'Updated Offer',
  description: 'Updated description with more details',
  image: 'https://example.com/variant.jpg',
  price: 45.00,
};

describe('ABTestVariantPreview', () => {
  describe('side-by-side rendering', () => {
    it('renders both variants', () => {
      render(<ABTestVariantPreview variantA={mockVariantA} variantB={mockVariantB} />);

      expect(screen.getByText('Original Offer')).toBeInTheDocument();
      expect(screen.getByText('Updated Offer')).toBeInTheDocument();
    });

    it('displays variant labels', () => {
      render(<ABTestVariantPreview variantA={mockVariantA} variantB={mockVariantB} />);

      expect(screen.getByText('Variant A')).toBeInTheDocument();
      expect(screen.getByText('Variant B')).toBeInTheDocument();
    });

    it('renders variant images', () => {
      render(<ABTestVariantPreview variantA={mockVariantA} variantB={mockVariantB} />);

      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(2);
      expect(images[0]).toHaveAttribute('src', expect.stringContaining('original.jpg'));
      expect(images[1]).toHaveAttribute('src', expect.stringContaining('variant.jpg'));
    });

    it('displays variant descriptions', () => {
      render(<ABTestVariantPreview variantA={mockVariantA} variantB={mockVariantB} />);

      expect(screen.getByText('Original description')).toBeInTheDocument();
      expect(screen.getByText('Updated description with more details')).toBeInTheDocument();
    });
  });

  describe('pricing comparison', () => {
    it('displays prices for both variants', () => {
      render(<ABTestVariantPreview variantA={mockVariantA} variantB={mockVariantB} />);

      expect(screen.getByText('$50.00')).toBeInTheDocument();
      expect(screen.getByText('$45.00')).toBeInTheDocument();
    });

    it('highlights price difference', () => {
      const { container } = render(<ABTestVariantPreview variantA={mockVariantA} variantB={mockVariantB} />);

      const priceDiff = container.querySelector('.price-difference');
      expect(priceDiff).toBeInTheDocument();
      expect(priceDiff?.textContent).toContain('$5.00');
    });
  });

  describe('layout', () => {
    it('applies split layout styling', () => {
      const { container } = render(<ABTestVariantPreview variantA={mockVariantA} variantB={mockVariantB} />);

      const grid = container.querySelector('.grid-cols-2');
      expect(grid).toBeInTheDocument();
    });

    it('applies equal width to both variants', () => {
      const { container } = render(<ABTestVariantPreview variantA={mockVariantA} variantB={mockVariantB} />);

      const variants = container.querySelectorAll('[data-variant]');
      expect(variants).toHaveLength(2);
      variants.forEach((variant) => {
        expect(variant).toHaveClass('w-full');
      });
    });
  });
});
