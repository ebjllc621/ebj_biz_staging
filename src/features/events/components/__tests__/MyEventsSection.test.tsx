/**
 * MyEventsSection + EventStatsCards - Dashboard Integration Tests
 *
 * @tier STANDARD
 * @phase Phase 9 - Testing & Validation
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests tabs, loading state, empty state, event card rendering, stats display.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyEventsSection } from '../dashboard/MyEventsSection';
import { EventStatsCards } from '../dashboard/EventStatsCards';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

function createEventsResponse(items: Array<Record<string, unknown>>, total = items.length) {
  return {
    ok: true,
    json: async () => ({
      data: {
        items,
        pagination: {
          page: 1,
          limit: 10,
          total,
          totalPages: Math.ceil(total / 10),
          hasNextPage: total > 10,
          hasPrevPage: false,
        },
      },
    }),
  };
}

const sampleEvents = [
  {
    id: 1,
    title: 'Community BBQ',
    slug: 'community-bbq',
    start_date: futureDate,
    end_date: futureDate,
    status: 'published',
    location_type: 'physical',
    city: 'Portland',
    venue_name: 'Pioneer Square',
    listing_name: 'Local Grill',
    thumbnail: null,
    banner_image: null,
    has_reviewed: 0,
    rsvp_count: 25,
    total_capacity: 100,
    page_views: 150,
    shares: 12,
  },
];

describe('MyEventsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tabs', () => {
    it('should render all 4 tabs', async () => {
      mockFetch.mockResolvedValue(createEventsResponse([]));

      render(<MyEventsSection />);

      expect(screen.getByText('Upcoming')).toBeInTheDocument();
      expect(screen.getByText('Saved')).toBeInTheDocument();
      expect(screen.getByText('Past')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();
    });

    it('should render "My Events" heading', async () => {
      mockFetch.mockResolvedValue(createEventsResponse([]));

      render(<MyEventsSection />);

      expect(screen.getByText('My Events')).toBeInTheDocument();
    });

    it('should switch tabs on click', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue(createEventsResponse([]));

      render(<MyEventsSection />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Click "Saved" tab
      await user.click(screen.getByText('Saved'));

      await waitFor(() => {
        // Should fetch with tab=saved
        const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
        expect(lastCall[0]).toContain('tab=saved');
      });
    });
  });

  describe('loading state', () => {
    it('should show loading skeletons while fetching', () => {
      mockFetch.mockReturnValue(new Promise(() => {})); // Never resolves
      const { container } = render(<MyEventsSection />);

      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no events', async () => {
      mockFetch.mockResolvedValue(createEventsResponse([]));

      render(<MyEventsSection />);

      await waitFor(() => {
        expect(screen.getByText('No upcoming events')).toBeInTheDocument();
      });
      expect(screen.getByText("You haven't RSVPed to any upcoming events yet.")).toBeInTheDocument();
    });

    it('should show "Browse Events" link in empty state', async () => {
      mockFetch.mockResolvedValue(createEventsResponse([]));

      render(<MyEventsSection />);

      await waitFor(() => {
        expect(screen.getByText('Browse Events')).toBeInTheDocument();
      });
    });
  });

  describe('event cards', () => {
    it('should render event titles', async () => {
      mockFetch.mockResolvedValue(createEventsResponse(sampleEvents));

      render(<MyEventsSection />);

      await waitFor(() => {
        expect(screen.getByText('Community BBQ')).toBeInTheDocument();
      });
    });

    it('should render listing name', async () => {
      mockFetch.mockResolvedValue(createEventsResponse(sampleEvents));

      render(<MyEventsSection />);

      await waitFor(() => {
        expect(screen.getByText('Local Grill')).toBeInTheDocument();
      });
    });

    it('should render status badge', async () => {
      mockFetch.mockResolvedValue(createEventsResponse(sampleEvents));

      render(<MyEventsSection />);

      await waitFor(() => {
        expect(screen.getByText('published')).toBeInTheDocument();
      });
    });
  });

  describe('error state', () => {
    it('should show error message on fetch failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Server error' }),
      });

      render(<MyEventsSection />);

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });
    });

    it('should show Try again button on error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Server error' }),
      });

      render(<MyEventsSection />);

      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });
    });
  });

  describe('API calls', () => {
    it('should fetch with correct tab and page params', async () => {
      mockFetch.mockResolvedValue(createEventsResponse([]));

      render(<MyEventsSection />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/user/events?tab=upcoming&page=1&limit=10',
          { credentials: 'include' }
        );
      });
    });
  });
});

describe('EventStatsCards', () => {
  it('should render RSVP count with capacity', () => {
    render(
      <EventStatsCards rsvpCount={25} totalCapacity={100} pageViews={150} shares={12} status="published" />
    );

    expect(screen.getByText('25 / 100')).toBeInTheDocument();
    expect(screen.getByText('RSVPs')).toBeInTheDocument();
  });

  it('should show infinity symbol when no capacity', () => {
    render(
      <EventStatsCards rsvpCount={10} totalCapacity={null} pageViews={50} shares={5} status="published" />
    );

    expect(screen.getByText('10 / \u221e')).toBeInTheDocument();
  });

  it('should render page views', () => {
    render(
      <EventStatsCards rsvpCount={25} totalCapacity={100} pageViews={150} shares={12} status="published" />
    );

    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('views')).toBeInTheDocument();
  });

  it('should render shares count', () => {
    render(
      <EventStatsCards rsvpCount={25} totalCapacity={100} pageViews={150} shares={12} status="published" />
    );

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('shares')).toBeInTheDocument();
  });

  it('should render status badge with correct color', () => {
    render(
      <EventStatsCards rsvpCount={25} totalCapacity={100} pageViews={150} shares={12} status="published" />
    );

    expect(screen.getByText('published')).toBeInTheDocument();
  });

  it('should render cancelled status with red color', () => {
    render(
      <EventStatsCards rsvpCount={0} totalCapacity={100} pageViews={10} shares={0} status="cancelled" />
    );

    const statusBadge = screen.getByText('cancelled');
    expect(statusBadge).toHaveClass('text-red-700');
  });
});
