/**
 * GroupTemplateCard Component
 * Card display for a group template with use and delete actions
 *
 * GOVERNANCE COMPLIANCE:
 * - SIMPLE tier component
 * - Client Component ('use client')
 * - CSRF protection via fetchWithCsrf for mutations
 *
 * @tier SIMPLE
 * @phase Connection Groups Feature - Phase 4B
 * @generated ComponentBuilder
 */

'use client';

import React, { useState } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import { Users, ShoppingBag, Globe, Lock, Trash2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import type { GroupTemplate, ConnectionGroup } from '@features/connections/types/groups';

export interface GroupTemplateCardProps {
  template: GroupTemplate;
  onUseTemplate: (group: ConnectionGroup) => void;
  onDelete?: (templateId: number) => void;
  showDelete?: boolean;
}

export function GroupTemplateCard({
  template,
  onUseTemplate,
  onDelete,
  showDelete = false
}: GroupTemplateCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newGroupName, setNewGroupName] = useState(template.name);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUseTemplate = async () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) {
      setError('Please enter a group name');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/users/connections/groups/templates/${template.id}/create`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmed })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to create group');
      }

      onUseTemplate(result.data.group as ConnectionGroup);
      setIsExpanded(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group from template');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this template?')) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/users/connections/groups/templates/${template.id}`,
        { method: 'DELETE' }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to delete template');
      }

      onDelete?.(template.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm transition-shadow">
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Color indicator */}
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0"
            style={{ backgroundColor: template.color }}
          >
            <Users className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium text-gray-900 truncate">{template.name}</h3>
              {template.isPublic ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                  <Globe className="w-3 h-3" />
                  Public
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  <Lock className="w-3 h-3" />
                  Private
                </span>
              )}
              {template.isQuotePool && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">
                  <ShoppingBag className="w-3 h-3" />
                  Quote Pool
                </span>
              )}
            </div>

            {template.description && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{template.description}</p>
            )}

            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              {template.usageCount > 0 && (
                <span>Used {template.usageCount} {template.usageCount === 1 ? 'time' : 'times'}</span>
              )}
              {template.creatorUsername && template.isPublic && (
                <span>by @{template.creatorUsername}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {showDelete && onDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                title="Delete template"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Use
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Inline name input when expanded */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
            <label className="block text-xs font-medium text-gray-600">
              Name for the new group
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                maxLength={100}
                placeholder="Enter group name"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isCreating}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleUseTemplate();
                  if (e.key === 'Escape') setIsExpanded(false);
                }}
              />
              <button
                onClick={() => void handleUseTemplate()}
                disabled={isCreating || !newGroupName.trim()}
                className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
