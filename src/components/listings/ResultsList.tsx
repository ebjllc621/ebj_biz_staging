/**
 * ResultsList - Optimized listing display component
 *
 * GOVERNANCE COMPLIANCE:
 * - React.memo for performance optimization
 * - Memoized ListingCard prevents unnecessary re-renders
 * - Phase R4.1 - React Component Optimization
 *
 * @authority docs/codeReview/12-8-25/phases/R4_BRAIN_PLAN.md
 * @phase Phase R4.1 - React Component Optimization
 */

import { memo } from 'react';

interface ListingItem {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  createdAt?: string;
}

interface ResultsListProps {
  items: ListingItem[];
}

/**
 * ListingCard - Individual listing card (memoized to prevent re-renders)
 */
const ListingCard = memo(function ListingCard({ item }: { item: ListingItem }) {
  const primaryName = item.title || item.name || `Listing ${item.id}`;
  const descriptionExcerpt = item.description
    ? item.description.length > 120
      ? item.description.substring(0, 120) + '...'
      : item.description
    : null;
  const createdDate = item.createdAt
    ? new Date(item.createdAt).toLocaleDateString()
    : null;

  return (
    <li className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">
          {primaryName}
        </h3>

        {descriptionExcerpt && (
          <p className="text-gray-700 leading-relaxed">
            {descriptionExcerpt}
          </p>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500">
          {createdDate && (
            <span>Created: {createdDate}</span>
          )}
          <span className="text-xs text-gray-600">
            ID: {item.id}
          </span>
        </div>
      </div>
    </li>
  );
});

/**
 * ResultsList - Memoized list container
 */
const ResultsList = memo(function ResultsList({ items }: ResultsListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-4" role="list">
      {items.map((item) => (
        <ListingCard key={item.id} item={item} />
      ))}
    </ul>
  );
});

export default ResultsList;