/**
 * Unit tests for RecommendButton component
 *
 * Tests 7 core behaviors:
 * 1. Authentication gating - returns null when not authenticated
 * 2. Render states - button appearance with Send icon and text
 * 3. Desktop modal - opens RecommendModal on desktop
 * 4. Mobile sheet - opens MobileRecommendSheet on mobile
 * 5. Variant styles - primary, secondary, ghost, mobile
 * 6. Size styles - sm, md, lg
 * 7. Mobile variant - vertical layout for MobileActionBar
 *
 * @phase Phase 12 - Recommend Button Deployment
 * @coverage 80%+ target
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecommendButton, type PartialEntityPreview } from '../RecommendButton';

// Mock useAuth hook
const mockUser = { id: 1, email: 'test@example.com' };
const mockUseAuth = vi.fn(() => ({ user: mockUser }));

vi.mock('@core/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth()
}));

// Mock useIsMobile hook
const mockUseIsMobile = vi.fn(() => false);

vi.mock('@core/hooks/useMediaQuery', () => ({
  useIsMobile: () => mockUseIsMobile()
}));

// Mock child components to avoid complex rendering
vi.mock('../RecommendModal', () => ({
  RecommendModal: vi.fn(({ isOpen, onClose, entityType, entityId, entityPreview, onShareSuccess }) => (
    isOpen ? (
      <div data-testid="recommend-modal">
        <span data-testid="modal-entity-type">{entityType}</span>
        <span data-testid="modal-entity-id">{entityId}</span>
        {entityPreview && <span data-testid="modal-preview">{entityPreview.title}</span>}
        <button data-testid="modal-close" onClick={onClose}>Close</button>
        {onShareSuccess && (
          <button data-testid="modal-success" onClick={onShareSuccess}>Trigger Success</button>
        )}
      </div>
    ) : null
  ))
}));

vi.mock('../MobileRecommendSheet', () => ({
  MobileRecommendSheet: vi.fn(({ isOpen, onClose, entityType, entityId, entityPreview, onShareSuccess }) => (
    isOpen ? (
      <div data-testid="mobile-recommend-sheet">
        <span data-testid="sheet-entity-type">{entityType}</span>
        <span data-testid="sheet-entity-id">{entityId}</span>
        {entityPreview && <span data-testid="sheet-preview">{entityPreview.title}</span>}
        <button data-testid="sheet-close" onClick={onClose}>Close</button>
        {onShareSuccess && (
          <button data-testid="sheet-success" onClick={onShareSuccess}>Trigger Success</button>
        )}
      </div>
    ) : null
  ))
}));

// Sample test data (PartialEntityPreview - type and id provided separately)
const mockEntityPreview: PartialEntityPreview = {
  title: 'Test Listing',
  description: 'A great listing',
  image_url: '/images/listing.jpg',
  url: '/listings/456'
};

describe('RecommendButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser });
    mockUseIsMobile.mockReturnValue(false);
  });

  // ============================================================================
  // Behavior 1: Authentication Gating
  // ============================================================================
  describe('Behavior 1: Authentication Gating', () => {
    it('returns null when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({ user: null });

      const { container } = render(
        <RecommendButton entityType="listing" entityId="123" />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders button when user is authenticated', () => {
      render(<RecommendButton entityType="listing" entityId="123" />);

      expect(screen.getByRole('button', { name: /recommend/i })).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Behavior 2: Render States
  // ============================================================================
  describe('Behavior 2: Render States', () => {
    it('renders button with "Recommend" text', () => {
      render(<RecommendButton entityType="listing" entityId="123" />);

      expect(screen.getByText('Recommend')).toBeInTheDocument();
    });

    it('renders Send icon', () => {
      render(<RecommendButton entityType="listing" entityId="123" />);

      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('has correct aria-label', () => {
      render(<RecommendButton entityType="listing" entityId="123" />);

      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Recommend to a connection');
    });

    it('applies custom className', () => {
      render(
        <RecommendButton
          entityType="listing"
          entityId="123"
          className="custom-class"
        />
      );

      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });

    it('hides text when iconOnly is true', () => {
      render(
        <RecommendButton
          entityType="listing"
          entityId="123"
          iconOnly
        />
      );

      expect(screen.queryByText('Recommend')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Behavior 3: Desktop Modal
  // ============================================================================
  describe('Behavior 3: Desktop Modal', () => {
    it('opens RecommendModal on click (desktop)', () => {
      render(<RecommendButton entityType="listing" entityId="123" />);

      expect(screen.queryByTestId('recommend-modal')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByTestId('recommend-modal')).toBeInTheDocument();
    });

    it('passes correct entityType to modal', () => {
      render(<RecommendButton entityType="event" entityId="789" />);

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByTestId('modal-entity-type')).toHaveTextContent('event');
    });

    it('passes correct entityId to modal', () => {
      render(<RecommendButton entityType="listing" entityId="456" />);

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByTestId('modal-entity-id')).toHaveTextContent('456');
    });

    it('passes entityPreview to modal when provided', () => {
      render(
        <RecommendButton
          entityType="listing"
          entityId="123"
          entityPreview={mockEntityPreview}
        />
      );

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByTestId('modal-preview')).toHaveTextContent('Test Listing');
    });

    it('closes modal when onClose is called', () => {
      render(<RecommendButton entityType="listing" entityId="123" />);

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByTestId('recommend-modal')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('modal-close'));
      expect(screen.queryByTestId('recommend-modal')).not.toBeInTheDocument();
    });

    it('calls onRecommendSuccess when modal triggers success', () => {
      const onRecommendSuccess = vi.fn();
      render(
        <RecommendButton
          entityType="listing"
          entityId="123"
          onRecommendSuccess={onRecommendSuccess}
        />
      );

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByTestId('modal-success'));

      expect(onRecommendSuccess).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // Behavior 4: Mobile Sheet
  // ============================================================================
  describe('Behavior 4: Mobile Sheet', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true);
    });

    it('opens MobileRecommendSheet on click (mobile)', () => {
      render(<RecommendButton entityType="listing" entityId="123" />);

      expect(screen.queryByTestId('mobile-recommend-sheet')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByTestId('mobile-recommend-sheet')).toBeInTheDocument();
    });

    it('passes correct entityType to sheet', () => {
      render(<RecommendButton entityType="user" entityId="999" />);

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByTestId('sheet-entity-type')).toHaveTextContent('user');
    });

    it('passes correct entityId to sheet', () => {
      render(<RecommendButton entityType="listing" entityId="555" />);

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByTestId('sheet-entity-id')).toHaveTextContent('555');
    });
  });

  // ============================================================================
  // Behavior 5: Variant Styles
  // ============================================================================
  describe('Behavior 5: Variant Styles', () => {
    it('applies secondary variant by default', () => {
      render(<RecommendButton entityType="listing" entityId="123" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('border', 'border-gray-300');
    });

    it('applies primary variant when specified', () => {
      render(
        <RecommendButton
          entityType="listing"
          entityId="123"
          variant="primary"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue-600', 'text-white');
    });

    it('applies ghost variant when specified', () => {
      render(
        <RecommendButton
          entityType="listing"
          entityId="123"
          variant="ghost"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-gray-600');
    });
  });

  // ============================================================================
  // Behavior 6: Size Styles
  // ============================================================================
  describe('Behavior 6: Size Styles', () => {
    it('applies medium size by default', () => {
      render(<RecommendButton entityType="listing" entityId="123" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4', 'py-2', 'text-base');
    });

    it('applies small size when specified', () => {
      render(
        <RecommendButton
          entityType="listing"
          entityId="123"
          size="sm"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm');
    });

    it('applies large size when specified', () => {
      render(
        <RecommendButton
          entityType="listing"
          entityId="123"
          size="lg"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-6', 'py-3', 'text-lg');
    });
  });

  // ============================================================================
  // Behavior 7: Mobile Variant
  // ============================================================================
  describe('Behavior 7: Mobile Variant', () => {
    it('renders vertical layout when variant is mobile', () => {
      render(
        <RecommendButton
          entityType="listing"
          entityId="123"
          variant="mobile"
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('flex-col');
    });

    it('shows "Recommend" text in mobile variant', () => {
      render(
        <RecommendButton
          entityType="listing"
          entityId="123"
          variant="mobile"
        />
      );

      expect(screen.getByText('Recommend')).toBeInTheDocument();
    });

    it('opens MobileRecommendSheet when mobile variant is clicked', () => {
      render(
        <RecommendButton
          entityType="listing"
          entityId="123"
          variant="mobile"
        />
      );

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByTestId('mobile-recommend-sheet')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('handles null entityPreview', () => {
      render(
        <RecommendButton
          entityType="listing"
          entityId="123"
          entityPreview={null}
        />
      );

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByTestId('recommend-modal')).toBeInTheDocument();
      expect(screen.queryByTestId('modal-preview')).not.toBeInTheDocument();
    });

    it('handles undefined entityPreview', () => {
      render(
        <RecommendButton
          entityType="listing"
          entityId="123"
        />
      );

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByTestId('recommend-modal')).toBeInTheDocument();
      expect(screen.queryByTestId('modal-preview')).not.toBeInTheDocument();
    });

    it('handles missing onRecommendSuccess callback', () => {
      render(<RecommendButton entityType="listing" entityId="123" />);

      fireEvent.click(screen.getByRole('button'));

      // Should not throw when no onRecommendSuccess provided
      expect(screen.queryByTestId('modal-success')).not.toBeInTheDocument();
    });
  });
});
