/**
 * QuotePoolInvitationsList Component
 * Display pending quote pool invitations with cancel action
 *
 * GOVERNANCE COMPLIANCE:
 * - SIMPLE tier component (< 300 lines)
 * - CSRF protection via fetchWithCsrf
 * - Client Component ('use client')
 *
 * @tier SIMPLE
 * @phase Connection Groups Feature - Phase 3B
 * @generated ComponentBuilder
 */

'use client';

import React, { useState, useEffect } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';
import { Mail, X, Loader2, Clock } from 'lucide-react';
import type { QuotePoolInvitation } from '../types/groups';

export interface QuotePoolInvitationsListProps {
  groupId: number;
  onCountChange?: (count: number) => void;
}

function formatExpiry(expiresAt: Date): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Expired';
  if (diffDays === 1) return 'Expires tomorrow';
  return `Expires in ${diffDays} days`;
}

export function QuotePoolInvitationsList({
  groupId,
  onCountChange
}: QuotePoolInvitationsListProps) {
  const [invitations, setInvitations] = useState<QuotePoolInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  useEffect(() => {
    void loadInvitations();
  }, [groupId]);

  const loadInvitations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/users/connections/groups/${groupId}/quote-pool/invitations`,
        { credentials: 'include' }
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to load invitations');
      }

      const items = result.data.invitations as QuotePoolInvitation[];
      setInvitations(items);
      onCountChange?.(items.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invitations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (invitationId: number) => {
    if (!confirm('Cancel this invitation?')) return;

    setCancellingId(invitationId);

    try {
      const response = await fetchWithCsrf(
        `/api/users/connections/groups/${groupId}/quote-pool/invitations/${invitationId}`,
        { method: 'DELETE' }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to cancel invitation');
      }

      const updated = invitations.filter((inv) => inv.id !== invitationId);
      setInvitations(updated);
      onCountChange?.(updated.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel invitation');
    } finally {
      setCancellingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={() => void loadInvitations()}
          className="mt-1 text-xs text-red-700 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center py-6">
        <Mail className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No pending invitations</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {invitations.map((invitation) => (
        <div
          key={invitation.id}
          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
        >
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Mail className="w-4 h-4 text-blue-600" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {invitation.inviteeEmail}
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>{formatExpiry(invitation.expiresAt)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCancel(invitation.id)}
            disabled={cancellingId === invitation.id}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            title="Cancel invitation"
          >
            {cancellingId === invitation.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
