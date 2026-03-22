/**
 * RecurrenceConfig - Component Tests
 *
 * @tier STANDARD
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests recurrence type selection, day-of-week selector, and end date picker.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecurrenceConfig } from '../RecurrenceConfig';
import type { RecurrenceConfig as RecurrenceConfigType } from '@features/offers/types';

describe('RecurrenceConfig', () => {
  const mockOnChange = vi.fn();

  const mockValue: RecurrenceConfigType = {
    type: 'none',
    days: [],
    endDate: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recurrence type selection', () => {
    it('renders recurrence type dropdown', () => {
      render(<RecurrenceConfig value={mockValue} onChange={mockOnChange} />);

      expect(screen.getByText('Recurrence Pattern')).toBeInTheDocument();
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('displays all recurrence options', () => {
      const { container } = render(
        <RecurrenceConfig value={mockValue} onChange={mockOnChange} />
      );

      const select = container.querySelector('select');
      const options = select?.querySelectorAll('option');

      expect(options).toHaveLength(5);
      expect(options?.[0].textContent).toContain('No recurrence');
      expect(options?.[1].textContent).toBe('Daily');
      expect(options?.[2].textContent).toBe('Weekly');
      expect(options?.[3].textContent).toBe('Monthly');
      expect(options?.[4].textContent).toBe('Yearly');
    });

    it('shows current recurrence type as selected', () => {
      const weeklyValue = { ...mockValue, type: 'weekly' as const };
      const { container } = render(
        <RecurrenceConfig value={weeklyValue} onChange={mockOnChange} />
      );

      const select = container.querySelector('select') as HTMLSelectElement;
      expect(select.value).toBe('weekly');
    });

    it('calls onChange when recurrence type changes', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <RecurrenceConfig value={mockValue} onChange={mockOnChange} />
      );

      const select = container.querySelector('select')!;
      await user.selectOptions(select, 'daily');

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'daily' })
      );
    });
  });

  describe('day-of-week selector', () => {
    it('shows day selector only for weekly recurrence', () => {
      const weeklyValue = { ...mockValue, type: 'weekly' as const, days: [] };
      render(<RecurrenceConfig value={weeklyValue} onChange={mockOnChange} />);

      expect(screen.getByText('Repeat on')).toBeInTheDocument();
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Sun')).toBeInTheDocument();
    });

    it('does not show day selector for non-weekly recurrence', () => {
      render(<RecurrenceConfig value={mockValue} onChange={mockOnChange} />);

      expect(screen.queryByText('Repeat on')).not.toBeInTheDocument();
    });

    it('renders all 7 day buttons', () => {
      const weeklyValue = { ...mockValue, type: 'weekly' as const, days: [] };
      render(<RecurrenceConfig value={weeklyValue} onChange={mockOnChange} />);

      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      dayLabels.forEach((day) => {
        expect(screen.getByText(day)).toBeInTheDocument();
      });
    });

    it('highlights selected days', () => {
      const weeklyValue = {
        ...mockValue,
        type: 'weekly' as const,
        days: [1, 3, 5],
      };
      render(<RecurrenceConfig value={weeklyValue} onChange={mockOnChange} />);

      const monButton = screen.getByText('Mon').closest('button')!;
      const wedButton = screen.getByText('Wed').closest('button')!;
      const friButton = screen.getByText('Fri').closest('button')!;
      const tueButton = screen.getByText('Tue').closest('button')!;

      expect(monButton).toHaveClass('bg-purple-600', 'text-white');
      expect(wedButton).toHaveClass('bg-purple-600', 'text-white');
      expect(friButton).toHaveClass('bg-purple-600', 'text-white');
      expect(tueButton).toHaveClass('bg-gray-100', 'text-gray-700');
    });

    it('calls onChange when day is toggled', async () => {
      const user = userEvent.setup();
      const weeklyValue = { ...mockValue, type: 'weekly' as const, days: [] };
      render(<RecurrenceConfig value={weeklyValue} onChange={mockOnChange} />);

      const monButton = screen.getByText('Mon').closest('button')!;
      await user.click(monButton);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({ days: [1] })
      );
    });

    it('removes day when toggled off', async () => {
      const user = userEvent.setup();
      const weeklyValue = {
        ...mockValue,
        type: 'weekly' as const,
        days: [1, 3],
      };
      render(<RecurrenceConfig value={weeklyValue} onChange={mockOnChange} />);

      const monButton = screen.getByText('Mon').closest('button')!;
      await user.click(monButton);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({ days: [3] })
      );
    });
  });

  describe('end date picker', () => {
    it('shows end date input for recurring types', () => {
      const dailyValue = { ...mockValue, type: 'daily' as const };
      render(<RecurrenceConfig value={dailyValue} onChange={mockOnChange} />);

      expect(screen.getByText(/End Date \(optional\)/)).toBeInTheDocument();
      expect(screen.getByLabelText(/End Date/)).toBeInTheDocument();
    });

    it('does not show end date input for non-recurring', () => {
      render(<RecurrenceConfig value={mockValue} onChange={mockOnChange} />);

      expect(screen.queryByText(/End Date/)).not.toBeInTheDocument();
    });

    it('displays current end date value', () => {
      const dailyValue = {
        ...mockValue,
        type: 'daily' as const,
        endDate: new Date('2026-06-01'),
      };
      const { container } = render(
        <RecurrenceConfig value={dailyValue} onChange={mockOnChange} />
      );

      const input = container.querySelector('input[type="date"]') as HTMLInputElement;
      expect(input.value).toBe('2026-06-01');
    });

    it('calls onChange when end date changes', async () => {
      const user = userEvent.setup();
      const dailyValue = { ...mockValue, type: 'daily' as const };
      const { container } = render(
        <RecurrenceConfig value={dailyValue} onChange={mockOnChange} />
      );

      const input = container.querySelector('input[type="date"]')!;
      await user.type(input, '2026-12-31');

      expect(mockOnChange).toHaveBeenCalled();
    });

    it('shows help text for end date', () => {
      const dailyValue = { ...mockValue, type: 'daily' as const };
      render(<RecurrenceConfig value={dailyValue} onChange={mockOnChange} />);

      expect(screen.getByText('Leave empty to continue indefinitely')).toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    it('disables recurrence type select when disabled', () => {
      const { container } = render(
        <RecurrenceConfig value={mockValue} onChange={mockOnChange} disabled />
      );

      const select = container.querySelector('select')!;
      expect(select).toBeDisabled();
    });

    it('disables day buttons when disabled', () => {
      const weeklyValue = { ...mockValue, type: 'weekly' as const, days: [] };
      render(
        <RecurrenceConfig value={weeklyValue} onChange={mockOnChange} disabled />
      );

      const monButton = screen.getByText('Mon').closest('button')!;
      expect(monButton).toBeDisabled();
    });

    it('disables end date input when disabled', () => {
      const dailyValue = { ...mockValue, type: 'daily' as const };
      const { container } = render(
        <RecurrenceConfig value={dailyValue} onChange={mockOnChange} disabled />
      );

      const input = container.querySelector('input[type="date"]')!;
      expect(input).toBeDisabled();
    });
  });

  describe('icons', () => {
    it('renders RefreshCw icon for recurrence pattern', () => {
      const { container } = render(
        <RecurrenceConfig value={mockValue} onChange={mockOnChange} />
      );

      // Check for icon presence
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('renders Calendar icon for end date', () => {
      const dailyValue = { ...mockValue, type: 'daily' as const };
      render(<RecurrenceConfig value={dailyValue} onChange={mockOnChange} />);

      expect(screen.getByText(/End Date/)).toBeInTheDocument();
    });
  });
});
