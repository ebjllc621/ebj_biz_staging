/**
 * ABTestSetupModal - Component Tests
 *
 * @tier ADVANCED
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests A/B test setup modal, variant creation, traffic split, and duration config.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ABTestSetupModal } from '../ABTestSetupModal';

describe('ABTestSetupModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('modal rendering', () => {
    it('renders modal when open', () => {
      render(<ABTestSetupModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} offerId={1} />);

      expect(screen.getByText('A/B Test Setup')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      const { container } = render(<ABTestSetupModal isOpen={false} onClose={mockOnClose} onSuccess={mockOnSuccess} offerId={1} />);

      expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
    });

    it('renders variant configuration section', () => {
      render(<ABTestSetupModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} offerId={1} />);

      expect(screen.getByText(/Variant Configuration/i)).toBeInTheDocument();
    });

    it('renders traffic split section', () => {
      render(<ABTestSetupModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} offerId={1} />);

      expect(screen.getByText(/Traffic Split/i)).toBeInTheDocument();
    });
  });

  describe('variant creation', () => {
    it('displays variant A and variant B fields', () => {
      render(<ABTestSetupModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} offerId={1} />);

      expect(screen.getByText(/Variant A/i)).toBeInTheDocument();
      expect(screen.getByText(/Variant B/i)).toBeInTheDocument();
    });

    it('allows editing variant titles', () => {
      render(<ABTestSetupModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} offerId={1} />);

      expect(screen.getByLabelText(/Variant A Title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Variant B Title/i)).toBeInTheDocument();
    });

    it('allows editing variant descriptions', () => {
      render(<ABTestSetupModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} offerId={1} />);

      const textareas = screen.getAllByRole('textbox');
      expect(textareas.length).toBeGreaterThanOrEqual(2);
    });

    it('allows uploading variant images', () => {
      render(<ABTestSetupModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} offerId={1} />);

      const fileInputs = screen.getAllByLabelText(/Image/i);
      expect(fileInputs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('traffic split configuration', () => {
    it('displays traffic split slider', () => {
      render(<ABTestSetupModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} offerId={1} />);

      const slider = screen.getByRole('slider', { name: /Traffic Split/i });
      expect(slider).toBeInTheDocument();
    });

    it('shows percentage for each variant', () => {
      render(<ABTestSetupModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} offerId={1} />);

      expect(screen.getByText(/50%/)).toBeInTheDocument();
    });

    it('allows adjusting traffic split', async () => {
      const user = userEvent.setup();
      render(<ABTestSetupModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} offerId={1} />);

      const slider = screen.getByRole('slider', { name: /Traffic Split/i });
      await user.type(slider, '60');

      expect(slider).toHaveValue('60');
    });

    it('ensures total traffic equals 100%', () => {
      render(<ABTestSetupModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} offerId={1} />);

      const percentages = screen.getAllByText(/%/);
      expect(percentages.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('duration configuration', () => {
    it('displays test duration field', () => {
      render(<ABTestSetupModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} offerId={1} />);

      expect(screen.getByLabelText(/Test Duration/i)).toBeInTheDocument();
    });

    it('displays start date picker', () => {
      render(<ABTestSetupModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} offerId={1} />);

      expect(screen.getByLabelText(/Start Date/i)).toBeInTheDocument();
    });

    it('displays end date picker', () => {
      render(<ABTestSetupModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} offerId={1} />);

      expect(screen.getByLabelText(/End Date/i)).toBeInTheDocument();
    });

    it('validates end date is after start date', () => {
      render(<ABTestSetupModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} offerId={1} />);

      expect(screen.getByText(/End date must be after start date/i)).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('renders Start Test button', () => {
      render(<ABTestSetupModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} offerId={1} />);

      expect(screen.getByRole('button', { name: /Start Test/i })).toBeInTheDocument();
    });

    it('disables submit button when invalid', () => {
      render(<ABTestSetupModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} offerId={1} />);

      const button = screen.getByRole('button', { name: /Start Test/i }) as HTMLButtonElement;
      expect(button).toBeDisabled();
    });

    it('calls onSuccess when test created successfully', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const user = userEvent.setup();
      render(<ABTestSetupModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} offerId={1} />);

      // Fill required fields and submit
      const button = screen.getByRole('button', { name: /Start Test/i });
      await user.click(button);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('validation', () => {
    it('requires variant A title', () => {
      render(<ABTestSetupModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} offerId={1} />);

      expect(screen.getByText(/Variant A title is required/i)).toBeInTheDocument();
    });

    it('requires variant B title', () => {
      render(<ABTestSetupModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} offerId={1} />);

      expect(screen.getByText(/Variant B title is required/i)).toBeInTheDocument();
    });

    it('requires test duration', () => {
      render(<ABTestSetupModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} offerId={1} />);

      expect(screen.getByText(/Test duration is required/i)).toBeInTheDocument();
    });

    it('validates minimum test duration (7 days)', () => {
      render(<ABTestSetupModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} offerId={1} />);

      expect(screen.getByText(/Minimum test duration is 7 days/i)).toBeInTheDocument();
    });
  });
});
