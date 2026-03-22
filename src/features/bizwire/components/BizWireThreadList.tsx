/**
 * BizWireThreadList - Thread list panel with search and filters
 *
 * @authority docs/components/contactListing/phases/PHASE_5_PLAN.md T5.5
 * @tier STANDARD
 */

'use client';

import { Search, X, RefreshCw } from 'lucide-react';
import { BizWireEmptyState } from './BizWireEmptyState';
import { BizWireThreadItem } from './BizWireThreadItem';
import type { BizWireThread, BizWireStatus } from '../types';

interface BizWireThreadListProps {
  threads: BizWireThread[];
  selectedThreadId: string | null;
  onSelectThread: (thread: BizWireThread) => void;
  isLoading: boolean;
  error: string | null;
  variant: 'listing' | 'user';
  search: string;
  onSearchChange: (query: string) => void;
  statusFilter: BizWireStatus | 'all';
  onStatusFilterChange: (status: BizWireStatus | 'all') => void;
  onRefresh?: () => void;
}

const LISTING_FILTERS: Array<{ label: string; value: BizWireStatus | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Unread', value: 'new' },
  { label: 'Archived', value: 'archived' }
];

const USER_FILTERS: Array<{ label: string; value: BizWireStatus | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Awaiting Reply', value: 'read' },
  { label: 'Replied', value: 'replied' }
];

export function BizWireThreadList({
  threads,
  selectedThreadId,
  onSelectThread,
  isLoading,
  error,
  variant,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onRefresh
}: BizWireThreadListProps) {
  const filters = variant === 'listing' ? LISTING_FILTERS : USER_FILTERS;

  return (
    <div className="h-full flex flex-col">
      {/* Search bar */}
      <div className="flex-shrink-0 p-3 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search BizWire..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex-shrink-0 flex items-center gap-1 px-3 py-2 border-b border-gray-200 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => onStatusFilterChange(f.value)}
            className={`px-2.5 py-1 text-xs rounded-full font-medium whitespace-nowrap transition-colors ${
              statusFilter === f.value
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="ml-auto p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
            aria-label="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Thread list content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <p className="text-sm text-red-600 mb-3">{error}</p>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                Try again
              </button>
            )}
          </div>
        ) : threads.length === 0 ? (
          <BizWireEmptyState variant={variant} />
        ) : (
          threads.map((thread) => (
            <BizWireThreadItem
              key={thread.thread_id}
              thread={thread}
              isSelected={selectedThreadId === thread.thread_id}
              onClick={() => onSelectThread(thread)}
              variant={variant}
            />
          ))
        )}
      </div>
    </div>
  );
}
