/**
 * SmartListBuilder - Smart list creation/editing modal
 *
 * @component Client Component
 * @tier ADVANCED (ErrorBoundary Required)
 * @phase Contacts Phase E
 * @generated ComponentBuilder v3.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * Advanced modal for creating and editing smart lists
 * Visual criteria builder with live contact count preview
 *
 * @see docs/pages/layouts/home/user/user_dash/contacts/phases/PHASE_E_ADVANCED_FEATURES_BRAIN_PLAN.md
 * @reference src/components/BizModal.tsx - Modal pattern reference
 */
'use client';

import { useState, useEffect } from 'react';
import { BizModal } from '@/components/BizModal';
import type { SmartListCriteria, CreateSmartListInput, ContactCategory, ContactPriority, ContactSource } from '../types';
import { List, AlertCircle, Clock, UserPlus, UserX, Star } from 'lucide-react';

interface SmartListBuilderProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback to close modal */
  onClose: () => void;
  /** Callback when smart list is created */
  onSave: (input: CreateSmartListInput) => void;
}

/**
 * SmartListBuilder component
 * ADVANCED tier - requires ErrorBoundary wrapper
 */
export function SmartListBuilder({
  isOpen,
  onClose,
  onSave
}: SmartListBuilderProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('List');
  const [color, setColor] = useState('blue');
  const [criteria, setCriteria] = useState<SmartListCriteria>({});
  const [contactCount, setContactCount] = useState(0);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setIcon('List');
      setColor('blue');
      setCriteria({});
      setContactCount(0);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a list name');
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      criteria,
      icon,
      color
    });

    onClose();
  };

  const updateCriteria = (key: keyof SmartListCriteria, value: any) => {
    setCriteria(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const iconOptions = [
    { value: 'List', label: 'List', Icon: List },
    { value: 'AlertCircle', label: 'Alert', Icon: AlertCircle },
    { value: 'Clock', label: 'Clock', Icon: Clock },
    { value: 'UserPlus', label: 'User Plus', Icon: UserPlus },
    { value: 'UserX', label: 'User X', Icon: UserX },
    { value: 'Star', label: 'Star', Icon: Star }
  ];

  const colorOptions = [
    { value: 'red', label: 'Red' },
    { value: 'orange', label: 'Orange' },
    { value: 'yellow', label: 'Yellow' },
    { value: 'green', label: 'Green' },
    { value: 'blue', label: 'Blue' },
    { value: 'purple', label: 'Purple' },
    { value: 'gray', label: 'Gray' }
  ];

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Smart List"
    >
      <div className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              List Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. High Priority Leads"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icon
              </label>
              <select
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {iconOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {colorOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Criteria Builder */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="font-semibold text-gray-900 mb-4">Filter Criteria</h4>

          <div className="space-y-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={criteria.category || ''}
                onChange={(e) => updateCriteria('category', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any</option>
                <option value="client">Client</option>
                <option value="partner">Partner</option>
                <option value="lead">Lead</option>
                <option value="friend">Friend</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Starred */}
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={criteria.isStarred || false}
                onChange={(e) => updateCriteria('isStarred', e.target.checked || undefined)}
                className="mr-2"
              />
              <label className="text-sm text-gray-700">Only starred contacts</label>
            </div>

            {/* Has Reminder */}
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={criteria.hasReminder || false}
                onChange={(e) => updateCriteria('hasReminder', e.target.checked || undefined)}
                className="mr-2"
              />
              <label className="text-sm text-gray-700">Has follow-up reminder</label>
            </div>

            {/* No Interaction Days */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                No contact in last (days)
              </label>
              <input
                type="number"
                value={criteria.noInteractionDays || ''}
                onChange={(e) => updateCriteria('noInteractionDays', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="e.g. 30"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Connection Date Within */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Connected within last (days)
              </label>
              <input
                type="number"
                value={criteria.connectionDateWithin || ''}
                onChange={(e) => updateCriteria('connectionDateWithin', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="e.g. 7"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            Create List
          </button>
        </div>
      </div>
    </BizModal>
  );
}

export default SmartListBuilder;
