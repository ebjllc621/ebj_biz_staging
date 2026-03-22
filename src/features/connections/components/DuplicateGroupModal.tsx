/**
 * DuplicateGroupModal Component
 * BizModal for duplicating a connection group
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
import { Copy, Loader2 } from 'lucide-react';
import type { ConnectionGroup } from '@features/connections/types/groups';

export interface DuplicateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: number;
  groupName: string;
  onDuplicated: (group: ConnectionGroup) => void;
}

function DuplicateGroupModalContent({
  isOpen,
  onClose,
  groupId,
  groupName,
  onDuplicated
}: DuplicateGroupModalProps) {
  const [name, setName] = useState(`${groupName} (Copy)`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset name when modal opens with new group
  useEffect(() => {
    if (isOpen) {
      setName(`${groupName} (Copy)`);
      setError(null);
    }
  }, [isOpen, groupName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a group name');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(
        `/api/users/connections/groups/${groupId}/duplicate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmed })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to duplicate group');
      }

      onDuplicated(result.data.group as ConnectionGroup);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate group');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Duplicate Group"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
          <Copy className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            A copy of <strong>{groupName}</strong> will be created with the same settings. Members are not copied.
          </p>
        </div>

        <div>
          <label htmlFor="duplicate-name" className="block text-sm font-medium text-gray-700 mb-1">
            New Group Name
          </label>
          <input
            id="duplicate-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter group name"
            disabled={isSubmitting}
            autoFocus
          />
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
                Duplicating...
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Duplicate Group
              </>
            )}
          </button>
        </div>
      </form>
    </BizModal>
  );
}

export function DuplicateGroupModal(props: DuplicateGroupModalProps) {
  return (
    <ErrorBoundary componentName="DuplicateGroupModal">
      <DuplicateGroupModalContent {...props} />
    </ErrorBoundary>
  );
}
