/**
 * UserProfilePage - Main Profile Page Content
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 * @authority docs/pages/layouts/home/user/phases/PHASE_4_BRAIN_PLAN.md
 *
 * GOVERNANCE COMPLIANCE:
 * - Client component ('use client' directive)
 * - ErrorBoundary wrapper (STANDARD tier requirement)
 * - Path aliases (@features/, @components/)
 * - Lucide React icons only
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ProfileHeroBanner } from './ProfileHeroBanner';
import { ProfileInfoSection } from './ProfileInfoSection';
import { ProfileStatsSection } from './ProfileStatsSection';
import { UserProfileEditModal } from './UserProfileEditModal';
import { ProfileCompletionChecklist } from './ProfileCompletionChecklist';
import { ViewModeToggle, ProfileViewMode } from './ViewModeToggle';
import { PanelLayoutManager } from './PanelLayoutManager';
import { ConnectButton } from '@features/connections/components/ConnectButton';
import { FollowButton } from '@features/connections/components/FollowButton';
import { SendMessageButton } from '@features/messaging/components/SendMessageButton';
import { ShareProfileButton } from './ShareProfileButton';
import { RecommendButton } from '@features/sharing/components';
import { PublicProfile, ProfileStats, ProfilePageResponse, ProfileLayout } from '../types';
import type { CategoryInterest, CustomInterest, GroupInterest, MembershipInterest } from '../types/user-interests';
import { ConnectionStatus } from '@features/connections/types';
import { calculateProfileCompletion, ProfileCompletionResult } from '../utils/calculateProfileCompletion';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UserProfilePageProps {
  /** Username to fetch profile for */
  username: string;
}

interface ProfileState {
  profile: PublicProfile | null;
  stats: ProfileStats | null;
  isOwner: boolean;
  canEdit: boolean;
  isLoading: boolean;
  error: string | null;
  completion: ProfileCompletionResult | null;
  connectionStatus: ConnectionStatus;
  isFollowing: boolean;
  viewMode: ProfileViewMode;
  profileLayout: ProfileLayout | null;
  // Phase 3: User interests from user_interests table
  categoryInterests: CategoryInterest[];
  customInterests: CustomInterest[];
  groups: GroupInterest[];
  memberships: MembershipInterest[];
}

// ============================================================================
// USERPROFILEPAGE CONTENT
// ============================================================================

