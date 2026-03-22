/**
 * ABTestResultsPanel - Component Tests
 *
 * @tier ADVANCED
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests A/B test results display, metrics comparison, winner declaration, and charts.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ABTestResultsPanel } from '../ABTestResultsPanel';

const mockTestResults = {
  test_id: 1,
  status: 'running',
  variants: [
    { id: 'A', title: 'Original', views: 1000, claims: 150, conversion_rate: 15.0 },
    { id: 'B', title: 'Variant B', views: 1000, claims: 180, conversion_rate: 18.0 },
  ],
  start_date: '2026-01-01',
  end_date: '2026-02-01',
  confidence_level: 95,
  winner: null,
};

describe('ABTestResultsPanel', () => {
  describe('results rendering', () => {
    it('renders test status', () => {
      render(<ABTestResultsPanel testResults={mockTestResults} />);

      expect(screen.getByText('Running')).toBeInTheDocument();
    });

    it('displays both variant results', () => {
      render(<ABTestResultsPanel testResults={mockTestResults} />);

      expect(screen.getByText('Original')).toBeInTheDocument();
      expect(screen.getByText('Variant B')).toBeInTheDocument();
    });

    it('shows test duration dates', () => {
      render(<ABTestResultsPanel testResults={mockTestResults} />);

      expect(screen.getByText(/1\/1\/2026/)).toBeInTheDocument();
      expect(screen.getByText(/2\/1\/2026/)).toBeInTheDocument();
    });

    it('displays confidence level', () => {
      render(<ABTestResultsPanel testResults={mockTestResults} />);

      expect(screen.getByText(/95% confidence/i)).toBeInTheDocument();
    });
  });

  describe('metrics comparison', () => {
    it('displays views for each variant', () => {
      render(<ABTestResultsPanel testResults={mockTestResults} />);

      const viewCounts = screen.getAllByText('1,000');
      expect(viewCounts.length).toBe(2);
    });

    it('displays claims for each variant', () => {
      render(<ABTestResultsPanel testResults={mockTestResults} />);

      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('180')).toBeInTheDocument();
    });

    it('displays conversion rates', () => {
      render(<ABTestResultsPanel testResults={mockTestResults} />);

      expect(screen.getByText('15.0%')).toBeInTheDocument();
      expect(screen.getByText('18.0%')).toBeInTheDocument();
    });

    it('highlights better performing variant', () => {
      const { container } = render(<ABTestResultsPanel testResults={mockTestResults} />);

      const variantBCard = container.querySelector('[data-variant="B"]');
      expect(variantBCard).toHaveClass('border-green-500');
    });
  });

  describe('winner declaration', () => {
    it('shows no winner when test is running', () => {
      render(<ABTestResultsPanel testResults={mockTestResults} />);

      expect(screen.queryByText(/Winner/i)).not.toBeInTheDocument();
    });

    it('displays winner when test is complete', () => {
      const completedTest = {
        ...mockTestResults,
        status: 'completed',
        winner: 'B',
      };

      render(<ABTestResultsPanel testResults={completedTest} />);

      expect(screen.getByText(/Winner: Variant B/i)).toBeInTheDocument();
    });

    it('shows trophy icon for winner', () => {
      const completedTest = {
        ...mockTestResults,
        status: 'completed',
        winner: 'B',
      };

      const { container } = render(<ABTestResultsPanel testResults={completedTest} />);

      const trophy = container.querySelector('[data-icon="trophy"]');
      expect(trophy).toBeInTheDocument();
    });

    it('displays improvement percentage', () => {
      const completedTest = {
        ...mockTestResults,
        status: 'completed',
        winner: 'B',
      };

      render(<ABTestResultsPanel testResults={completedTest} />);

      expect(screen.getByText(/20% improvement/i)).toBeInTheDocument();
    });
  });

  describe('charts', () => {
    it('renders conversion rate comparison chart', () => {
      render(<ABTestResultsPanel testResults={mockTestResults} />);

      expect(screen.getByText(/Conversion Rate Comparison/i)).toBeInTheDocument();
    });

    it('renders timeline chart for running test', () => {
      render(<ABTestResultsPanel testResults={mockTestResults} />);

      expect(screen.getByText(/Performance Over Time/i)).toBeInTheDocument();
    });

    it('displays statistical significance indicator', () => {
      render(<ABTestResultsPanel testResults={mockTestResults} />);

      expect(screen.getByText(/Statistical Significance/i)).toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('renders Stop Test button for running tests', () => {
      render(<ABTestResultsPanel testResults={mockTestResults} />);

      expect(screen.getByRole('button', { name: /Stop Test/i })).toBeInTheDocument();
    });

    it('renders Apply Winner button for completed tests', () => {
      const completedTest = {
        ...mockTestResults,
        status: 'completed',
        winner: 'B',
      };

      render(<ABTestResultsPanel testResults={completedTest} />);

      expect(screen.getByRole('button', { name: /Apply Winner/i })).toBeInTheDocument();
    });

    it('does not show Apply Winner when no clear winner', () => {
      const inconclusiveTest = {
        ...mockTestResults,
        status: 'completed',
        winner: null,
        confidence_level: 80,
      };

      render(<ABTestResultsPanel testResults={inconclusiveTest} />);

      expect(screen.queryByRole('button', { name: /Apply Winner/i })).not.toBeInTheDocument();
    });
  });
});
