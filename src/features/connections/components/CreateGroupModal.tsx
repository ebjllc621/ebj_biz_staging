/**
 * CreateGroupModal Component
 * Modal for creating a new connection group
 *
 * GOVERNANCE COMPLIANCE:
 * - STANDARD tier component (100-300 lines)
 * - Uses BizModal for branded modal experience
 * - CSRF protection via fetchWithCsrf
 * - Client Component ('use client')
 *
 * @tier STANDARD
 * @phase Connection Groups Feature - Phase 1
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/3-5-26/phases/PHASE_1_BRAIN_PLAN.md
 * @reference src/features/connections/components/ConnectionRequestModal.tsx
 */

'use client';

import React, { useState } from 'react';
import BizModal from '@/components/BizModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';
import { Users, Palette, ShoppingBag } from 'lucide-react';
import type { CreateGroupInput, ConnectionGroup } from '../types/groups';

export interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (group: ConnectionGroup) => void;
}

const QUOTE_POOL_CATEGORIES = [
  'Home Services', 'Landscaping', 'Construction', 'Plumbing', 'Electrical',
  'HVAC', 'Roofing', 'Painting', 'Cleaning', 'Auto Services', 'IT Services',
  'Legal Services', 'Accounting', 'Marketing', 'Photography', 'Catering',
  'Events', 'Other'
];

const COLOR_OPTIONS = [
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Green' },
  { value: '#F59E0B', label: 'Orange' },
  { value: '#EF4444', label: 'Red' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#6366F1', label: 'Indigo' },
  { value: '#14B8A6', label: 'Teal' }
];

export function CreateGroupModal({
  isOpen,
  onClose,
  onGroupCreated
}: CreateGroupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [enableRecommendations, setEnableRecommendations] = useState(true);
  const [isQuotePool, setIsQuotePool] = useState(false);
  const [quotePoolCategory, setQuotePoolCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_NAME_LENGTH = 100;
  const MAX_DESCRIPTION_LENGTH = 500;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Group name is required');
      return;
    }

    if (name.length > MAX_NAME_LENGTH) {
      setError(`Group name must be ${MAX_NAME_LENGTH} characters or less`);
      return;
    }

    setIsLoading(true);

    try {
      const input: CreateGroupInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        icon: 'users',
        enableMemberRecommendations: enableRecommendations,
        isQuotePool,
        quotePoolCategory: isQuotePool && quotePoolCategory ? quotePoolCategory : undefined
      };

      const response = await fetchWithCsrf('/api/users/connections/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to create group');
      }

      // Success
      onGroupCreated(result.data.group);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setColor('#3B82F6');
    setEnableRecommendations(true);
    setIsQuotePool(false);
    setQuotePoolCategory('');
    setError(null);
    onClose();
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Connection Group"
      size="medium"
    >
      <ErrorBoundary
        componentName="CreateGroupModal"
        fallback={<div className="p-4 text-red-600">Error loading form. Please close and try again.</div>}
      >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Group Name */}
        <div>
          <label htmlFor="group-name" className="block text-sm font-medium text-gray-700 mb-1">
            Group Name *
          </label>
          <input
            type="text"
            id="group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            placeholder="e.g., Marketing Team, College Friends"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            {name.length}/{MAX_NAME_LENGTH} characters
          </p>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="group-description" className="block text-sm font-medium text-gray-700 mb-1">
            Description (optional)
          </label>
          <textarea
            id="group-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={MAX_DESCRIPTION_LENGTH}
            rows={3}
            placeholder="What's this group for?"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            {description.length}/{MAX_DESCRIPTION_LENGTH} characters
          </p>
        </div>

        {/* Color Picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Palette className="w-4 h-4 inline mr-1" />
            Group Color
          </label>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setColor(option.value)}
                className={`w-10 h-10 rounded-lg border-2 transition-all ${
                  color === option.value
                    ? 'border-gray-900 scale-110'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
                style={{ backgroundColor: option.value }}
                title={option.label}
                disabled={isLoading}
              />
            ))}
          </div>
        </div>

        {/* PYMK Recommendations */}
        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center h-5">
            <input
              type="checkbox"
              id="enable-recommendations"
              checked={enableRecommendations}
              onChange={(e) => setEnableRecommendations(e.target.checked)}
              disabled={isLoading}
              className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label
              htmlFor="enable-recommendations"
              className="text-sm font-medium text-gray-900 cursor-pointer"
            >
              Enable member recommendations
            </label>
            <p className="text-xs text-gray-600 mt-1">
              Suggest connections between group members who aren't connected yet
            </p>
          </div>
        </div>

        {/* Quote Pool Option */}
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                id="enable-quote-pool"
                checked={isQuotePool}
                onChange={(e) => setIsQuotePool(e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 text-orange-600 bg-white border-gray-300 rounded focus:ring-orange-500"
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="enable-quote-pool"
                className="text-sm font-medium text-gray-900 cursor-pointer flex items-center gap-1.5"
              >
                <ShoppingBag className="w-4 h-4 text-orange-600" />
                Make this a Quote Pool group
              </label>
              <p className="text-xs text-gray-600 mt-1">
                Members can submit and compare quotes for services. Great for getting competitive pricing from your network.
              </p>
            </div>
          </div>

          {isQuotePool && (
            <div className="ml-7">
              <label htmlFor="quote-pool-category" className="block text-sm font-medium text-gray-700 mb-1">
                Service Category (optional)
              </label>
              <select
                id="quote-pool-category"
                value={quotePoolCategory}
                onChange={(e) => setQuotePoolCategory(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              >
                <option value="">Select a category...</option>
                {QUOTE_POOL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={isLoading || !name.trim()}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Users className="w-4 h-4" />
                Create Group
              </>
            )}
          </button>
        </div>
      </form>
      </ErrorBoundary>
    </BizModal>
  );
}
