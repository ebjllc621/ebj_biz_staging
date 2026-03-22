/**
 * QuotePoolToggle Component
 * Toggle to enable/disable quote pool on a group with category input
 *
 * GOVERNANCE COMPLIANCE:
 * - SIMPLE tier component (< 300 lines)
 * - CSRF protection via fetchWithCsrf
 * - Client Component ('use client')
 *
 * @tier SIMPLE
 * @phase Connection Groups Feature - Phase 3B
 * @generated ComponentBuilder
 */

'use client';

import React, { useState } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import { ShoppingBag } from 'lucide-react';
import type { ConnectionGroup } from '../types/groups';

export interface QuotePoolToggleProps {
  group: ConnectionGroup;
  onUpdate: (group: ConnectionGroup) => void;
}

const QUOTE_POOL_CATEGORIES = [
  'Home Services',
  'Landscaping',
  'Construction',
  'Plumbing',
  'Electrical',
  'HVAC',
  'Roofing',
  'Painting',
  'Cleaning',
  'Auto Services',
  'IT Services',
  'Legal Services',
  'Accounting',
  'Marketing',
  'Photography',
  'Catering',
  'Events',
  'Other'
];

export function QuotePoolToggle({ group, onUpdate }: QuotePoolToggleProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState(group.quotePoolCategory || '');

  const handleToggle = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetchWithCsrf(
        `/api/users/connections/groups/${group.id}/quote-pool`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isQuotePool: !group.isQuotePool,
            quotePoolCategory: category || undefined
          })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to update quote pool setting');
      }

      onUpdate(result.data.group as ConnectionGroup);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update setting');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryChange = async (newCategory: string) => {
    setCategory(newCategory);

    if (!group.isQuotePool) return;

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetchWithCsrf(
        `/api/users/connections/groups/${group.id}/quote-pool`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isQuotePool: true,
            quotePoolCategory: newCategory || undefined
          })
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to update category');
      }

      onUpdate(result.data.group as ConnectionGroup);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start gap-3">
        <div className="flex items-center h-5 mt-0.5">
          <input
            type="checkbox"
            id="quote-pool-toggle"
            checked={group.isQuotePool}
            onChange={handleToggle}
            disabled={isLoading}
            className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
          />
        </div>
        <div className="flex-1">
          <label
            htmlFor="quote-pool-toggle"
            className="flex items-center gap-2 text-sm font-medium text-gray-900 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-blue-600" />
            Enable Quote Pool
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Allow members to receive and submit quotes as a group. Members with active listings
            will receive quote requests directly.
          </p>

          {group.isQuotePool && (
            <div className="mt-3">
              <label
                htmlFor="quote-pool-category"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                Service Category (optional)
              </label>
              <select
                id="quote-pool-category"
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">-- Select a category --</option>
                {QUOTE_POOL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5" />
        )}
      </div>

      {error && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {group.isQuotePool && (
        <div className="mt-3 p-2 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700">
            Quote pool is active
            {group.quotePoolCategory ? ` - ${group.quotePoolCategory}` : ''}.
            Members can now receive quote requests through this group.
          </p>
        </div>
      )}
    </div>
  );
}
