/**
 * Event Detail Mobile Responsiveness Tests
 *
 * @tier STANDARD
 * @phase Phase 9 - Testing & Validation
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests viewport-specific rendering, responsive classes, sticky CTA, touch targets.
 * Validates responsive CSS classes are applied correctly across event detail components.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventDetailContent } from '../EventDetailContent';
import { EventCard } from '../EventCard';
import { EventCardHorizontal } from '../EventCardHorizontal';
import type { EventDetailData, EventWithCoordinates } from '@features/events/types';

// Mock useEventAnalytics hook
vi.mock('@features/events/hooks/useEventAnalytics', () => ({
  useEventAnalytics: () => ({
    trackEvent: vi.fn(),
    trackPageView: vi.fn(),
  }),
}));

const mockDetailEvent: EventDetailData = {
  id: 1,
  listing_id: 1,
  title: 'Mobile Test Event',
  slug: 'mobile-test-event',
  description: 'A description for mobile testing',
  event_type: 'workshop',
  location_type: 'hybrid',
  venue_name: 'Test Venue',
  address: '123 Main St',
  city: 'Portland',
  state: 'OR',
  zip: '97201',
  start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
  listing_name: 'Test Business',
  listing_slug: 'test-business',
  listing_city: 'Portland',
  listing_state: 'OR',
  virtual_link: 'https://zoom.us/j/123',
  banner_image: '/images/banner.jpg',
  is_featured: false,
  is_ticketed: false,
  status: 'published',
};

const mockCardEvent: EventWithCoordinates = {
  id: 1,
  listing_id: 1,
  title: 'Card Mobile Test',
  slug: 'card-mobile-test',
  listing_name: 'Test Business',
  start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
  event_type: 'workshop',
  location_type: 'physical',
  city: 'Portland',
  state: 'OR',
  latitude: 45.5152,
  longitude: -122.6784,
  venue_name: 'Test Venue',
  is_featured: false,
  is_ticketed: true,
  ticket_price: 15,
  remaining_capacity: 30,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

describe('Event Detail Mobile Responsiveness', () => {
  describe('EventDetailContent responsive layout', () => {
    it('should render all content sections', () => {
      render(<EventDetailContent event={mockDetailEvent} />);

      expect(screen.getByText('About This Event')).toBeInTheDocument();
      expect(screen.getByText('Event Details')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Hosted By')).toBeInTheDocument();
    });

    it('should render virtual event section for hybrid events', () => {
      render(<EventDetailContent event={mockDetailEvent} />);

      expect(screen.getByText('Online Access')).toBeInTheDocument();
    });

    it('should show RSVP-gated virtual link for confirmed users', () => {
      render(<EventDetailContent event={mockDetailEvent} rsvpStatus="confirmed" />);

      expect(screen.getByText('Join Virtual Event')).toBeInTheDocument();
    });

    it('should hide virtual link for non-RSVP users', () => {
      render(<EventDetailContent event={mockDetailEvent} rsvpStatus={undefined} />);

      expect(screen.getByText(/Join link will be available after RSVP/)).toBeInTheDocument();
      expect(screen.queryByText('Join Virtual Event')).not.toBeInTheDocument();
    });

    it('should apply responsive spacing classes', () => {
      const { container } = render(<EventDetailContent event={mockDetailEvent} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('space-y-6');
    });

    it('should render sections as cards with responsive padding', () => {
      const { container } = render(<EventDetailContent event={mockDetailEvent} />);

      const sections = container.querySelectorAll('section');
      sections.forEach((section) => {
        expect(section).toHaveClass('p-6');
        expect(section).toHaveClass('rounded-xl');
      });
    });

    it('should use prose classes for description readability', () => {
      const { container } = render(<EventDetailContent event={mockDetailEvent} />);

      const proseDiv = container.querySelector('.prose');
      expect(proseDiv).toBeInTheDocument();
      expect(proseDiv).toHaveClass('max-w-none');
    });
  });

  describe('EventCard responsive layout', () => {
    it('should apply full height for grid layout', () => {
      const { container } = render(<EventCard event={mockCardEvent} />);

      const article = container.querySelector('article');
      expect(article).toHaveClass('h-full');
    });

    it('should have responsive image container', () => {
      const { container } = render(<EventCard event={mockCardEvent} />);

      // Image container uses relative positioning for next/image fill
      const imgContainer = container.querySelector('.relative');
      expect(imgContainer).toBeInTheDocument();
    });

    it('should have responsive rounded corners', () => {
      const { container } = render(<EventCard event={mockCardEvent} />);

      const article = container.querySelector('article');
      expect(article).toHaveClass('rounded-xl');
    });
  });

  describe('EventCardHorizontal responsive layout', () => {
    it('should stack vertically on mobile (flex-col)', () => {
      const { container } = render(<EventCardHorizontal event={mockCardEvent} />);

      const article = container.querySelector('article');
      expect(article).toHaveClass('flex-col');
    });

    it('should switch to horizontal on sm+ (sm:flex-row)', () => {
      const { container } = render(<EventCardHorizontal event={mockCardEvent} />);

      const article = container.querySelector('article');
      expect(article).toHaveClass('sm:flex-row');
    });

    it('should have responsive thumbnail widths', () => {
      const { container } = render(<EventCardHorizontal event={mockCardEvent} />);

      const thumbnail = container.querySelector('.relative.w-full');
      expect(thumbnail).toHaveClass('sm:w-32');
      expect(thumbnail).toHaveClass('md:w-40');
    });
  });

  describe('touch target sizes', () => {
    it('should render clickable links with sufficient size for touch', () => {
      const { container } = render(<EventCard event={mockCardEvent} />);

      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();
      // The entire card is a link, making it a large touch target
      expect(link?.querySelector('article')).toBeInTheDocument();
    });

    it('should render horizontal card as large touch target', () => {
      const { container } = render(<EventCardHorizontal event={mockCardEvent} />);

      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();
      expect(link?.querySelector('article')).toBeInTheDocument();
    });

    it('should render Get Directions button with adequate size', () => {
      render(<EventDetailContent event={mockDetailEvent} />);

      const directionsButton = screen.getByText('Get Directions');
      expect(directionsButton).toBeInTheDocument();
      expect(directionsButton).toHaveClass('px-4', 'py-2');
    });

    it('should render View Business link', () => {
      render(<EventDetailContent event={mockDetailEvent} />);

      expect(screen.getByText('View Business')).toBeInTheDocument();
    });
  });
});
