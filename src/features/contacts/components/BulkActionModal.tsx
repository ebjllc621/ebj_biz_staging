/**
 * BulkActionModal - Bulk action confirmation modal
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Contacts Phase E
 * @generated ComponentBuilder v3.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * Modal for confirming and configuring bulk actions
 * Handles tag input, category selection, priority selection
 *
 * @see docs/pages/layouts/home/user/user_dash/contacts/phases/PHASE_E_ADVANCED_FEATURES_BRAIN_PLAN.md
 * @reference src/components/BizModal.tsx - Modal pattern reference
 */
'use client';

import { useState } from 'react';
import { X, Tag, FolderOpen, AlertCircle, Star, Archive, Trash2, Share2 } from 'lucide-react';
import { BizModal } from '@/components/BizModal';
import type { BulkActionType, ContactCategory, ContactPriority } from '../types';

interface BulkActionModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Bulk action type */
  action: BulkActionType | null;
  /** Number of selected contacts */
  selectedCount: number;
  /** Callback to close modal */
  onClose: () => void;
  /** Callback to execute bulk action */
  onExecute: (action: BulkActionType, payload?: any) => void;
}

/**
 * Get action display information
 */
function getActionInfo(action: BulkActionType | null) {
  const actionMap: Record<BulkActionType, { icon: any; title: string; description: string }> = {
    add_tag: {
      icon: Tag,
      title: 'Add Tag',
      description: 'Add a tag to selected contacts'
    },
    remove_tag: {
      icon: Tag,
      title: 'Remove Tag',
      description: 'Remove a tag from selected contacts'
    },
    set_category: {
      icon: FolderOpen,
      title: 'Set Category',
      description: 'Assign category to selected contacts'
    },
    set_priority: {
      icon: AlertCircle,
      title: 'Set Priority',
      description: 'Assign priority level to selected contacts'
    },
    star: {
      icon: Star,
      title: 'Star Contacts',
      description: 'Mark selected contacts as starred'
    },
    unstar: {
      icon: Star,
      title: 'Unstar Contacts',
      description: 'Remove star from selected contacts'
    },
    archive: {
      icon: Archive,
      title: 'Archive Contacts',
      description: 'Move selected contacts to archive'
    },
    unarchive: {
      icon: Archive,
      title: 'Unarchive Contacts',
      description: 'Restore selected contacts from archive'
    },
    delete: {
      icon: Trash2,
      title: 'Delete Contacts',
      description: 'Permanently delete selected manual contacts'
    },
    export: {
      icon: FolderOpen,
      title: 'Export Contacts',
      description: 'Export selected contacts to file'
    },
    refer: {
      icon: Share2,
      title: 'Refer Contacts',
      description: 'Send individual referral invitations to each selected contact'
    }
  };

  return action ? actionMap[action] : null;
}

/**
 * BulkActionModal component
 */
export function BulkActionModal({
  isOpen,
  action,
  selectedCount,
  onClose,
  onExecute
}: BulkActionModalProps) {
  const [tagInput, setTagInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ContactCategory>('client');
  const [selectedPriority, setSelectedPriority] = useState<ContactPriority>('medium');

  const actionInfo = getActionInfo(action);

  if (!actionInfo) {
    return null;
  }

  const Icon = actionInfo.icon;

  const handleExecute = () => {
    let payload: any = undefined;

    switch (action) {
      case 'add_tag':
      case 'remove_tag':
        if (!tagInput.trim()) {
          alert('Please enter a tag');
          return;
        }
        payload = { tag: tagInput.trim() };
        break;

      case 'set_category':
        payload = { category: selectedCategory };
        break;

      case 'set_priority':
        payload = { priority: selectedPriority };
        break;
    }

    onExecute(action!, payload);
    onClose();

    // Reset form
    setTagInput('');
    setSelectedCategory('client');
    setSelectedPriority('medium');
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={actionInfo.title}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-md">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <Icon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{actionInfo.title}</h3>
            <p className="text-sm text-gray-600">{actionInfo.description}</p>
          </div>
        </div>

        {/* Selection count */}
        <div className="text-sm text-gray-700">
          This action will affect <strong>{selectedCount}</strong> {selectedCount === 1 ? 'contact' : 'contacts'}.
        </div>

        {/* Action-specific inputs */}
        {(action === 'add_tag' || action === 'remove_tag') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tag Name
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Enter tag name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {action === 'set_category' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as ContactCategory)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="client">Client</option>
              <option value="partner">Partner</option>
              <option value="lead">Lead</option>
              <option value="friend">Friend</option>
              <option value="other">Other</option>
            </select>
          </div>
        )}

        {action === 'set_priority' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value as ContactPriority)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        )}

        {action === 'refer' && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
            <p className="text-sm text-orange-700">
              Each contact will receive an individual referral invitation to join Bizconekt. You&apos;ll earn <strong>5 points</strong> per referral sent, with additional points as they register and connect. Contacts without an email will be skipped.
            </p>
          </div>
        )}

        {action === 'delete' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">
              <strong>Warning:</strong> This action cannot be undone. Only manual contacts can be deleted.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExecute}
            className={`
              px-4 py-2 text-sm text-white rounded-md transition-colors
              ${action === 'delete' ? 'bg-red-600 hover:bg-red-700' : action === 'refer' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}
            `}
          >
            {action === 'delete' ? 'Delete' : action === 'refer' ? 'Send Referrals' : 'Apply'}
          </button>
        </div>
      </div>
    </BizModal>
  );
}

export default BulkActionModal;
