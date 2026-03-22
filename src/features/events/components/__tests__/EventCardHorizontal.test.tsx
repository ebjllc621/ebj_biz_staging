/**
 * EventCardHorizontal - Component Tests
 *
 * @tier SIMPLE
 * @phase Phase 9 - Testing & Validation
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests rendering, responsive layout, and accessibility for horizontal event card.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventCardHorizontal } from '../EventCardHorizontal';
import type { EventWithCoordinates } from '@/features/events/types';

const mockEvent: EventWithCoordinates = {
  id: 1,
  listing_id: 1,
  title: 'Community Festival',
  slug: 'community-festival',
  listing_name: 'Local Business',
  start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
  banner_image: 'https://example.com/event.jpg',
  event_type: 'festival',
  location_type: 'physical',
  city: 'Seattle',
  state: 'WA',
  latitude: 47.6062,
  longitude: -122.3321,
  venue_name: 'Seattle Center',
  is_featured: true,
  is_ticketed: true,
  ticket_price: 25.00,
  remaining_capacity: 50,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

describe('EventCardHorizontal', () => {
  describe('rendering', () => {
    it('should render in horizontal layout', () => {
      const { container } = render(<EventCardHorizontal event={mockEvent} />);

      const article = container.querySelector('article');
      expect(article).toHaveClass('flex');
    });

    it('should render thumbnail on left', () => {
      const { container } = render(<EventCardHorizontal event={mockEvent} />);

      const thumbnailContainer = container.querySelector('.relative.w-full');
      expect(thumbnailContainer).toBeInTheDocument();
    });

    it('should render content on right', () => {
      const { container } = render(<EventCardHorizontal event={mockEvent} />);

      const contentDiv = container.querySelector('.flex-1.p-3');
      expect(contentDiv).toBeInTheDocument();
    });

    it('should render event title', () => {
      render(<EventCardHorizontal event={mockEvent} />);

      expect(screen.getByText('Community Festival')).toBeInTheDocument();
    });

    it('should render listing name in orange', () => {
      render(<EventCardHorizontal event={mockEvent} />);

      const listingName = screen.getByText('Local Business');
      expect(listingName).toBeInTheDocument();
      expect(listingName).toHaveClass('text-biz-orange');
    });

    it('should render date with icon', () => {
      render(<EventCardHorizontal event={mockEvent} />);

      // Check for formatted date — dynamic date
      const expected = mockEvent.start_date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      expect(screen.getByText(new RegExp(expected.replace(',', ',?')))).toBeInTheDocument();
    });

    it('should render location', () => {
      render(<EventCardHorizontal event={mockEvent} />);

      expect(screen.getByText('Seattle Center')).toBeInTheDocument();
    });

    it('should render ticket price when available', () => {
      render(<EventCardHorizontal event={mockEvent} />);

      expect(screen.getByText('$25.00')).toBeInTheDocument();
    });

    it('should not render ticket price when not ticketed', () => {
      const freeEvent = { ...mockEvent, is_ticketed: false };
      render(<EventCardHorizontal event={freeEvent} />);

      expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    });

    it('should render date range for multi-day events', () => {
      const startDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000);
      const multiDayEvent = {
        ...mockEvent,
        start_date: startDate,
        end_date: endDate,
      };
      render(<EventCardHorizontal event={multiDayEvent} />);

      // Should show date range — dynamic dates
      const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      expect(screen.getByText(new RegExp(fmt(startDate).replace(',', ',?')))).toBeInTheDocument();
    });

    it('should render single date for same-day events', () => {
      render(<EventCardHorizontal event={mockEvent} />);

      // Should show single date (start and end on same day) — dynamic date
      const expected = mockEvent.start_date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      expect(screen.getByText(new RegExp(expected.replace(',', ',?')))).toBeInTheDocument();
    });

    it('should handle missing thumbnail gracefully', () => {
      const eventWithoutImage = { ...mockEvent, banner_image: undefined };
      const { container } = render(<EventCardHorizontal event={eventWithoutImage} />);

      // Should show gradient background with calendar icon
      const gradientDiv = container.querySelector('.bg-gradient-to-br');
      expect(gradientDiv).toBeInTheDocument();
    });
  });

  describe('responsive', () => {
    it('should apply full-width on mobile', () => {
      const { container } = render(<EventCardHorizontal event={mockEvent} />);

      const article = container.querySelector('article');
      expect(article).toHaveClass('flex-col');
    });

    it('should maintain horizontal layout on desktop', () => {
      const { container } = render(<EventCardHorizontal event={mockEvent} />);

      const article = container.querySelector('article');
      expect(article).toHaveClass('sm:flex-row');
    });

    it('should have responsive thumbnail sizing', () => {
      const { container } = render(<EventCardHorizontal event={mockEvent} />);

      const thumbnail = container.querySelector('.relative.w-full');
      expect(thumbnail).toHaveClass('sm:w-32');
      expect(thumbnail).toHaveClass('md:w-40');
    });
  });

  describe('accessibility', () => {
    it('should have alt text on images', () => {
      render(<EventCardHorizontal event={mockEvent} />);

      const image = screen.getByAltText('Community Festival');
      expect(image).toBeInTheDocument();
    });

    it('should have semantic HTML structure', () => {
      const { container } = render(<EventCardHorizontal event={mockEvent} />);

      // Should use article element
      const article = container.querySelector('article');
      expect(article).toBeInTheDocument();
    });

    it('should be keyboard navigable (link)', () => {
      const { container } = render(<EventCardHorizontal event={mockEvent} />);

      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();
      expect(link?.tagName).toBe('A');
    });

    it('should have proper link href', () => {
      const { container } = render(<EventCardHorizontal event={mockEvent} />);

      const link = container.querySelector('a');
      expect(link).toHaveAttribute('href', '/events/community-festival');
    });
  });

  describe('styling', () => {
    it('should apply card styling', () => {
      const { container } = render(<EventCardHorizontal event={mockEvent} />);

      const article = container.querySelector('article');
      expect(article).toHaveClass('bg-white');
      expect(article).toHaveClass('rounded-xl');
      expect(article).toHaveClass('shadow-sm');
    });

    it('should apply hover effects', () => {
      const { container } = render(<EventCardHorizontal event={mockEvent} />);

      const article = container.querySelector('article');
      expect(article).toHaveClass('hover:shadow-md');
    });

    it('should apply border styling', () => {
      const { container } = render(<EventCardHorizontal event={mockEvent} />);

      const article = container.querySelector('article');
      expect(article).toHaveClass('border');
      expect(article).toHaveClass('border-gray-100');
    });

    it('should apply custom className', () => {
      const { container } = render(<EventCardHorizontal event={mockEvent} className="custom-class" />);

      const link = container.querySelector('a');
      expect(link).toHaveClass('custom-class');
    });
  });

  describe('venue name vs city/state', () => {
    it('should prefer venue name when available', () => {
      render(<EventCardHorizontal event={mockEvent} />);

      expect(screen.getByText('Seattle Center')).toBeInTheDocument();
      expect(screen.queryByText('Seattle, WA')).not.toBeInTheDocument();
    });

    it('should show city and state when venue name missing', () => {
      const eventWithoutVenue = { ...mockEvent, venue_name: undefined };
      render(<EventCardHorizontal event={eventWithoutVenue} />);

      expect(screen.getByText('Seattle, WA')).toBeInTheDocument();
    });

    it('should handle missing city gracefully', () => {
      const eventWithoutCity = { ...mockEvent, venue_name: undefined, city: undefined };
      render(<EventCardHorizontal event={eventWithoutCity} />);

      // Should only show state
      expect(screen.getByText('WA')).toBeInTheDocument();
    });
  });
});
