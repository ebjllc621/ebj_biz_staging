/**
 * FeatureSelectorGrid component tests
 *
 * @tier STANDARD
 * @phase Phase 7a - Unit Tests
 * @authority docs/media/galleryformat/phases/PHASE_7_UI_TESTING_INTEGRATION_BRAIN_PLAN.md
 * @target 70%+ coverage
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeatureSelectorGrid } from '../FeatureSelectorGrid';
import type { FeatureSummary, FeatureConfig } from '../../types/media-manager-lite-types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeConfig(key: FeatureConfig['key'], label: string): FeatureConfig {
  return {
    key,
    label,
    description: `${label} description`,
    icon: 'Image',
    mediaType: key,
    storagePattern: 'json-array',
    listingColumn: `${key}_images`,
    acceptedFormats: 'image/jpeg,image/png',
    maxFileSizeMB: 10,
    useCropper: false,
    tierLimits: { essentials: 6, plus: 12, preferred: 100, premium: 100 },
  };
}

function makeSummary(key: FeatureConfig['key'], label: string): FeatureSummary {
  return {
    config: makeConfig(key, label),
    currentCount: 2,
    maxCount: 6,
    seoCompleteCount: 2,
    seoTotalCount: 2,
  };
}

const mockSummaries: FeatureSummary[] = [
  makeSummary('gallery', 'Gallery'),
  makeSummary('logo', 'Logo'),
  makeSummary('cover', 'Cover'),
];

const defaultProps = {
  summaries: mockSummaries,
  onSelectFeature: vi.fn(),
  tier: 'essentials',
};

describe('FeatureSelectorGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  describe('Rendering', () => {
    it('should render a list container with correct aria-label', () => {
      render(<FeatureSelectorGrid {...defaultProps} />);
      const list = screen.getByRole('list', { name: /media features/i });
      expect(list).toBeInTheDocument();
    });

    it('should render correct number of listitem elements', () => {
      render(<FeatureSelectorGrid {...defaultProps} />);
      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(3);
    });

    it('should render a card for each summary', () => {
      render(<FeatureSelectorGrid {...defaultProps} />);
      expect(screen.getByText('Gallery')).toBeInTheDocument();
      expect(screen.getByText('Logo')).toBeInTheDocument();
      expect(screen.getByText('Cover')).toBeInTheDocument();
    });

    it('should render grid container with correct CSS classes', () => {
      const { container } = render(<FeatureSelectorGrid {...defaultProps} />);
      const grid = container.firstChild as HTMLElement;
      expect(grid).toHaveClass('grid');
      expect(grid).toHaveClass('grid-cols-2');
      expect(grid).toHaveClass('gap-3');
    });

    it('should render empty grid when summaries array is empty', () => {
      render(<FeatureSelectorGrid {...defaultProps} summaries={[]} />);
      const list = screen.getByRole('list', { name: /media features/i });
      expect(list).toBeInTheDocument();
      expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    });

    it('should render single item when summaries has one entry', () => {
      render(<FeatureSelectorGrid {...defaultProps} summaries={[mockSummaries[0]]} />);
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Interactions
  // ---------------------------------------------------------------------------

  describe('Feature selection', () => {
    it('should call onSelectFeature with correct key when Gallery card is clicked', () => {
      render(<FeatureSelectorGrid {...defaultProps} />);
      // FeatureCardFromSummary renders a role="button" for each feature
      const buttons = screen.getAllByRole('button');
      // First button is Gallery (gallery key)
      fireEvent.click(buttons[0]);
      expect(defaultProps.onSelectFeature).toHaveBeenCalledWith('gallery');
    });

    it('should call onSelectFeature with correct key when Logo card is clicked', () => {
      render(<FeatureSelectorGrid {...defaultProps} />);
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);
      expect(defaultProps.onSelectFeature).toHaveBeenCalledWith('logo');
    });

    it('should call onSelectFeature with correct key when Cover card is clicked', () => {
      render(<FeatureSelectorGrid {...defaultProps} />);
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[2]);
      expect(defaultProps.onSelectFeature).toHaveBeenCalledWith('cover');
    });

    it('should NOT call onSelectFeature for features not in tier (disabled)', () => {
      // tier with 0 limit for logo makes it disabled
      const zeroLimitConfig: FeatureConfig = {
        ...makeConfig('logo', 'Logo'),
        tierLimits: { essentials: 0, plus: 0, preferred: 0, premium: 0 },
      };
      const summaries = [
        makeSummary('gallery', 'Gallery'),
        { ...makeSummary('logo', 'Logo'), config: zeroLimitConfig },
      ];

      render(<FeatureSelectorGrid {...defaultProps} summaries={summaries} tier="essentials" />);
      const buttons = screen.getAllByRole('button');
      // Second button is logo (disabled)
      fireEvent.click(buttons[1]);
      expect(defaultProps.onSelectFeature).not.toHaveBeenCalledWith('logo');
    });
  });

  // ---------------------------------------------------------------------------
  // Tier handling
  // ---------------------------------------------------------------------------

  describe('Tier handling', () => {
    it('should disable cards when tier limit is 0', () => {
      const lockedConfig: FeatureConfig = {
        ...makeConfig('attachments', 'Attachments'),
        tierLimits: { essentials: 0, plus: 2, preferred: 10, premium: 10 },
      };
      const summaries = [{ ...makeSummary('attachments', 'Attachments'), config: lockedConfig }];

      render(<FeatureSelectorGrid summaries={summaries} onSelectFeature={vi.fn()} tier="essentials" />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('should enable cards when tier limit is greater than 0', () => {
      const summaries = [makeSummary('gallery', 'Gallery')];

      render(<FeatureSelectorGrid summaries={summaries} onSelectFeature={vi.fn()} tier="plus" />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'false');
    });
  });
});
