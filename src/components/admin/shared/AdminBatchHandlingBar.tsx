/**
 * AdminBatchHandlingBar - Floating action bar for batch admin operations
 *
 * @authority docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 * @tier STANDARD
 *
 * GOVERNANCE:
 * - Fixed bottom position
 * - Responsive mobile/desktop layout
 * - Exact color specifications from Listings Manager
 *
 * Features:
 * - Selection count with clear button
 * - Configurable batch action buttons
 * - Mobile adaptation (icon-only)
 * - Touch-friendly targets (min 44px)
 */

'use client';

import { memo, ReactNode } from 'react';
import { X, CheckCircle, PauseCircle, Trash2 } from 'lucide-react';

export interface BatchAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  variant: 'approve' | 'suspend' | 'delete' | 'primary' | 'secondary';
}

export interface AdminBatchHandlingBarProps {
  selectedCount: number;
  entityName?: string;  // e.g., "listing", "job", "event"
  isMobile?: boolean;
  actions: BatchAction[];
  onClearSelection: () => void;
}

const variantStyles: Record<string, string> = {
  approve: 'bg-green-50 hover:bg-green-100 text-green-700',
  suspend: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700',
  delete: 'bg-red-50 hover:bg-red-100 text-red-600',
  primary: 'bg-orange-50 hover:bg-orange-100 text-orange-700',
  secondary: 'bg-gray-50 hover:bg-gray-100 text-gray-700'
};

export const AdminBatchHandlingBar = memo(function AdminBatchHandlingBar({
  selectedCount,
  entityName = 'item',
  isMobile = false,
  actions,
  onClearSelection
}: AdminBatchHandlingBarProps) {
  if (selectedCount === 0) return null;

  const entityPlural = selectedCount === 1 ? entityName : `${entityName}s`;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 transition-transform">
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${isMobile ? 'py-3' : 'py-4'}`}>
        <div className={`flex items-center ${isMobile ? 'justify-center gap-4' : 'justify-between'}`}>
          {/* Selection count with clear button */}
          <div className="flex items-center gap-4">
            <button
              onClick={onClearSelection}
              className="min-w-[44px] min-h-[44px] p-2.5 flex items-center justify-center rounded-md hover:bg-gray-100 active:scale-95 transition-all"
              aria-label="Clear selection"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-900">
              {isMobile ? selectedCount : `${selectedCount} ${entityPlural} selected`}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={`${
                  isMobile
                    ? 'min-w-[44px] min-h-[44px] p-2.5 flex items-center justify-center'
                    : 'flex items-center gap-2 px-3 py-2'
                } rounded-md ${variantStyles[action.variant]} active:scale-95 transition-all text-sm`}
                aria-label={isMobile ? action.label : undefined}
              >
                {action.icon}
                {!isMobile && <span>{action.label}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * Pre-configured batch actions for common operations
 * Use these for consistency across admin pages
 */
export const createStandardBatchActions = (handlers: {
  onApprove?: () => void;
  onSuspend?: () => void;
  onDelete?: () => void;
}): BatchAction[] => {
  const actions: BatchAction[] = [];

  if (handlers.onApprove) {
    actions.push({
      label: 'Approve',
      icon: <CheckCircle className="w-4 h-4" />,
      onClick: handlers.onApprove,
      variant: 'approve'
    });
  }

  if (handlers.onSuspend) {
    actions.push({
      label: 'Suspend',
      icon: <PauseCircle className="w-4 h-4" />,
      onClick: handlers.onSuspend,
      variant: 'suspend'
    });
  }

  if (handlers.onDelete) {
    actions.push({
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: handlers.onDelete,
      variant: 'delete'
    });
  }

  return actions;
};

export default AdminBatchHandlingBar;
