'use client';

import React, { useState, useCallback } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useRecommendations } from '../hooks/useRecommendations';
import { RecommendationCard } from './RecommendationCard';
import { NotInterestedModal } from './NotInterestedModal';
import { ConnectionRequestModal } from './ConnectionRequestModal';
import { SendMessageModal } from '@features/messaging/components/SendMessageModal';
import { Loader2, RefreshCw, AlertCircle, SlidersHorizontal } from 'lucide-react';
import { RecommendationSettingsModal } from './RecommendationSettingsModal';

interface PeopleYouMayKnowProps {
  variant?: 'sidebar' | 'full';
  limit?: number;
  /** Callback when a connection request is successfully sent - parent can use to refresh data */
  onConnectionRequestSent?: () => void;
}

/**
 * PeopleYouMayKnow
 *
 * Displays connection recommendations with actions.
 * Supports two variants:
 * - sidebar: Compact view for sidebar widgets
 * - full: Full-width view for dedicated pages
 *
 * Features:
 * - Connection recommendations with scoring
 * - Connect action (opens ConnectionRequestModal)
 * - Dismiss action (removes from view)
 * - Not interested action (opens NotInterestedModal)
 * - Load more pagination
 * - Refresh functionality
 *
 * @phase ConnectP2 Phase 2
 */
