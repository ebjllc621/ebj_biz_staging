/**
 * EventRSVPButton - Component Tests
 *
 * @tier SIMPLE
 * @phase Phase 7
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 *
 * Tests RSVP button states: default, confirmed, waitlist, ended, cancelled,
 * ticketed events, and callback invocation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { EventDetailData, EventRSVPStatus } from '@features/events/types';
import { EventRSVPButton } from '../EventRSVPButton';

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
  rsvpStatus: 'none' as EventRSVPStatus,
  onRSVPClick: vi.fn(),
  onCancelClick: vi.fn(),
};

describe('EventRSVPButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "RSVP Now" for default non-ticketed event', () => {
    render(<EventRSVPButton {...defaultProps} />);

    expect(screen.getByText('RSVP Now')).toBeInTheDocument();
  });

  it('renders "Going" when rsvpStatus is confirmed', () => {
    render(<EventRSVPButton {...defaultProps} rsvpStatus="confirmed" />);

    expect(screen.getByText('Going')).toBeInTheDocument();
  });

  it('renders "Join Waitlist" when event is at capacity', () => {
    const atCapacityEvent = {
      ...mockEvent,
      remaining_capacity: 0,
    } as EventDetailData;

    render(<EventRSVPButton {...defaultProps} event={atCapacityEvent} />);

    expect(screen.getByText('Join Waitlist')).toBeInTheDocument();
  });

  it('renders "Event Ended" and is disabled for past events', () => {
    const pastEvent = {
      ...mockEvent,
      end_date: new Date('2020-01-01T00:00:00Z'),
    } as EventDetailData;

    render(<EventRSVPButton {...defaultProps} event={pastEvent} />);

    const button = screen.getByText('Event Ended');
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('calls onRSVPClick callback when clicked', () => {
    const onRSVPClick = vi.fn();
    render(<EventRSVPButton {...defaultProps} onRSVPClick={onRSVPClick} />);

    fireEvent.click(screen.getByText('RSVP Now'));

    expect(onRSVPClick).toHaveBeenCalledTimes(1);
  });

  it('renders "Get Tickets" for ticketed events', () => {
    const ticketedEvent = {
      ...mockEvent,
      is_ticketed: true,
    } as EventDetailData;

    render(<EventRSVPButton {...defaultProps} event={ticketedEvent} />);

    expect(screen.getByText('Get Tickets')).toBeInTheDocument();
  });

  it('renders "Event Cancelled" and is disabled for cancelled events', () => {
    const cancelledEvent = {
      ...mockEvent,
      status: 'cancelled',
    } as EventDetailData;

    render(<EventRSVPButton {...defaultProps} event={cancelledEvent} />);

    const button = screen.getByText('Event Cancelled');
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('shows "Cancel RSVP" link when confirmed', () => {
    render(<EventRSVPButton {...defaultProps} rsvpStatus="confirmed" />);

    expect(screen.getByText('Cancel RSVP')).toBeInTheDocument();
  });
});
