/**
 * BatchRequestManager - Floating action bar for batch request operations
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Connect Phase 5
 * @generated ComponentBuilder v3.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * Floating action bar that appears when requests are selected
 * Provides batch accept and decline operations with loading states
 * Uses fetchWithCsrf for mutations
 *
 * @see docs/pages/layouts/home/user/phases/troubleshooting/connect/fixes/connectP2/phases/PHASE_5_ADVANCED_FEATURES_BRAIN_PLAN.md
 */
'use client';

import { useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { fetchWithCsrf } from '@core/utils/csrf';

interface BatchRequestManagerProps {
  /** Array of selected request IDs */
  selectedIds: number[];
  /** Callback to clear selection */
  onClearSelection: () => void;
  /** Callback when batch operation completes */
  onBatchComplete: (successful: number, failed: number) => void;
}

/**
 * BatchRequestManager component
 * Floating bar at bottom of screen when requests are selected
 */
export function BatchRequestManager({
  selectedIds,
  onClearSelection,
  onBatchComplete
}: BatchRequestManagerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCount = selectedIds.length;

  const handleBatchAction = async (action: 'accept' | 'decline') => {
    setError(null);
    setLoading(true);

    try {
      const response = await fetchWithCsrf('/api/users/connections/requests/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          request_ids: selectedIds
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} requests`);
      }

      const data = await response.json();
      const { successful, failed } = data.result || data;

      // Notify parent of completion
      onBatchComplete(successful, failed);

      // Clear selection
      onClearSelection();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Don't render if no selection
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
              disabled={loading}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
              aria-label="Clear selection"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-900">
              {selectedCount} {selectedCount === 1 ? 'request' : 'requests'} selected
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {error && (
              <span className="text-sm text-red-600">{error}</span>
            )}

            <button
              onClick={() => handleBatchAction('accept')}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Accept All</span>
            </button>

            <button
              onClick={() => handleBatchAction('decline')}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
              <span>Decline All</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BatchRequestManager;
