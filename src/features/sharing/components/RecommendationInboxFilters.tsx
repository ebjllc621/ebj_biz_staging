/**
 * RecommendationInboxFilters - Tab filters for recommendations inbox
 *
 * Tab navigation for All/Received/Sent/Saved views with badge counts.
 *
 * @tier SIMPLE
 * @phase Phase 3 - Inbox & Discovery
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/userrecommendations/phases/PHASE_3_BRAIN_PLAN.md
 *
 * @example
 * ```tsx
 * import { RecommendationInboxFilters } from '@features/sharing/components';
 *
 * function InboxPage() {
 *   const [activeTab, setActiveTab] = useState('all');
 *   const counts = { all: 10, received: 6, sent: 4, saved: 2, unread: 3 };
 *
 *   return (
 *     <RecommendationInboxFilters
 *       activeTab={activeTab}
 *       counts={counts}
 *       onTabChange={setActiveTab}
 *     />
 *   );
 * }
 * ```
 */

'use client';

import type { EntityType } from '@features/contacts/types/sharing';

type InboxTab = 'all' | 'received' | 'sent' | 'saved' | 'helpful' | 'thankyous';

interface InboxCounts {
  all: number;
  received: number;
  unread: number;
  sent: number;
  saved: number;
  // Phase 4: Feedback counts
  helpful: number;
  thankyous: number;
}

interface RecommendationInboxFiltersProps {
  activeTab: InboxTab;
  onTabChange: (tab: InboxTab) => void;
  entityTypeFilter: EntityType | 'all';
  onEntityTypeChange: (type: EntityType | 'all') => void;
  counts?: InboxCounts;
}

const TAB_OPTIONS: { key: InboxTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'received', label: 'Received' },
  { key: 'sent', label: 'Sent' },
  { key: 'saved', label: 'Saved' },
  // Phase 4: Feedback tabs
  { key: 'helpful', label: 'Helpful' },
  { key: 'thankyous', label: 'Thank Yous' }
];

const ENTITY_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  // Phase 1 entity types
  { value: 'listing', label: 'Businesses' },
  { value: 'event', label: 'Events' },
  { value: 'user', label: 'Connections' },
  // Phase 8 content types
  { value: 'article', label: 'Articles' },
  { value: 'newsletter', label: 'Newsletters' },
  { value: 'podcast', label: 'Podcasts' },
  { value: 'video', label: 'Videos' }
];

export function RecommendationInboxFilters({
  activeTab,
  onTabChange,
  entityTypeFilter,
  onEntityTypeChange,
  counts
}: RecommendationInboxFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-4">
      {/* Tab Navigation */}
      <nav className="-mb-px flex space-x-4 overflow-x-auto">
        {TAB_OPTIONS.map(({ key, label }) => {
          const isActive = activeTab === key;
          const count = counts?.[key === 'all' ? 'all' : key];

          return (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                isActive
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {label}
              {count !== undefined && count > 0 && (
                <span
                  className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    isActive
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Entity Type Filter Dropdown */}
      <select
        value={entityTypeFilter}
        onChange={(e) => onEntityTypeChange(e.target.value as EntityType | 'all')}
        className="text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
      >
        {ENTITY_TYPE_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default RecommendationInboxFilters;
