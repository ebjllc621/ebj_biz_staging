/**
 * EventsFilterBar - Search, sort, and filter controls for events page
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @phase Phase 6 - Filter Bar
 * @governance Build Map v2.1 ENHANCED
 * @authority docs/pages/layouts/events/phases/PHASE_6_BRAIN_PLAN.md
 *
 * FEATURES:
 * - Search input with debounce (300ms) and clear button
 * - Sort dropdown (Featured, Date, Name, Distance)
 * - Event type filter dropdown
 * - Location type filter dropdown (Physical, Virtual, Hybrid)
 * - Clear filters button with active count badge
 * - Mobile-responsive collapsible design
 *
 * @see src/features/listings/components/ListingsFilterBar.tsx - Canonical pattern
 */

'use client';

import { useState, useCallback, useEffect, ChangeEvent } from 'react';
import { Search, X, ChevronDown, Filter, MapPin, Calendar, LayoutGrid, List as ListIcon, Map as MapIcon } from 'lucide-react';
import { useEventsFilters } from '@/features/events/hooks/useEventsFilters';
import type { EventSortOption, EventSortDropdownOption } from '@/features/events/types';

/**
 * Component props
 */
export interface EventsFilterBarProps {
  /** Additional CSS classes */
  className?: string;
  /** Available event types for filter dropdown */
  eventTypes?: string[];
  /** Current display mode (grid or list) */
  displayMode?: 'grid' | 'list';
  /** Callback when display mode changes */
  onDisplayModeChange?: (mode: 'grid' | 'list') => void;
  /** Whether the map is currently visible */
  isMapVisible?: boolean;
  /** Callback to toggle map visibility */
  onMapToggle?: () => void;
}

/**
 * Sort options for dropdown
 */
const SORT_OPTIONS: EventSortDropdownOption[] = [
  { value: 'priority', label: 'Featured' },
  { value: 'date', label: 'Soonest Date' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'distance', label: 'Nearest' },
];

/**
 * Location type options for dropdown
 */
const LOCATION_TYPE_OPTIONS = [
  { value: '', label: 'All Locations' },
  { value: 'physical', label: 'In-Person' },
  { value: 'virtual', label: 'Virtual' },
  { value: 'hybrid', label: 'Hybrid' },
] as const;

/**
 * Default event types - used as fallback if API fetch fails
 */
const FALLBACK_EVENT_TYPES = [
  'Workshop',
  'Concert',
  'Conference',
  'Meetup',
  'Webinar',
  'Festival',
  'Networking',
  'Class',
];

/**
 * EventsFilterBar component
 */
