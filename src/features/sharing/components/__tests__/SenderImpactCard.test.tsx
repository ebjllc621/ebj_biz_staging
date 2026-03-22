/**
 * Unit tests for SenderImpactCard component
 *
 * Tests loading states, error handling, stats display, and feedback list.
 *
 * @tier STANDARD
 * @phase Technical Debt Remediation - Phase 5 (P3: Component Tests)
 * @coverage 80%+ target
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SenderImpactCard } from '../SenderImpactCard';

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock ErrorBoundary
vi.mock('@/components/common/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock avatar util
vi.mock('@core/utils/avatar', () => ({
  getAvatarInitials: (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase()
}));

describe('SenderImpactCard', () => {
  const mockStats = {
    total_sent: 25,
    total_viewed: 20,
    total_helpful: 15,
    total_thanked: 8,
    view_rate: 80,
    helpful_rate: 60,
    thank_rate: 32
  };

  const mockFeedback = [
    {
      id: 1,
      type: 'helpful',
      recipient_name: 'Alice Smith',
      recipient_avatar: '/avatars/alice.jpg',
      entity_title: 'Coffee Shop',
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      type: 'thank',
      recipient_name: 'Bob Johnson',
      recipient_avatar: null,
      entity_title: 'Restaurant',
      message: 'Thanks so much!',
      created_at: new Date().toISOString()
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Loading State
  // ============================================================================
  describe('Loading State', () => {
    it('shows loading spinner on mount', async () => {
      let resolveRequest: (value: unknown) => void;
      const requestPromise = new Promise((resolve) => {
        resolveRequest = resolve;
      });

      mockFetch.mockReturnValue(requestPromise);

      render(<SenderImpactCard />);

      // Should show loading spinner
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();

      // Resolve to prevent hanging
      resolveRequest!({
        ok: true,
        json: () => Promise.resolve({ data: { stats: mockStats, recent_feedback: [] } })
      });
    });
  });

  // ============================================================================
  // Error State
  // ============================================================================
  describe('Error State', () => {
    it('shows error message on fetch failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500
      });

      render(<SenderImpactCard />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch impact stats')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Stats Display
  // ============================================================================
  describe('Stats Display', () => {
    it('renders stats grid with correct values', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { stats: mockStats, recent_feedback: [] } })
      });

      render(<SenderImpactCard />);

      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument(); // total_sent
        expect(screen.getByText('20')).toBeInTheDocument(); // total_viewed
        expect(screen.getByText('15')).toBeInTheDocument(); // total_helpful
        expect(screen.getByText('8')).toBeInTheDocument();  // total_thanked
      });
    });

    it('shows percentage rates', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { stats: mockStats, recent_feedback: [] } })
      });

      render(<SenderImpactCard />);

      await waitFor(() => {
        expect(screen.getByText('80%')).toBeInTheDocument(); // view_rate
        expect(screen.getByText('60%')).toBeInTheDocument(); // helpful_rate
        expect(screen.getByText('32%')).toBeInTheDocument(); // thank_rate
      });
    });

    it('shows correct labels', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { stats: mockStats, recent_feedback: [] } })
      });

      render(<SenderImpactCard />);

      await waitFor(() => {
        expect(screen.getByText('Sent')).toBeInTheDocument();
        expect(screen.getByText('Viewed')).toBeInTheDocument();
        expect(screen.getByText('Helpful')).toBeInTheDocument();
        expect(screen.getByText('Thank Yous')).toBeInTheDocument();
      });
    });

    it('shows header with title', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { stats: mockStats, recent_feedback: [] } })
      });

      render(<SenderImpactCard />);

      await waitFor(() => {
        expect(screen.getByText('Your Recommendation Impact')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Feedback List
  // ============================================================================
  describe('Feedback List', () => {
    it('renders recent feedback items', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { stats: mockStats, recent_feedback: mockFeedback } })
      });

      render(<SenderImpactCard />);

      await waitFor(() => {
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      });
    });

    it('shows helpful feedback correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { stats: mockStats, recent_feedback: mockFeedback } })
      });

      render(<SenderImpactCard />);

      await waitFor(() => {
        expect(screen.getByText(/as helpful/)).toBeInTheDocument();
      });
    });

    it('shows thank you message', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { stats: mockStats, recent_feedback: mockFeedback } })
      });

      render(<SenderImpactCard />);

      await waitFor(() => {
        expect(screen.getByText(/Thanks so much!/)).toBeInTheDocument();
      });
    });

    it('shows section header when feedback exists', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { stats: mockStats, recent_feedback: mockFeedback } })
      });

      render(<SenderImpactCard />);

      await waitFor(() => {
        expect(screen.getByText('Recent Feedback')).toBeInTheDocument();
      });
    });

    it('does not show feedback section when empty', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { stats: mockStats, recent_feedback: [] } })
      });

      render(<SenderImpactCard />);

      await waitFor(() => {
        expect(screen.queryByText('Recent Feedback')).not.toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Empty State
  // ============================================================================
  describe('Empty State', () => {
    it('shows empty state when no recommendations sent', async () => {
      const emptyStats = { ...mockStats, total_sent: 0 };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { stats: emptyStats, recent_feedback: [] } })
      });

      render(<SenderImpactCard />);

      await waitFor(() => {
        expect(screen.getByText('Start sharing recommendations to see your impact!')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Avatar Rendering
  // ============================================================================
  describe('Avatar Rendering', () => {
    it('shows avatar image when available', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { stats: mockStats, recent_feedback: mockFeedback } })
      });

      render(<SenderImpactCard />);

      await waitFor(() => {
        const avatarImg = screen.getByAltText('Alice Smith');
        expect(avatarImg).toBeInTheDocument();
        expect(avatarImg).toHaveAttribute('src', '/avatars/alice.jpg');
      });
    });

    it('shows initials when avatar not available', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { stats: mockStats, recent_feedback: mockFeedback } })
      });

      render(<SenderImpactCard />);

      await waitFor(() => {
        expect(screen.getByText('BJ')).toBeInTheDocument(); // Bob Johnson initials
      });
    });
  });

  // ============================================================================
  // Custom Class Name
  // ============================================================================
  describe('Custom Class Name', () => {
    it('applies custom className', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { stats: mockStats, recent_feedback: [] } })
      });

      const { container } = render(<SenderImpactCard className="custom-class" />);

      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom-class');
      });
    });
  });
});
