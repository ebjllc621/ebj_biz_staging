/**
 * ConnectionsListPanel - Dashboard panel for managing user connections
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Connect System Remediation
 * @generated ComponentBuilder v3.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * Reusable dashboard panel showing user's connections with search and filter capabilities.
 * Displays list of ConnectionCard components with actions for managing connections.
 *
 * @see docs/pages/layouts/home/user/phases/troubleshooting/connect/CONNECT_SYSTEM_REMEDIATION_BRAIN_PLAN.md
 * @see src/features/connections/components/ConnectionCard.tsx - Card component for individual connections
 * @see src/features/connections/types/index.ts - UserConnection type definition
 */
'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, Users } from 'lucide-react';
import type { UserConnection } from '../types';
import { ConnectionCard } from './ConnectionCard';
import { ErrorService } from '@core/services/ErrorService';

interface ConnectionsListPanelProps {
  /** Array of user connections to display */
  connections: UserConnection[];
  /** Loading state for initial data fetch */
  isLoading: boolean;
  /** Callback when connection is removed */
  onRemove: (connectionId: number) => Promise<void>;
  /** Callback to trigger connections data refresh */
  onConnectionsChange: () => void;
}

type FilterType = 'all' | 'professional' | 'business' | 'personal';

/**
 * ConnectionsListPanel component
 * Dashboard panel showing user's connections with search/filter
 */
export function ConnectionsListPanel({
  connections,
  isLoading,
  onRemove,
  onConnectionsChange
}: ConnectionsListPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  /**
   * Filter connections based on search query and connection type
   */
  const filteredConnections = useMemo(() => {
    let filtered = connections;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conn =>
        conn.username.toLowerCase().includes(query) ||
        conn.display_name?.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(conn =>
        conn.connection_type?.toLowerCase() === filterType
      );
    }

    return filtered;
  }, [connections, searchQuery, filterType]);

  /**
   * Handle connection removal
   */
  const handleRemove = async (connectionId: number) => {
    try {
      await onRemove(connectionId);
      onConnectionsChange();
    } catch (error) {
      ErrorService.capture('Failed to remove connection:', error);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Panel Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-biz-navy to-biz-navy/90 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-white" />
            <h2 className="text-lg font-semibold text-white">
              My Connections
            </h2>
            <span className="px-2.5 py-0.5 bg-white/20 text-white text-sm font-medium rounded-full">
              {connections.length}
            </span>
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or username..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biz-orange focus:border-transparent transition-shadow"
            />
          </div>

          {/* Connection Type Filter */}
          <div className="relative min-w-[200px]">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-biz-orange focus:border-transparent transition-shadow cursor-pointer"
            >
              <option value="all">All Connections</option>
              <option value="professional">Professional</option>
              <option value="business">Business</option>
              <option value="personal">Personal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Connections List */}
      <div className="p-6">
        {isLoading ? (
          // Loading State
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-biz-orange border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500">Loading connections...</p>
            </div>
          </div>
        ) : filteredConnections.length === 0 ? (
          // Empty State
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {searchQuery || filterType !== 'all' ? 'No Matches Found' : 'No Connections Yet'}
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {searchQuery || filterType !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Start connecting with other users to grow your network.'}
            </p>
          </div>
        ) : (
          // Connections Grid
          <div className="grid gap-4">
            {filteredConnections.map((connection) => (
              <ConnectionCard
                key={connection.id}
                connection={connection}
                showActions={true}
                onRemove={() => handleRemove(connection.id)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default ConnectionsListPanel;
