/**
 * EventShareModal - Component Tests
 *
 * @tier SIMPLE
 * @phase Phase 7
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 *
 * Tests modal open/close, platform share buttons, copy link button,
 * and event preview display.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { EventDetailData } from '@features/events/types';
import { EventShareModal } from '../EventShareModal';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props as React.ImgHTMLAttributes<HTMLImageElement>} />;
  }
}));

vi.mock('@/components/ui/BizModal', () => ({
  BizModal: ({
    isOpen,
    children,
    title
  }: {
    isOpen: boolean;
    children: React.ReactNode;
    title: string;
  }) =>
    isOpen ? (
      <div data-testid="biz-modal">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null
}));

vi.mock('@/components/common/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('@features/events/hooks/useEventAnalytics', () => ({
  useEventAnalytics: () => ({ trackEvent: vi.fn() })
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

describe('EventShareModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) }
    });
  });

  it('renders modal when isOpen is true', () => {
    render(
      <EventShareModal
        isOpen={true}
        onClose={vi.fn()}
        event={mockEvent as EventDetailData}
      />
    );

    expect(screen.getByText('Share This Event')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <EventShareModal
        isOpen={false}
        onClose={vi.fn()}
        event={mockEvent as EventDetailData}
      />
    );

    expect(screen.queryByText('Share This Event')).not.toBeInTheDocument();
  });

  it('renders platform share buttons', () => {
    render(
      <EventShareModal
        isOpen={true}
        onClose={vi.fn()}
        event={mockEvent as EventDetailData}
      />
    );

    expect(screen.getByText('Facebook')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
  });

  it('shows copy link button', () => {
    render(
      <EventShareModal
        isOpen={true}
        onClose={vi.fn()}
        event={mockEvent as EventDetailData}
      />
    );

    expect(screen.getByText('Copy')).toBeInTheDocument();
  });

  it('calls onClose when Done button clicked', () => {
    const onClose = vi.fn();
    render(
      <EventShareModal
        isOpen={true}
        onClose={onClose}
        event={mockEvent as EventDetailData}
      />
    );

    fireEvent.click(screen.getByText('Done'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows event preview with title', () => {
    render(
      <EventShareModal
        isOpen={true}
        onClose={vi.fn()}
        event={mockEvent as EventDetailData}
      />
    );

    expect(screen.getByText('Community Festival 2026')).toBeInTheDocument();
  });
});
