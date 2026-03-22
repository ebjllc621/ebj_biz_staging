/**
 * SEOHealthBadge component tests
 *
 * @tier SIMPLE
 * @phase Phase 7a - Unit Tests
 * @authority docs/media/galleryformat/phases/PHASE_7_UI_TESTING_INTEGRATION_BRAIN_PLAN.md
 * @target 100% coverage (simple pure display component)
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SEOHealthBadge } from '../SEOHealthBadge';

describe('SEOHealthBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Color states
  // ---------------------------------------------------------------------------

  describe('Color states', () => {
    it('should render green badge when both altText and titleText are present', () => {
      render(<SEOHealthBadge altText="Alt text" titleText="Title text" />);
      const badge = screen.getByLabelText('SEO Complete');
      expect(badge).toHaveClass('bg-green-500');
    });

    it('should render yellow badge when only altText is present (no titleText)', () => {
      render(<SEOHealthBadge altText="Alt text" />);
      const badge = screen.getByLabelText('Missing Title');
      expect(badge).toHaveClass('bg-yellow-400');
    });

    it('should render yellow badge when altText present and titleText is empty string', () => {
      render(<SEOHealthBadge altText="Alt text" titleText="" />);
      const badge = screen.getByLabelText('Missing Title');
      expect(badge).toHaveClass('bg-yellow-400');
    });

    it('should render yellow badge when altText present and titleText is only whitespace', () => {
      render(<SEOHealthBadge altText="Alt text" titleText="   " />);
      const badge = screen.getByLabelText('Missing Title');
      expect(badge).toHaveClass('bg-yellow-400');
    });

    it('should render red badge when altText is missing (undefined)', () => {
      render(<SEOHealthBadge titleText="Title" />);
      const badge = screen.getByLabelText('Missing Alt Text');
      expect(badge).toHaveClass('bg-red-500');
    });

    it('should render red badge when altText is empty string', () => {
      render(<SEOHealthBadge altText="" titleText="Title" />);
      const badge = screen.getByLabelText('Missing Alt Text');
      expect(badge).toHaveClass('bg-red-500');
    });

    it('should render red badge when altText is only whitespace', () => {
      render(<SEOHealthBadge altText="   " titleText="Title" />);
      const badge = screen.getByLabelText('Missing Alt Text');
      expect(badge).toHaveClass('bg-red-500');
    });

    it('should render red badge when both altText and titleText are undefined', () => {
      render(<SEOHealthBadge />);
      const badge = screen.getByLabelText('Missing Alt Text');
      expect(badge).toHaveClass('bg-red-500');
    });

    it('should render red badge when both are empty strings', () => {
      render(<SEOHealthBadge altText="" titleText="" />);
      const badge = screen.getByLabelText('Missing Alt Text');
      expect(badge).toHaveClass('bg-red-500');
    });
  });

  // ---------------------------------------------------------------------------
  // Title attribute
  // ---------------------------------------------------------------------------

  describe('Title attribute', () => {
    it('should have title="SEO Complete" when both fields present', () => {
      render(<SEOHealthBadge altText="Alt" titleText="Title" />);
      const badge = screen.getByTitle('SEO Complete');
      expect(badge).toBeInTheDocument();
    });

    it('should have title="Missing Title" when only altText present', () => {
      render(<SEOHealthBadge altText="Alt" />);
      const badge = screen.getByTitle('Missing Title');
      expect(badge).toBeInTheDocument();
    });

    it('should have title="Missing Alt Text" when altText missing', () => {
      render(<SEOHealthBadge />);
      const badge = screen.getByTitle('Missing Alt Text');
      expect(badge).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Aria-label
  // ---------------------------------------------------------------------------

  describe('aria-label', () => {
    it('should have aria-label matching title text for SEO Complete', () => {
      render(<SEOHealthBadge altText="Alt" titleText="Title" />);
      expect(screen.getByLabelText('SEO Complete')).toBeInTheDocument();
    });

    it('should have aria-label matching title text for Missing Title', () => {
      render(<SEOHealthBadge altText="Alt" />);
      expect(screen.getByLabelText('Missing Title')).toBeInTheDocument();
    });

    it('should have aria-label matching title text for Missing Alt Text', () => {
      render(<SEOHealthBadge />);
      expect(screen.getByLabelText('Missing Alt Text')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Size variants
  // ---------------------------------------------------------------------------

  describe('Size variants', () => {
    it('should apply sm size classes by default (w-2 h-2)', () => {
      render(<SEOHealthBadge altText="Alt" titleText="Title" />);
      const badge = screen.getByLabelText('SEO Complete');
      expect(badge).toHaveClass('w-2');
      expect(badge).toHaveClass('h-2');
    });

    it('should apply sm size classes when size="sm"', () => {
      render(<SEOHealthBadge altText="Alt" titleText="Title" size="sm" />);
      const badge = screen.getByLabelText('SEO Complete');
      expect(badge).toHaveClass('w-2');
      expect(badge).toHaveClass('h-2');
    });

    it('should apply md size classes when size="md"', () => {
      render(<SEOHealthBadge altText="Alt" titleText="Title" size="md" />);
      const badge = screen.getByLabelText('SEO Complete');
      expect(badge).toHaveClass('w-3');
      expect(badge).toHaveClass('h-3');
    });

    it('should apply md size classes for Missing Title state', () => {
      render(<SEOHealthBadge altText="Alt" size="md" />);
      const badge = screen.getByLabelText('Missing Title');
      expect(badge).toHaveClass('w-3');
      expect(badge).toHaveClass('h-3');
    });

    it('should apply md size classes for Missing Alt Text state', () => {
      render(<SEOHealthBadge size="md" />);
      const badge = screen.getByLabelText('Missing Alt Text');
      expect(badge).toHaveClass('w-3');
      expect(badge).toHaveClass('h-3');
    });
  });

  // ---------------------------------------------------------------------------
  // Element type
  // ---------------------------------------------------------------------------

  describe('Element type', () => {
    it('should render as a span element', () => {
      render(<SEOHealthBadge altText="Alt" titleText="Title" />);
      const badge = screen.getByLabelText('SEO Complete');
      expect(badge.tagName).toBe('SPAN');
    });

    it('should have rounded-full class for circular shape', () => {
      render(<SEOHealthBadge altText="Alt" titleText="Title" />);
      const badge = screen.getByLabelText('SEO Complete');
      expect(badge).toHaveClass('rounded-full');
    });
  });
});
