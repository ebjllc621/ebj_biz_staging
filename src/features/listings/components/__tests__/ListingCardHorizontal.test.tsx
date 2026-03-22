/**
 * ListingCardHorizontal - Component Tests
 *
 * @tier STANDARD
 * @phase Phase 9 - Testing & Documentation
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests rendering, links, and content display.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ListingCardHorizontal } from '../ListingCardHorizontal';
import type { ListingWithCoordinates } from '@/features/listings/types';

const mockListing: ListingWithCoordinates = {
  id: 1,
  name: 'Test Business',
  slug: 'test-business',
  category_name: 'Restaurant',
  city: 'Seattle',
  state: 'WA',
  cover_image_url: 'https://example.com/cover.jpg',
  logo_url: 'https://example.com/logo.jpg',
  rating: 4.5,
  is_featured: true,
  latitude: 47.6062,
  longitude: -122.3321,
  address: '123 Main St',
  zip: '98101',
  phone: '555-1234',
  email: 'test@example.com',
  website_url: 'https://example.com',
  description: 'Test description',
  hours_of_operation: {},
  social_media: {},
  user_id: 1,
  is_verified: true,
  is_published: true,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

describe('ListingCardHorizontal', () => {
  describe('rendering', () => {
    it('should render listing name', () => {
      render(<ListingCardHorizontal listing={mockListing} />);

      expect(screen.getByText('Test Business')).toBeInTheDocument();
    });

    it('should render category badge', () => {
      render(<ListingCardHorizontal listing={mockListing} />);

      expect(screen.getByText('Restaurant')).toBeInTheDocument();
    });

    it('should render location with MapPin icon', () => {
      render(<ListingCardHorizontal listing={mockListing} />);

      expect(screen.getByText('Seattle, WA')).toBeInTheDocument();
    });

    it('should render location with city only when state is missing', () => {
      const listingWithoutState = { ...mockListing, state: '' };
      render(<ListingCardHorizontal listing={listingWithoutState} />);

      expect(screen.getByText('Seattle')).toBeInTheDocument();
    });

    it('should not render location when both city and state are missing', () => {
      const listingWithoutLocation = { ...mockListing, city: '', state: '' };
      const { container } = render(<ListingCardHorizontal listing={listingWithoutLocation} />);

      // MapPin icon should not be present
      const mapPinIcon = container.querySelector('svg');
      expect(mapPinIcon).not.toHaveClass('w-3.5'); // MapPin icon class
    });

    it('should render rating when present', () => {
      render(<ListingCardHorizontal listing={mockListing} />);

      expect(screen.getByText('4.5')).toBeInTheDocument();
    });

    it('should not render rating when rating is 0', () => {
      const listingWithoutRating = { ...mockListing, rating: 0 };
      render(<ListingCardHorizontal listing={listingWithoutRating} />);

      expect(screen.queryByText('0.0')).not.toBeInTheDocument();
    });

    it('should not render rating when rating is undefined', () => {
      const listingWithoutRating = { ...mockListing, rating: undefined };
      render(<ListingCardHorizontal listing={listingWithoutRating} />);

      expect(screen.queryByText('0.0')).not.toBeInTheDocument();
    });

    it('should render cover image when present', () => {
      const { container } = render(<ListingCardHorizontal listing={mockListing} />);

      const img = container.querySelector('img[src*="cover.jpg"]');
      expect(img).toBeInTheDocument();
    });

    it('should render logo when cover image is missing', () => {
      const listingWithoutCover = { ...mockListing, cover_image_url: '' };
      const { container } = render(<ListingCardHorizontal listing={listingWithoutCover} />);

      const img = container.querySelector('img[src*="logo.jpg"]');
      expect(img).toBeInTheDocument();
    });

    it('should render fallback when both images are missing', () => {
      const listingWithoutImages = { ...mockListing, cover_image_url: '', logo_url: '' };
      render(<ListingCardHorizontal listing={listingWithoutImages} />);

      expect(screen.getByText('T')).toBeInTheDocument(); // First letter of name
    });

    it('should render featured badge when is_featured is true', () => {
      render(<ListingCardHorizontal listing={mockListing} />);

      expect(screen.getByText('Featured')).toBeInTheDocument();
    });

    it('should not render featured badge when is_featured is false', () => {
      const listingNotFeatured = { ...mockListing, is_featured: false };
      render(<ListingCardHorizontal listing={listingNotFeatured} />);

      expect(screen.queryByText('Featured')).not.toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <ListingCardHorizontal listing={mockListing} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('links', () => {
    it('should link to listing detail page', () => {
      render(<ListingCardHorizontal listing={mockListing} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/listings/test-business');
    });

    it('should use correct slug format', () => {
      const listingWithSpecialSlug = { ...mockListing, slug: 'coffee-shop-seattle' };
      render(<ListingCardHorizontal listing={listingWithSpecialSlug} />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/listings/coffee-shop-seattle');
    });

    it('should be wrapped in article tag', () => {
      const { container } = render(<ListingCardHorizontal listing={mockListing} />);

      const article = container.querySelector('article');
      expect(article).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply horizontal layout classes', () => {
      const { container } = render(<ListingCardHorizontal listing={mockListing} />);

      const article = container.querySelector('article');
      expect(article).toHaveClass('flex', 'flex-col', 'sm:flex-row');
    });

    it('should apply hover effects', () => {
      const { container } = render(<ListingCardHorizontal listing={mockListing} />);

      const article = container.querySelector('article');
      expect(article).toHaveClass('hover:shadow-md', 'transition-shadow');
    });

    it('should apply group class for child hover effects', () => {
      const { container } = render(<ListingCardHorizontal listing={mockListing} />);

      const link = container.querySelector('a');
      expect(link).toHaveClass('group');
    });
  });

  describe('image sizing', () => {
    it('should apply correct image container dimensions', () => {
      const { container } = render(<ListingCardHorizontal listing={mockListing} />);

      const imageContainer = container.querySelector('.relative');
      expect(imageContainer).toHaveClass('w-full', 'sm:w-48', 'md:w-56');
    });

    it('should apply correct image sizing attributes', () => {
      const { container } = render(<ListingCardHorizontal listing={mockListing} />);

      const img = container.querySelector('img[src*="cover.jpg"]');
      expect(img).toHaveAttribute('sizes', '(max-width: 640px) 100vw, 224px');
    });
  });

  describe('accessibility', () => {
    it('should have alt text for cover image', () => {
      const { container } = render(<ListingCardHorizontal listing={mockListing} />);

      const img = container.querySelector('img[src*="cover.jpg"]');
      expect(img).toHaveAttribute('alt', 'Test Business');
    });

    it('should have alt text for logo image', () => {
      const listingWithoutCover = { ...mockListing, cover_image_url: '' };
      const { container } = render(<ListingCardHorizontal listing={listingWithoutCover} />);

      const img = container.querySelector('img[src*="logo.jpg"]');
      expect(img).toHaveAttribute('alt', 'Test Business');
    });
  });
});
