/**
 * Unit tests for EntityPreviewCard component
 *
 * Tests render states for different entity types, image handling,
 * and optional link display.
 *
 * @tier SIMPLE
 * @phase Technical Debt Remediation - Phase 5 (P3: Component Tests)
 * @coverage 80%+ target
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EntityPreviewCard } from '../EntityPreviewCard';
import type { EntityPreview } from '@features/contacts/types/sharing';

const createMockPreview = (overrides: Partial<EntityPreview> = {}): EntityPreview => ({
  id: '123',
  type: 'listing',
  title: 'Test Title',
  description: 'Test description',
  image_url: '/images/test.jpg',
  url: '/listings/123',
  ...overrides
});

describe('EntityPreviewCard', () => {
  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('Basic Rendering', () => {
    it('renders entity title', () => {
      render(<EntityPreviewCard preview={createMockPreview({ title: 'Amazing Business' })} />);
      expect(screen.getByText('Amazing Business')).toBeInTheDocument();
    });

    it('renders entity description', () => {
      render(<EntityPreviewCard preview={createMockPreview({ description: 'Great place to visit' })} />);
      expect(screen.getByText('Great place to visit')).toBeInTheDocument();
    });

    it('renders without description when not provided', () => {
      render(<EntityPreviewCard preview={createMockPreview({ description: undefined })} />);
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Image Handling
  // ============================================================================
  describe('Image Handling', () => {
    it('renders image when image_url is provided', () => {
      render(<EntityPreviewCard preview={createMockPreview({ image_url: '/uploads/photo.jpg' })} />);
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/uploads/photo.jpg');
    });

    it('renders fallback icon when image_url is not provided', () => {
      render(<EntityPreviewCard preview={createMockPreview({ image_url: undefined })} />);
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      // Should render an icon instead (SVG element)
      expect(document.querySelector('svg')).toBeInTheDocument();
    });

    it('renders fallback icon when image_url is empty string', () => {
      render(<EntityPreviewCard preview={createMockPreview({ image_url: '' })} />);
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Entity Types
  // ============================================================================
  describe('Entity Types', () => {
    it('renders listing entity correctly', () => {
      render(<EntityPreviewCard preview={createMockPreview({ type: 'listing' })} />);
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('renders user entity correctly', () => {
      render(<EntityPreviewCard preview={createMockPreview({ type: 'user' })} />);
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('renders event entity correctly', () => {
      render(<EntityPreviewCard preview={createMockPreview({ type: 'event' })} />);
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Link Display
  // ============================================================================
  describe('Link Display', () => {
    it('does not show link by default', () => {
      render(<EntityPreviewCard preview={createMockPreview()} />);
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('shows link when showLink is true', () => {
      render(
        <EntityPreviewCard
          preview={createMockPreview({ type: 'listing', url: '/listings/123' })}
          showLink={true}
        />
      );
      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/listings/123');
    });

    it('link has correct text for listing', () => {
      render(
        <EntityPreviewCard
          preview={createMockPreview({ type: 'listing' })}
          showLink={true}
        />
      );
      expect(screen.getByText('View listing')).toBeInTheDocument();
    });

    it('link has correct text for user', () => {
      render(
        <EntityPreviewCard
          preview={createMockPreview({ type: 'user' })}
          showLink={true}
        />
      );
      expect(screen.getByText('View user')).toBeInTheDocument();
    });

    it('link has correct text for event', () => {
      render(
        <EntityPreviewCard
          preview={createMockPreview({ type: 'event' })}
          showLink={true}
        />
      );
      expect(screen.getByText('View event')).toBeInTheDocument();
    });

    it('link opens in new tab', () => {
      render(
        <EntityPreviewCard
          preview={createMockPreview()}
          showLink={true}
        />
      );
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  // ============================================================================
  // Accessibility
  // ============================================================================
  describe('Accessibility', () => {
    it('image has alt text from title', () => {
      render(<EntityPreviewCard preview={createMockPreview({ title: 'Coffee Shop' })} />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'Coffee Shop');
    });
  });
});
