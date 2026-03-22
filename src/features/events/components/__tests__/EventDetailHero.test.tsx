/**
 * EventDetailHero - Component Tests
 *
 * @tier SIMPLE
 * @phase Phase 7
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 *
 * Tests rendering of hero section: banner image, badges, action buttons,
 * price display, and location for EventDetailHero component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { EventDetailData } from '@features/events/types';
import { EventDetailHero } from '../EventDetailHero';

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

vi.mock('@features/sharing/components/RecommendButton', () => ({
  RecommendButton: () => <button>Recommend</button>
}));

vi.mock('../EventCapacityBar', () => ({
  EventCapacityBar: () => <div data-testid="capacity-bar" />
}));

vi.mock('../EventRSVPButton', () => ({
  EventRSVPButton: () => <button>RSVP</button>
}));

vi.mock('../EventSaveButton', () => ({
  EventSaveButton: () => <button>Save</button>
}));

vi.mock('../EventSponsorBadge', () => ({
  EventSponsorBadge: ({ sponsorName }: { sponsorName: string }) => <span>{sponsorName}</span>
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

const defaultProps = {
  event: mockEvent as EventDetailData,
  onRSVPClick: vi.fn(),
  onSaveClick: vi.fn(),
  onShareClick: vi.fn(),
};

describe('EventDetailHero', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders event title', () => {
    render(<EventDetailHero {...defaultProps} />);

    expect(screen.getByText('Community Festival 2026')).toBeInTheDocument();
  });

  it('renders banner image when provided', () => {
    render(<EventDetailHero {...defaultProps} />);

    const img = screen.getByAltText('Community Festival 2026');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', expect.stringContaining('banner.jpg'));
  });

  it('shows "Free" for non-ticketed events', () => {
    render(<EventDetailHero {...defaultProps} />);

    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('shows price for ticketed events', () => {
    const ticketedEvent = {
      ...mockEvent,
      is_ticketed: true,
      ticket_price: 25,
    } as EventDetailData;

    render(<EventDetailHero {...defaultProps} event={ticketedEvent} />);

    expect(screen.getByText('$25.00')).toBeInTheDocument();
  });

  it('shows "Featured" badge when is_featured is true', () => {
    render(<EventDetailHero {...defaultProps} />);

    expect(screen.getByText('Featured')).toBeInTheDocument();
  });

  it('shows days-until badge for future events', () => {
    const futureEvent = {
      ...mockEvent,
      start_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
    } as EventDetailData;

    render(<EventDetailHero {...defaultProps} event={futureEvent} />);

    // Should show some form of days-until badge text
    const badge = screen.getByText(/days|Today|Tomorrow/);
    expect(badge).toBeInTheDocument();
  });

  it('renders action buttons (RSVP, Save, Share, Recommend)', () => {
    render(<EventDetailHero {...defaultProps} />);

    expect(screen.getByText('RSVP')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
    expect(screen.getByText('Recommend')).toBeInTheDocument();
  });

  it('shows venue name and location for physical events', () => {
    render(<EventDetailHero {...defaultProps} />);

    expect(screen.getByText('Central Park Pavilion')).toBeInTheDocument();
  });
});