function PeopleYouMayKnowComponent({
  variant = 'sidebar',
  limit = 10,
  onConnectionRequestSent
}: PeopleYouMayKnowProps) {
  const {
    recommendations,
    isLoading,
    error,
    total,
    hasMore,
    refresh,
    loadMore,
    recordFeedback,
    dismissRecommendation
  } = useRecommendations({ limit }, true);

  const [connectingUserId, setConnectingUserId] = useState<number | null>(null);
  const [notInterestedUserId, setNotInterestedUserId] = useState<number | null>(null);
  const [messageUserId, setMessageUserId] = useState<number | null>(null);
  const [connectionModalOpen, setConnectionModalOpen] = useState(false);
  const [notInterestedModalOpen, setNotInterestedModalOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Find user data for modals
  const connectingUser = recommendations.find(r => r.userId === connectingUserId);
  const notInterestedUser = recommendations.find(r => r.userId === notInterestedUserId);
  const messageUser = recommendations.find(r => r.userId === messageUserId);

  /**
   * Handle connect action
   */
  const handleConnect = useCallback((userId: number) => {
    setConnectingUserId(userId);
    setConnectionModalOpen(true);
  }, []);

  /**
   * Handle successful connection request
   */
  const handleRequestSent = useCallback(async () => {
    if (connectingUserId) {
      // Record feedback
      await recordFeedback(connectingUserId, 'connected');
      // Remove from UI
      dismissRecommendation(connectingUserId);
      // Close modal
      setConnectionModalOpen(false);
      setConnectingUserId(null);
      // Notify parent to refresh data (e.g., update Sent Requests tab)
      onConnectionRequestSent?.();
    }
  }, [connectingUserId, recordFeedback, dismissRecommendation, onConnectionRequestSent]);

  /**
   * Handle dismiss action
   */
  const handleDismiss = useCallback((userId: number) => {
    dismissRecommendation(userId);
  }, [dismissRecommendation]);

  /**
   * Handle not interested action
   */
  const handleNotInterested = useCallback((userId: number) => {
    setNotInterestedUserId(userId);
    setNotInterestedModalOpen(true);
  }, []);

  /**
   * Handle send message action - opens SendMessageModal
   */
  const handleSendMessage = useCallback((userId: number) => {
    setMessageUserId(userId);
    setMessageModalOpen(true);
  }, []);

  /**
   * Handle not interested feedback submission
   */
  const handleNotInterestedSubmit = useCallback(async (reason: string, otherReason?: string) => {
    if (notInterestedUserId) {
      await recordFeedback(notInterestedUserId, 'not_interested', reason, otherReason);
      // Remove from UI
      dismissRecommendation(notInterestedUserId);
      // Close modal
      setNotInterestedModalOpen(false);
      setNotInterestedUserId(null);
    }
  }, [notInterestedUserId, recordFeedback, dismissRecommendation]);

  /**
   * Close connection modal
   */
  const handleCloseConnectionModal = () => {
    setConnectionModalOpen(false);
    setConnectingUserId(null);
  };

  /**
   * Close not interested modal
   */
  const handleCloseNotInterestedModal = () => {
    setNotInterestedModalOpen(false);
    setNotInterestedUserId(null);
  };

  /**
   * Close message modal
   */
  const handleCloseMessageModal = () => {
    setMessageModalOpen(false);
    setMessageUserId(null);
  };

  // Container classes based on variant
  const containerClasses = variant === 'sidebar'
    ? 'bg-white rounded-lg shadow p-4'
    : 'w-full max-w-4xl mx-auto';

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className={variant === 'sidebar' ? 'text-lg font-semibold text-gray-900' : 'text-2xl font-bold text-gray-900'}>
          People You May Know
        </h2>
        <div className="flex items-center gap-1">
          {/* Settings button - left of refresh */}
          <button
            onClick={() => setSettingsModalOpen(true)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Customize recommendations"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
          {/* Refresh button */}
          <button
            onClick={refresh}
            disabled={isLoading}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh recommendations"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Error loading recommendations</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Loading state (initial) */}
      {isLoading && recommendations.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && recommendations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No recommendations available at this time.</p>
          <p className="text-sm text-gray-600 mt-2">Check back later for new connections!</p>
        </div>
      )}

      {/* Recommendations grid */}
      {recommendations.length > 0 && (
        <div className={variant === 'sidebar' ? 'space-y-3' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
          {recommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.userId}
              recommendation={recommendation}
              onConnect={handleConnect}
              onDismiss={handleDismiss}
              onNotInterested={handleNotInterested}
              onSendMessage={handleSendMessage}
              isConnecting={connectingUserId === recommendation.userId}
            />
          ))}
        </div>
      )}

      {/* Load more button */}
      {hasMore && !isLoading && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Load More
          </button>
          <p className="text-sm text-gray-500 mt-2">
            Showing {recommendations.length} of {total}
          </p>
        </div>
      )}

      {/* Connection Request Modal */}
      {connectingUser && (
        <ConnectionRequestModal
          isOpen={connectionModalOpen}
          onClose={handleCloseConnectionModal}
          targetUser={{
            id: connectingUser.userId,
            username: connectingUser.username,
            display_name: connectingUser.displayName,
            avatar_url: connectingUser.avatarUrl
          }}
          onRequestSent={handleRequestSent}
        />
      )}

      {/* Not Interested Modal */}
      {notInterestedUser && (
        <NotInterestedModal
          isOpen={notInterestedModalOpen}
          onClose={handleCloseNotInterestedModal}
          userName={notInterestedUser.displayName || notInterestedUser.username}
          onSubmit={handleNotInterestedSubmit}
        />
      )}

      {/* Send Message Modal */}
      {messageUser && (
        <SendMessageModal
          isOpen={messageModalOpen}
          onClose={handleCloseMessageModal}
          targetUser={{
            id: messageUser.userId,
            username: messageUser.username,
            display_name: messageUser.displayName,
            avatar_url: messageUser.avatarUrl
          }}
        />
      )}

      {/* Recommendation Settings Modal */}
      <RecommendationSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onSave={refresh}
      />
    </div>
  );
}

/**
 * Wrapped with ErrorBoundary (STANDARD tier requirement)
 */
export function PeopleYouMayKnow(props: PeopleYouMayKnowProps) {
  return (
    <ErrorBoundary>
      <PeopleYouMayKnowComponent {...props} />
    </ErrorBoundary>
  );
}
