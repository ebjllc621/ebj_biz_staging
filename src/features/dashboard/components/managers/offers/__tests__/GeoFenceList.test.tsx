/**
 * GeoFenceList - Component Tests
 *
 * @tier STANDARD
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests geo-fence list display, activation status, and deletion.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GeoFenceList } from '../GeoFenceList';

const mockGeoFences = [
  {
    id: 1,
    name: 'Downtown Seattle',
    latitude: 47.6062,
    longitude: -122.3321,
    radius: 5,
    active: true,
  },
  {
    id: 2,
    name: 'Bellevue Area',
    latitude: 47.6101,
    longitude: -122.2015,
    radius: 3,
    active: false,
  },
];

describe('GeoFenceList', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnToggleActive = vi.fn();

  describe('list rendering', () => {
    it('renders all geo-fences', () => {
      render(<GeoFenceList geoFences={mockGeoFences} onEdit={mockOnEdit} onDelete={mockOnDelete} onToggleActive={mockOnToggleActive} />);

      expect(screen.getByText('Downtown Seattle')).toBeInTheDocument();
      expect(screen.getByText('Bellevue Area')).toBeInTheDocument();
    });

    it('displays coordinates for each fence', () => {
      render(<GeoFenceList geoFences={mockGeoFences} onEdit={mockOnEdit} onDelete={mockOnDelete} onToggleActive={mockOnToggleActive} />);

      expect(screen.getByText(/47.6062, -122.3321/)).toBeInTheDocument();
      expect(screen.getByText(/47.6101, -122.2015/)).toBeInTheDocument();
    });

    it('shows radius for each fence', () => {
      render(<GeoFenceList geoFences={mockGeoFences} onEdit={mockOnEdit} onDelete={mockOnDelete} onToggleActive={mockOnToggleActive} />);

      expect(screen.getByText('5 mi radius')).toBeInTheDocument();
      expect(screen.getByText('3 mi radius')).toBeInTheDocument();
    });
  });

  describe('activation status', () => {
    it('shows active badge for active fences', () => {
      render(<GeoFenceList geoFences={mockGeoFences} onEdit={mockOnEdit} onDelete={mockOnDelete} onToggleActive={mockOnToggleActive} />);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('shows inactive badge for inactive fences', () => {
      render(<GeoFenceList geoFences={mockGeoFences} onEdit={mockOnEdit} onDelete={mockOnDelete} onToggleActive={mockOnToggleActive} />);

      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('allows toggling active status', async () => {
      const user = userEvent.setup();
      render(<GeoFenceList geoFences={mockGeoFences} onEdit={mockOnEdit} onDelete={mockOnDelete} onToggleActive={mockOnToggleActive} />);

      const toggleButtons = screen.getAllByRole('switch');
      await user.click(toggleButtons[0]);

      expect(mockOnToggleActive).toHaveBeenCalledWith(1);
    });
  });

  describe('actions', () => {
    it('renders edit button for each fence', () => {
      render(<GeoFenceList geoFences={mockGeoFences} onEdit={mockOnEdit} onDelete={mockOnDelete} onToggleActive={mockOnToggleActive} />);

      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      expect(editButtons).toHaveLength(2);
    });

    it('calls onEdit when edit clicked', async () => {
      const user = userEvent.setup();
      render(<GeoFenceList geoFences={mockGeoFences} onEdit={mockOnEdit} onDelete={mockOnDelete} onToggleActive={mockOnToggleActive} />);

      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      await user.click(editButtons[0]);

      expect(mockOnEdit).toHaveBeenCalledWith(mockGeoFences[0]);
    });

    it('renders delete button for each fence', () => {
      render(<GeoFenceList geoFences={mockGeoFences} onEdit={mockOnEdit} onDelete={mockOnDelete} onToggleActive={mockOnToggleActive} />);

      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      expect(deleteButtons).toHaveLength(2);
    });

    it('calls onDelete when delete clicked', async () => {
      const user = userEvent.setup();
      render(<GeoFenceList geoFences={mockGeoFences} onEdit={mockOnEdit} onDelete={mockOnDelete} onToggleActive={mockOnToggleActive} />);

      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      await user.click(deleteButtons[0]);

      expect(mockOnDelete).toHaveBeenCalledWith(1);
    });
  });

  describe('empty state', () => {
    it('shows empty message when no fences', () => {
      render(<GeoFenceList geoFences={[]} onEdit={mockOnEdit} onDelete={mockOnDelete} onToggleActive={mockOnToggleActive} />);

      expect(screen.getByText(/No geo-fences configured/i)).toBeInTheDocument();
    });
  });
});
