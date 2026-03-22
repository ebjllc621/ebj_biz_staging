/**
 * Unit tests for ShareEntityButton component
 *
 * Tests 6 core behaviors:
 * 1. Authentication gating - returns null when not authenticated
 * 2. Render states - button appearance with icon and text
 * 3. Desktop modal - opens ShareEntityModal on desktop
 * 4. Mobile sheet - opens MobileShareSheet on mobile
 * 5. Variant styles - primary, secondary, ghost
 * 6. Size styles - sm, md, lg
 *
 * @phase Technical Debt Remediation - Phase 5 (P3: Component Tests)
 * @coverage 80%+ target
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShareEntityButton } from '../ShareEntityButton';
import type { EntityPreview } from '@features/contacts/types/sharing';

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
vi.mock('../ShareEntityModal', () => ({
  ShareEntityModal: vi.fn(({ isOpen, onClose, entityType, entityId, entityPreview, onShareSuccess }) => (
    isOpen ? (
      <div data-testid="share-entity-modal">
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

vi.mock('../MobileShareSheet', () => ({
  MobileShareSheet: vi.fn(({ isOpen, onClose, entityType, entityId, entityPreview, onShareSuccess }) => (
    isOpen ? (
      <div data-testid="mobile-share-sheet">
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

// Sample test data
const mockEntityPreview: EntityPreview = {
  title: 'Test Listing',
  description: 'A great listing',
  image_url: '/images/listing.jpg',
  url: '/listings/456'
};

describe('ShareEntityButton', () => {
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
        <ShareEntityButton entityType="listing" entityId="123" />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders button when user is authenticated', () => {
      render(<ShareEntityButton entityType="listing" entityId="123" />);

      expect(screen.getByRole('button', { name: /recommend/i })).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Behavior 2: Render States
  // ============================================================================
  describe('Behavior 2: Render States', () => {
    it('renders button with "Recommend" text', () => {
      render(<ShareEntityButton entityType="listing" entityId="123" />);

      expect(screen.getByText('Recommend')).toBeInTheDocument();
    });

    it('renders Share2 icon', () => {
      render(<ShareEntityButton entityType="listing" entityId="123" />);

      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('has correct aria-label', () => {
      render(<ShareEntityButton entityType="listing" entityId="123" />);

      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Recommend');
    });

    it('applies custom className', () => {
      render(
        <ShareEntityButton
          entityType="listing"
          entityId="123"
          className="custom-class"
        />
      );

      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });

  // ============================================================================
  // Behavior 3: Desktop Modal
  // ============================================================================
  describe('Behavior 3: Desktop Modal', () => {
    it('opens ShareEntityModal on click (desktop)', () => {
      render(<ShareEntityButton entityType="listing" entityId="123" />);

      expect(screen.queryByTestId('share-entity-modal')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByTestId('share-entity-modal')).toBeInTheDocument();
    });

    it('passes correct entityType to modal', () => {
      render(<ShareEntityButton entityType="event" entityId="789" />);

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByTestId('modal-entity-type')).toHaveTextContent('event');
    });

    it('passes correct entityId to modal', () => {
      render(<ShareEntityButton entityType="listing" entityId="456" />);

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByTestId('modal-entity-id')).toHaveTextContent('456');
    });

    it('passes entityPreview to modal when provided', () => {
      render(
        <ShareEntityButton
          entityType="listing"
          entityId="123"
          entityPreview={mockEntityPreview}
        />
      );

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByTestId('modal-preview')).toHaveTextContent('Test Listing');
    });

    it('closes modal when onClose is called', () => {
      render(<ShareEntityButton entityType="listing" entityId="123" />);

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByTestId('share-entity-modal')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('modal-close'));
      expect(screen.queryByTestId('share-entity-modal')).not.toBeInTheDocument();
    });

    it('calls onShareSuccess when modal triggers success', () => {
      const onShareSuccess = vi.fn();
      render(
        <ShareEntityButton
          entityType="listing"
          entityId="123"
          onShareSuccess={onShareSuccess}
        />
      );

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByTestId('modal-success'));

      expect(onShareSuccess).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // Behavior 4: Mobile Sheet
  // ============================================================================
  describe('Behavior 4: Mobile Sheet', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true);
    });

    it('opens MobileShareSheet on click (mobile)', () => {
      render(<ShareEntityButton entityType="listing" entityId="123" />);

      expect(screen.queryByTestId('mobile-share-sheet')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByTestId('mobile-share-sheet')).toBeInTheDocument();
    });

    it('passes correct entityType to sheet', () => {
      render(<ShareEntityButton entityType="user" entityId="999" />);

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByTestId('sheet-entity-type')).toHaveTextContent('user');
    });

    it('passes correct entityId to sheet', () => {
      render(<ShareEntityButton entityType="listing" entityId="555" />);

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByTestId('sheet-entity-id')).toHaveTextContent('555');
    });

    it('passes entityPreview to sheet when provided', () => {
      render(
        <ShareEntityButton
          entityType="listing"
          entityId="123"
          entityPreview={mockEntityPreview}
        />
      );

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByTestId('sheet-preview')).toHaveTextContent('Test Listing');
    });

    it('closes sheet when onClose is called', () => {
      render(<ShareEntityButton entityType="listing" entityId="123" />);

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByTestId('mobile-share-sheet')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('sheet-close'));
      expect(screen.queryByTestId('mobile-share-sheet')).not.toBeInTheDocument();
    });

    it('calls onShareSuccess when sheet triggers success', () => {
      const onShareSuccess = vi.fn();
      render(
        <ShareEntityButton
          entityType="listing"
          entityId="123"
          onShareSuccess={onShareSuccess}
        />
      );

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByTestId('sheet-success'));

      expect(onShareSuccess).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // Behavior 5: Variant Styles
  // ============================================================================
  describe('Behavior 5: Variant Styles', () => {
    it('applies secondary variant by default', () => {
      render(<ShareEntityButton entityType="listing" entityId="123" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('border', 'border-gray-300');
    });

    it('applies primary variant when specified', () => {
      render(
        <ShareEntityButton
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
        <ShareEntityButton
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
      render(<ShareEntityButton entityType="listing" entityId="123" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4', 'py-2', 'text-base');
    });

    it('applies small size when specified', () => {
      render(
        <ShareEntityButton
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
        <ShareEntityButton
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
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    it('handles null entityPreview', () => {
      render(
        <ShareEntityButton
          entityType="listing"
          entityId="123"
          entityPreview={null}
        />
      );

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByTestId('share-entity-modal')).toBeInTheDocument();
      expect(screen.queryByTestId('modal-preview')).not.toBeInTheDocument();
    });

    it('handles undefined entityPreview', () => {
      render(
        <ShareEntityButton
          entityType="listing"
          entityId="123"
        />
      );

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByTestId('share-entity-modal')).toBeInTheDocument();
      expect(screen.queryByTestId('modal-preview')).not.toBeInTheDocument();
    });

    it('handles missing onShareSuccess callback', () => {
      render(<ShareEntityButton entityType="listing" entityId="123" />);

      fireEvent.click(screen.getByRole('button'));

      // Should not throw when no onShareSuccess provided
      expect(screen.queryByTestId('modal-success')).not.toBeInTheDocument();
    });
  });
});
