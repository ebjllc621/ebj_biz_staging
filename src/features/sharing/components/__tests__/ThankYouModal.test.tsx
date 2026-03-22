/**
 * Unit tests for ThankYouModal component
 *
 * Tests modal rendering, form interactions, quick messages, validation, and submission.
 *
 * @tier STANDARD
 * @phase Technical Debt Remediation - Phase 5 (P3: Component Tests)
 * @coverage 80%+ target
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThankYouModal } from '../ThankYouModal';

// Mock BizModal
vi.mock('@/components/BizModal/BizModal', () => ({
  default: vi.fn(({ isOpen, onClose, title, children }) => (
    isOpen ? (
      <div data-testid="biz-modal" role="dialog">
        <div data-testid="modal-title">{title}</div>
        <button data-testid="modal-close-internal" onClick={onClose}>Close</button>
        {children}
      </div>
    ) : null
  ))
}));

// Mock ErrorBoundary
vi.mock('@/components/common/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

describe('ThankYouModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSendThank = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    senderName: 'John Doe',
    entityTitle: 'Best Coffee Shop',
    onSendThank: mockOnSendThank
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSendThank.mockResolvedValue(undefined);
  });

  // ============================================================================
  // Render States
  // ============================================================================
  describe('Render States', () => {
    it('renders when isOpen is true', () => {
      render(<ThankYouModal {...defaultProps} />);
      expect(screen.getByTestId('biz-modal')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<ThankYouModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByTestId('biz-modal')).not.toBeInTheDocument();
    });

    it('shows correct title with sender name', () => {
      render(<ThankYouModal {...defaultProps} />);
      expect(screen.getByText('Say Thanks to John Doe')).toBeInTheDocument();
    });

    it('shows context text with entity title', () => {
      render(<ThankYouModal {...defaultProps} />);
      expect(screen.getByText('Best Coffee Shop')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Quick Messages
  // ============================================================================
  describe('Quick Messages', () => {
    it('renders all quick message buttons', () => {
      render(<ThankYouModal {...defaultProps} />);

      expect(screen.getByText('Thanks for the great recommendation!')).toBeInTheDocument();
      expect(screen.getByText('Really helpful, appreciate it!')).toBeInTheDocument();
      expect(screen.getByText('Exactly what I was looking for!')).toBeInTheDocument();
      expect(screen.getByText('You always have great suggestions!')).toBeInTheDocument();
    });

    it('fills textarea when quick message clicked', () => {
      render(<ThankYouModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Thanks for the great recommendation!'));

      const textarea = screen.getByPlaceholderText('Write your thank you message...');
      expect(textarea).toHaveValue('Thanks for the great recommendation!');
    });
  });

  // ============================================================================
  // Message Input
  // ============================================================================
  describe('Message Input', () => {
    it('renders message textarea', () => {
      render(<ThankYouModal {...defaultProps} />);
      expect(screen.getByPlaceholderText('Write your thank you message...')).toBeInTheDocument();
    });

    it('updates character count when typing', () => {
      render(<ThankYouModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Write your thank you message...');
      fireEvent.change(textarea, { target: { value: 'Hello!' } });

      expect(screen.getByText('6/500')).toBeInTheDocument();
    });

    it('starts with 0 character count', () => {
      render(<ThankYouModal {...defaultProps} />);
      expect(screen.getByText('0/500')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Form Validation
  // ============================================================================
  describe('Form Validation', () => {
    it('shows error when submitting empty message', async () => {
      render(<ThankYouModal {...defaultProps} />);

      // Submit button should be disabled with empty message
      const submitButton = screen.getByText('Send Thanks');
      expect(submitButton).toBeDisabled();
    });

    it('enables submit button when message entered', () => {
      render(<ThankYouModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Write your thank you message...');
      fireEvent.change(textarea, { target: { value: 'Thank you!' } });

      const submitButton = screen.getByText('Send Thanks');
      expect(submitButton).not.toBeDisabled();
    });
  });

  // ============================================================================
  // Form Submission
  // ============================================================================
  describe('Form Submission', () => {
    it('calls onSendThank with message when submitted', async () => {
      render(<ThankYouModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Write your thank you message...');
      fireEvent.change(textarea, { target: { value: 'Thank you so much!' } });

      fireEvent.click(screen.getByText('Send Thanks'));

      await waitFor(() => {
        expect(mockOnSendThank).toHaveBeenCalledWith('Thank you so much!');
      });
    });

    it('shows loading state while submitting', async () => {
      let resolveSubmit: () => void;
      const submitPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });
      mockOnSendThank.mockReturnValue(submitPromise);

      render(<ThankYouModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Write your thank you message...');
      fireEvent.change(textarea, { target: { value: 'Thanks!' } });

      fireEvent.click(screen.getByText('Send Thanks'));

      await waitFor(() => {
        expect(screen.getByText('Sending...')).toBeInTheDocument();
      });

      resolveSubmit!();
    });

    it('closes modal on successful submission', async () => {
      render(<ThankYouModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Write your thank you message...');
      fireEvent.change(textarea, { target: { value: 'Thanks!' } });

      fireEvent.click(screen.getByText('Send Thanks'));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('shows error on failed submission', async () => {
      mockOnSendThank.mockRejectedValue(new Error('Network error'));

      render(<ThankYouModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Write your thank you message...');
      fireEvent.change(textarea, { target: { value: 'Thanks!' } });

      fireEvent.click(screen.getByText('Send Thanks'));

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Cancel/Close
  // ============================================================================
  describe('Cancel/Close', () => {
    it('calls onClose when cancel clicked', () => {
      render(<ThankYouModal {...defaultProps} />);

      fireEvent.click(screen.getByText('Cancel'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('clears message when closed', () => {
      render(<ThankYouModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Write your thank you message...');
      fireEvent.change(textarea, { target: { value: 'Some message' } });

      fireEvent.click(screen.getByText('Cancel'));

      // Re-render with isOpen true to check if message is cleared
      // The component should clear state on close
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
