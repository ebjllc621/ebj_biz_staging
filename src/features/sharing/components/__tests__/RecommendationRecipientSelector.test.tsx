/**
 * Unit tests for RecommendationRecipientSelector component
 *
 * Tests contact loading, search/filtering, selection, and error states.
 *
 * @tier STANDARD
 * @phase Technical Debt Remediation - Phase 5 (P3: Component Tests)
 * @coverage 80%+ target
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecommendationRecipientSelector } from '../RecommendationRecipientSelector';

// Mock ErrorBoundary
vi.mock('@/components/common/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock avatar util
vi.mock('@core/utils/avatar', () => ({
  getAvatarInitials: (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase()
}));

// Mock fetchWithCsrf
const mockFetchWithCsrf = vi.fn();
vi.mock('@core/utils/csrf', () => ({
  fetchWithCsrf: (...args: unknown[]) => mockFetchWithCsrf(...args)
}));

describe('RecommendationRecipientSelector', () => {
  const mockOnSelectRecipient = vi.fn();

  const mockContacts = [
    {
      user_id: 1,
      username: 'johndoe',
      display_name: 'John Doe',
      avatar_url: '/avatars/john.jpg',
      registered_user_id: 100
    },
    {
      user_id: 2,
      username: 'janedoe',
      display_name: 'Jane Doe',
      avatar_url: null,
      registered_user_id: 101
    }
  ];

  const selectedRecipient = {
    id: 1,
    username: 'johndoe',
    display_name: 'John Doe',
    avatar_url: '/avatars/john.jpg'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchWithCsrf.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { contacts: mockContacts } })
    });
  });

  // ============================================================================
  // Loading State
  // ============================================================================
  describe('Loading State', () => {
    it('shows loading text while fetching contacts', async () => {
      let resolveRequest: (value: unknown) => void;
      const requestPromise = new Promise((resolve) => {
        resolveRequest = resolve;
      });
      mockFetchWithCsrf.mockReturnValue(requestPromise);

      render(
        <RecommendationRecipientSelector
          selectedRecipient={null}
          onSelectRecipient={mockOnSelectRecipient}
        />
      );

      expect(screen.getByText('Loading contacts...')).toBeInTheDocument();

      resolveRequest!({
        ok: true,
        json: () => Promise.resolve({ data: { contacts: mockContacts } })
      });
    });
  });

  // ============================================================================
  // Contact List
  // ============================================================================
  describe('Contact List', () => {
    it('renders contact list after loading', async () => {
      render(
        <RecommendationRecipientSelector
          selectedRecipient={null}
          onSelectRecipient={mockOnSelectRecipient}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      });
    });

    it('renders search input', async () => {
      render(
        <RecommendationRecipientSelector
          selectedRecipient={null}
          onSelectRecipient={mockOnSelectRecipient}
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search contacts...')).toBeInTheDocument();
      });
    });

    it('shows initials when avatar not available', async () => {
      render(
        <RecommendationRecipientSelector
          selectedRecipient={null}
          onSelectRecipient={mockOnSelectRecipient}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Search/Filter
  // ============================================================================
  describe('Search/Filter', () => {
    it('filters contacts by search query', async () => {
      render(
        <RecommendationRecipientSelector
          selectedRecipient={null}
          onSelectRecipient={mockOnSelectRecipient}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText('Search contacts...'), {
        target: { value: 'jane' }
      });

      await waitFor(() => {
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      });
    });

    it('shows no results message when search has no matches', async () => {
      render(
        <RecommendationRecipientSelector
          selectedRecipient={null}
          onSelectRecipient={mockOnSelectRecipient}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText('Search contacts...'), {
        target: { value: 'xyz123' }
      });

      await waitFor(() => {
        expect(screen.getByText(/No contacts match/)).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Selection
  // ============================================================================
  describe('Selection', () => {
    it('calls onSelectRecipient when contact clicked', async () => {
      render(
        <RecommendationRecipientSelector
          selectedRecipient={null}
          onSelectRecipient={mockOnSelectRecipient}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('John Doe'));

      expect(mockOnSelectRecipient).toHaveBeenCalledWith({
        id: 1,
        username: 'johndoe',
        display_name: 'John Doe',
        avatar_url: '/avatars/john.jpg'
      });
    });

    it('shows selected recipient with clear button', () => {
      render(
        <RecommendationRecipientSelector
          selectedRecipient={selectedRecipient}
          onSelectRecipient={mockOnSelectRecipient}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('@johndoe')).toBeInTheDocument();
    });

    it('clears selection when X clicked', () => {
      render(
        <RecommendationRecipientSelector
          selectedRecipient={selectedRecipient}
          onSelectRecipient={mockOnSelectRecipient}
        />
      );

      // Find the clear button (X icon)
      const clearButton = screen.getByRole('button');
      fireEvent.click(clearButton);

      expect(mockOnSelectRecipient).toHaveBeenCalledWith(null);
    });
  });

  // ============================================================================
  // Error State
  // ============================================================================
  describe('Error State', () => {
    it('shows error message on fetch failure', async () => {
      mockFetchWithCsrf.mockResolvedValue({
        ok: false,
        status: 500
      });

      render(
        <RecommendationRecipientSelector
          selectedRecipient={null}
          onSelectRecipient={mockOnSelectRecipient}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load contacts')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Empty State
  // ============================================================================
  describe('Empty State', () => {
    it('shows empty state when no registered contacts', async () => {
      mockFetchWithCsrf.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { contacts: [] } })
      });

      render(
        <RecommendationRecipientSelector
          selectedRecipient={null}
          onSelectRecipient={mockOnSelectRecipient}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No registered contacts found')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Disabled State
  // ============================================================================
  describe('Disabled State', () => {
    it('disables clear button when disabled prop is true', () => {
      render(
        <RecommendationRecipientSelector
          selectedRecipient={selectedRecipient}
          onSelectRecipient={mockOnSelectRecipient}
          disabled={true}
        />
      );

      const clearButton = screen.getByRole('button');
      expect(clearButton).toBeDisabled();
    });
  });
});
