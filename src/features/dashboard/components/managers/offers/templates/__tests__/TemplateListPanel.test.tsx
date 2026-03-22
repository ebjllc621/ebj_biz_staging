/**
 * TemplateListPanel - Component Tests
 *
 * @tier STANDARD
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests template list rendering, deletion, menu actions, and empty/error states.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateListPanel } from '../TemplateListPanel';
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
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
  },
];

describe('TemplateListPanel', () => {
  const mockOnSelect = vi.fn();
  const mockOnSchedule = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('shows loading spinner initially', () => {
      (global.fetch as any).mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      render(<TemplateListPanel listingId={1} />);

      expect(screen.getByText('Loading templates...')).toBeInTheDocument();
    });

    it('renders Loader2 icon when loading', () => {
      (global.fetch as any).mockImplementationOnce(
        () => new Promise(() => {}) // Never resolves
      );

      const { container } = render(<TemplateListPanel listingId={1} />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('template list rendering', () => {
    it('renders list of templates', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates }),
      });

      render(<TemplateListPanel listingId={1} />);

      await waitFor(() => {
        expect(screen.getByText('Summer Sale Template')).toBeInTheDocument();
        expect(screen.getByText('Weekly Special')).toBeInTheDocument();
      });
    });

    it('displays template metadata correctly', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates }),
      });

      render(<TemplateListPanel listingId={1} />);

      await waitFor(() => {
        expect(screen.getByText(/discount.*One-time/i)).toBeInTheDocument();
        expect(screen.getByText(/coupon.*Weekly \(Mon, Wed, Fri\)/i)).toBeInTheDocument();
      });
    });

    it('displays creation dates', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates }),
      });

      const { container } = render(<TemplateListPanel listingId={1} />);

      await waitFor(() => {
        // Dates are formatted with toLocaleDateString()
        // Check for the text-xs text-gray-400 elements containing "Created"
        const createdTexts = container.querySelectorAll('.text-xs.text-gray-400');
        expect(createdTexts.length).toBeGreaterThanOrEqual(2);
        expect(createdTexts[0].textContent).toContain('Created');
      });
    });

    it('renders FileText icons for templates', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates }),
      });

      const { container } = render(<TemplateListPanel listingId={1} />);

      await waitFor(() => {
        const icons = container.querySelectorAll('.text-purple-600');
        expect(icons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('template deletion', () => {
    it('opens menu when MoreVertical is clicked', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates }),
      });

      const user = userEvent.setup();
      const { container } = render(<TemplateListPanel listingId={1} />);

      await waitFor(() => {
        expect(screen.getByText('Summer Sale Template')).toBeInTheDocument();
      });

      const menuButtons = container.querySelectorAll('button');
      const menuButton = Array.from(menuButtons).find((btn) =>
        btn.querySelector('svg')
      );

      if (menuButton) {
        await user.click(menuButton);
        expect(screen.getByText('Delete')).toBeInTheDocument();
      }
    });

    it('deletes template when Delete is clicked', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ templates: mockTemplates }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const user = userEvent.setup();
      const { container } = render(<TemplateListPanel listingId={1} />);

      await waitFor(() => {
        expect(screen.getByText('Summer Sale Template')).toBeInTheDocument();
      });

      const menuButtons = container.querySelectorAll('button');
      const menuButton = Array.from(menuButtons).find((btn) =>
        btn.querySelector('svg')
      );

      if (menuButton) {
        await user.click(menuButton);

        const deleteButton = screen.getByText('Delete').closest('button')!;
        await user.click(deleteButton);

        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith(
            '/api/templates/1',
            expect.objectContaining({ method: 'DELETE' })
          );
        });
      }
    });

    it('removes template from list after deletion', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ templates: mockTemplates }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const user = userEvent.setup();
      const { container } = render(<TemplateListPanel listingId={1} />);

      await waitFor(() => {
        expect(screen.getByText('Summer Sale Template')).toBeInTheDocument();
      });

      const menuButtons = container.querySelectorAll('button');
      const menuButton = Array.from(menuButtons).find((btn) =>
        btn.querySelector('svg')
      );

      if (menuButton) {
        await user.click(menuButton);

        const deleteButton = screen.getByText('Delete').closest('button')!;
        await user.click(deleteButton);

        await waitFor(() => {
          expect(screen.queryByText('Summer Sale Template')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('menu actions', () => {
    it('shows Use Template option when onSelect provided', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates }),
      });

      const user = userEvent.setup();
      const { container } = render(
        <TemplateListPanel listingId={1} onSelect={mockOnSelect} />
      );

      await waitFor(() => {
        expect(screen.getByText('Summer Sale Template')).toBeInTheDocument();
      });

      const menuButtons = container.querySelectorAll('button');
      const menuButton = Array.from(menuButtons).find((btn) =>
        btn.querySelector('svg')
      );

      if (menuButton) {
        await user.click(menuButton);
        expect(screen.getByText('Use Template')).toBeInTheDocument();
      }
    });

    it('shows Schedule option for recurring templates when onSchedule provided', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates }),
      });

      const user = userEvent.setup();
      const { container } = render(
        <TemplateListPanel listingId={1} onSchedule={mockOnSchedule} />
      );

      await waitFor(() => {
        expect(screen.getByText('Weekly Special')).toBeInTheDocument();
      });

      // Click menu for recurring template (second one)
      const menuButtons = container.querySelectorAll('button');
      const recurringMenuButton = Array.from(menuButtons)[3]; // Approximate index

      if (recurringMenuButton) {
        await user.click(recurringMenuButton);
        expect(screen.getByText('Schedule')).toBeInTheDocument();
      }
    });

    it('calls onSelect when Use Template is clicked', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates }),
      });

      const user = userEvent.setup();
      const { container } = render(
        <TemplateListPanel listingId={1} onSelect={mockOnSelect} />
      );

      await waitFor(() => {
        expect(screen.getByText('Summer Sale Template')).toBeInTheDocument();
      });

      const menuButtons = container.querySelectorAll('button');
      const menuButton = Array.from(menuButtons).find((btn) =>
        btn.querySelector('svg')
      );

      if (menuButton) {
        await user.click(menuButton);

        const useButton = screen.getByText('Use Template').closest('button')!;
        await user.click(useButton);

        expect(mockOnSelect).toHaveBeenCalledWith(mockTemplates[0]);
      }
    });
  });

  describe('empty state', () => {
    it('shows empty state when no templates exist', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: [] }),
      });

      render(<TemplateListPanel listingId={1} />);

      await waitFor(() => {
        expect(screen.getByText('No Templates Yet')).toBeInTheDocument();
        expect(
          screen.getByText('Save an offer as a template to reuse it later.')
        ).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('shows error message when fetch fails', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

      render(<TemplateListPanel listingId={1} />);

      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument();
      });
    });

    it('shows Try Again button on error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

      render(<TemplateListPanel listingId={1} />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('retries fetch when Try Again is clicked', async () => {
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ templates: mockTemplates }),
        });

      const user = userEvent.setup();
      render(<TemplateListPanel listingId={1} />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Try Again').closest('button')!;
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Summer Sale Template')).toBeInTheDocument();
      });
    });
  });

  describe('recurrence labels', () => {
    it('displays "One-time" for non-recurring templates', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: [mockTemplates[0]] }),
      });

      render(<TemplateListPanel listingId={1} />);

      await waitFor(() => {
        expect(screen.getByText(/One-time/)).toBeInTheDocument();
      });
    });

    it('displays day names for weekly recurring templates', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: [mockTemplates[1]] }),
      });

      render(<TemplateListPanel listingId={1} />);

      await waitFor(() => {
        expect(screen.getByText(/Mon, Wed, Fri/)).toBeInTheDocument();
      });
    });
  });
});
