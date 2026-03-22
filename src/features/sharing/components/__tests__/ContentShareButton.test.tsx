/**
 * Unit tests for ContentShareButton component
 *
 * Tests content type handling and delegation to ShareEntityButton.
 *
 * @tier SIMPLE
 * @phase Technical Debt Remediation - Phase 5 (P3: Component Tests)
 * @coverage 80%+ target
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContentShareButton } from '../ContentShareButton';

// Mock useAuth hook
const mockUser = { id: 1, email: 'test@example.com' };

vi.mock('@core/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser })
}));

// Mock useIsMobile hook
vi.mock('@core/hooks/useMediaQuery', () => ({
  useIsMobile: () => false
}));

// Mock ShareEntityModal
vi.mock('../ShareEntityModal', () => ({
  ShareEntityModal: vi.fn(({ isOpen, entityType, entityId }) => (
    isOpen ? (
      <div data-testid="share-entity-modal">
        <span data-testid="modal-entity-type">{entityType}</span>
        <span data-testid="modal-entity-id">{entityId}</span>
      </div>
    ) : null
  ))
}));

// Mock MobileShareSheet
vi.mock('../MobileShareSheet', () => ({
  MobileShareSheet: () => null
}));

describe('ContentShareButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders share button', () => {
      render(<ContentShareButton contentType="article" contentId="123" />);
      expect(screen.getByRole('button', { name: /recommend/i })).toBeInTheDocument();
    });

    it('renders with article content type', () => {
      render(<ContentShareButton contentType="article" contentId="article-slug" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders with newsletter content type', () => {
      render(<ContentShareButton contentType="newsletter" contentId="newsletter-123" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders with podcast content type', () => {
      render(<ContentShareButton contentType="podcast" contentId="podcast-456" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders with video content type', () => {
      render(<ContentShareButton contentType="video" contentId="video-789" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Size Variants
  // ============================================================================
  describe('Size Variants', () => {
    it('applies small size', () => {
      render(<ContentShareButton contentType="article" contentId="123" size="sm" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm');
    });

    it('applies medium size by default', () => {
      render(<ContentShareButton contentType="article" contentId="123" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4', 'py-2', 'text-base');
    });

    it('applies large size', () => {
      render(<ContentShareButton contentType="article" contentId="123" size="lg" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-6', 'py-3', 'text-lg');
    });
  });

  // ============================================================================
  // Custom Class Name
  // ============================================================================
  describe('Custom Class Name', () => {
    it('applies custom className', () => {
      render(
        <ContentShareButton
          contentType="article"
          contentId="123"
          className="custom-share-class"
        />
      );
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-share-class');
    });
  });

  // ============================================================================
  // onShareSuccess Callback
  // ============================================================================
  describe('onShareSuccess Callback', () => {
    it('accepts onShareSuccess prop', () => {
      const onShareSuccess = vi.fn();
      render(
        <ContentShareButton
          contentType="article"
          contentId="123"
          onShareSuccess={onShareSuccess}
        />
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});
