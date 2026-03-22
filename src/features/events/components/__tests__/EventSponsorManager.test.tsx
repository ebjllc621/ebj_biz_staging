/**
 * EventSponsorManager - Component Tests
 *
 * @tier SIMPLE
 * @phase Phase 8D
 * @generated DNA v11.4.0
 *
 * Tests loading state, events list rendering, sponsor display with analytics,
 * empty states, invite modal, and delete confirmation flow.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventSponsorManager } from '../dashboard/EventSponsorManager';

vi.mock('@/components/common/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('../SponsorInviteModal', () => ({
  SponsorInviteModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="sponsor-invite-modal">
      <button onClick={onClose}>Close Modal</button>
    </div>
  ),
}));

vi.mock('@core/utils/csrf', () => ({
  fetchWithCsrf: vi.fn(),
}));

import { fetchWithCsrf } from '@core/utils/csrf';
const mockFetchWithCsrf = vi.mocked(fetchWithCsrf);

const mockFetch = vi.fn();
global.fetch = mockFetch;

function createEventsResponse(events: Array<Record<string, unknown>>) {
  return {
    ok: true,
    json: async () => ({
      data: { items: events }
    }),
  };
}

function createSponsorsResponse(sponsors: Array<Record<string, unknown>>) {
  return {
    ok: true,
    json: async () => ({
      data: { sponsors }
    }),
  };
}

const sampleEvent = {
  id: 1,
  title: 'Annual Gala',
  slug: 'annual-gala',
  start_date: '2026-04-01T19:00:00Z',
  status: 'published',
};

const sampleSponsor = {
  id: 101,
  event_id: 1,
  sponsor_listing_id: 50,
  sponsor_tier: 'gold',
  sponsor_logo: null,
  sponsor_message: 'Proud sponsor',
  click_count: 25,
  impression_count: 500,
  status: 'active',
  start_date: null,
  end_date: null,
  listing_name: 'Acme Corp',
  listing_slug: 'acme-corp',
  listing_logo: null,
  listing_city: 'Portland',
  listing_tier: 'plus',
};

function setupFetchWithSponsors(events: Array<Record<string, unknown>>, sponsors: Array<Record<string, unknown>>) {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('/sponsors')) {
      return Promise.resolve(createSponsorsResponse(sponsors));
    }
    return Promise.resolve(createEventsResponse(events));
  });
}

function setupFetchNoSponsors(events: Array<Record<string, unknown>>) {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('/sponsors')) {
      return Promise.resolve(createSponsorsResponse([]));
    }
    return Promise.resolve(createEventsResponse(events));
  });
}

describe('EventSponsorManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading', () => {
    it('should show loading spinner on mount', () => {
      mockFetch.mockReturnValue(new Promise(() => {})); // Never resolves

      render(<EventSponsorManager listingId={5} />);

      expect(screen.getByText('Loading events and sponsors...')).toBeInTheDocument();
    });
  });

  describe('API', () => {
    it('should fetch events for the listing', async () => {
      setupFetchNoSponsors([]);

      render(<EventSponsorManager listingId={5} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
        const eventsCall = mockFetch.mock.calls.find((call) =>
          (call[0] as string).includes('listingId=')
        );
        expect(eventsCall).toBeDefined();
      });
    });
  });

  describe('events list', () => {
    it('should render event titles', async () => {
      setupFetchNoSponsors([sampleEvent]);

      render(<EventSponsorManager listingId={5} />);

      await waitFor(() => {
        expect(screen.getByText('Annual Gala')).toBeInTheDocument();
      });
    });

    it('should render event status', async () => {
      setupFetchNoSponsors([sampleEvent]);

      render(<EventSponsorManager listingId={5} />);

      await waitFor(() => {
        expect(screen.getByText(/published/)).toBeInTheDocument();
      });
    });
  });

  describe('sponsors', () => {
    it('should render sponsor name and tier', async () => {
      setupFetchWithSponsors([sampleEvent], [sampleSponsor]);

      render(<EventSponsorManager listingId={5} />);

      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
        expect(screen.getByText('gold')).toBeInTheDocument();
      });
    });

    it('should render analytics (impressions and clicks)', async () => {
      setupFetchWithSponsors([sampleEvent], [sampleSponsor]);

      render(<EventSponsorManager listingId={5} />);

      await waitFor(() => {
        expect(screen.getByText(/500 imp\./)).toBeInTheDocument();
        expect(screen.getByText(/25 clicks/)).toBeInTheDocument();
      });
    });
  });

  describe('empty states', () => {
    it('should show empty state when no events', async () => {
      setupFetchNoSponsors([]);

      render(<EventSponsorManager listingId={5} />);

      await waitFor(() => {
        expect(screen.getByText('No events found')).toBeInTheDocument();
      });
    });

    it('should show no sponsors message for event with no sponsors', async () => {
      setupFetchNoSponsors([sampleEvent]);

      render(<EventSponsorManager listingId={5} />);

      await waitFor(() => {
        expect(screen.getByText(/No sponsors yet/)).toBeInTheDocument();
      });
    });
  });

  describe('invite modal', () => {
    it('should open modal on Invite Sponsor click', async () => {
      const user = userEvent.setup();
      setupFetchNoSponsors([sampleEvent]);

      render(<EventSponsorManager listingId={5} />);

      await waitFor(() => {
        expect(screen.getByText('Annual Gala')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /invite sponsor/i }));

      expect(screen.getByTestId('sponsor-invite-modal')).toBeInTheDocument();
    });
  });

  describe('delete', () => {
    it('should call fetchWithCsrf DELETE after confirm', async () => {
      const user = userEvent.setup();
      setupFetchWithSponsors([sampleEvent], [sampleSponsor]);

      mockFetchWithCsrf.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      // Mock window.confirm to return true
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<EventSponsorManager listingId={5} />);

      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      });

      // Click remove button (Trash2 icon button, title="Remove sponsor")
      const removeButton = screen.getByTitle('Remove sponsor');
      await user.click(removeButton);

      await waitFor(() => {
        expect(mockFetchWithCsrf).toHaveBeenCalledWith(
          expect.stringContaining('/sponsors/101'),
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });
  });
});
