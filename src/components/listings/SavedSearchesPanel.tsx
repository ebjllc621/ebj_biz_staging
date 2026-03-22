'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithCsrf } from '@core/utils/csrf';

interface SavedSearch {
  id: string;
  name: string | null;
  params: Record<string, string>;
  createdAt: string;
}

/**
 * SavedSearchesPanel - Client Component for managing saved searches
 * Fetches, displays, applies, and deletes saved searches
 * Listens for save events and refreshes automatically
 */
export default function SavedSearchesPanel() {
  const [items, setItems] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch saved searches from API
  const fetchSavedSearches = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/saved-searches', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (response.ok && result.ok) {
        setItems(result.data?.items || []);
      } else {
        setError(result.error?.message || 'Failed to load saved searches');
      }
    } catch (err) {
      setError('Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Delete saved search with optimistic UI update
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this saved search?')) {
      return;
    }

    // Optimistic update - remove from UI immediately
    const originalItems = items;
    setItems(items.filter(item => item.id !== id));

    // @governance MANDATORY - CSRF protection for DELETE requests
    // Source: osi-production-compliance.mdc, Layer 7 Security
    try {
      const response = await fetchWithCsrf(`/api/saved-searches/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        // Revert optimistic update on failure
        setItems(originalItems);
        setError(result.error?.message || 'Failed to delete saved search');
      }
    } catch (err) {
      // Revert optimistic update on failure
      setItems(originalItems);
      setError('Unable to delete saved search');
    }
  };

  // Apply saved search by navigating to listings with params
  const handleApply = (params: Record<string, string>) => {
    const queryParams = new URLSearchParams();
    
    // Add each parameter to the query string
    Object.entries(params).forEach(([key, value]) => {
      if (value && value.trim()) {
        queryParams.set(key, value);
      }
    });

    // Navigate to listings page with parameters
    const searchString = queryParams.toString();
    if (searchString) {
      router.push(`/listings?${searchString}`);
    } else {
      router.push('/listings');
    }
  };

  // Generate display label for saved search
  const getDisplayLabel = (item: SavedSearch): string => {
    if (item.name?.trim()) {
      return item.name;
    }

    // Generate label from parameters
    const parts: string[] = [];
    if (item.params.q) parts.push(`"${item.params.q}"`);
    if (item.params.tags) parts.push(`tags: ${item.params.tags}`);
    if (item.params.sort) parts.push(`sorted by ${item.params.sort}`);

    return parts.length > 0 ? parts.join(', ') : 'Untitled search';
  };

  // Format creation date
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Unknown date';
    }
  };

  // Listen for new saved search events
  useEffect(() => {
    const handleSavedSearchCreated = () => {
      fetchSavedSearches();
    };

    window.addEventListener('savedsearch:created', handleSavedSearchCreated);
    
    return () => {
      window.removeEventListener('savedsearch:created', handleSavedSearchCreated);
    };
  }, []);

  // Initial load
  useEffect(() => {
    fetchSavedSearches();
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Saved Searches</h3>
        <div className="text-sm text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-3">Saved Searches</h3>
      
      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-2 underline hover:no-underline"
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-gray-600">
          No saved searches yet. Use the "Save Search" button to save your current search.
        </p>
      ) : (
        <ul role="list" className="space-y-3">
          {items.map((item) => (
            <li 
              key={item.id}
              className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {getDisplayLabel(item)}
                </h4>
                <p className="text-xs text-gray-500">
                  Saved {formatDate(item.createdAt)}
                </p>
              </div>
              
              <div className="flex items-center gap-2 ml-3">
                <button
                  onClick={() => handleApply(item.params)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-200 rounded hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={`Apply search: ${getDisplayLabel(item)}`}
                >
                  <svg 
                    className="w-3 h-3" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                    />
                  </svg>
                  Apply
                </button>
                
                <button
                  onClick={() => handleDelete(item.id)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-100 border border-red-200 rounded hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  aria-label={`Delete search: ${getDisplayLabel(item)}`}
                >
                  <svg 
                    className="w-3 h-3" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                    />
                  </svg>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}