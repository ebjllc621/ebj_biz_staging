/**
 * AdminStatsPanel - Statistics panel for admin manager pages
 *
 * @authority docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 * @tier STANDARD
 *
 * Features:
 * - 3-column grid layout
 * - Configurable stat sections
 * - Skeleton loading state
 * - Consistent styling
 */

'use client';

import { memo, ReactNode } from 'react';

export interface StatItem {
  label: string;
  value: string | number;
  /** Optional: Make the value bold */
  bold?: boolean;
}

export interface StatSection {
  title?: string;
  items: StatItem[];
}

export interface AdminStatsPanelProps {
  /** Title for the panel (default: "[Entity] Statistics") */
  title?: string;
  /** Stat sections (max 3 columns) */
  sections: StatSection[];
  /** Loading state */
  loading?: boolean;
  /** Custom loading skeleton */
  loadingSkeleton?: ReactNode;
}

/**
 * Default skeleton for 3-column stats panel
 */
function DefaultSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-5 w-32 bg-gray-200 rounded mb-3"></div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-4 w-20 bg-gray-200 rounded"></div>
            <div className="h-4 w-8 bg-gray-200 rounded"></div>
          </div>
          <div className="flex justify-between">
            <div className="h-4 w-20 bg-gray-200 rounded"></div>
            <div className="h-4 w-8 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="border-l pl-4 space-y-2">
          <div className="h-4 w-16 bg-gray-200 rounded"></div>
          <div className="flex justify-between">
            <div className="h-3 w-12 bg-gray-200 rounded"></div>
            <div className="h-3 w-8 bg-gray-200 rounded"></div>
          </div>
          <div className="flex justify-between">
            <div className="h-3 w-12 bg-gray-200 rounded"></div>
            <div className="h-3 w-8 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="border-l pl-4 space-y-2">
          <div className="h-4 w-16 bg-gray-200 rounded"></div>
          <div className="flex justify-between">
            <div className="h-3 w-12 bg-gray-200 rounded"></div>
            <div className="h-3 w-8 bg-gray-200 rounded"></div>
          </div>
          <div className="flex justify-between">
            <div className="h-3 w-12 bg-gray-200 rounded"></div>
            <div className="h-3 w-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const AdminStatsPanel = memo(function AdminStatsPanel({
  title = 'Statistics',
  sections,
  loading = false,
  loadingSkeleton
}: AdminStatsPanelProps) {
  if (loading) {
    return (
      <div className="bg-white p-4 rounded shadow mb-6">
        {loadingSkeleton || <DefaultSkeleton />}
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded shadow mb-6">
      <h3 className="font-medium mb-3">{title}</h3>
      <div className="grid grid-cols-3 gap-4">
        {sections.map((section, sectionIndex) => (
          <div
            key={sectionIndex}
            className={sectionIndex > 0 ? 'border-l pl-4' : ''}
          >
            {section.title && (
              <div className="text-sm font-medium mb-1">{section.title}</div>
            )}
            <div className="space-y-1 text-sm">
              {section.items.map((item, itemIndex) => (
                <div key={itemIndex} className="flex justify-between">
                  <span>{item.label}:</span>
                  <span className={item.bold ? 'font-bold' : 'font-medium'}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default AdminStatsPanel;
