/**
 * FeatureCard component tests
 *
 * @tier STANDARD
 * @phase Phase 7a - Unit Tests
 * @authority docs/media/galleryformat/phases/PHASE_7_UI_TESTING_INTEGRATION_BRAIN_PLAN.md
 * @target 70%+ coverage
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeatureCard } from '../FeatureCard';
import type { FeatureConfig } from '../../types/media-manager-lite-types';

// ---------------------------------------------------------------------------
// Mock config fixture
// ---------------------------------------------------------------------------

const mockConfig: FeatureConfig = {
  key: 'gallery',
  label: 'Gallery',
  description: 'Manage gallery images',
  icon: 'Image',
  mediaType: 'gallery',
  storagePattern: 'json-array',
  listingColumn: 'gallery_images',
  acceptedFormats: 'image/jpeg,image/png',
  maxFileSizeMB: 10,
  useCropper: true,
  defaultCropPreset: 'gallery',
  tierLimits: { essentials: 6, plus: 12, preferred: 100, premium: 100 },
};

const defaultProps = {
  config: mockConfig,
  currentCount: 2,
  maxCount: 6,
  seoCompleteCount: 2,
  seoTotalCount: 2,
  onClick: vi.fn(),
};

describe('FeatureCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  describe('Rendering', () => {
    it('should render the feature label in h3', () => {
      render(<FeatureCard {...defaultProps} />);
      expect(screen.getByRole('heading', { level: 3, name: /gallery/i })).toBeInTheDocument();
    });

    it('should render the feature description', () => {
      render(<FeatureCard {...defaultProps} />);
      expect(screen.getByText('Manage gallery images')).toBeInTheDocument();
    });

    it('should render count badge with current / max format', () => {
      render(<FeatureCard {...defaultProps} currentCount={3} maxCount={6} />);
      expect(screen.getByText('3 / 6')).toBeInTheDocument();
    });

    it('should have role="button"', () => {
      render(<FeatureCard {...defaultProps} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should have tabIndex 0 when not disabled', () => {
      render(<FeatureCard {...defaultProps} />);
      expect(screen.getByRole('button')).toHaveAttribute('tabindex', '0');
    });
  });

  // ---------------------------------------------------------------------------
  // SEO dot colors
  // ---------------------------------------------------------------------------

  describe('SEO dot indicator', () => {
    it('should render green SEO dot when 100% complete', () => {
      render(<FeatureCard {...defaultProps} seoCompleteCount={4} seoTotalCount={4} />);
      const dot = screen.getByLabelText(/seo health/i);
      expect(dot).toHaveClass('bg-green-500');
    });

    it('should render yellow SEO dot when 50-99% complete', () => {
      render(<FeatureCard {...defaultProps} seoCompleteCount={2} seoTotalCount={4} />);
      const dot = screen.getByLabelText(/seo health/i);
      expect(dot).toHaveClass('bg-yellow-400');
    });

    it('should render red SEO dot when <50% complete', () => {
      render(<FeatureCard {...defaultProps} seoCompleteCount={1} seoTotalCount={4} />);
      const dot = screen.getByLabelText(/seo health/i);
      expect(dot).toHaveClass('bg-red-500');
    });

    it('should NOT render SEO dot when seoTotalCount is 0', () => {
      render(<FeatureCard {...defaultProps} seoCompleteCount={0} seoTotalCount={0} />);
      expect(screen.queryByLabelText(/seo health/i)).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Count badge colors
  // ---------------------------------------------------------------------------

  describe('Count badge colors', () => {
    it('should render green badge when usage is <80%', () => {
      render(<FeatureCard {...defaultProps} currentCount={2} maxCount={10} />);
      const badge = screen.getByText('2 / 10');
      expect(badge).toHaveClass('bg-green-100');
    });

    it('should render amber badge when usage is >=80%', () => {
      render(<FeatureCard {...defaultProps} currentCount={8} maxCount={10} />);
      const badge = screen.getByText('8 / 10');
      expect(badge).toHaveClass('bg-amber-100');
    });

    it('should render red badge when at or above max', () => {
      render(<FeatureCard {...defaultProps} currentCount={10} maxCount={10} />);
      const badge = screen.getByText('10 / 10');
      expect(badge).toHaveClass('bg-red-100');
    });

    it('should render gray badge when maxCount is 0', () => {
      render(<FeatureCard {...defaultProps} currentCount={0} maxCount={0} />);
      const badge = screen.getByText('0 / 0');
      expect(badge).toHaveClass('bg-gray-100');
    });
  });

  // ---------------------------------------------------------------------------
  // Disabled state
  // ---------------------------------------------------------------------------

  describe('Disabled state', () => {
    it('should have tabIndex -1 when disabled', () => {
      render(<FeatureCard {...defaultProps} disabled />);
      expect(screen.getByRole('button')).toHaveAttribute('tabindex', '-1');
    });

    it('should have aria-disabled="true" when disabled', () => {
      render(<FeatureCard {...defaultProps} disabled />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    });

    it('should show "Upgrade to unlock" text instead of description', () => {
      render(<FeatureCard {...defaultProps} disabled />);
      expect(screen.getByText('Upgrade to unlock')).toBeInTheDocument();
      expect(screen.queryByText('Manage gallery images')).not.toBeInTheDocument();
    });

    it('should show "Locked" badge instead of count', () => {
      render(<FeatureCard {...defaultProps} disabled />);
      expect(screen.getByText('Locked')).toBeInTheDocument();
      expect(screen.queryByText('2 / 6')).not.toBeInTheDocument();
    });

    it('should NOT call onClick when disabled card is clicked', () => {
      render(<FeatureCard {...defaultProps} disabled />);
      fireEvent.click(screen.getByRole('button'));
      expect(defaultProps.onClick).not.toHaveBeenCalled();
    });

    it('should NOT call onClick when Enter pressed on disabled card', () => {
      render(<FeatureCard {...defaultProps} disabled />);
      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
      expect(defaultProps.onClick).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Click interactions
  // ---------------------------------------------------------------------------

  describe('Click interactions', () => {
    it('should call onClick when card is clicked', () => {
      render(<FeatureCard {...defaultProps} />);
      fireEvent.click(screen.getByRole('button'));
      expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick when Enter key pressed', () => {
      render(<FeatureCard {...defaultProps} />);
      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
      expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick when Space key pressed', () => {
      render(<FeatureCard {...defaultProps} />);
      fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
      expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
    });

    it('should NOT call onClick on other keys', () => {
      render(<FeatureCard {...defaultProps} />);
      fireEvent.keyDown(screen.getByRole('button'), { key: 'Tab' });
      expect(defaultProps.onClick).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Different icon configs
  // ---------------------------------------------------------------------------

  describe('Icon rendering', () => {
    it('should render without crash for CircleUser icon', () => {
      const config = { ...mockConfig, icon: 'CircleUser', key: 'logo' as const };
      render(<FeatureCard {...defaultProps} config={config} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render without crash for Film icon', () => {
      const config = { ...mockConfig, icon: 'Film', key: 'video-gallery' as const };
      render(<FeatureCard {...defaultProps} config={config} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render without crash for Panorama (fallback) icon', () => {
      const config = { ...mockConfig, icon: 'Panorama', key: 'cover' as const };
      render(<FeatureCard {...defaultProps} config={config} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render without crash for unknown icon (falls back to Image)', () => {
      const config = { ...mockConfig, icon: 'UnknownIcon' };
      render(<FeatureCard {...defaultProps} config={config} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});
