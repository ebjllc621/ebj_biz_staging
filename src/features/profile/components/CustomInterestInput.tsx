/**
 * CustomInterestInput - Input component for adding custom interests
 *
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @authority docs/pages/layouts/userProfile/phases/PHASE_3B_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component ('use client' directive)
 * - Lucide React icons only
 * - Tailwind CSS styling
 * - API calls with credentials: 'include'
 * - BizError-based error handling
 */

'use client';

import { useState, KeyboardEvent } from 'react';
import { Plus } from 'lucide-react';
import { fetchCsrfToken } from '@core/utils/csrf';
import type { CustomInterest } from '../types/user-interests';

export interface CustomInterestInputProps {
  /** Current custom interests (for validation) */
  interests: CustomInterest[];
  /** Callback when interest is successfully added */
  onInterestAdd: (_interest: CustomInterest) => void;
  /** Whether the input is disabled during operations */
  disabled?: boolean;
  /** Maximum number of custom interests allowed */
  maxInterests?: number;
  /** Input placeholder text */
  placeholder?: string;
  /** Target user's username for API calls (admin editing support) */
  username: string;
}

export function CustomInterestInput({
  interests,
  onInterestAdd,
  disabled = false,
  maxInterests = 20,
  placeholder = 'Type a custom interest...',
  username
}: CustomInterestInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddInterest = async () => {
    const value = inputValue.trim();

    // Validation
    if (!value) {
      setError('Interest value is required');
      return;
    }

    if (value.length > 100) {
      setError('Interest must be 100 characters or less');
      return;
    }

    if (interests.length >= maxInterests) {
      setError(`Maximum ${maxInterests} custom interests allowed`);
      return;
    }

    // Check for duplicate (case-insensitive)
    const isDuplicate = interests.some(
      i => i.custom_value.toLowerCase() === value.toLowerCase()
    );

    if (isDuplicate) {
      setError('This custom interest already exists');
      return;
    }

    setIsAdding(true);
    setError(null);

    try {
      const csrfToken = await fetchCsrfToken();

      if (!csrfToken) {
        throw new Error('CSRF token not available');
      }

      // Uses username-based endpoint to support admin editing other users
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/interests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({
          custom_value: value
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to add custom interest');
      }

      const result = await response.json();
      if (result.success && result.data.interest) {
        onInterestAdd(result.data.interest);
        setInputValue('');
        setError(null);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Add custom interest error:', err);
      setError(err instanceof Error ? err.message : 'Failed to add custom interest');
    } finally {
      setIsAdding(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddInterest();
    }
  };

  const isMaxReached = interests.length >= maxInterests;

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setError(null);
          }}
          onKeyPress={handleKeyPress}
          placeholder={isMaxReached ? `Maximum ${maxInterests} reached` : placeholder}
          disabled={disabled || isAdding || isMaxReached}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#ed6437] focus:ring-2 focus:ring-orange-200 transition shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onClick={handleAddInterest}
          disabled={!inputValue.trim() || disabled || isAdding || isMaxReached}
          className="px-4 py-2 bg-[#022641] text-white rounded-lg hover:bg-[#033a5c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          aria-label="Add custom interest"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}

export default CustomInterestInput;
