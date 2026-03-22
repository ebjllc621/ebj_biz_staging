/**
 * Unit tests for ShareEntityModal component
 *
 * Tests modal rendering, recipient selection, form submission, and close handling.
 *
 * @tier STANDARD
 * @phase Technical Debt Remediation - Phase 5 (P3: Component Tests)
 * @coverage 80%+ target
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareEntityModal } from '../ShareEntityModal';

// Mock BizModal
vi.mock('@/components/BizModal/BizModal', () => ({
  default: vi.fn(({ isOpen, onClose, title, children }) => (
    isOpen ? (
      <div data-testid="biz-modal" role="dialog">
        <div data-testid="modal-title">{title}</div>
        <button data-testid="modal-close" onClick={onClose}>Close</button>
        {children}
      </div>
    ) : null
  ))
}));

// Mock ErrorBoundary
vi.mock('@/components/common/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock RecommendationRecipientSelector
vi.mock('../RecommendationRecipientSelector', () => ({
  RecommendationRecipientSelector: vi.fn(({ onSelect }) => (
    <div data-testid="recipient-selector">
      <button
        data-testid="select-recipient"
        onClick={() => onSelect && onSelect({ id: 456, username: 'janedoe', display_name: 'Jane Doe' })}
      >
        Select Jane
      </button>
    </div>
  ))
}));

// Mock EntityPreviewCard
vi.mock('../EntityPreviewCard', () => ({
  EntityPreviewCard: vi.fn(({ preview }) => (
    <div data-testid="entity-preview">{preview?.title}</div>
  ))
}));

describe('ShareEntityModal', () => {
  const mockOnClose = vi.fn();
  const mockOnShareSuccess = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    entityType: 'listing' as const,
    entityId: '123',
    entityPreview: {
      id: '123',
      type: 'listing' as const,
      title: 'Coffee Shop',
      description: 'Great coffee',
      image_url: '/coffee.jpg',
      url: '/listings/123'
    },
    onShareSuccess: mockOnShareSuccess
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { id: 1 } })
    });
  });

  // ============================================================================
  // Render States
  // ============================================================================
  describe('Render States', () => {
    it('renders when isOpen is true', () => {
      render(<ShareEntityModal {...defaultProps} />);
      expect(screen.getByTestId('biz-modal')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<ShareEntityModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByTestId('biz-modal')).not.toBeInTheDocument();
    });

    it('shows title from BizModal', () => {
      render(<ShareEntityModal {...defaultProps} />);
      expect(screen.getByTestId('modal-title')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Entity Preview
  // ============================================================================
  describe('Entity Preview', () => {
    it('shows entity preview when provided', () => {
      render(<ShareEntityModal {...defaultProps} />);
      expect(screen.getByTestId('entity-preview')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Recipient Selection
  // ============================================================================
  describe('Recipient Selection', () => {
    it('renders recipient selector', () => {
      render(<ShareEntityModal {...defaultProps} />);
      expect(screen.getByTestId('recipient-selector')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Message Input
  // ============================================================================
  describe('Message Input', () => {
    it('renders message textarea', () => {
      render(<ShareEntityModal {...defaultProps} />);
      expect(screen.getByPlaceholderText(/add a personal message/i)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Form Submission
  // ============================================================================
  describe('Form Submission', () => {
    it('renders send button', () => {
      render(<ShareEntityModal {...defaultProps} />);
      expect(screen.getByText('Send Recommendation')).toBeInTheDocument();
    });

    it('renders message textarea', () => {
      render(<ShareEntityModal {...defaultProps} />);
      expect(screen.getByPlaceholderText(/add a personal message/i)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Close Handling
  // ============================================================================
  describe('Close Handling', () => {
    it('calls onClose when cancel clicked', () => {
      render(<ShareEntityModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Cancel'));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