export function EventsFilterBar({
  className = '',
  eventTypes: eventTypesProp,
  displayMode,
  onDisplayModeChange,
  isMapVisible,
  onMapToggle,
}: EventsFilterBarProps) {
  const {
    filters,
    setSearchQuery,
    setSortOption,
    setEventType,
    setLocationType,
    clearFilters,
    activeFilterCount,
    isDebouncing,
  } = useEventsFilters();

  // Local state for search input (controlled for immediate UI update)
  const [searchValue, setSearchValue] = useState(filters.q);

  // Fetch event types from API, fall back to props or hardcoded list
  const [dynamicEventTypes, setDynamicEventTypes] = useState<string[]>(eventTypesProp || FALLBACK_EVENT_TYPES);

  useEffect(() => {
    if (eventTypesProp) return; // Props take precedence
    const fetchEventTypes = async () => {
      try {
        const response = await fetch('/api/events/types');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data?.eventTypes) {
            setDynamicEventTypes(result.data.eventTypes.map((et: { name: string }) => et.name));
          }
        }
      } catch {
        // Keep fallback types
      }
    };
    fetchEventTypes();
  }, [eventTypesProp]);

  const eventTypes = eventTypesProp || dynamicEventTypes;

  // Mobile filter collapse state
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  /**
   * Handle search input change
   */
  const handleSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchValue(value);
      setSearchQuery(value); // Debounced URL update
    },
    [setSearchQuery]
  );

  /**
   * Clear search input
   */
  const handleClearSearch = useCallback(() => {
    setSearchValue('');
    setSearchQuery('');
  }, [setSearchQuery]);

  /**
   * Handle sort dropdown change
   */
  const handleSortChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      setSortOption(e.target.value as EventSortOption);
    },
    [setSortOption]
  );

  /**
   * Handle event type dropdown change
   */
  const handleEventTypeChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setEventType(value === '' ? undefined : value);
    },
    [setEventType]
  );

  /**
   * Handle location type dropdown change
   */
  const handleLocationTypeChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setLocationType(
        value === '' ? undefined : (value as 'physical' | 'virtual' | 'hybrid')
      );
    },
    [setLocationType]
  );

  /**
   * Toggle mobile filter expansion
   */
  const toggleMobileExpanded = useCallback(() => {
    setIsMobileExpanded((prev) => !prev);
  }, []);

  return (
    <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
      {/* Mobile toggle button */}
      <button
        type="button"
        onClick={toggleMobileExpanded}
        className="w-full flex items-center justify-between p-4 md:hidden"
        aria-expanded={isMobileExpanded}
        aria-label="Toggle filters"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-600" />
          <span className="font-medium text-gray-700">Filters</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-biz-navy rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-5 w-5 text-gray-600 transition-transform ${
            isMobileExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Filter controls */}
      <div
        className={`p-4 border-t md:border-t-0 ${
          isMobileExpanded ? 'block' : 'hidden'
        } md:block`}
      >
        <div className="flex flex-col gap-4">
          {/* Row 1: Search and Sort */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search input */}
            <div className="flex-1">
              <label htmlFor="event-search" className="sr-only">
                Search events
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
                <input
                  id="event-search"
                  type="text"
                  value={searchValue}
                  onChange={handleSearchChange}
                  placeholder="Search events..."
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-biz-navy focus:border-transparent"
                />
                {searchValue && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label="Clear search"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
                {isDebouncing && (
                  <div className="absolute right-10 top-1/2 -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-biz-navy border-t-transparent rounded-full" />
                  </div>
                )}
              </div>
            </div>

            {/* Sort dropdown */}
            <div className="md:w-44">
              <label htmlFor="event-sort" className="sr-only">
                Sort by
              </label>
              <div className="relative">
                <select
                  id="event-sort"
                  value={filters.sort}
                  onChange={handleSortChange}
                  className="w-full appearance-none pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-biz-navy focus:border-transparent cursor-pointer"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600 pointer-events-none" />
              </div>
            </div>

            {/* Display Mode Toggle */}
            {onDisplayModeChange && (
              <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1">
                <button
                  onClick={() => onDisplayModeChange('grid')}
                  className={`p-1.5 rounded ${
                    displayMode === 'grid'
                      ? 'bg-biz-orange text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDisplayModeChange('list')}
                  className={`p-1.5 rounded ${
                    displayMode === 'list'
                      ? 'bg-biz-orange text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  aria-label="List view"
                >
                  <ListIcon className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Map Toggle */}
            {onMapToggle && (
              <div className="hidden lg:flex items-center gap-1 border border-gray-300 rounded-lg p-1">
                <button
                  onClick={onMapToggle}
                  className={`p-1.5 rounded ${
                    isMapVisible
                      ? 'bg-biz-orange text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  aria-pressed={isMapVisible}
                  aria-label={isMapVisible ? 'Hide map' : 'Show map'}
                >
                  <MapIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Row 2: Event Type, Location Type, Clear */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Event type dropdown */}
            <div className="md:w-44">
              <label htmlFor="event-type" className="sr-only">
                Event type
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                <select
                  id="event-type"
                  value={filters.eventType || ''}
                  onChange={handleEventTypeChange}
                  className="w-full appearance-none pl-9 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-biz-navy focus:border-transparent cursor-pointer"
                >
                  <option value="">All Types</option>
                  {eventTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600 pointer-events-none" />
              </div>
            </div>

            {/* Location type dropdown */}
            <div className="md:w-40">
              <label htmlFor="location-type" className="sr-only">
                Location type
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                <select
                  id="location-type"
                  value={filters.locationType || ''}
                  onChange={handleLocationTypeChange}
                  className="w-full appearance-none pl-9 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-biz-navy focus:border-transparent cursor-pointer"
                >
                  {LOCATION_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600 pointer-events-none" />
              </div>
            </div>

            {/* Clear filters button */}
            {activeFilterCount > 0 && (
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-biz-navy focus:ring-offset-2 transition-colors whitespace-nowrap"
                >
                  Clear Filters ({activeFilterCount})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Active filters display */}
        {activeFilterCount > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {filters.q && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded">
                <span className="font-medium">Search:</span>
                <span>{filters.q}</span>
              </div>
            )}
            {filters.sort !== 'priority' && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded">
                <span className="font-medium">Sort:</span>
                <span>{SORT_OPTIONS.find((o) => o.value === filters.sort)?.label}</span>
              </div>
            )}
            {filters.eventType && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded">
                <span className="font-medium">Type:</span>
                <span>{filters.eventType}</span>
              </div>
            )}
            {filters.locationType && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded">
                <span className="font-medium">Location:</span>
                <span>
                  {LOCATION_TYPE_OPTIONS.find((o) => o.value === filters.locationType)?.label}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EventsFilterBar;
