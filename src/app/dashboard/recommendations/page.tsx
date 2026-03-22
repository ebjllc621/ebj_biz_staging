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
 */

'use client';

import { useState, useCallback } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useSharingInbox } from '@features/sharing/hooks/useSharingInbox';
import { RecommendationInboxFilters } from '@features/sharing/components/RecommendationInboxFilters';
import { RecommendationInboxList } from '@features/sharing/components/RecommendationInboxList';
import { RecommendationInboxPagination } from '@features/sharing/components/RecommendationInboxPagination';
import { SenderImpactCard } from '@features/sharing/components/SenderImpactCard';
import { ThankYouModal } from '@features/sharing/components/ThankYouModal';
import type { SharingWithPreview } from '@features/contacts/types/sharing';

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
    hideRecommendation,
    // Phase 4: Feedback handlers
    markHelpful,
    sendThankYou
  } = useSharingInbox({ pageSize: 20 });

  const isSentTab = activeTab === 'sent';

  // Phase 4: Thank You Modal State
  const [thankYouModal, setThankYouModal] = useState<{
    isOpen: boolean;
    recommendation: SharingWithPreview | null;
  }>({ isOpen: false, recommendation: null });

  // Open thank you modal for a recommendation
  const handleOpenThankYou = useCallback((id: number) => {
    const rec = recommendations.find(r => r.id === id);
    if (rec) {
      setThankYouModal({ isOpen: true, recommendation: rec });
    }
  }, [recommendations]);

  // Close thank you modal
  const handleCloseThankYou = useCallback(() => {
    setThankYouModal({ isOpen: false, recommendation: null });
  }, []);

  // Send thank you message
  const handleSendThankYou = useCallback(async (message: string) => {
    if (thankYouModal.recommendation) {
      await sendThankYou(thankYouModal.recommendation.id, message);
      handleCloseThankYou();
    }
  }, [thankYouModal.recommendation, sendThankYou, handleCloseThankYou]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recommendations</h1>
          <p className="text-gray-600 mt-1">
            {counts?.unread
              ? `${counts.unread} unread recommendation${counts.unread !== 1 ? 's' : ''}`
              : 'View and manage your recommendations'}
          </p>
        </div>
      </div>

      {/* Impact Summary Card (for sent tab) */}
      {isSentTab && (
        <SenderImpactCard />
      )}

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
          onMarkHelpful={markHelpful}
          onSendThank={handleOpenThankYou}
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

      {/* Thank You Modal */}
      {thankYouModal.recommendation && (
        <ThankYouModal
          isOpen={thankYouModal.isOpen}
          onClose={handleCloseThankYou}
          senderName={thankYouModal.recommendation.sender.display_name || thankYouModal.recommendation.sender.username}
          entityTitle={thankYouModal.recommendation.entity_preview?.title || 'this recommendation'}
          onSendThank={handleSendThankYou}
        />
      )}
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
