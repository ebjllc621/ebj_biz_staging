'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';

/**
 * SaveSearchButton - Client Component for saving current search parameters
 * Reads current URL params (q, sort, page, tags) and POSTs to saved searches API
 * Shows aria-live status and triggers window event on success
 */
export default function SaveSearchButton() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const handleSaveSearch = async () => {
    try {
      setStatus('saving');

      // Extract current search parameters
      const currentParams: Record<string, string> = {};
      const q = searchParams.get('q');
      const sort = searchParams.get('sort');
      const page = searchParams.get('page');
      const tags = searchParams.get('tags');

      if (q) currentParams.q = q;
      if (sort) currentParams.sort = sort;
      if (page) currentParams.page = page;
      if (tags) currentParams.tags = tags;

      // Check if there are any search parameters to save
      if (Object.keys(currentParams).length === 0) {
        alert('No search parameters to save. Please perform a search first.');
        setStatus('idle');
        return;
      }

      // Prompt for optional name
      const name = window.prompt('Enter a name for this saved search (optional):');
      if (name === null) {
        // User cancelled
        setStatus('idle');
        return;
      }

      // Create request body
      const requestBody = {
        name: name?.trim() || null,
        params: currentParams
      };

      // POST to saved searches API
      // @governance MANDATORY - CSRF protection for POST requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf('/api/saved-searches', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (response.ok && result.ok) {
        setStatus('saved');
        
        // Trigger custom event for SavedSearchesPanel to refresh
        window.dispatchEvent(new CustomEvent('savedsearch:created', {
          detail: result.data
        }));

        // Reset status after 3 seconds
        setTimeout(() => {
          setStatus('idle');
        }, 3000);
      } else {
        setStatus('error');
        // Reset status after 5 seconds
        setTimeout(() => {
          setStatus('idle');
        }, 5000);
      }
    } catch (error) {
      setStatus('error');
      // Reset status after 5 seconds
      setTimeout(() => {
        setStatus('idle');
      }, 5000);
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'saving':
        return 'Saving search...';
      case 'saved':
        return 'Search saved successfully!';
      case 'error':
        return 'Failed to save search. Please try again.';
      default:
        return '';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSaveSearch}
        disabled={status === 'saving'}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Save current search parameters"
      >
        <svg 
          className="w-4 h-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" 
          />
        </svg>
        Save Search
      </button>
      
      {status !== 'idle' && (
        <div 
          aria-live="polite" 
          aria-atomic="true"
          className={`text-sm font-medium ${
            status === 'saving' 
              ? 'text-blue-600' 
              : status === 'saved' 
                ? 'text-green-600' 
                : 'text-red-600'
          }`}
        >
          {getStatusMessage()}
        </div>
      )}
    </div>
  );
}