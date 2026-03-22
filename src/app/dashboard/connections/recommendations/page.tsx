/**
 * Dashboard Recommendations Inbox Page
 *
 * Full-featured recommendations management interface with:
 * - Paginated recommendation list
 * - Filter by tab (All/Received/Sent/Saved)
 * - Filter by entity type
 * - Mark as viewed/saved
 * - Navigate to recommended entities
 *
 * @authority docs/components/connections/userrecommendations/phases/PHASE_3_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @phase User Recommendations - Phase 3
 * @reference src/app/dashboard/notifications/page.tsx
 */

'use client';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useSharingInbox } from '@features/sharing/hooks/useSharingInbox';
import { RecommendationInboxFilters } from '@features/sharing/components/RecommendationInboxFilters';
import { RecommendationInboxList } from '@features/sharing/components/RecommendationInboxList';
import { RecommendationInboxPagination } from '@features/sharing/components/RecommendationInboxPagination';

function RecommendationsPageContent() {
  const {
    recommendations,
    total,
    page,
    pageSize,
    totalPages,
    isLoading,
    error,
    activeTab,
    entityTypeFilter,
    counts,
    setPage,
    setTab,
    setEntityTypeFilter,
    markAsViewed,
    toggleSaved,
    hideRecommendation
  } = useSharingInbox({ pageSize: 20 });

  const isSentTab = activeTab === 'sent';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recommendations</h1>
          <p className="text-gray-600 mt-1">
            {counts?.unread
              ? `${counts.unread} unread recommendation${counts.unread !== 1 ? 's' : ''}`
              : 'View recommendations from your connections'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <RecommendationInboxFilters
        activeTab={activeTab}
        onTabChange={setTab}
        entityTypeFilter={entityTypeFilter}
        onEntityTypeChange={setEntityTypeFilter}
        counts={counts || undefined}
      />

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <RecommendationInboxList
          recommendations={recommendations}
          isLoading={isLoading}
          error={error}
          isSentTab={isSentTab}
          onMarkViewed={markAsViewed}
          onToggleSaved={toggleSaved}
          onHide={hideRecommendation}
        />

        {/* Pagination */}
        <RecommendationInboxPagination
          currentPage={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

export default function RecommendationsPage() {
  return (
    <ErrorBoundary componentName="DashboardRecommendationsPage">
      <RecommendationsPageContent />
    </ErrorBoundary>
  );
}
