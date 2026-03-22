/**
 * EventCapacityBar - Component Tests
 *
 * @tier SIMPLE
 * @phase Phase 7
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 *
 * Tests progress bar rendering, color states, sold out display,
 * and null render when capacity is 0.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventCapacityBar } from '../EventCapacityBar';

describe('EventCapacityBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders progress bar with correct percentage', () => {
    // 200 total, 150 remaining = 50 filled = 25% filled
    render(
      <EventCapacityBar totalCapacity={200} remainingCapacity={150} showLabel />
    );

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute('aria-valuenow', '50');
    expect(progressbar).toHaveAttribute('aria-valuemax', '200');
  });

  it('shows green color when below 50% capacity', () => {
    // 200 total, 150 remaining = 50 filled = 25% → green
    const { container } = render(
      <EventCapacityBar totalCapacity={200} remainingCapacity={150} />
    );

    const bar = container.querySelector('.bg-green-500');
    expect(bar).toBeInTheDocument();
  });

  it('shows yellow when 50-80% capacity', () => {
    // 200 total, 60 remaining = 140 filled = 70% → yellow
    const { container } = render(
      <EventCapacityBar totalCapacity={200} remainingCapacity={60} />
    );

    const bar = container.querySelector('.bg-yellow-500');
    expect(bar).toBeInTheDocument();
  });

  it('shows red when above 80% capacity', () => {
    // 200 total, 20 remaining = 180 filled = 90% → red
    const { container } = render(
      <EventCapacityBar totalCapacity={200} remainingCapacity={20} />
    );

    const bar = container.querySelector('.bg-red-500');
    expect(bar).toBeInTheDocument();
  });

  it('shows "SOLD OUT" when remainingCapacity is 0', () => {
    render(
      <EventCapacityBar totalCapacity={200} remainingCapacity={0} showLabel />
    );

    expect(screen.getByText('SOLD OUT')).toBeInTheDocument();
  });

  it('renders nothing when totalCapacity is 0', () => {
    const { container } = render(
      <EventCapacityBar totalCapacity={0} remainingCapacity={0} />
    );

    expect(container.firstChild).toBeNull();
  });
});
