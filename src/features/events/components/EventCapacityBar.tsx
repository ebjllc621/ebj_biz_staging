/**
 * EventCapacityBar - Visual progress bar showing RSVP count vs total capacity
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 2 - RSVP & Engagement UI
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

interface EventCapacityBarProps {
  totalCapacity: number;
  remainingCapacity: number;
  className?: string;
  showLabel?: boolean;
}

export function EventCapacityBar({
  totalCapacity,
  remainingCapacity,
  className = '',
  showLabel = false
}: EventCapacityBarProps) {
  // Render nothing if no capacity set
  if (!totalCapacity || totalCapacity <= 0) {
    return null;
  }

  const filled = totalCapacity - remainingCapacity;
  const filledPercent = Math.min(100, Math.max(0, (filled / totalCapacity) * 100));
  const isSoldOut = remainingCapacity <= 0;

  // Color code based on fill percentage
  let barColor = 'bg-green-500';
  if (filledPercent > 80) {
    barColor = 'bg-red-500';
  } else if (filledPercent >= 50) {
    barColor = 'bg-yellow-500';
  }

  const label = isSoldOut
    ? 'SOLD OUT'
    : `${remainingCapacity} of ${totalCapacity} spots available`;

  return (
    <div className={`${className}`}>
      {/* Progress bar track */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${filledPercent}%` }}
          role="progressbar"
          aria-valuenow={filled}
          aria-valuemin={0}
          aria-valuemax={totalCapacity}
          aria-label={label}
        />
      </div>

      {/* Label */}
      {showLabel && (
        <p className={`mt-1 text-xs font-medium ${isSoldOut ? 'text-red-600' : 'text-gray-600'}`}>
          {label}
        </p>
      )}
    </div>
  );
}

export default EventCapacityBar;
