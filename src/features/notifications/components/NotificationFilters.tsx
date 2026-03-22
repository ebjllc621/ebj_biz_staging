/**
 * NotificationFilters - Filter tabs for notifications
 *
 * @authority docs/notificationService/phases/PHASE_5_BRAIN_PLAN.md
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/app/dashboard/connections/page.tsx - Tab pattern
 */

'use client';

import type { NotificationTypeKey } from '../types/notification-ui';
import { NOTIFICATION_TYPE_META } from '../types/notification-ui';

type FilterType = NotificationTypeKey | 'all';

interface NotificationFiltersProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  counts?: {
    all: number;
    connection_request: number;
    message: number;
    review: number;
    mention: number;
    system: number;
    recommendation: number;
  };
}

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'message', label: 'Messages' },
  { key: 'connection_request', label: 'Connections' },
  { key: 'review', label: 'Reviews' },
  { key: 'mention', label: 'Mentions' },
  { key: 'system', label: 'System' },
  { key: 'recommendation', label: 'Recommendations' }
];

export function NotificationFilters({
  activeFilter,
  onFilterChange,
  counts
}: NotificationFiltersProps) {
  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-4 overflow-x-auto">
        {FILTER_OPTIONS.map(({ key, label }) => {
          const isActive = activeFilter === key;
          const count = counts?.[key === 'all' ? 'all' : key];

          return (
            <button
              key={key}
              onClick={() => onFilterChange(key)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                isActive
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {label}
              {count !== undefined && count > 0 && (
                <span
                  className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    isActive
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default NotificationFilters;
