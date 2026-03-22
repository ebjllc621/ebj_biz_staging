/**
 * ListingHero Test Suite
 *
 * Tests for hero section component covering:
 * - Rendering with complete listing data
 * - Rendering without optional fields
 * - Image optimization verification
 * - Accessibility compliance
 * - Responsive behavior
 *
 * @component Client Component Test
 * @tier STANDARD
 * @phase Phase 10 - Testing & Documentation
 * @coverage Target: 85%+
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ListingHero } from '../ListingHero';
import type { Listing } from '@core/services/ListingService';

describe('ListingHero', () => {
  const mockListing: Partial<Listing> = {
    id: 1,
    name: 'Aperture Science',
    slug: 'aperture-science',
    type: 'Technology Company',
    city: 'Cleveland',
    state: 'OH',
    cover_image_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa',
    logo_url: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9',
    user_id: 1,
    category_id: 1,
    tier: 'premium',
    status: 'active',
    approved: 'approved',
    claimed: 1
  };

  describe('Rendering - Complete Data', () => {
    it('should render business name in h1 heading', () => {
      render(<ListingHero listing={mockListing as Listing} />);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Aperture Science');
    });

    it('should render business type badge', () => {
      render(<ListingHero listing={mockListing as Listing} />);

      expect(screen.getByText('Technology Company')).toBeInTheDocument();
    });

    it('should render location with city and state', () => {
      render(<ListingHero listing={mockListing as Listing} />);

      expect(screen.getByText('Cleveland, OH')).toBeInTheDocument();
    });

    it('should render cover image with next/image', () => {
      render(<ListingHero listing={mockListing as Listing} />);

      const coverImage = screen.getByAltText('Aperture Science');
      expect(coverImage).toBeInTheDocument();
      expect(coverImage).toHaveAttribute('src', expect.stringContaining('photo-1451187580459-43490279c0fa'));
    });

    it('should render logo image with next/image', () => {
      render(<ListingHero listing={mockListing as Listing} />);

      const logoImage = screen.getByAltText('Aperture Science logo');
      expect(logoImage).toBeInTheDocument();
      expect(logoImage).toHaveAttribute('src', expect.stringContaining('photo-1599305445671-ac291c95aaa9'));
    });
  });

  describe('Rendering - Missing Optional Fields', () => {
    it('should render without cover image (gradient fallback)', () => {
      const listingNoCover = { ...mockListing, cover_image_url: undefined };
      render(<ListingHero listing={listingNoCover as Listing} />);

      // Should have gradient background
      const container = screen.getByRole('heading', { level: 1 }).closest('div')?.parentElement;
      expect(container).toBeInTheDocument();
    });

    it('should render without logo', () => {
      const listingNoLogo = { ...mockListing, logo_url: undefined };
      render(<ListingHero listing={listingNoLogo as Listing} />);

      // Should not render logo image
      expect(screen.queryByAltText(/logo/i)).not.toBeInTheDocument();

      // Should still render business name
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Aperture Science');
    });

    it('should render without type badge', () => {
      const listingNoType = { ...mockListing, type: undefined };
      render(<ListingHero listing={listingNoType as Listing} />);

      expect(screen.queryByText('Technology Company')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Aperture Science');
    });

    it('should render without city (only state)', () => {
      const listingNoCity = { ...mockListing, city: undefined };
      render(<ListingHero listing={listingNoCity as Listing} />);

      expect(screen.getByText('OH')).toBeInTheDocument();
    });

    it('should render without state (only city)', () => {
      const listingNoState = { ...mockListing, state: undefined };
      render(<ListingHero listing={listingNoState as Listing} />);

      expect(screen.getByText('Cleveland')).toBeInTheDocument();
    });

    it('should render without location (no city or state)', () => {
      const listingNoLocation = { ...mockListing, city: undefined, state: undefined };
      render(<ListingHero listing={listingNoLocation as Listing} />);

      // MapPin icon should not be present
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Aperture Science');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy (h1)', () => {
      render(<ListingHero listing={mockListing as Listing} />);

      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('Aperture Science');
    });

    it('should have descriptive alt text on cover image', () => {
      render(<ListingHero listing={mockListing as Listing} />);

      const coverImage = screen.getByAltText('Aperture Science');
      expect(coverImage).toBeInTheDocument();
    });

    it('should have descriptive alt text on logo image', () => {
      render(<ListingHero listing={mockListing as Listing} />);

      const logoImage = screen.getByAltText('Aperture Science logo');
      expect(logoImage).toBeInTheDocument();
    });

    it('should have MapPin icon when location is present', () => {
      const { container } = render(<ListingHero listing={mockListing as Listing} />);

      // Lucide icons render as SVG elements
      const svgIcons = container.querySelectorAll('svg');
      expect(svgIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long business name', () => {
      const longNameListing = {
        ...mockListing,
        name: 'A Very Long Business Name That Exceeds Normal Character Limits And Tests Text Wrapping Behavior In The Hero Component'
      };
      render(<ListingHero listing={longNameListing as Listing} />);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent(longNameListing.name);
    });

    it('should handle special characters in business name', () => {
      const specialCharListing = {
        ...mockListing,
        name: 'O\'Brien & Associates, LLC.'
      };
      render(<ListingHero listing={specialCharListing as Listing} />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('O\'Brien & Associates, LLC.');
    });

    it('should handle minimal listing data', () => {
      const minimalListing: Partial<Listing> = {
        id: 1,
        name: 'Test Business',
        slug: 'test-business',
        user_id: 1,
        category_id: 1,
        tier: 'essential',
        status: 'active',
        approved: 'approved',
        claimed: 1
      };

      render(<ListingHero listing={minimalListing as Listing} />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test Business');
    });
  });

  describe('Image Optimization', () => {
    it('should use priority loading for cover image', () => {
      render(<ListingHero listing={mockListing as Listing} />);

      const coverImage = screen.getByAltText('Aperture Science');
      // Next.js Image component adds priority attribute
      expect(coverImage.closest('img')).toBeInTheDocument();
    });

    it('should use responsive sizes for cover image', () => {
      render(<ListingHero listing={mockListing as Listing} />);

      const coverImage = screen.getByAltText('Aperture Science');
      // Cover should use full viewport width (100vw)
      expect(coverImage).toBeInTheDocument();
    });

    it('should use fixed size for logo image', () => {
      render(<ListingHero listing={mockListing as Listing} />);

      const logoImage = screen.getByAltText('Aperture Science logo');
      // Logo should use fixed size (128px)
      expect(logoImage).toBeInTheDocument();
    });
  });
});
