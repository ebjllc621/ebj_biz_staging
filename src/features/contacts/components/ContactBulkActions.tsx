/**
 * ContactBulkActions - Floating bulk action bar
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Contacts Phase E
 * @generated ComponentBuilder v3.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * Floating action bar that appears when contacts are selected
 * Provides bulk actions: tag, category, priority, star, archive, delete
 *
 * @see docs/pages/layouts/home/user/user_dash/contacts/phases/PHASE_E_ADVANCED_FEATURES_BRAIN_PLAN.md
 */
'use client';

import { Tag, FolderOpen, AlertCircle, Star, Archive, Trash2, X, Share2 } from 'lucide-react';
import type { BulkActionType } from '../types';

interface ContactBulkActionsProps {
  /** Number of selected contacts */
  selectedCount: number;
  /** Callback to open bulk action modal */
  onAction: (action: BulkActionType) => void;
  /** Callback to clear selection */
  onClearSelection: () => void;
}

/**
 * ContactBulkActions component
 * Floating bar at bottom of screen when contacts are selected
 */
export function ContactBulkActions({
  selectedCount,
  onAction,
  onClearSelection
}: ContactBulkActionsProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Selection count */}
          <div className="flex items-center gap-4">
            <button
              onClick={onClearSelection}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Clear selection"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-900">
              {selectedCount} {selectedCount === 1 ? 'contact' : 'contacts'} selected
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAction('add_tag')}
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors text-sm"
            >
              <Tag className="w-4 h-4" />
              <span>Add Tag</span>
            </button>

            <button
              onClick={() => onAction('set_category')}
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors text-sm"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Set Category</span>
            </button>

            <button
              onClick={() => onAction('set_priority')}
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors text-sm"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Set Priority</span>
            </button>

            <button
              onClick={() => onAction('star')}
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors text-sm"
            >
              <Star className="w-4 h-4" />
              <span>Star</span>
            </button>

            <button
              onClick={() => onAction('refer')}
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-orange-50 hover:bg-orange-100 text-orange-700 transition-colors text-sm"
            >
              <Share2 className="w-4 h-4" />
              <span>Refer</span>
            </button>

            <button
              onClick={() => onAction('archive')}
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors text-sm"
            >
              <Archive className="w-4 h-4" />
              <span>Archive</span>
            </button>

            <button
              onClick={() => onAction('delete')}
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-red-50 hover:bg-red-100 text-red-600 transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactBulkActions;
