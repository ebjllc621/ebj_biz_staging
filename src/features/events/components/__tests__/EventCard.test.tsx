/**
 * EventCard - Component Tests
 *
 * @tier SIMPLE
 * @phase Phase 9 - Testing & Validation
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests rendering, links, date formatting, and accessibility for EventCard component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventCard } from '../EventCard';
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

describe('EventCard', () => {
  describe('rendering', () => {
    it('should render event title', () => {
      render(<EventCard event={mockEvent} />);

      expect(screen.getByText('Community Festival')).toBeInTheDocument();
    });

    it('should render listing/business name', () => {
      render(<EventCard event={mockEvent} />);

      expect(screen.getByText('Local Business')).toBeInTheDocument();
    });

    it('should render event date with calendar icon', () => {
      render(<EventCard event={mockEvent} />);

      // Check for formatted date — dynamic date 7 days from now
      const expected = mockEvent.start_date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      expect(screen.getByText(new RegExp(expected.replace(',', ',?')))).toBeInTheDocument();
    });

    it('should render location (city, state)', () => {
      render(<EventCard event={mockEvent} />);

      expect(screen.getByText('Seattle Center')).toBeInTheDocument();
    });

    it('should render venue name when available', () => {
      render(<EventCard event={mockEvent} />);

      expect(screen.getByText('Seattle Center')).toBeInTheDocument();
    });

    it('should render city and state when no venue name', () => {
      const eventWithoutVenue = { ...mockEvent, venue_name: undefined };
      render(<EventCard event={eventWithoutVenue} />);

      expect(screen.getByText('Seattle, WA')).toBeInTheDocument();
    });

    it('should render thumbnail image', () => {
      render(<EventCard event={mockEvent} />);

      const image = screen.getByAltText('Community Festival');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', expect.stringContaining('event.jpg'));
    });

    it('should render days until badge', () => {
      render(<EventCard event={mockEvent} />);

      // Should show "X days" badge
      const badge = screen.getByText(/days/);
      expect(badge).toBeInTheDocument();
    });

    it('should show "Today" badge for today events', () => {
      const today = new Date();
      const todayEvent = { ...mockEvent, start_date: today };
      render(<EventCard event={todayEvent} />);

      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    it('should show "Tomorrow" badge for tomorrow events', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowEvent = { ...mockEvent, start_date: tomorrow };
      render(<EventCard event={tomorrowEvent} />);

      expect(screen.getByText('Tomorrow')).toBeInTheDocument();
    });

    it('should render capacity badge when available', () => {
      render(<EventCard event={mockEvent} />);

      expect(screen.getByText('50 spots')).toBeInTheDocument();
    });

    it('should not render capacity badge when not available', () => {
      const eventWithoutCapacity = { ...mockEvent, remaining_capacity: undefined };
      render(<EventCard event={eventWithoutCapacity} />);

      expect(screen.queryByText(/spots/)).not.toBeInTheDocument();
    });

    it('should render ticket price when ticketed', () => {
      render(<EventCard event={mockEvent} />);

      expect(screen.getByText('$25.00')).toBeInTheDocument();
    });

    it('should not render ticket price when not ticketed', () => {
      const freeEvent = { ...mockEvent, is_ticketed: false };
      render(<EventCard event={freeEvent} />);

      expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    });

    it('should handle missing thumbnail gracefully', () => {
      const eventWithoutImage = { ...mockEvent, banner_image: undefined };
      const { container } = render(<EventCard event={eventWithoutImage} />);

      // Should show gradient background with calendar icon
      const gradientDiv = container.querySelector('.bg-gradient-to-br');
      expect(gradientDiv).toBeInTheDocument();
    });
  });

  describe('links', () => {
    it('should link to event detail page', () => {
      const { container } = render(<EventCard event={mockEvent} />);

      const link = container.querySelector('a');
      expect(link).toHaveAttribute('href', '/events/community-festival');
    });

    it('should have correct href attribute', () => {
      const { container } = render(<EventCard event={mockEvent} />);

      const link = container.querySelector('a');
      expect(link?.getAttribute('href')).toBe('/events/community-festival');
    });
  });

  describe('date formatting', () => {
    it('should format single-day events correctly', () => {
      render(<EventCard event={mockEvent} />);

      // Check for formatted date — dynamic date
      const expected = mockEvent.start_date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      expect(screen.getByText(new RegExp(expected.replace(',', ',?')))).toBeInTheDocument();
    });

    it('should format multi-day events with start date', () => {
      const multiDayEvent = {
        ...mockEvent,
        start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        end_date: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
      };
      render(<EventCard event={multiDayEvent} />);

      // Should show start date — dynamic date
      const expected = multiDayEvent.start_date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      expect(screen.getByText(new RegExp(expected.replace(',', ',?')))).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have alt text on images', () => {
      render(<EventCard event={mockEvent} />);

      const image = screen.getByAltText('Community Festival');
      expect(image).toBeInTheDocument();
    });

    it('should have semantic HTML structure', () => {
      const { container } = render(<EventCard event={mockEvent} />);

      // Should use article element
      const article = container.querySelector('article');
      expect(article).toBeInTheDocument();
    });

    it('should be keyboard navigable (link)', () => {
      const { container } = render(<EventCard event={mockEvent} />);

      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();
      expect(link?.tagName).toBe('A');
    });
  });

  describe('styling', () => {
    it('should apply card styling', () => {
      const { container } = render(<EventCard event={mockEvent} />);

      const article = container.querySelector('article');
      expect(article).toHaveClass('bg-white');
      expect(article).toHaveClass('rounded-xl');
      expect(article).toHaveClass('shadow-sm');
    });

    it('should apply hover effects', () => {
      const { container } = render(<EventCard event={mockEvent} />);

      const article = container.querySelector('article');
      expect(article).toHaveClass('hover:shadow-md');
    });

    it('should be responsive', () => {
      const { container } = render(<EventCard event={mockEvent} />);

      // Should have full height
      const article = container.querySelector('article');
      expect(article).toHaveClass('h-full');
    });

    it('should apply custom className', () => {
      const { container } = render(<EventCard event={mockEvent} className="custom-class" />);

      const link = container.querySelector('a');
      expect(link).toHaveClass('custom-class');
    });
  });
});
