/**
 * AdminSearchBar - Generic search bar with mode detection and history
 *
 * @authority docs/components/admin/ADMIN_TABLE_CANONICAL_STANDARD.md
 * @tier STANDARD
 *
 * Features:
 * - Debounced input (300ms)
 * - Search mode detection (ID, owner, name)
 * - Mode badges with color coding
 * - Search history dropdown
 * - Clear button
 * - Loading spinner during debounce
 */

'use client';

import { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
import { Search, X, Clock } from 'lucide-react';

export type SearchMode = 'all' | 'id' | 'owner' | 'name' | 'email' | 'title';

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
  mode?: SearchMode;
}

export interface AdminSearchBarProps {
  /** Placeholder text */
  placeholder?: string;
  /** Called when search is executed (after debounce or Enter) */
  onSearch: (query: string, mode: SearchMode) => void;
  /** Search history items */
  searchHistory?: SearchHistoryItem[];
  /** Called when a history item is clicked */
  onHistoryItemClick?: (query: string) => void;
  /** Called when clear history is clicked */
  onClearHistory?: () => void;
  /** Custom mode detection function */
  detectMode?: (query: string) => SearchMode;
  /** Show loading spinner */
  isDebouncing?: boolean;
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
  /** Width class (default: "max-w-[50%]") */
  widthClass?: string;
}

/**
 * Default mode detection for admin search
 * Detects #ID, owner:, and name searches
 */
function defaultDetectMode(query: string): SearchMode {
  const trimmed = query.trim();
  if (!trimmed) return 'all';

  // ID search: #123 or just numbers
  if (/^#?\d+$/.test(trimmed)) return 'id';

  // Owner search: owner:john or owner:john@example.com
  if (/^owner:/i.test(trimmed)) return 'owner';

  // Email search: contains @
  if (/@/.test(trimmed)) return 'email';

  // Default to name search
  return 'name';
}

/**
 * Mode badge colors
 */
const modeBadgeStyles: Record<SearchMode, string> = {
  all: '',
  id: 'bg-blue-100 text-blue-700',
  owner: 'bg-green-100 text-green-700',
  name: 'bg-purple-100 text-purple-700',
  email: 'bg-cyan-100 text-cyan-700',
  title: 'bg-indigo-100 text-indigo-700'
};

const modeBadgeLabels: Record<SearchMode, string> = {
  all: '',
  id: 'ID Search',
  owner: 'Owner Search',
  name: 'Name Search',
  email: 'Email Search',
  title: 'Title Search'
};

/**
 * Format relative time for history items
 */
function getRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const AdminSearchBar = memo(function AdminSearchBar({
  placeholder = 'Search by name, #ID, or owner:name...',
  onSearch,
  searchHistory = [],
  onHistoryItemClick,
  onClearHistory,
  detectMode = defaultDetectMode,
  isDebouncing: externalDebouncing,
  debounceMs = 300,
  widthClass = 'max-w-[50%]'
}: AdminSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [internalDebouncing, setInternalDebouncing] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isDebouncing = externalDebouncing !== undefined ? externalDebouncing : internalDebouncing;
  const searchMode = useMemo(() => detectMode(searchQuery), [detectMode, searchQuery]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setInternalDebouncing(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const mode = detectMode(query);
      onSearch(query, mode);
      setInternalDebouncing(false);
    }, debounceMs);
  }, [onSearch, detectMode, debounceMs]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      setInternalDebouncing(false);
      const mode = detectMode(searchQuery);
      onSearch(searchQuery, mode);
    } else if (e.key === 'Escape') {
      setSearchQuery('');
      onSearch('', 'all');
    }
  }, [searchQuery, onSearch, detectMode]);

  const handleClear = useCallback(() => {
    setSearchQuery('');
    onSearch('', 'all');
  }, [onSearch]);

  const handleHistoryClick = useCallback((query: string) => {
    setSearchQuery(query);
    setIsHistoryOpen(false);
    const mode = detectMode(query);
    onSearch(query, mode);
    onHistoryItemClick?.(query);
  }, [onSearch, detectMode, onHistoryItemClick]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative flex-1 ${widthClass}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsHistoryOpen(searchHistory.length > 0)}
          onBlur={() => setTimeout(() => setIsHistoryOpen(false), 200)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full pl-10 pr-24 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          aria-label="Search"
        />

        {/* Mode badge */}
        {searchQuery && searchMode !== 'all' && (
          <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded ${modeBadgeStyles[searchMode]}`}>
              {modeBadgeLabels[searchMode]}
            </span>
          </div>
        )}

        {/* Loading spinner */}
        {isDebouncing && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-orange-500 border-t-transparent rounded-full" />
          </div>
        )}

        {/* Clear button */}
        {searchQuery && !isDebouncing && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Search history dropdown */}
      {isHistoryOpen && searchHistory.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10">
          <div className="p-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Recent Searches</span>
              {onClearHistory && (
                <button
                  onClick={onClearHistory}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="space-y-1">
              {searchHistory.slice(0, 5).map((entry, i) => (
                <button
                  key={i}
                  onClick={() => handleHistoryClick(entry.query)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left hover:bg-gray-50 rounded"
                >
                  <Clock className="w-3 h-3 text-gray-600" />
                  <span className="flex-1 truncate">{entry.query}</span>
                  <span className="text-xs text-gray-600">{getRelativeTime(entry.timestamp)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default AdminSearchBar;
