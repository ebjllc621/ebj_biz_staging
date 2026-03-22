/**
 * GroupMembersGrid Component
 * Displays group members in a grid layout with tab access management
 *
 * GOVERNANCE COMPLIANCE:
 * - STANDARD tier component
 * - Props interface with clear types
 *
 * @tier STANDARD
 * @phase Connection Groups Feature - Phase 1, Tab Access Permissions
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/components/connections/3-5-26/phases/PHASE_1_BRAIN_PLAN.md
 */

'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { X, Shield, Check, MessageCircle } from 'lucide-react';
import { getAvatarInitials } from '@core/utils/avatar';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { GroupMember } from '../types/groups';

const RESTRICTED_TAB_OPTIONS = [
  { id: 'recommendations', label: 'Recommendations' },
  { id: 'activity', label: 'Activity' },
  { id: 'quote-pool', label: 'Quote Pool' },
  { id: 'analytics', label: 'Analytics' }
] as const;

export interface GroupMembersGridProps {
  members: GroupMember[];
  onRemove?: (memberId: number) => void;
  editable?: boolean;
  showTabAccess?: boolean;
  showMessageLink?: boolean;
  groupId?: number;
  onTabAccessUpdated?: () => void;
  className?: string;
}

function GroupMembersGridComponent({
  members,
  onRemove,
  editable = false,
  showTabAccess = false,
  showMessageLink = false,
  groupId,
  onTabAccessUpdated,
  className = ''
}: GroupMembersGridProps) {
  const [managingMemberId, setManagingMemberId] = useState<number | null>(null);
  const [savingTabAccess, setSavingTabAccess] = useState(false);

  const handleToggleTab = useCallback(async (member: GroupMember, tabId: string) => {
    if (!groupId || savingTabAccess) return;

    setSavingTabAccess(true);
    const currentTabs = member.tabAccess || [];
    const newTabs = currentTabs.includes(tabId)
      ? currentTabs.filter(t => t !== tabId)
      : [...currentTabs, tabId];

    try {
      const response = await fetchWithCsrf(
        `/api/users/connections/groups/${groupId}/members/${member.memberUserId}/tab-access`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tabs: newTabs })
        }
      );

      if (response.ok && onTabAccessUpdated) {
        onTabAccessUpdated();
      }
    } catch {
      // Silently handle - user will see unchanged state
    } finally {
      setSavingTabAccess(false);
    }
  }, [groupId, savingTabAccess, onTabAccessUpdated]);

  if (members.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-gray-500">No members in this group yet</p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 ${className}`}>
      {members.map((member) => {
        const isManaging = managingMemberId === member.memberUserId;
        const grantedTabs = member.tabAccess || [];

        return (
          <div
            key={member.id}
            className="relative bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm transition-shadow"
          >
            {/* Remove Button */}
            {editable && onRemove && (
              <button
                onClick={() => onRemove(member.memberUserId)}
                className="absolute top-2 right-2 w-6 h-6 bg-red-50 hover:bg-red-100 rounded-full flex items-center justify-center transition-colors"
                title="Remove member"
              >
                <X className="w-4 h-4 text-red-600" />
              </button>
            )}

            {/* Avatar */}
            <div className="flex flex-col items-center text-center">
              {member.avatarUrl ? (
                <img
                  src={member.avatarUrl}
                  alt={member.displayName || member.username}
                  className="w-16 h-16 rounded-full object-cover mb-2"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-xl mb-2"
                  style={{ backgroundColor: member.avatarBgColor || '#3B82F6' }}
                >
                  {getAvatarInitials(member.displayName || member.username)}
                </div>
              )}

              {/* Name */}
              <h4 className="font-medium text-sm text-gray-900 truncate w-full">
                {member.displayName || member.username}
              </h4>
              <p className="text-xs text-gray-500 truncate w-full">@{member.username}</p>

              {/* Message Link */}
              {showMessageLink && (
                <Link
                  href={`/dashboard/messages?compose=user&userId=${member.memberUserId}&username=${encodeURIComponent(member.username)}&displayName=${encodeURIComponent(member.displayName || '')}&avatarUrl=${encodeURIComponent(member.avatarUrl || '')}`}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1.5 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  <MessageCircle className="w-3 h-3" />
                  Message
                </Link>
              )}

              {/* Tab Access Badge */}
              {showTabAccess && (
                <button
                  onClick={() => setManagingMemberId(isManaging ? null : member.memberUserId)}
                  className={`mt-2 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full transition-colors ${
                    grantedTabs.length > 0
                      ? 'bg-green-50 text-green-700 hover:bg-green-100'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                  title="Manage tab access"
                >
                  <Shield className="w-3 h-3" />
                  {grantedTabs.length > 0 ? `${grantedTabs.length} tab${grantedTabs.length > 1 ? 's' : ''}` : 'No tabs'}
                </button>
              )}
            </div>

            {/* Tab Access Dropdown */}
            {showTabAccess && isManaging && (
              <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-white rounded-lg border border-gray-200 shadow-lg p-3">
                <p className="text-xs font-medium text-gray-700 mb-2">Tab Access</p>
                <div className="space-y-1.5">
                  {RESTRICTED_TAB_OPTIONS.map(tab => {
                    const isGranted = grantedTabs.includes(tab.id);
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleToggleTab(member, tab.id)}
                        disabled={savingTabAccess}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-colors ${
                          isGranted
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        } ${savingTabAccess ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isGranted ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                        }`}>
                          {isGranted && <Check className="w-3 h-3 text-white" />}
                        </div>
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setManagingMemberId(null)}
                  className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700 text-center py-1"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export const GroupMembersGrid = React.memo(GroupMembersGridComponent);
GroupMembersGrid.displayName = 'GroupMembersGrid';
