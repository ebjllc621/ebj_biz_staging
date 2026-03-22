'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useRecommendations } from '../hooks/useRecommendations';
import { NotInterestedModal } from './NotInterestedModal';
import { ConnectionRequestModal } from './ConnectionRequestModal';
import { ContentSlider } from '@features/homepage/components/ContentSlider';
import { UserPlus, X, Users } from 'lucide-react';
import { getAvatarInitials } from '@/core/utils/avatar';
import BizButton from '@/components/BizButton/BizButton';
import { RecommendedConnection } from '../types';

/**
 * Compact recommendation card for homepage scroller
 * Optimized for horizontal slider display with all core actions
 */
interface CompactRecommendationCardProps {
  recommendation: RecommendedConnection;
  onConnect: (_id: number) => void;
  onDismiss: (_id: number) => void;
  onNotInterested: (_id: number) => void;
  isConnecting?: boolean;
}

function CompactRecommendationCard({
  recommendation,
  onConnect,
  onDismiss,
  onNotInterested,
  isConnecting = false
}: CompactRecommendationCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="flex-shrink-0 w-64 bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-200 snap-start relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Dismiss button */}
      {isHovered && (
        <button
          onClick={() => onDismiss(recommendation.userId)}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          title="Dismiss recommendation"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Avatar and Name - clickable to profile */}
      <div className="flex flex-col items-center text-center mb-3">
        <Link
          href={`/profile/${recommendation.username}` as Route}
          className="block"
        >
          {recommendation.avatarUrl ? (
            <img
              src={recommendation.avatarUrl}
              alt={recommendation.displayName || recommendation.username}
              className="w-16 h-16 rounded-full object-cover mb-2 ring-2 ring-transparent hover:ring-biz-orange transition-all"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg mb-2 ring-2 ring-transparent hover:ring-biz-orange transition-all">
              {getAvatarInitials(recommendation.displayName || recommendation.username)}
            </div>
          )}
        </Link>
        <Link
          href={`/profile/${recommendation.username}` as Route}
          className="group w-full"
        >
          <h3 className="font-semibold text-gray-900 truncate w-full group-hover:text-biz-orange transition-colors">
            {recommendation.displayName || recommendation.username}
          </h3>
        </Link>
        {recommendation.headline && (
          <p className="text-xs text-gray-600 line-clamp-2 mt-1">
            {recommendation.headline}
          </p>
        )}
      </div>

      {/* Mutual connections */}
      {recommendation.mutualConnectionCount > 0 && (
        <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-3">
          <Users className="w-3 h-3 text-blue-600" />
          <span>{recommendation.mutualConnectionCount} mutual</span>
        </div>
      )}

      {/* Match score badge */}
      <div className="flex justify-center mb-3">
        <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded">
          {Math.round(recommendation.score)}% match
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <BizButton
          variant="primary"
          size="sm"
          onClick={() => onConnect(recommendation.userId)}
          disabled={isConnecting}
          loading={isConnecting}
          leftIcon={<UserPlus className="w-4 h-4" />}
          className="w-full !bg-bizconekt-primaryLight !text-bizconekt-primary !border-bizconekt-primaryLight hover:!bg-bizconekt-primary hover:!text-white hover:!border-bizconekt-primary"
        >
          Connect
        </BizButton>
        <button
          onClick={() => onNotInterested(recommendation.userId)}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          Not Interested
        </button>
      </div>
    </div>
  );
}

/**
 * HomepageRecommendationsSlider
 *
 * Displays "People You May Know" recommendations in a horizontal
 * scroller format for the authenticated homepage.
 *
 * Features:
 * - Horizontal scrolling via ContentSlider
 * - "See All" button navigating to /dashboard/connections
 * - Compact recommendation cards with all actions
 * - Connection request and Not Interested modals
 *
 * @tier STANDARD
 * @phase ConnectP2 Phase 2
 */
function HomepageRecommendationsSliderComponent() {
  const {
    recommendations,
    isLoading,
    error,
    recordFeedback,
    dismissRecommendation
  } = useRecommendations({ limit: 10 }, true);

  const [connectingUserId, setConnectingUserId] = useState<number | null>(null);
  const [notInterestedUserId, setNotInterestedUserId] = useState<number | null>(null);
  const [connectionModalOpen, setConnectionModalOpen] = useState(false);
  const [notInterestedModalOpen, setNotInterestedModalOpen] = useState(false);

  // Find user data for modals
  const connectingUser = recommendations.find(r => r.userId === connectingUserId);
  const notInterestedUser = recommendations.find(r => r.userId === notInterestedUserId);

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
      await recordFeedback(connectingUserId, 'connected');
      dismissRecommendation(connectingUserId);
      setConnectionModalOpen(false);
      setConnectingUserId(null);
    }
  }, [connectingUserId, recordFeedback, dismissRecommendation]);

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
   * Handle not interested feedback submission
   */
  const handleNotInterestedSubmit = useCallback(async (reason: string, otherReason?: string) => {
    if (notInterestedUserId) {
      await recordFeedback(notInterestedUserId, 'not_interested', reason, otherReason);
      dismissRecommendation(notInterestedUserId);
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

  // Don't render if loading, error, or no recommendations
  if (isLoading || error || recommendations.length === 0) {
    return null;
  }

  return (
    <>
      <ContentSlider
        title="People You May Know"
        icon={Users}
        moreLink="/dashboard/connections"
        moreLinkText="See All"
        gap="gap-4"
      >
        {recommendations.map((recommendation) => (
          <CompactRecommendationCard
            key={recommendation.userId}
            recommendation={recommendation}
            onConnect={handleConnect}
            onDismiss={handleDismiss}
            onNotInterested={handleNotInterested}
            isConnecting={connectingUserId === recommendation.userId}
          />
        ))}
      </ContentSlider>

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
    </>
  );
}

/**
 * Wrapped with ErrorBoundary (STANDARD tier requirement)
 */
export function HomepageRecommendationsSlider() {
  return (
    <ErrorBoundary componentName="HomepageRecommendationsSlider">
      <HomepageRecommendationsSliderComponent />
    </ErrorBoundary>
  );
}
