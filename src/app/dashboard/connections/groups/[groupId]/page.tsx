/**
 * Group Detail Page with Tabs
 * Individual connection group page with Overview, Messages, Recommendations, Activity tabs
 *
 * GOVERNANCE COMPLIANCE:
 * - Client Component ('use client')
 * - ErrorBoundary wrapper (MANDATORY)
 * - Uses Phase 2 components
 *
 * @tier STANDARD
 * @phase Connection Groups Feature - Phase 2, Phase 4C Performance Optimization
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/3-5-26/phases/PHASE_2_BRAIN_PLAN.md
 * @reference src/app/dashboard/connections/page.tsx
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  Share2,
  BadgeCheck,
  Activity,
  Settings,
  ShoppingBag,
  Loader2,
  BarChart3,
  Copy,
  BookmarkPlus,
  UserPlus,
  Check,
  X as XIcon
} from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { GroupMembersGrid } from '@features/connections/components/GroupMembersGrid';
import { GroupMemberPicker } from '@features/connections/components/GroupMemberPicker';
import { SuggestMemberModal } from '@features/connections/components/SuggestMemberModal';

import { GroupActivityFeed } from '@features/connections/components/GroupActivityFeed';
import { GroupListingRecommendationCard } from '@features/connections/components/GroupListingRecommendationCard';
import { GroupRecommendListingModal } from '@features/connections/components/GroupRecommendListingModal';
import { GroupNotificationPreferences } from '@features/connections/components/GroupNotificationPreferences';
import { QuotePoolToggle } from '@features/connections/components/QuotePoolToggle';
import { SendQuoteToGroupModal } from '@features/connections/components/SendQuoteToGroupModal';
import { GroupBidComparisonPanel } from '@features/connections/components/GroupBidComparisonPanel';
import { InviteToQuotePoolModal } from '@features/connections/components/InviteToQuotePoolModal';
import { QuotePoolInvitationsList } from '@features/connections/components/QuotePoolInvitationsList';
import { DuplicateGroupModal } from '@features/connections/components/DuplicateGroupModal';
import { SaveAsTemplateModal } from '@features/connections/components/SaveAsTemplateModal';
import { ShareGroupPanel } from '@features/connections/components/ShareGroupPanel';
import dynamic from 'next/dynamic';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { ConnectionGroup, GroupMember } from '@features/connections/types/groups';
import type {
  GroupListingRecommendation,
  GroupMemberNotificationPreferences,
  GroupMemberSuggestion
} from '@features/connections/types/group-actions';

const GroupAnalyticsTab = dynamic(
  () => import('@features/connections/components/GroupAnalyticsTab').then(m => ({ default: m.GroupAnalyticsTab })),
  { ssr: false, loading: () => <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div> }
);

type TabId = 'overview' | 'recommendations' | 'activity' | 'quote-pool' | 'analytics' | 'settings';

const ALL_TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: Users },
  { id: 'recommendations', label: 'Recommendations', icon: BadgeCheck },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'quote-pool', label: 'Quote Pool', icon: ShoppingBag },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings }
];

// Tabs always visible to all users
const ALWAYS_VISIBLE_TABS: TabId[] = ['overview', 'settings'];
// Tabs restricted to owner by default, grantable to members
const RESTRICTED_TABS: TabId[] = ['recommendations', 'activity', 'quote-pool', 'analytics'];

function GroupDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const groupId = parseInt(params.groupId as string, 10);

  const [group, setGroup] = useState<ConnectionGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [recommendations, setRecommendations] = useState<GroupListingRecommendation[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [myPreferences, setMyPreferences] = useState<GroupMemberNotificationPreferences | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMemberPickerOpen, setIsMemberPickerOpen] = useState(false);
  const [isRecommendModalOpen, setIsRecommendModalOpen] = useState(false);
  const [isSendQuoteModalOpen, setIsSendQuoteModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [activeComparisonQuoteId, setActiveComparisonQuoteId] = useState<number | null>(null);
  const [pendingInvitationCount, setPendingInvitationCount] = useState(0);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [isSharePanelOpen, setIsSharePanelOpen] = useState(false);
  const [allowedTabs, setAllowedTabs] = useState<TabId[]>([...ALWAYS_VISIBLE_TABS]);
  const [isOwner, setIsOwner] = useState(false);
  const [isSuggestMemberOpen, setIsSuggestMemberOpen] = useState(false);
  const [pendingSuggestions, setPendingSuggestions] = useState<GroupMemberSuggestion[]>([]);
  const [isMuted, setIsMuted] = useState(false);

  const loadGroupData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load group details
      const groupRes = await fetch(`/api/users/connections/groups/${groupId}`, {
        credentials: 'include'
      });
      const groupResult = await groupRes.json();

      if (!groupRes.ok || !groupResult.success) {
        throw new Error(groupResult.error?.message || 'Group not found');
      }

      setGroup(groupResult.data.group);
      setCurrentUserId(groupResult.data.currentUserId || null);

      // Load tab access permissions
      const tabAccessRes = await fetch(`/api/users/connections/groups/${groupId}/tab-access`, {
        credentials: 'include'
      });
      const tabAccessResult = await tabAccessRes.json();

      if (tabAccessResult.success) {
        const userIsOwner = tabAccessResult.data.isOwner;
        setIsOwner(userIsOwner);
        if (userIsOwner) {
          setAllowedTabs([...ALWAYS_VISIBLE_TABS, ...RESTRICTED_TABS]);
        } else {
          const grantedTabs = (tabAccessResult.data.tabs || []) as TabId[];
          setAllowedTabs([...ALWAYS_VISIBLE_TABS, ...grantedTabs]);
        }
      }

      // Load members
      const membersRes = await fetch(`/api/users/connections/groups/${groupId}/members`, {
        credentials: 'include'
      });
      const membersResult = await membersRes.json();

      if (membersResult.success) {
        setMembers(membersResult.data.members || []);

        // Find current user's preferences
        if (groupResult.data.currentUserId) {
          const myMember = membersResult.data.members?.find(
            (m: GroupMember) => m.memberUserId === groupResult.data.currentUserId
          );
          if (myMember) {
            setMyPreferences({
              notifyMessages: myMember.notifyMessages ?? true,
              notifyActivity: myMember.notifyActivity ?? true,
              notifyRecommendations: myMember.notifyRecommendations ?? true
            });
            setIsMuted(myMember.isMuted ?? false);
          }
        }
      }

      // Load pending suggestions (owner only)
      if (tabAccessResult?.data?.isOwner) {
        try {
          const suggestionsRes = await fetch(`/api/users/connections/groups/${groupId}/suggestions`, {
            credentials: 'include'
          });
          const suggestionsResult = await suggestionsRes.json();
          if (suggestionsResult.success) {
            setPendingSuggestions(suggestionsResult.data.suggestions || []);
          }
        } catch {
          // Non-critical - ignore
        }
      }

      // Load recommendations
      const recsRes = await fetch(`/api/users/connections/groups/${groupId}/recommendations`, {
        credentials: 'include'
      });
      const recsResult = await recsRes.json();

      if (recsResult.success) {
        setRecommendations(recsResult.data.recommendations || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load group');
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (!isNaN(groupId)) {
      void loadGroupData();
    }
  }, [groupId, loadGroupData]);

  const handleRemoveMember = useCallback(async (memberId: number) => {
    if (!confirm('Remove this member from the group?')) return;

    try {
      const response = await fetchWithCsrf(
        `/api/users/connections/groups/${groupId}/members/${memberId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        await loadGroupData();
      }
    } catch {
      // Error handling
    }
  }, [groupId, loadGroupData]);

  const handleMembersAdded = useCallback(async () => {
    await loadGroupData();
  }, [loadGroupData]);

  const handleRecommendationSent = useCallback((recommendation: GroupListingRecommendation) => {
    setRecommendations(prev => [recommendation, ...prev]);
  }, []);

  if (isNaN(groupId)) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Invalid group ID</p>
        <Link href="/dashboard/connections/groups" className="text-blue-600 hover:underline mt-2 block">
          Back to Groups
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">{error || 'Group not found'}</p>
        <Link href="/dashboard/connections/groups" className="text-blue-600 hover:underline mt-2 block">
          Back to Groups
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/connections/groups"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Groups
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: group.color }}
            >
              <Users className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
              {group.description && (
                <p className="text-gray-600 mt-1">{group.description}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
              </p>
            </div>
          </div>
          {isOwner && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsSharePanelOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={() => setIsDuplicateModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Copy className="w-4 h-4" />
                Duplicate
              </button>
              <button
                onClick={() => setIsSaveTemplateModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <BookmarkPlus className="w-4 h-4" />
                Save as Template
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
          {ALL_TABS.filter(tab => allowedTabs.includes(tab.id)).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-3 sm:px-1 sm:mr-8 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 min-h-[44px] ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Group Members</h2>
                {isOwner ? (
                  <button
                    onClick={() => setIsMemberPickerOpen(true)}
                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Add Members
                  </button>
                ) : (
                  <button
                    onClick={() => setIsSuggestMemberOpen(true)}
                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    Suggest Member
                  </button>
                )}
              </div>

              <GroupMembersGrid
                members={members}
                onRemove={handleRemoveMember}
                editable={isOwner}
                showTabAccess={isOwner}
                showMessageLink={true}
                groupId={groupId}
                onTabAccessUpdated={loadGroupData}
              />
            </div>

            {/* Pending Suggestions (owner only) */}
            {isOwner && pendingSuggestions.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Pending Member Suggestions ({pendingSuggestions.length})
                </h3>
                <div className="space-y-3">
                  {pendingSuggestions.map((suggestion) => (
                    <div key={suggestion.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {suggestion.suggestedDisplayName || suggestion.suggestedUsername}
                        </p>
                        <p className="text-xs text-gray-500">
                          Suggested by {suggestion.suggestedByDisplayName || suggestion.suggestedByUsername}
                          {suggestion.message && <span className="italic"> &mdash; &quot;{suggestion.message}&quot;</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <button
                          onClick={async () => {
                            try {
                              await fetchWithCsrf(`/api/users/connections/groups/${groupId}/suggestions/${suggestion.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'approved' })
                              });
                              await loadGroupData();
                            } catch { /* ignore */ }
                          }}
                          className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await fetchWithCsrf(`/api/users/connections/groups/${groupId}/suggestions/${suggestion.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'denied' })
                              });
                              await loadGroupData();
                            } catch { /* ignore */ }
                          }}
                          className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                          title="Deny"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Listing Recommendations</h2>
              <button
                onClick={() => setIsRecommendModalOpen(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Recommend Listing
              </button>
            </div>

            {recommendations.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <Share2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No recommendations yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Share a listing with the group to get started
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {recommendations.map((rec) => (
                  <GroupListingRecommendationCard key={rec.id} recommendation={rec} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <GroupActivityFeed groupId={groupId} limit={50} />
        )}

        {/* Quote Pool Tab */}
        {activeTab === 'quote-pool' && group && (
          <div className="space-y-6">
            {/* Quote Pool Toggle */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Quote Pool Settings</h2>
              <QuotePoolToggle
                group={group}
                onUpdate={(updatedGroup) => setGroup(updatedGroup)}
              />
            </div>

            {/* Quote Pool Actions (only shown when enabled) */}
            {group.isQuotePool && (
              <>
                {/* Actions */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-900">Actions</h2>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setIsSendQuoteModalOpen(true)}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      Send Quote to Group
                    </button>
                    <button
                      onClick={() => setIsInviteModalOpen(true)}
                      className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
                    >
                      Invite by Email
                      {pendingInvitationCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                          {pendingInvitationCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Bid Comparison */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-900">Bid Comparison</h2>
                  </div>
                  {activeComparisonQuoteId ? (
                    <GroupBidComparisonPanel
                      groupId={groupId}
                      quoteId={activeComparisonQuoteId}
                    />
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-500">
                        Enter a quote ID to compare bids from group members.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Quote ID"
                          className="w-36 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = parseInt((e.target as HTMLInputElement).value, 10);
                              if (!isNaN(val)) setActiveComparisonQuoteId(val);
                            }
                          }}
                        />
                        <button
                          onClick={(e) => {
                            const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                            const val = parseInt(input.value, 10);
                            if (!isNaN(val)) setActiveComparisonQuoteId(val);
                          }}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Compare
                        </button>
                      </div>
                    </div>
                  )}
                  {activeComparisonQuoteId && (
                    <button
                      onClick={() => setActiveComparisonQuoteId(null)}
                      className="mt-4 text-xs text-gray-500 underline"
                    >
                      Clear comparison
                    </button>
                  )}
                </div>

                {/* Pending Invitations */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="font-semibold text-gray-900 mb-4">
                    Pending Invitations
                  </h2>
                  <QuotePoolInvitationsList
                    groupId={groupId}
                    onCountChange={setPendingInvitationCount}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <GroupAnalyticsTab groupId={groupId} />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Notification Preferences */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              {currentUserId && myPreferences && (
                <GroupNotificationPreferences
                  groupId={groupId}
                  memberId={currentUserId}
                  preferences={myPreferences}
                  onUpdate={(prefs) => setMyPreferences(prefs)}
                />
              )}

              {currentUserId && !myPreferences && (
                <p className="text-gray-500">
                  Notification preferences are available for group members.
                </p>
              )}

              {!currentUserId && (
                <p className="text-gray-500">Loading settings...</p>
              )}
            </div>

            {/* Mute Group (non-owner members) */}
            {currentUserId && !isOwner && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Mute Group</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Silence all notifications from this group. Activity will continue but you won&apos;t be notified.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isMuted}
                    onClick={async () => {
                      const newMuted = !isMuted;
                      setIsMuted(newMuted);
                      try {
                        await fetchWithCsrf(`/api/users/connections/groups/${groupId}/mute`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ muted: newMuted })
                        });
                      } catch {
                        setIsMuted(!newMuted); // revert
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      isMuted ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isMuted ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* Leave Group (non-owner members) */}
            {currentUserId && !isOwner && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-gray-900">Leave Group</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">
                  Remove yourself from this group. The group owner will be notified.
                </p>
                <div className="space-y-3">
                  <textarea
                    id="leave-reason"
                    placeholder="Reason for leaving (optional)"
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  />
                  <button
                    onClick={async () => {
                      if (!confirm('Are you sure you want to leave this group? This action cannot be undone.')) return;
                      const reasonEl = document.getElementById('leave-reason') as HTMLTextAreaElement | null;
                      const reason = reasonEl?.value?.trim() || undefined;
                      try {
                        const res = await fetchWithCsrf(`/api/users/connections/groups/${groupId}/leave`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ reason })
                        });
                        if (res.ok) {
                          router.push('/dashboard/connections/groups');
                        }
                      } catch {
                        // Error handling
                      }
                    }}
                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Leave Group
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Member Picker Modal */}
      {group && (
        <GroupMemberPicker
          isOpen={isMemberPickerOpen}
          onClose={() => setIsMemberPickerOpen(false)}
          groupId={group.id}
          groupName={group.name}
          existingMembers={members}
          onMembersAdded={handleMembersAdded}
        />
      )}

      {/* Suggest Member Modal (non-owner) */}
      {group && (
        <SuggestMemberModal
          isOpen={isSuggestMemberOpen}
          onClose={() => setIsSuggestMemberOpen(false)}
          groupId={group.id}
          groupName={group.name}
          existingMembers={members}
          onSuggestionSent={loadGroupData}
        />
      )}

      {/* Recommend Listing Modal */}
      <GroupRecommendListingModal
        isOpen={isRecommendModalOpen}
        onClose={() => setIsRecommendModalOpen(false)}
        groupId={groupId}
        onRecommendationSent={handleRecommendationSent}
      />

      {/* Send Quote to Group Modal */}
      {group && (
        <SendQuoteToGroupModal
          isOpen={isSendQuoteModalOpen}
          onClose={() => setIsSendQuoteModalOpen(false)}
          groupId={group.id}
          groupName={group.name}
          onSent={() => setIsSendQuoteModalOpen(false)}
        />
      )}

      {/* Invite to Quote Pool Modal */}
      {group && (
        <InviteToQuotePoolModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          groupId={group.id}
          groupName={group.name}
          onInvited={() => {
            setIsInviteModalOpen(false);
          }}
        />
      )}

      {/* Phase 4B: Duplicate Group Modal */}
      {group && (
        <DuplicateGroupModal
          isOpen={isDuplicateModalOpen}
          onClose={() => setIsDuplicateModalOpen(false)}
          groupId={group.id}
          groupName={group.name}
          onDuplicated={(newGroup) => {
            setIsDuplicateModalOpen(false);
            router.push(`/dashboard/connections/groups/${newGroup.id}`);
          }}
        />
      )}

      {/* Phase 4B: Save as Template Modal */}
      {group && (
        <SaveAsTemplateModal
          isOpen={isSaveTemplateModalOpen}
          onClose={() => setIsSaveTemplateModalOpen(false)}
          groupId={group.id}
          groupName={group.name}
          onSaved={() => {
            setIsSaveTemplateModalOpen(false);
          }}
        />
      )}

      {/* Phase 4B: Share Group Panel */}
      <ShareGroupPanel
        groupId={groupId}
        isOpen={isSharePanelOpen}
        onClose={() => setIsSharePanelOpen(false)}
      />
    </div>
  );
}

export default function GroupDetailPage() {
  return (
    <ErrorBoundary
      componentName="GroupDetailPage"
      fallback={
        <div className="p-8 text-center text-gray-500 bg-white rounded-xl shadow-sm">
          <p>Unable to load group page.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-blue-600 underline"
          >
            Refresh page
          </button>
        </div>
      }
    >
      <GroupDetailPageContent />
    </ErrorBoundary>
  );
}
