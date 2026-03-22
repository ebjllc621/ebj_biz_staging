/**
 * SaveAsTemplateModal Component
 * BizModal for saving a connection group as a reusable template
 *
 * GOVERNANCE COMPLIANCE:
 * - STANDARD tier component with ErrorBoundary
 * - Uses BizModal for branded modal experience
 * - CSRF protection via fetchWithCsrf
 * - Client Component ('use client')
 *
 * @tier STANDARD
 * @phase Connection Groups Feature - Phase 4B
 * @generated ComponentBuilder
 */

'use client';

import React, { useState, useEffect } from 'react';
import BizModal from '@/components/BizModal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';
import { BookmarkPlus, Loader2, Globe, Lock } from 'lucide-react';
import type { GroupTemplate } from '@features/connections/types/groups';

export interface SaveAsTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: number;
  groupName: string;
  onSaved: (template: GroupTemplate) => void;
}

function SaveAsTemplateModalContent({
  isOpen,
  onClose,
  groupId,
  groupName,
  onSaved
}: SaveAsTemplateModalProps) {
  const [name, setName] = useState(groupName);
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(groupName);
      setIsPublic(false);
      setError(null);
    }
  }, [isOpen, groupName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a template name');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/users/connections/groups/${groupId}/template`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmed, isPublic })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to save template');
      }

      onSaved(result.data.template as GroupTemplate);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Save as Template"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
          <BookmarkPlus className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            Save <strong>{groupName}</strong> as a template to reuse its settings when creating future groups.
          </p>
        </div>

        <div>
          <label htmlFor="template-name" className="block text-sm font-medium text-gray-700 mb-1">
            Template Name
          </label>
          <input
            id="template-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter template name"
            disabled={isSubmitting}
            autoFocus
          />
        </div>

        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">Visibility</p>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="visibility"
                checked={!isPublic}
                onChange={() => setIsPublic(false)}
                disabled={isSubmitting}
                className="text-blue-600"
              />
              <Lock className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Private</p>
                <p className="text-xs text-gray-500">Only you can use this template</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="visibility"
                checked={isPublic}
                onChange={() => setIsPublic(true)}
                disabled={isSubmitting}
                className="text-blue-600"
              />
              <Globe className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Public</p>
                <p className="text-xs text-gray-500">Share with all users in the community</p>
              </div>
            </label>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <BookmarkPlus className="w-4 h-4" />
                Save Template
              </>
            )}
          </button>
        </div>
      </form>
    </BizModal>
  );
}

export function SaveAsTemplateModal(props: SaveAsTemplateModalProps) {
  return (
    <ErrorBoundary componentName="SaveAsTemplateModal">
      <SaveAsTemplateModalContent {...props} />
    </ErrorBoundary>
  );
}
