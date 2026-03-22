/**
 * ShareGroupPanel Component
 * Panel for sharing a group - displays group preview and copy-to-clipboard share text
 *
 * GOVERNANCE COMPLIANCE:
 * - SIMPLE tier component
 * - Client Component ('use client')
 * - No ErrorBoundary needed (SIMPLE tier)
 *
 * @tier SIMPLE
 * @phase Connection Groups Feature - Phase 4B
 * @generated ComponentBuilder
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Share2, Copy, Check, Loader2, X, Users, ShoppingBag } from 'lucide-react';
import type { GroupShareInfo } from '@features/connections/types/groups';

export interface ShareGroupPanelProps {
  groupId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareGroupPanel({ groupId, isOpen, onClose }: ShareGroupPanelProps) {
  const [shareInfo, setShareInfo] = useState<GroupShareInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isOpen && groupId) {
      void loadShareInfo();
    }
  }, [isOpen, groupId]);

  const loadShareInfo = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/users/connections/groups/${groupId}/share`, {
        credentials: 'include'
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to load share info');
      }

      setShareInfo(result.data.shareInfo as GroupShareInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load share info');
    } finally {
      setIsLoading(false);
    }
  };

  const buildShareText = (info: GroupShareInfo): string => {
    const lines: string[] = [
      `Join my connection group: ${info.groupName}`,
    ];

    if (info.description) {
      lines.push(info.description);
    }

    lines.push(`${info.memberCount} ${info.memberCount === 1 ? 'member' : 'members'}`);

    if (info.isQuotePool) {
      lines.push('This group is a Quote Pool - get competitive quotes from trusted connections.');
    }

    lines.push('');
    lines.push(`Organized by @${info.ownerUsername}${info.ownerDisplayName ? ` (${info.ownerDisplayName})` : ''}`);

    return lines.join('\n');
  };

  const handleCopy = async () => {
    if (!shareInfo) return;

    const text = buildShareText(shareInfo);

    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback for environments where clipboard API is not available
      setError('Unable to copy to clipboard. Please copy the text manually.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Share Group</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={() => void loadShareInfo()}
                className="mt-2 text-sm text-red-700 underline"
              >
                Try again
              </button>
            </div>
          ) : shareInfo ? (
            <div className="space-y-4">
              {/* Group Preview Card */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: shareInfo.color }}
                  >
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{shareInfo.groupName}</h3>
                      {shareInfo.isQuotePool && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">
                          <ShoppingBag className="w-3 h-3" />
                          Quote Pool
                        </span>
                      )}
                    </div>
                    {shareInfo.description && (
                      <p className="text-sm text-gray-600 mt-1">{shareInfo.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {shareInfo.memberCount} {shareInfo.memberCount === 1 ? 'member' : 'members'} &middot; by @{shareInfo.ownerUsername}
                    </p>
                  </div>
                </div>
              </div>

              {/* Share Text Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share message
                </label>
                <div className="relative">
                  <pre className="w-full p-3 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg whitespace-pre-wrap font-sans">
                    {buildShareText(shareInfo)}
                  </pre>
                </div>
              </div>

              {/* Copy Button */}
              <button
                onClick={() => void handleCopy()}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isCopied
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied to clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Share Message
                  </>
                )}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
