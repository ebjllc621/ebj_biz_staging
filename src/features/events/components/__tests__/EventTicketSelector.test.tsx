/**
 * EventTicketSelector - Component Tests
 *
 * @tier STANDARD
 * @phase Phase 9 - Testing & Validation
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests ticket tier display, price formatting, quantity selection, sold out state.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventTicketSelector } from '../EventTicketSelector';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createTicketResponse(tickets: Array<{
  id: number;
  event_id: number;
  ticket_name: string;
  ticket_price: number;
  quantity_total: number;
  quantity_sold: number;
}>) {
  return {
    ok: true,
    json: async () => ({ data: { tickets } }),
  };
}

const sampleTickets = [
  { id: 1, event_id: 10, ticket_name: 'General Admission', ticket_price: 25, quantity_total: 100, quantity_sold: 40 },
  { id: 2, event_id: 10, ticket_name: 'VIP Pass', ticket_price: 75, quantity_total: 20, quantity_sold: 20 },
  { id: 3, event_id: 10, ticket_name: 'Free Entry', ticket_price: 0, quantity_total: 50, quantity_sold: 10 },
];

describe('EventTicketSelector', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('should show loading skeleton while fetching', () => {
      mockFetch.mockReturnValue(new Promise(() => {})); // Never resolves
      const { container } = render(
        <EventTicketSelector eventId={10} onTicketSelect={mockOnSelect} selectedTicketId={null} />
      );

      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should display error message on fetch failure', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      render(
        <EventTicketSelector eventId={10} onTicketSelect={mockOnSelect} selectedTicketId={null} />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load ticket options')).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    it('should show no tickets message when empty', async () => {
      mockFetch.mockResolvedValue(createTicketResponse([]));

      render(
        <EventTicketSelector eventId={10} onTicketSelect={mockOnSelect} selectedTicketId={null} />
      );

      await waitFor(() => {
        expect(screen.getByText('No ticket tiers available.')).toBeInTheDocument();
      });
    });
  });

  describe('ticket display', () => {
    it('should render all ticket tiers', async () => {
      mockFetch.mockResolvedValue(createTicketResponse(sampleTickets));

      render(
        <EventTicketSelector eventId={10} onTicketSelect={mockOnSelect} selectedTicketId={null} />
      );

      await waitFor(() => {
        expect(screen.getByText('General Admission')).toBeInTheDocument();
      });
      expect(screen.getByText('VIP Pass')).toBeInTheDocument();
      expect(screen.getByText('Free Entry')).toBeInTheDocument();
    });

    it('should show prompt text', async () => {
      mockFetch.mockResolvedValue(createTicketResponse(sampleTickets));

      render(
        <EventTicketSelector eventId={10} onTicketSelect={mockOnSelect} selectedTicketId={null} />
      );

      await waitFor(() => {
        expect(screen.getByText('Select a ticket type:')).toBeInTheDocument();
      });
    });
  });

  describe('price formatting', () => {
    it('should format prices with dollar sign and decimals', async () => {
      mockFetch.mockResolvedValue(createTicketResponse(sampleTickets));

      render(
        <EventTicketSelector eventId={10} onTicketSelect={mockOnSelect} selectedTicketId={null} />
      );

      await waitFor(() => {
        expect(screen.getByText('$25.00')).toBeInTheDocument();
      });
      expect(screen.getByText('$75.00')).toBeInTheDocument();
    });

    it('should show "Free" for zero-price tickets', async () => {
      mockFetch.mockResolvedValue(createTicketResponse(sampleTickets));

      render(
        <EventTicketSelector eventId={10} onTicketSelect={mockOnSelect} selectedTicketId={null} />
      );

      await waitFor(() => {
        expect(screen.getByText('Free')).toBeInTheDocument();
      });
    });
  });

  describe('remaining capacity', () => {
    it('should show remaining out of total', async () => {
      mockFetch.mockResolvedValue(createTicketResponse(sampleTickets));

      render(
        <EventTicketSelector eventId={10} onTicketSelect={mockOnSelect} selectedTicketId={null} />
      );

      await waitFor(() => {
        expect(screen.getByText('60 of 100 remaining')).toBeInTheDocument();
      });
      expect(screen.getByText('40 of 50 remaining')).toBeInTheDocument();
    });
  });

  describe('sold out state', () => {
    it('should show SOLD OUT badge for fully sold tickets', async () => {
      mockFetch.mockResolvedValue(createTicketResponse(sampleTickets));

      render(
        <EventTicketSelector eventId={10} onTicketSelect={mockOnSelect} selectedTicketId={null} />
      );

      await waitFor(() => {
        expect(screen.getByText('SOLD OUT')).toBeInTheDocument();
      });
    });

    it('should disable sold out ticket buttons', async () => {
      mockFetch.mockResolvedValue(createTicketResponse(sampleTickets));

      render(
        <EventTicketSelector eventId={10} onTicketSelect={mockOnSelect} selectedTicketId={null} />
      );

      await waitFor(() => {
        expect(screen.getByText('VIP Pass')).toBeInTheDocument();
      });

      const vipButton = screen.getByText('VIP Pass').closest('button');
      expect(vipButton).toBeDisabled();
    });
  });

  describe('selection', () => {
    it('should call onTicketSelect when ticket clicked', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue(createTicketResponse(sampleTickets));

      render(
        <EventTicketSelector eventId={10} onTicketSelect={mockOnSelect} selectedTicketId={null} />
      );

      await waitFor(() => {
        expect(screen.getByText('General Admission')).toBeInTheDocument();
      });

      const gaButton = screen.getByText('General Admission').closest('button')!;
      await user.click(gaButton);

      expect(mockOnSelect).toHaveBeenCalledWith(1);
    });

    it('should deselect when clicking selected ticket', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue(createTicketResponse(sampleTickets));

      render(
        <EventTicketSelector eventId={10} onTicketSelect={mockOnSelect} selectedTicketId={1} />
      );

      await waitFor(() => {
        expect(screen.getByText('General Admission')).toBeInTheDocument();
      });

      const gaButton = screen.getByText('General Admission').closest('button')!;
      await user.click(gaButton);

      expect(mockOnSelect).toHaveBeenCalledWith(null);
    });

    it('should highlight selected ticket with orange border', async () => {
      mockFetch.mockResolvedValue(createTicketResponse(sampleTickets));

      render(
        <EventTicketSelector eventId={10} onTicketSelect={mockOnSelect} selectedTicketId={1} />
      );

      await waitFor(() => {
        expect(screen.getByText('General Admission')).toBeInTheDocument();
      });

      const gaButton = screen.getByText('General Admission').closest('button')!;
      expect(gaButton).toHaveClass('border-biz-orange');
    });
  });

  describe('API call', () => {
    it('should fetch tickets for the correct event ID', async () => {
      mockFetch.mockResolvedValue(createTicketResponse([]));

      render(
        <EventTicketSelector eventId={42} onTicketSelect={mockOnSelect} selectedTicketId={null} />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/events/42/tickets', { credentials: 'include' });
      });
    });
  });
});
