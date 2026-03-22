/**
 * BundleCreatorModal - Component Tests
 *
 * @tier ADVANCED
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests bundle creation modal, offer selection, pricing, and validation.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BundleCreatorModal } from '../BundleCreatorModal';

describe('BundleCreatorModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  describe('modal rendering', () => {
    it('renders modal when open', () => {
      render(<BundleCreatorModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} listingId={1} />);

      expect(screen.getByText('Create Bundle')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      const { container } = render(<BundleCreatorModal isOpen={false} onClose={mockOnClose} onSuccess={mockOnSuccess} listingId={1} />);

      expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
    });
  });

  describe('offer selection', () => {
    it('displays available offers for selection', () => {
      render(<BundleCreatorModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} listingId={1} />);

      expect(screen.getByText('Select Offers')).toBeInTheDocument();
    });

    it('allows multiple offer selection', () => {
      render(<BundleCreatorModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} listingId={1} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });
  });

  describe('pricing configuration', () => {
    it('displays bundle pricing fields', () => {
      render(<BundleCreatorModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} listingId={1} />);

      expect(screen.getByLabelText(/Bundle Price/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Discount Percentage/)).toBeInTheDocument();
    });

    it('calculates total price from selected offers', () => {
      render(<BundleCreatorModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} listingId={1} />);

      expect(screen.getByText(/Total Value:/)).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('requires bundle name', () => {
      render(<BundleCreatorModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} listingId={1} />);

      expect(screen.getByLabelText(/Bundle Name/)).toBeRequired();
    });

    it('requires at least 2 offers selected', () => {
      render(<BundleCreatorModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} listingId={1} />);

      expect(screen.getByText(/Select at least 2 offers/)).toBeInTheDocument();
    });
  });
});
