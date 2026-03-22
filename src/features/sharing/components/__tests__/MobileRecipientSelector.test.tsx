/**
 * Unit tests for MobileRecipientSelector component
 *
 * Tests render states, search functionality, recipient selection, and recent recipients.
 *
 * @tier STANDARD
 * @phase Technical Debt Remediation - Phase 5 (P3: Component Tests)
 * @coverage 80%+ target
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobileRecipientSelector } from '../MobileRecipientSelector';

// Mock ErrorBoundary
vi.mock('@/components/common/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock fetchWithCsrf
const mockFetchWithCsrf = vi.fn();
vi.mock('@core/utils/csrf', () => ({
  fetchWithCsrf: (...args: unknown[]) => mockFetchWithCsrf(...args)
}));

// Mock avatar util
vi.mock('@/core/utils/avatar', () => ({
  getAvatarInitials: (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase()
}));

describe('MobileRecipientSelector', () => {
  const mockOnClose = vi.fn();
  const mockOnSelectRecipient = vi.fn();

  const mockRecipients = [
    {
      id: 1,
      username: 'johndoe',
      display_name: 'John Doe',
      avatar_url: '/avatars/john.jpg'
    },
    {
      id: 2,
      username: 'janedoe',
      display_name: 'Jane Doe',
      avatar_url: null
    }
  ];

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    selectedRecipient: null,
    onSelectRecipient: mockOnSelectRecipient
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchWithCsrf.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ recipients: mockRecipients })
    });
  });

  // ============================================================================
  // Render States
  // ============================================================================
  describe('Render States', () => {
    it('renders when isOpen is true', () => {
      render(<MobileRecipientSelector {...defaultProps} />);
      expect(screen.getByText('Select Recipient')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<MobileRecipientSelector {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Select Recipient')).not.toBeInTheDocument();
    });

    it('renders close button', () => {
      render(<MobileRecipientSelector {...defaultProps} />);
      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });

    it('renders search input', () => {
      render(<MobileRecipientSelector {...defaultProps} />);
      expect(screen.getByPlaceholderText('Search connections...')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Recent Recipients
  // ============================================================================
  describe('Recent Recipients', () => {
    it('fetches recent recipients on mount', async () => {
      render(<MobileRecipientSelector {...defaultProps} />);

      await waitFor(() => {
        expect(mockFetchWithCsrf).toHaveBeenCalledWith(
          '/api/sharing/recipients/recent',
          expect.any(Object)
        );
      });
    });

    it('shows Recent recipients label', async () => {
      render(<MobileRecipientSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Recent recipients')).toBeInTheDocument();
      });
    });

    it('displays recent recipients', async () => {
      render(<MobileRecipientSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Search Functionality
  // ============================================================================
  describe('Search Functionality', () => {
    it('hides Recent label when searching', async () => {
      render(<MobileRecipientSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Recent recipients')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText('Search connections...'), {
        target: { value: 'john' }
      });

      await waitFor(() => {
        expect(screen.queryByText('Recent recipients')).not.toBeInTheDocument();
      });
    });

    it('shows no results message when search has no matches', async () => {
      mockFetchWithCsrf
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ recipients: mockRecipients })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ recipients: [] })
        });

      render(<MobileRecipientSelector {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText('Search connections...'), {
        target: { value: 'xyz123' }
      });

      await waitFor(() => {
        expect(screen.getByText(/No connections found matching/)).toBeInTheDocument();
      });
    });

    it('shows clear button when search has text', async () => {
      render(<MobileRecipientSelector {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText('Search connections...'), {
        target: { value: 'john' }
      });

      expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
    });

    it('clears search when clear button clicked', async () => {
      render(<MobileRecipientSelector {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search connections...');
      fireEvent.change(searchInput, { target: { value: 'john' } });

      fireEvent.click(screen.getByLabelText('Clear search'));

      expect(searchInput).toHaveValue('');
    });
  });

  // ============================================================================
  // Recipient Selection
  // ============================================================================
  describe('Recipient Selection', () => {
    it('calls onSelectRecipient when recipient clicked', async () => {
      render(<MobileRecipientSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('John Doe'));

      expect(mockOnSelectRecipient).toHaveBeenCalledWith(mockRecipients[0]);
    });

    it('calls onClose after selection', async () => {
      render(<MobileRecipientSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('John Doe'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('shows check mark for selected recipient', async () => {
      render(
        <MobileRecipientSelector
          {...defaultProps}
          selectedRecipient={mockRecipients[0]}
        />
      );

      await waitFor(() => {
        const johnButton = screen.getByText('John Doe').closest('button');
        expect(johnButton?.querySelector('svg.text-blue-600')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Close Handling
  // ============================================================================
  describe('Close Handling', () => {
    it('calls onClose when close button clicked', () => {
      render(<MobileRecipientSelector {...defaultProps} />);

      fireEvent.click(screen.getByLabelText('Close'));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Avatar Display
  // ============================================================================
  describe('Avatar Display', () => {
    it('shows avatar image when available', async () => {
      render(<MobileRecipientSelector {...defaultProps} />);

      await waitFor(() => {
        const avatar = screen.getByAltText('John Doe');
        expect(avatar).toHaveAttribute('src', '/avatars/john.jpg');
      });
    });

    it('shows initials when avatar not available', async () => {
      render(<MobileRecipientSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Loading State
  // ============================================================================
  describe('Loading State', () => {
    it('shows searching text during search', async () => {
      let resolveRequest: (value: unknown) => void;
      const searchPromise = new Promise((resolve) => {
        resolveRequest = resolve;
      });

      mockFetchWithCsrf
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ recipients: [] })
        })
        .mockReturnValueOnce(searchPromise);

      render(<MobileRecipientSelector {...defaultProps} />);

      fireEvent.change(screen.getByPlaceholderText('Search connections...'), {
        target: { value: 'john' }
      });

      await waitFor(() => {
        expect(screen.getByText('Searching...')).toBeInTheDocument();
      });

      resolveRequest!({
        ok: true,
        json: () => Promise.resolve({ recipients: mockRecipients })
      });
    });
  });

  // ============================================================================
  // Empty Initial State
  // ============================================================================
  describe('Empty Initial State', () => {
    it('shows prompt when no search and no recent', async () => {
      mockFetchWithCsrf.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ recipients: [] })
      });

      render(<MobileRecipientSelector {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Start typing to search your connections')).toBeInTheDocument();
      });
    });
  });
});
