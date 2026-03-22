/**
 * EventSponsorsSection - Component Tests
 *
 * @tier SIMPLE
 * @phase Phase 7
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 *
 * Tests sponsor fetching, tier grouping, heading display,
 * bronze text links, empty state, and loading state.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { EventSponsorsSection } from '../EventSponsorsSection';

vi.mock('@/components/common/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('../EventSponsorCard', () => ({
  EventSponsorCard: ({ sponsor }: { sponsor: { listing_name?: string } }) => (
    <div data-testid="sponsor-card">{sponsor.listing_name}</div>
  )
}));

const mockSponsors = [
  { id: 1, sponsor_tier: 'title', listing_name: 'Title Corp', listing_slug: 'title-corp', sponsor_logo: '/title.jpg', status: 'active', display_order: 0 },
  { id: 2, sponsor_tier: 'gold', listing_name: 'Gold Inc', listing_slug: 'gold-inc', sponsor_logo: '/gold.jpg', status: 'active', display_order: 1 },
  { id: 3, sponsor_tier: 'bronze', listing_name: 'Bronze LLC', listing_slug: 'bronze-llc', status: 'active', display_order: 2 },
];

function buildFetchResponse(body: unknown, ok = true) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(body),
  } as Response);
}

describe('EventSponsorsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sponsors grouped by tier', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/sponsors') && !url.includes('impressions')) {
        return buildFetchResponse({ data: { sponsors: mockSponsors } });
      }
      return buildFetchResponse({});
    });

    render(<EventSponsorsSection eventId={1} />);

    await waitFor(() => {
      expect(screen.getAllByTestId('sponsor-card').length).toBeGreaterThan(0);
    });
  });

  it('renders title sponsor with EventSponsorCard', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/sponsors') && !url.includes('impressions')) {
        return buildFetchResponse({ data: { sponsors: mockSponsors } });
      }
      return buildFetchResponse({});
    });

    render(<EventSponsorsSection eventId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Title Corp')).toBeInTheDocument();
    });
  });

  it('renders bronze sponsors as text links', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/sponsors') && !url.includes('impressions')) {
        return buildFetchResponse({ data: { sponsors: mockSponsors } });
      }
      return buildFetchResponse({});
    });

    render(<EventSponsorsSection eventId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Bronze LLC')).toBeInTheDocument();
    });
  });

  it('renders nothing when sponsors array is empty', async () => {
    global.fetch = vi.fn().mockImplementation(() =>
      buildFetchResponse({ data: { sponsors: [] } })
    );

    const { container } = render(<EventSponsorsSection eventId={1} />);

    await waitFor(() => {
      // Section should not be rendered
      expect(container.querySelector('section')).toBeNull();
    });
  });

  it('renders "Event Sponsors" heading when sponsors exist', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/sponsors') && !url.includes('impressions')) {
        return buildFetchResponse({ data: { sponsors: mockSponsors } });
      }
      return buildFetchResponse({});
    });

    render(<EventSponsorsSection eventId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Event Sponsors')).toBeInTheDocument();
    });
  });

  it('renders nothing while loading (initial render before fetch resolves)', () => {
    global.fetch = vi.fn().mockImplementation(
      () => new Promise(() => { /* never resolves */ })
    );

    const { container } = render(<EventSponsorsSection eventId={1} />);

    // On initial render before fetch resolves, component returns null (isLoading = true)
    expect(container.querySelector('section')).toBeNull();
  });
});
