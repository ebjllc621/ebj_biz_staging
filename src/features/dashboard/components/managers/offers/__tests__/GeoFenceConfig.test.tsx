/**
 * GeoFenceConfig - Component Tests
 *
 * @tier ADVANCED
 * @phase Phase 5 - Testing & Quality Assurance
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 *
 * Tests geo-fence configuration, map display, radius selector, location search.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GeoFenceConfig } from '../GeoFenceConfig';

describe('GeoFenceConfig', () => {
  const mockOnChange = vi.fn();
  const mockValue = {
    latitude: 47.6062,
    longitude: -122.3321,
    radius: 5,
  };

  describe('map rendering', () => {
    it('renders map container', () => {
      const { container } = render(<GeoFenceConfig value={mockValue} onChange={mockOnChange} />);

      const map = container.querySelector('[data-map="geo-fence"]');
      expect(map).toBeInTheDocument();
    });

    it('displays center marker at coordinates', () => {
      render(<GeoFenceConfig value={mockValue} onChange={mockOnChange} />);

      expect(screen.getByText(/47.6062, -122.3321/i)).toBeInTheDocument();
    });

    it('renders radius circle overlay', () => {
      const { container } = render(<GeoFenceConfig value={mockValue} onChange={mockOnChange} />);

      const circle = container.querySelector('[data-radius-circle]');
      expect(circle).toBeInTheDocument();
    });
  });

  describe('radius configuration', () => {
    it('displays radius slider', () => {
      render(<GeoFenceConfig value={mockValue} onChange={mockOnChange} />);

      const slider = screen.getByRole('slider', { name: /Radius/i });
      expect(slider).toBeInTheDocument();
    });

    it('shows current radius value', () => {
      render(<GeoFenceConfig value={mockValue} onChange={mockOnChange} />);

      expect(screen.getByText('5 miles')).toBeInTheDocument();
    });

    it('allows adjusting radius from 1-50 miles', () => {
      const { container } = render(<GeoFenceConfig value={mockValue} onChange={mockOnChange} />);

      const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
      expect(slider).toHaveAttribute('min', '1');
      expect(slider).toHaveAttribute('max', '50');
    });

    it('calls onChange when radius changes', async () => {
      const user = userEvent.setup();
      const { container } = render(<GeoFenceConfig value={mockValue} onChange={mockOnChange} />);

      const slider = container.querySelector('input[type="range"]')!;
      await user.type(slider, '10');

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({ radius: 10 })
      );
    });
  });

  describe('location search', () => {
    it('renders location search input', () => {
      render(<GeoFenceConfig value={mockValue} onChange={mockOnChange} />);

      expect(screen.getByPlaceholderText(/Search location/i)).toBeInTheDocument();
    });

    it('allows entering custom address', async () => {
      const user = userEvent.setup();
      render(<GeoFenceConfig value={mockValue} onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText(/Search location/i);
      await user.type(input, 'Seattle, WA');

      expect(input).toHaveValue('Seattle, WA');
    });

    it('displays search results dropdown', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { label: 'Seattle, WA, USA', lat: 47.6062, lng: -122.3321 },
          ],
        }),
      });

      render(<GeoFenceConfig value={mockValue} onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText(/Search location/i);
      await user.type(input, 'Seattle');

      expect(await screen.findByText('Seattle, WA, USA')).toBeInTheDocument();
    });
  });

  describe('coordinates display', () => {
    it('displays latitude and longitude', () => {
      render(<GeoFenceConfig value={mockValue} onChange={mockOnChange} />);

      expect(screen.getByText(/Latitude:/i)).toBeInTheDocument();
      expect(screen.getByText(/Longitude:/i)).toBeInTheDocument();
      expect(screen.getByText('47.6062')).toBeInTheDocument();
      expect(screen.getByText('-122.3321')).toBeInTheDocument();
    });

    it('allows manual coordinate entry', () => {
      render(<GeoFenceConfig value={mockValue} onChange={mockOnChange} />);

      expect(screen.getByLabelText(/Latitude/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Longitude/i)).toBeInTheDocument();
    });
  });
});
