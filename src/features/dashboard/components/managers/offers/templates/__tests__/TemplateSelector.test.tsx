/**
 * TemplateSelector - Component Tests
 *
 * @tier STANDARD
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests template dropdown, loading state, selection handling, and empty state.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateSelector } from '../TemplateSelector';
import type { OfferTemplate } from '@features/offers/types';

// Mock fetch
global.fetch = vi.fn();

const mockTemplates: OfferTemplate[] = [
  {
    id: 1,
    listing_id: 1,
    name: 'Summer Sale Template',
    template_data: {
      offer_type: 'discount',
      title: 'Summer Sale',
      discount_percentage: 20,
    },
    recurrence_type: 'none',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    listing_id: 1,
    name: 'Weekly Special',
    template_data: {
      offer_type: 'coupon',
      title: 'Weekly Deal',
    },
    recurrence_type: 'weekly',
    recurrence_days: [1, 3, 5],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

describe('TemplateSelector', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('shows loading spinner initially', () => {
      (global.fetch as any).mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      render(<TemplateSelector listingId={1} onSelect={mockOnSelect} />);

      expect(screen.getByText('Loading templates...')).toBeInTheDocument();
    });

    it('renders Loader2 icon when loading', () => {
      (global.fetch as any).mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      const { container } = render(
        <TemplateSelector listingId={1} onSelect={mockOnSelect} />
      );

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('template dropdown', () => {
    it('renders dropdown button after loading templates', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates }),
      });

      render(<TemplateSelector listingId={1} onSelect={mockOnSelect} />);

      await waitFor(() => {
        expect(screen.getByText('Load from template')).toBeInTheDocument();
      });
    });

    it('shows FileText icon in button', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates }),
      });

      const { container } = render(
        <TemplateSelector listingId={1} onSelect={mockOnSelect} />
      );

      await waitFor(() => {
        // FileText icon should be present
        const icon = container.querySelector('svg');
        expect(icon).toBeInTheDocument();
      });
    });

    it('opens dropdown menu on button click', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates }),
      });

      const user = userEvent.setup();
      render(<TemplateSelector listingId={1} onSelect={mockOnSelect} />);

      await waitFor(() => {
        expect(screen.getByText('Load from template')).toBeInTheDocument();
      });

      const button = screen.getByText('Load from template').closest('button')!;
      await user.click(button);

      expect(screen.getByText('Summer Sale Template')).toBeInTheDocument();
      expect(screen.getByText('Weekly Special')).toBeInTheDocument();
    });

    it('displays template names in dropdown', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates }),
      });

      const user = userEvent.setup();
      render(<TemplateSelector listingId={1} onSelect={mockOnSelect} />);

      await waitFor(() => {
        expect(screen.getByText('Load from template')).toBeInTheDocument();
      });

      const button = screen.getByText('Load from template').closest('button')!;
      await user.click(button);

      expect(screen.getByText('Summer Sale Template')).toBeInTheDocument();
      expect(screen.getByText(/discount/)).toBeInTheDocument();
      expect(screen.getByText('Weekly Special')).toBeInTheDocument();
      expect(screen.getByText(/coupon.*weekly/i)).toBeInTheDocument();
    });
  });

  describe('template selection', () => {
    it('calls onSelect when template is clicked', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates }),
      });

      const user = userEvent.setup();
      render(<TemplateSelector listingId={1} onSelect={mockOnSelect} />);

      await waitFor(() => {
        expect(screen.getByText('Load from template')).toBeInTheDocument();
      });

      const button = screen.getByText('Load from template').closest('button')!;
      await user.click(button);

      const templateButton = screen.getByText('Summer Sale Template').closest('button')!;
      await user.click(templateButton);

      expect(mockOnSelect).toHaveBeenCalledWith(mockTemplates[0]);
    });

    it('updates button text after selection', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates }),
      });

      const user = userEvent.setup();
      render(<TemplateSelector listingId={1} onSelect={mockOnSelect} />);

      await waitFor(() => {
        expect(screen.getByText('Load from template')).toBeInTheDocument();
      });

      const button = screen.getByText('Load from template').closest('button')!;
      await user.click(button);

      const templateButton = screen.getByText('Summer Sale Template').closest('button')!;
      await user.click(templateButton);

      await waitFor(() => {
        expect(screen.getByText('Summer Sale Template')).toBeInTheDocument();
        expect(screen.queryByText('Load from template')).not.toBeInTheDocument();
      });
    });

    it('closes dropdown after selection', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates }),
      });

      const user = userEvent.setup();
      render(<TemplateSelector listingId={1} onSelect={mockOnSelect} />);

      await waitFor(() => {
        expect(screen.getByText('Load from template')).toBeInTheDocument();
      });

      const button = screen.getByText('Load from template').closest('button')!;
      await user.click(button);

      const templateButton = screen.getByText('Summer Sale Template').closest('button')!;
      await user.click(templateButton);

      // Dropdown should close
      await waitFor(() => {
        expect(screen.queryByText('Weekly Special')).not.toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    it('renders nothing when no templates exist', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: [] }),
      });

      const { container } = render(
        <TemplateSelector listingId={1} onSelect={mockOnSelect} />
      );

      await waitFor(() => {
        expect(container.querySelector('button')).not.toBeInTheDocument();
      });
    });
  });

  describe('disabled state', () => {
    it('disables button when disabled prop is true', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates }),
      });

      render(<TemplateSelector listingId={1} onSelect={mockOnSelect} disabled />);

      await waitFor(() => {
        const button = screen.getByText('Load from template').closest('button')!;
        expect(button).toBeDisabled();
      });
    });
  });

  describe('API integration', () => {
    it('fetches templates on mount', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates }),
      });

      render(<TemplateSelector listingId={1} onSelect={mockOnSelect} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/listings/1/templates',
          expect.objectContaining({ credentials: 'include' })
        );
      });
    });

    it('handles API errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

      const { container } = render(
        <TemplateSelector listingId={1} onSelect={mockOnSelect} />
      );

      await waitFor(() => {
        // Should show nothing on error
        expect(container.querySelector('button')).not.toBeInTheDocument();
      });
    });
  });
});