function UserProfilePageContent({ username }: UserProfilePageProps) {
  const router = useRouter();
  const [state, setState] = useState<ProfileState>({
    profile: null,
    stats: null,
    isOwner: false,
    canEdit: false,
    isLoading: true,
    error: null,
    completion: null,
    connectionStatus: 'none',
    isFollowing: false,
    viewMode: 'edit',
    profileLayout: null,
    // Phase 3: User interests from user_interests table
    categoryInterests: [],
    customInterests: [],
    groups: [],
    memberships: []
  });
  const [isEditModalOpen, setEditModalOpen] = useState(false);

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/profile`, {
        credentials: 'include'
      });

      if (!response.ok) {
        // Handle account status errors with redirect
        if (response.status === 403 || response.status === 410) {
          try {
            const errorResult = await response.json();
            const errorCode = errorResult?.error?.code;

            if (errorCode === 'ACCOUNT_SUSPENDED') {
              router.replace(`/account/suspended/${encodeURIComponent(username)}`);
              return;
            }

            if (errorCode === 'ACCOUNT_DELETED') {
              router.replace(`/account/deleted/${encodeURIComponent(username)}`);
              return;
            }
          } catch {
            // If JSON parsing fails, fall through to default handling
          }
        }

        if (response.status === 404) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Profile not found'
          }));
          return;
        }
        throw new Error('Failed to fetch profile');
      }

      const result = await response.json() as { success: boolean; data: ProfilePageResponse };

      if (result.success && result.data) {
        // Calculate profile completion
        const completion = calculateProfileCompletion(result.data.profile);

        setState({
          profile: result.data.profile,
          stats: result.data.stats,
          isOwner: result.data.is_owner,
          canEdit: result.data.can_edit,
          isLoading: false,
          error: null,
          completion,
          connectionStatus: result.data.connection_status ?? 'none',
          isFollowing: result.data.is_following ?? false,
          viewMode: 'edit',
          profileLayout: result.data.profile?.profile_layout ?? null,
          // Phase 3: Reset interests - will be fetched separately
          categoryInterests: [],
          customInterests: [],
          groups: [],
          memberships: []
        });
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load profile data'
        }));
      }
    } catch {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load profile'
      }));
    }
  }, [username, router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Fetch user interests when profile is loaded
  // Phase 3: Load interests from user_interests table
  // Interests are public profile data - fetch for ALL viewers (public, authenticated, owner, admin)
  useEffect(() => {
    const fetchUserInterests = async () => {
      if (!state.profile) return;

      try {
        // Use username-based endpoint - this is a PUBLIC endpoint
        // Interests are viewable by anyone viewing the profile
        const response = await fetch(`/api/users/${encodeURIComponent(state.profile.username)}/interests`, {
          credentials: 'include'
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setState(prev => ({
              ...prev,
              categoryInterests: result.data.category_interests || [],
              customInterests: result.data.custom_interests || [],
              groups: result.data.groups || [],
              memberships: result.data.memberships || []
            }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch user interests:', err);
      }
    };

    fetchUserInterests();
  }, [state.profile]);

  // Handle profile update
  const handleProfileUpdate = useCallback(() => {
    fetchProfile();
    setEditModalOpen(false);
  }, [fetchProfile]);

  // Handle view mode change
  const handleViewModeChange = useCallback((mode: ProfileViewMode) => {
    setState(prev => ({ ...prev, viewMode: mode }));
  }, []);

  // Loading state
  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (state.error || !state.profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {state.error || 'Profile not found'}
          </h1>
          <p className="text-gray-600">
            The requested profile could not be found or is not accessible.
          </p>
        </div>
      </div>
    );
  }

  const { profile, stats, isOwner, canEdit, completion, connectionStatus, isFollowing, viewMode, profileLayout } = state;

  // Calculate effective view states
  const isEditView = viewMode === 'edit';
  const isPublishedView = viewMode === 'published';

  // In Published View, owner sees what public visitors see
  const effectiveIsOwner = isOwner && isEditView;
  const showEditButton = canEdit && isEditView;
  const showStats = canEdit && isEditView;
  const showCompletionChecklist = isOwner && isEditView && completion && completion.percentage < 100;
  const showProfileActions = !isOwner || isPublishedView;
  const showSharedConnections = !isOwner || isPublishedView;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Profile Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* View Mode Toggle - Only for owners and admins who can edit */}
        {(isOwner || canEdit) && (
          <ViewModeToggle
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            isOwner={isOwner}
            isAdmin={canEdit && !isOwner}
          />
        )}

        {/* Profile Completion Checklist (for owner with incomplete profile) - Only in Edit View */}
        {showCompletionChecklist && (
          <div className="mb-6">
            <ProfileCompletionChecklist
              completion={completion}
              onEditClick={() => setEditModalOpen(true)}
            />
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Hero Banner - Pass effective edit state */}
          <ProfileHeroBanner
            profile={profile}
            showEditButton={showEditButton}
            onEditClick={() => setEditModalOpen(true)}
            completion={isEditView ? completion : null}
            isOwner={effectiveIsOwner}
          />

          {/* Profile Info */}
          <div className="p-6 space-y-8">
            {/* Info Sections (Bio, Goals, Interests, Social Links, Groups, Memberships) */}
            <ProfileInfoSection
              profile={profile}
              categoryInterests={state.categoryInterests}
              customInterests={state.customInterests}
              groups={state.groups}
              memberships={state.memberships}
            />

            {/* Profile Actions - Show in Published View or for non-owners */}
            {/* Always show functional buttons - admins can use them for business purposes */}
            {/* Individual button components handle self-action edge cases internally */}
            {showProfileActions && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex flex-wrap gap-3">
                  <ConnectButton
                    targetUserId={profile.id}
                    targetUsername={profile.username}
                    initialStatus={connectionStatus}
                    onStatusChange={(newStatus) => setState(prev => ({ ...prev, connectionStatus: newStatus }))}
                  />
                  <FollowButton
                    targetUserId={profile.id}
                    initialIsFollowing={isFollowing}
                    onFollowChange={(newState) => setState(prev => ({ ...prev, isFollowing: newState }))}
                    size="md"
                  />
                  <SendMessageButton
                    targetUser={{
                      id: profile.id,
                      username: profile.username,
                      display_name: profile.display_name,
                      avatar_url: profile.avatar_url
                    }}
                  />
                  <ShareProfileButton
                    profile={{
                      id: profile.id,
                      username: profile.username,
                      display_name: profile.display_name,
                      avatar_url: profile.avatar_url
                    }}
                  />
                  <RecommendButton
                    entityType="user"
                    entityId={profile.id.toString()}
                    entityPreview={{
                      title: profile.display_name || profile.username,
                      description: profile.bio || null,
                      image_url: profile.avatar_url || null,
                      url: `/profile/${profile.username}`
                    }}
                  />
                </div>
              </div>
            )}

            {/* Profile Stats - Visible in Edit View for owners and admins */}
            {showStats && stats && <ProfileStatsSection stats={stats} />}
          </div>
        </div>

        {/* Panel Layout Manager - Handles all configurable panels including Recommendations */}
        <PanelLayoutManager
          username={profile.username}
          initialLayout={profileLayout}
          showControls={canEdit}
          isEditView={isEditView}
          showSharedConnections={showSharedConnections}
        />
      </div>

      {/* Edit Modal */}
      {canEdit && (
        <UserProfileEditModal
          isOpen={isEditModalOpen}
          onClose={() => {
            // Always refresh profile and interests when modal closes
            // This ensures interests added/edited in Section 3 are displayed
            handleProfileUpdate();
          }}
          profile={profile}
          onProfileUpdate={() => handleProfileUpdate()}
        />
      )}
    </div>
  );
}

// ============================================================================
// USERPROFILEPAGE COMPONENT (WITH ERRORBOUNDARY)
// ============================================================================

/**
 * UserProfilePage - Wrapped with ErrorBoundary (STANDARD tier requirement)
 *
 * @example
 * ```tsx
 * <UserProfilePage username="johndoe" />
 * ```
 */
export function UserProfilePage(props: UserProfilePageProps) {
  return (
    <ErrorBoundary componentName="UserProfilePage">
      <UserProfilePageContent {...props} />
    </ErrorBoundary>
  );
}

export default UserProfilePage;
