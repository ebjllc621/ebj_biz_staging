/**
 * JobsFilterBar - Filter and search controls for Jobs page
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Jobs Phase 1 - Core Job CRUD & Display
 * @governance Build Map v2.1 ENHANCED
 */
'use client';

import { Search, Filter, Grid, List, Map } from 'lucide-react';
import { JobDisplayMode } from '@features/jobs/types';

interface JobsFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  displayMode: JobDisplayMode;
  onDisplayModeChange: (mode: JobDisplayMode) => void;
  employmentType?: string;
  onEmploymentTypeChange: (type: string) => void;
  workLocationType?: string;
  onWorkLocationTypeChange: (type: string) => void;
  isMapVisible?: boolean;
  onMapToggle?: () => void;
  className?: string;
}

export function JobsFilterBar({
  searchQuery,
  onSearchChange,
  displayMode,
  onDisplayModeChange,
  employmentType,
  onEmploymentTypeChange,
  workLocationType,
  onWorkLocationTypeChange,
  isMapVisible,
  onMapToggle,
  className = ''
}: JobsFilterBarProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 ${className}`}>
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biz-orange focus:border-biz-orange"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {/* Employment Type */}
          <select
            value={employmentType || ''}
            onChange={(e) => onEmploymentTypeChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-biz-orange focus:border-biz-orange"
          >
            <option value="">All Types</option>
            <option value="full_time">Full Time</option>
            <option value="part_time">Part Time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
            <option value="seasonal">Seasonal</option>
            <option value="temporary">Temporary</option>
            <option value="gig">Gig</option>
          </select>

          {/* Work Location Type */}
          <select
            value={workLocationType || ''}
            onChange={(e) => onWorkLocationTypeChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-biz-orange focus:border-biz-orange"
          >
            <option value="">All Locations</option>
            <option value="onsite">On-site</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
          </select>

          {/* Display Mode Toggle */}
          <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1">
            <button
              onClick={() => onDisplayModeChange(JobDisplayMode.GRID)}
              className={`p-1.5 rounded ${
                displayMode === JobDisplayMode.GRID
                  ? 'bg-biz-orange text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDisplayModeChange(JobDisplayMode.LIST)}
              className={`p-1.5 rounded ${
                displayMode === JobDisplayMode.LIST
                  ? 'bg-biz-orange text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

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
                <Map className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default JobsFilterBar;
