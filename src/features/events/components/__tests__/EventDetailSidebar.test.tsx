/**
 * EventDetailSidebar - Component Tests
 *
 * @tier SIMPLE
 * @phase Phase 7
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 *
 * Tests sidebar rendering: business header, contact, location, hours,
 * social links, other events, follow button, and null-listing fallback.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { EventDetailData } from '@features/events/types';
import { EventDetailSidebar } from '../EventDetailSidebar';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props as React.ImgHTMLAttributes<HTMLImageElement>} />;
  }
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
}));

vi.mock('@features/listings/components/details/SidebarLocationCard', () => ({
  SidebarLocationCard: () => <div data-testid="location-card" />
}));

vi.mock('@features/listings/components/details/SidebarHoursCard', () => ({
  SidebarHoursCard: () => <div data-testid="hours-card" />
}));

vi.mock('@features/listings/components/details/SidebarSocialCard', () => ({
  SidebarSocialCard: () => <div data-testid="social-card" />
}));

vi.mock('../EventSidebarBusinessHeader', () => ({
  EventSidebarBusinessHeader: ({ listing }: { listing: { name: string } }) => (
    <div data-testid="business-header">{listing.name}</div>
  )
}));

vi.mock('../EventSidebarOtherEvents', () => ({
  EventSidebarOtherEvents: () => <div data-testid="other-events" />
}));

vi.mock('../EventSidebarFollowButton', () => ({
  EventSidebarFollowButton: () => <div data-testid="follow-button" />
}));

vi.mock('../EventSidebarQuickContact', () => ({
  EventSidebarQuickContact: () => <div data-testid="quick-contact" />
}));

const mockEvent: Partial<EventDetailData> = {
  id: 1,
  listing_id: 10,
  title: 'Community Festival 2026',
  slug: 'community-festival-2026',
  description: '<p>A wonderful community event</p>',
  event_type: 'festival',
  start_date: new Date('2026-06-15T10:00:00Z'),
  end_date: new Date('2026-06-15T18:00:00Z'),
  timezone: 'America/Los_Angeles',
  location_type: 'physical',
  venue_name: 'Central Park Pavilion',
  address: '123 Main St',
  city: 'Seattle',
  state: 'WA',
  zip: '98101',
  latitude: 47.6062,
  longitude: -122.3321,
  banner_image: 'https://example.com/banner.jpg',
  thumbnail: 'https://example.com/thumb.jpg',
  is_ticketed: false,
  ticket_price: null,
  total_capacity: 200,
  remaining_capacity: 150,
  rsvp_count: 50,
  status: 'published',
  is_featured: true,
  is_mock: false,
  view_count: 1234,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
  listing_name: 'Seattle Community Center',
  listing_slug: 'seattle-community-center',
  listing_logo: 'https://example.com/logo.jpg',
  listing_cover_image: null,
  listing_tier: 'preferred',
  listing_claimed: true,
  listing_rating: 4.5,
  listing_review_count: 12,
  listing_phone: '206-555-1234',
  listing_email: 'info@example.com',
  listing_website: 'https://example.com',
  listing_city: 'Seattle',
  listing_state: 'WA',
};

// Minimal mock listing shape matching what Listing type expects
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockListing: any = {
  id: 10,
  name: 'Seattle Community Center',
  slug: 'seattle-community-center',
  phone: '206-555-1234',
  email: 'info@example.com',
  website: 'https://example.com',
  city: 'Seattle',
  state: 'WA',
};

describe('EventDetailSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders business header with listing data', () => {
    render(
      <EventDetailSidebar
        event={mockEvent as EventDetailData}
        listing={mockListing}
      />
    );

    expect(screen.getByTestId('business-header')).toBeInTheDocument();
    expect(screen.getByText('Seattle Community Center')).toBeInTheDocument();
  });

  it('renders quick contact section', () => {
    render(
      <EventDetailSidebar
        event={mockEvent as EventDetailData}
        listing={mockListing}
      />
    );

    expect(screen.getByTestId('quick-contact')).toBeInTheDocument();
  });

  it('renders location card', () => {
    render(
      <EventDetailSidebar
        event={mockEvent as EventDetailData}
        listing={mockListing}
      />
    );

    expect(screen.getByTestId('location-card')).toBeInTheDocument();
  });

  it('renders hours card', () => {
    render(
      <EventDetailSidebar
        event={mockEvent as EventDetailData}
        listing={mockListing}
      />
    );

    expect(screen.getByTestId('hours-card')).toBeInTheDocument();
  });

  it('renders social card', () => {
    render(
      <EventDetailSidebar
        event={mockEvent as EventDetailData}
        listing={mockListing}
      />
    );

    expect(screen.getByTestId('social-card')).toBeInTheDocument();
  });

  it('renders other events section', () => {
    render(
      <EventDetailSidebar
        event={mockEvent as EventDetailData}
        listing={mockListing}
      />
    );

    expect(screen.getByTestId('other-events')).toBeInTheDocument();
  });

  it('renders follow button', () => {
    render(
      <EventDetailSidebar
        event={mockEvent as EventDetailData}
        listing={mockListing}
      />
    );

    expect(screen.getByTestId('follow-button')).toBeInTheDocument();
  });

  it('shows minimal sidebar when listing is null', () => {
    const eventNoListing = {
      ...mockEvent,
      listing_name: null,
    } as EventDetailData;

    render(
      <EventDetailSidebar
        event={eventNoListing}
        listing={null}
      />
    );

    expect(screen.getByText('Event Host')).toBeInTheDocument();
    expect(screen.queryByTestId('business-header')).not.toBeInTheDocument();
  });
});
