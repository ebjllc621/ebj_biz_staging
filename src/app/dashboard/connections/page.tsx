/**
 * Dashboard Connections Page
 *
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/pages/layouts/home/user/phases/troubleshooting/connect/CONNECTIONS_USABILITY_BRAIN_PLAN.md
 *
 * Features:
 * - Displays user connections with proper avatars via ConnectionCard
 * - Send Message functionality via SendMessageModal
 * - Remove connection with confirmation via RemoveConnectionModal
 * - View profile navigation
 * - Incoming/Sent request management
 * - Search functionality across all tabs
 * - Pagination with configurable page size (20/50/100/All)
 */
'use client';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Route } from 'next';
import { fetchWithCsrf } from '@core/utils/csrf';
import { UserConnection, ConnectionRequest, DismissedConnection, BlockedUser } from '@features/connections/types';
import { ConnectionCard } from '@features/connections/components/ConnectionCard';
import { SendMessageModal } from '@features/messaging/components/SendMessageModal';
import { RemoveConnectionModal } from '@features/connections/components/RemoveConnectionModal';
import { PeopleYouMayKnow } from '@features/connections/components/PeopleYouMayKnow';
import { ConfirmRemoveDismissedModal } from '@features/connections/components/ConfirmRemoveDismissedModal';
import { BlockUserModal } from '@features/connections/components/BlockUserModal';
import { UnblockModal } from '@features/connections/components/UnblockModal';
import { RecommendModal } from '@features/sharing/components';
import { getAvatarInitials } from '@core/utils/avatar';
import { ConnectionsSearchBar } from '@features/connections/components/ConnectionsSearchBar';
import { ConnectionsPagination, type PageSize } from '@features/connections/components/ConnectionsPagination';
import { ErrorService } from '@core/services/ErrorService';

function ConnectionsPageContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  // Initialize tab from URL query param or default to 'connections'
  const getInitialTab = (): 'connections' | 'incoming' | 'sent' | 'dismissed' | 'blacklist' => {
    if (tabParam === 'incoming') return 'incoming';
    if (tabParam === 'sent') return 'sent';
    if (tabParam === 'dismissed') return 'dismissed';
    if (tabParam === 'blacklist') return 'blacklist';
    return 'connections';
  };

  const [activeTab, setActiveTab] = useState<'connections' | 'incoming' | 'sent' | 'dismissed' | 'blacklist'>(getInitialTab());
  const [connections, setConnections] = useState<UserConnection[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<ConnectionRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<ConnectionRequest[]>([]);
  const [dismissedConnections, setDismissedConnections] = useState<DismissedConnection[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search and pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);

  // Message modal state
  const [messageTarget, setMessageTarget] = useState<{
    id: number;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

  // Remove connection modal state
  const [removeTarget, setRemoveTarget] = useState<UserConnection | null>(null);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);

  // Remove dismissed modal state
  const [dismissedTarget, setDismissedTarget] = useState<DismissedConnection | null>(null);
  const [isDismissedModalOpen, setIsDismissedModalOpen] = useState(false);

  // Block user modal state
  const [blockTarget, setBlockTarget] = useState<{
    user_id: number;
    username: string;
    display_name: string | null;
  } | null>(null);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);

  // Unblock modal state
  const [unblockTarget, setUnblockTarget] = useState<BlockedUser | null>(null);
  const [isUnblockModalOpen, setIsUnblockModalOpen] = useState(false);

  // Recommend modal state
  const [recommendTarget, setRecommendTarget] = useState<UserConnection | null>(null);
  const [isRecommendModalOpen, setIsRecommendModalOpen] = useState(false);

  // Track tabs with new/unseen activity (notification indicators)
  // These are set to true when new data arrives, cleared when user views that tab
  const [hasNewIncoming, setHasNewIncoming] = useState(false);
  const [hasNewSent, setHasNewSent] = useState(false);

  // Reset to page 1 when search query or active tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  // Clear notification indicator when user views a tab
  useEffect(() => {
    if (activeTab === 'incoming') {
      setHasNewIncoming(false);
    } else if (activeTab === 'sent') {
      setHasNewSent(false);
    }
  }, [activeTab]);

  // Filter connections based on search query
  const filteredConnections = useMemo(() => {
    if (!searchQuery.trim()) return connections;
    const query = searchQuery.toLowerCase();
    return connections.filter(conn =>
      conn.username.toLowerCase().includes(query) ||
      conn.display_name?.toLowerCase().includes(query)
    );
  }, [connections, searchQuery]);

  // Filter incoming requests based on search query
  const filteredIncomingRequests = useMemo(() => {
    if (!searchQuery.trim()) return incomingRequests;
    const query = searchQuery.toLowerCase();
    return incomingRequests.filter(req =>
      req.sender_username?.toLowerCase().includes(query) ||
      req.sender_display_name?.toLowerCase().includes(query)
    );
  }, [incomingRequests, searchQuery]);

  // Filter sent requests based on search query
  const filteredSentRequests = useMemo(() => {
    if (!searchQuery.trim()) return sentRequests;
    const query = searchQuery.toLowerCase();
    return sentRequests.filter(req =>
      req.sender_username?.toLowerCase().includes(query) ||
      req.sender_display_name?.toLowerCase().includes(query)
    );
  }, [sentRequests, searchQuery]);

  // Filter dismissed connections based on search query
  const filteredDismissedConnections = useMemo(() => {
    if (!searchQuery.trim()) return dismissedConnections;
    const query = searchQuery.toLowerCase();
    return dismissedConnections.filter(dismissed =>
      dismissed.username.toLowerCase().includes(query) ||
      dismissed.display_name?.toLowerCase().includes(query)
    );
  }, [dismissedConnections, searchQuery]);

  // Filter blocked users based on search query
  const filteredBlockedUsers = useMemo(() => {
    if (!searchQuery.trim()) return blockedUsers;
    const query = searchQuery.toLowerCase();
    return blockedUsers.filter(blocked =>
      blocked.username.toLowerCase().includes(query) ||
      blocked.display_name?.toLowerCase().includes(query)
    );
  }, [blockedUsers, searchQuery]);

  // Get current tab's filtered data for pagination
  const getCurrentTabData = () => {
    switch (activeTab) {
      case 'connections': return { filtered: filteredConnections, total: connections };
      case 'incoming': return { filtered: filteredIncomingRequests, total: incomingRequests };
      case 'sent': return { filtered: filteredSentRequests, total: sentRequests };
      case 'dismissed': return { filtered: filteredDismissedConnections, total: dismissedConnections };
      case 'blacklist': return { filtered: filteredBlockedUsers, total: blockedUsers };
      default: return { filtered: [] as UserConnection[], total: [] as UserConnection[] };
    }
  };

  const currentTabData = getCurrentTabData();

  // Paginate the current tab's filtered data
  const paginateData = <T,>(data: T[]): T[] => {
    if (pageSize === 'all') return data;
    const startIndex = (currentPage - 1) * pageSize;
    return data.slice(startIndex, startIndex + pageSize);
  };

  // Get item label for current tab
  const getItemLabel = () => {
    switch (activeTab) {
      case 'connections': return 'connections';
      case 'incoming': return 'requests';
      case 'sent': return 'requests';
      case 'dismissed': return 'dismissed';
      case 'blacklist': return 'blocked';
      default: return 'items';
    }
  };

  useEffect(() => {
    loadData();
    // Mark connection_request notifications as read when user visits this page
    markConnectionNotificationsRead();
  }, []);

  const markConnectionNotificationsRead = async () => {
    try {
      await fetchWithCsrf('/api/dashboard/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationType: 'connection_request' })
      });
    } catch (error) {
      // Silent fail - don't interrupt user experience for notification marking
      ErrorService.capture('Failed to mark notifications as read:', error);
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load connections
      // API returns: { success: true, data: { connections: [...], ... } }
      const connectionsRes = await fetch('/api/users/connections', {
        credentials: 'include'
      });
      if (connectionsRes.ok) {
        const result = await connectionsRes.json();
        // Unwrap the data property from createSuccessResponse
        const data = result.data || result;
        setConnections(data.connections || []);
      }

      // Load requests
      // API returns: { success: true, data: { pending_received: [...], pending_sent: [...] } }
      const requestsRes = await fetch('/api/users/connections/requests', {
        credentials: 'include'
      });
      if (requestsRes.ok) {
        const result = await requestsRes.json();
        // Unwrap the data property from createSuccessResponse
        const data = result.data || result;
        const newIncoming = data.pending_received || [];
        const newSent = data.pending_sent || [];
        setIncomingRequests(newIncoming);
        setSentRequests(newSent);

        // Set notification indicator if there are items and user isn't viewing that tab
        // This helps users see where new activity is when they open the page
        if (newIncoming.length > 0 && activeTab !== 'incoming') {
          setHasNewIncoming(true);
        }
      }

      // Load dismissed connections
      const dismissedRes = await fetch('/api/users/connections/dismissed', {
        credentials: 'include'
      });
      if (dismissedRes.ok) {
        const result = await dismissedRes.json();
        const data = result.data || result;
        setDismissedConnections(data.dismissed || []);
      }

      // Load blocked users (blacklist)
      const blockedRes = await fetch('/api/users/connections/blocked', {
        credentials: 'include'
      });
      if (blockedRes.ok) {
        const result = await blockedRes.json();
        const data = result.data || result;
        setBlockedUsers(data.blocked || []);
      }
    } catch (error) {
      ErrorService.capture('Failed to load connection data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (requestId: number) => {
    try {
      const response = await fetchWithCsrf(`/api/users/connections/requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' })
      });

      if (response.ok) {
        // Optimistic UI update: immediately remove from incoming requests
        // This provides instant feedback without waiting for refetch
        setIncomingRequests(prev => prev.filter(req => req.id !== requestId));

        // Reload full data to sync connections count and get new connection details
        loadData();
      }
    } catch (error) {
      ErrorService.capture('Failed to accept request:', error);
    }
  };

  const handleDecline = async (requestId: number) => {
    try {
      const response = await fetchWithCsrf(`/api/users/connections/requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline' })
      });

      if (response.ok) {
        // Optimistic UI update: immediately remove from incoming requests
        // This provides instant feedback without waiting for refetch
        setIncomingRequests(prev => prev.filter(req => req.id !== requestId));

        // Reload full data to sync dismissed list
        loadData();
      }
    } catch (error) {
      ErrorService.capture('Failed to decline request:', error);
    }
  };

  // Handle send message - opens SendMessageModal
  const handleSendMessage = (connection: UserConnection) => {
    setMessageTarget({
      id: connection.user_id,
      username: connection.username,
      display_name: connection.display_name,
      avatar_url: connection.avatar_url
    });
    setIsMessageModalOpen(true);
  };

  // Handle remove connection - opens RemoveConnectionModal
  const handleRemoveConnection = (connection: UserConnection) => {
    setRemoveTarget(connection);
    setIsRemoveModalOpen(true);
  };

  // Handle recommend connection - opens RecommendModal to recommend this user
  const handleRecommendConnection = (connection: UserConnection) => {
    setRecommendTarget(connection);
    setIsRecommendModalOpen(true);
  };

  // Handle successful connection removal
  const handleRemoveSuccess = () => {
    loadData(); // Reload connections list
  };

  // Handle remove dismissed - opens ConfirmRemoveDismissedModal
  const handleRemoveDismissed = (dismissed: DismissedConnection) => {
    setDismissedTarget(dismissed);
    setIsDismissedModalOpen(true);
  };

  // Handle successful dismissed removal
  const handleDismissedRemoveSuccess = () => {
    loadData(); // Reload all data
  };

  // Handle block user - opens BlockUserModal
  const handleBlockUser = (dismissed: DismissedConnection) => {
    setBlockTarget({
      user_id: dismissed.user_id,
      username: dismissed.username,
      display_name: dismissed.display_name
    });
    setIsBlockModalOpen(true);
  };

  // Handle successful block
  const handleBlockSuccess = () => {
    loadData(); // Reload all data including blacklist
  };

  // Handle unblock user - opens UnblockModal
  const handleUnblockUser = (blocked: BlockedUser) => {
    setUnblockTarget(blocked);
    setIsUnblockModalOpen(true);
  };

  // Handle successful unblock
  const handleUnblockSuccess = () => {
    loadData(); // Reload all data
  };

  // Handle connection request sent from PeopleYouMayKnow
  // Updates the Sent Requests tab immediately and shows notification indicator
  const handleConnectionRequestSent = () => {
    // Show notification indicator if user isn't on the sent tab
    if (activeTab !== 'sent') {
      setHasNewSent(true);
    }
    // Reload data to get the new sent request
    loadData();
  };

  // Format reason for display
  const formatDismissReason = (dismissed: DismissedConnection): string => {
    if (dismissed.source === 'request_declined') {
      return 'Declined connection request';
    }
    if (dismissed.dismiss_reason) {
      const reasons: Record<string, string> = {
        dont_know: "Don't know this person",
        not_relevant: 'Not relevant',
        spam: 'Spam',
        already_contacted: 'Already contacted',
        other: dismissed.other_reason || 'Other reason'
      };
      return reasons[dismissed.dismiss_reason] || 'Dismissed from PYMK';
    }
    return 'Dismissed from PYMK';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Connections</h1>
        <p className="text-gray-600 mt-1">Manage your professional network</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('connections')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'connections' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            My Connections ({connections.length})
          </button>
          <button
            onClick={() => setActiveTab('incoming')}
            className={`relative py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'incoming' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Incoming Requests ({incomingRequests.length})
            {/* Notification indicator for new incoming requests */}
            {hasNewIncoming && activeTab !== 'incoming' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`relative py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sent' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Sent Requests ({sentRequests.length})
            {/* Notification indicator for new sent requests */}
            {hasNewSent && activeTab !== 'sent' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('dismissed')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'dismissed' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Dismissed ({dismissedConnections.length})
          </button>
          <button
            onClick={() => setActiveTab('blacklist')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'blacklist' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Blacklist ({blockedUsers.length})
          </button>
        </nav>
      </div>

      {/* Search Bar */}
      <ConnectionsSearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalCount={currentTabData.total.length}
        filteredCount={currentTabData.filtered.length}
        itemLabel={getItemLabel()}
      />

      <div>
        {isLoading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500">
            Loading...
          </div>
        ) : (
          <>
            {activeTab === 'connections' && (
              <div className="space-y-4">
                {filteredConnections.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500">
                    {searchQuery.trim() ? 'No connections match your search' : 'No connections yet'}
                  </div>
                ) : (
                  <>
                    {paginateData(filteredConnections).map((connection) => (
                      <ConnectionCard
                        key={connection.id}
                        connection={connection}
                        onMessage={() => handleSendMessage(connection)}
                        onRemove={() => handleRemoveConnection(connection)}
                        onRecommend={() => handleRecommendConnection(connection)}
                        showActions={true}
                      />
                    ))}
                    <ConnectionsPagination
                      totalCount={filteredConnections.length}
                      currentPage={currentPage}
                      pageSize={pageSize}
                      onPageChange={setCurrentPage}
                      onPageSizeChange={setPageSize}
                      itemLabel="connections"
                    />
                  </>
                )}
              </div>
            )}

            {activeTab === 'incoming' && (
              <div className="space-y-4">
                {filteredIncomingRequests.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500">
                    {searchQuery.trim() ? 'No requests match your search' : 'No pending requests'}
                  </div>
                ) : (
                  <>
                    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
                      {paginateData(filteredIncomingRequests).map((request) => (
                        <div key={request.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/profile/${request.sender_username}` as Route}
                              className="flex-shrink-0"
                            >
                              {request.sender_avatar_url ? (
                                <img
                                  src={request.sender_avatar_url}
                                  alt={request.sender_display_name || request.sender_username || ''}
                                  className="w-12 h-12 rounded-full object-cover ring-2 ring-transparent hover:ring-biz-orange transition-all"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-biz-navy to-biz-orange flex items-center justify-center ring-2 ring-transparent hover:ring-biz-orange transition-all">
                                  <span className="text-white font-semibold">
                                    {request.sender_username?.substring(0, 2).toUpperCase() || '?'}
                                  </span>
                                </div>
                              )}
                            </Link>
                            <div>
                              <Link
                                href={`/profile/${request.sender_username}` as Route}
                                className="group"
                              >
                                <p className="font-medium text-gray-900 group-hover:text-biz-orange transition-colors">{request.sender_display_name || request.sender_username}</p>
                                <p className="text-sm text-gray-500">@{request.sender_username}</p>
                              </Link>
                              {request.message && <p className="text-sm text-gray-600 mt-1">{request.message}</p>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAccept(request.id)}
                              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleDecline(request.id)}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <ConnectionsPagination
                      totalCount={filteredIncomingRequests.length}
                      currentPage={currentPage}
                      pageSize={pageSize}
                      onPageChange={setCurrentPage}
                      onPageSizeChange={setPageSize}
                      itemLabel="requests"
                    />
                  </>
                )}
              </div>
            )}

            {activeTab === 'sent' && (
              <div className="space-y-4">
                {filteredSentRequests.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500">
                    {searchQuery.trim() ? 'No requests match your search' : 'No sent requests'}
                  </div>
                ) : (
                  <>
                    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
                      {paginateData(filteredSentRequests).map((request) => (
                        <div key={request.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/profile/${request.sender_username}` as Route}
                              className="flex-shrink-0"
                            >
                              {request.sender_avatar_url ? (
                                <img
                                  src={request.sender_avatar_url}
                                  alt={request.sender_display_name || request.sender_username || ''}
                                  className="w-12 h-12 rounded-full object-cover ring-2 ring-transparent hover:ring-biz-orange transition-all"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-biz-navy to-biz-orange flex items-center justify-center ring-2 ring-transparent hover:ring-biz-orange transition-all">
                                  <span className="text-white font-semibold">
                                    {request.sender_username?.substring(0, 2).toUpperCase() || '?'}
                                  </span>
                                </div>
                              )}
                            </Link>
                            <div>
                              <Link
                                href={`/profile/${request.sender_username}` as Route}
                                className="group"
                              >
                                <p className="font-medium text-gray-900 group-hover:text-biz-orange transition-colors">{request.sender_display_name || request.sender_username}</p>
                                <p className="text-sm text-gray-500">@{request.sender_username}</p>
                              </Link>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">Pending</span>
                        </div>
                      ))}
                    </div>
                    <ConnectionsPagination
                      totalCount={filteredSentRequests.length}
                      currentPage={currentPage}
                      pageSize={pageSize}
                      onPageChange={setCurrentPage}
                      onPageSizeChange={setPageSize}
                      itemLabel="requests"
                    />
                  </>
                )}
              </div>
            )}

            {activeTab === 'dismissed' && (
              <div className="space-y-4">
                {filteredDismissedConnections.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500">
                    {searchQuery.trim() ? (
                      <p>No dismissed connections match your search</p>
                    ) : (
                      <>
                        <p>No dismissed connections</p>
                        <p className="text-sm mt-1">Connections you decline or dismiss from PYMK will appear here</p>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
                      {paginateData(filteredDismissedConnections).map((dismissed) => (
                        <div key={`${dismissed.source}-${dismissed.id}`} className="p-4 flex items-center justify-between hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/profile/${dismissed.username}` as Route}
                              className="flex-shrink-0"
                            >
                              {dismissed.avatar_url ? (
                                <img
                                  src={dismissed.avatar_url}
                                  alt={dismissed.display_name || dismissed.username}
                                  className="w-12 h-12 rounded-full object-cover ring-2 ring-transparent hover:ring-biz-orange transition-all"
                                />
                              ) : (
                                <div
                                  className="w-12 h-12 rounded-full flex items-center justify-center ring-2 ring-transparent hover:ring-biz-orange transition-all"
                                  style={{ backgroundColor: dismissed.avatar_bg_color || '#1a365d' }}
                                >
                                  <span className="text-white font-semibold">
                                    {getAvatarInitials(dismissed.display_name, dismissed.username)}
                                  </span>
                                </div>
                              )}
                            </Link>
                            <div>
                              <Link
                                href={`/profile/${dismissed.username}` as Route}
                                className="group"
                              >
                                <p className="font-medium text-gray-900 group-hover:text-biz-orange transition-colors">{dismissed.display_name || dismissed.username}</p>
                                <p className="text-sm text-gray-500">@{dismissed.username}</p>
                              </Link>
                              <p className="text-xs text-gray-600 mt-0.5">
                                {formatDismissReason(dismissed)}
                                {dismissed.request_message && (
                                  <span className="ml-2 italic">&ldquo;{dismissed.request_message.substring(0, 50)}{dismissed.request_message.length > 50 ? '...' : ''}&rdquo;</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-600">
                              {new Date(dismissed.dismissed_at).toLocaleDateString()}
                            </span>
                            <button
                              onClick={() => handleBlockUser(dismissed)}
                              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                              title="Block this user"
                            >
                              Block
                            </button>
                            <button
                              onClick={() => handleRemoveDismissed(dismissed)}
                              className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                              title="Permanently remove from list"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <ConnectionsPagination
                      totalCount={filteredDismissedConnections.length}
                      currentPage={currentPage}
                      pageSize={pageSize}
                      onPageChange={setCurrentPage}
                      onPageSizeChange={setPageSize}
                      itemLabel="dismissed"
                    />
                  </>
                )}
              </div>
            )}

            {activeTab === 'blacklist' && (
              <div className="space-y-4">
                {filteredBlockedUsers.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500">
                    {searchQuery.trim() ? (
                      <p>No blocked users match your search</p>
                    ) : (
                      <>
                        <p>No blocked users</p>
                        <p className="text-sm mt-1">Users you block will appear here</p>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
                      {paginateData(filteredBlockedUsers).map((blocked) => (
                        <div key={blocked.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/profile/${blocked.username}` as Route}
                              className="flex-shrink-0"
                            >
                              {blocked.avatar_url ? (
                                <img
                                  src={blocked.avatar_url}
                                  alt={blocked.display_name || blocked.username}
                                  className="w-12 h-12 rounded-full object-cover ring-2 ring-transparent hover:ring-biz-orange transition-all"
                                />
                              ) : (
                                <div
                                  className="w-12 h-12 rounded-full flex items-center justify-center ring-2 ring-transparent hover:ring-biz-orange transition-all"
                                  style={{ backgroundColor: blocked.avatar_bg_color || '#1a365d' }}
                                >
                                  <span className="text-white font-semibold">
                                    {getAvatarInitials(blocked.display_name, blocked.username)}
                                  </span>
                                </div>
                              )}
                            </Link>
                            <div>
                              <Link
                                href={`/profile/${blocked.username}` as Route}
                                className="group"
                              >
                                <p className="font-medium text-gray-900 group-hover:text-biz-orange transition-colors">{blocked.display_name || blocked.username}</p>
                                <p className="text-sm text-gray-500">@{blocked.username}</p>
                              </Link>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {blocked.block_messages && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Messages
                                  </span>
                                )}
                                {blocked.block_connections && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    Connections
                                  </span>
                                )}
                                {blocked.block_pymk && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    PYMK
                                  </span>
                                )}
                              </div>
                              {blocked.block_reason && (
                                <p className="text-xs text-gray-600 mt-1">
                                  Reason: {blocked.block_reason}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-600">
                              {new Date(blocked.blocked_at).toLocaleDateString()}
                            </span>
                            <button
                              onClick={() => handleUnblockUser(blocked)}
                              className="px-3 py-1.5 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors"
                              title="Unblock this user"
                            >
                              Unblock
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <ConnectionsPagination
                      totalCount={filteredBlockedUsers.length}
                      currentPage={currentPage}
                      pageSize={pageSize}
                      onPageChange={setCurrentPage}
                      onPageSizeChange={setPageSize}
                      itemLabel="blocked"
                    />
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Send Message Modal */}
      {messageTarget && (
        <SendMessageModal
          isOpen={isMessageModalOpen}
          onClose={() => {
            setIsMessageModalOpen(false);
            setMessageTarget(null);
          }}
          targetUser={messageTarget}
          onMessageSent={() => {
            // Optional: could show a success toast here
          }}
        />
      )}

      {/* Remove Connection Modal */}
      {removeTarget && (
        <RemoveConnectionModal
          isOpen={isRemoveModalOpen}
          onClose={() => {
            setIsRemoveModalOpen(false);
            setRemoveTarget(null);
          }}
          connection={removeTarget}
          onSuccess={handleRemoveSuccess}
        />
      )}

      {/* Confirm Remove Dismissed Modal */}
      {dismissedTarget && (
        <ConfirmRemoveDismissedModal
          isOpen={isDismissedModalOpen}
          onClose={() => {
            setIsDismissedModalOpen(false);
            setDismissedTarget(null);
          }}
          dismissed={dismissedTarget}
          onSuccess={handleDismissedRemoveSuccess}
        />
      )}

      {/* Block User Modal */}
      {blockTarget && (
        <BlockUserModal
          isOpen={isBlockModalOpen}
          onClose={() => {
            setIsBlockModalOpen(false);
            setBlockTarget(null);
          }}
          targetUser={blockTarget}
          onSuccess={handleBlockSuccess}
        />
      )}

      {/* Unblock Modal */}
      {unblockTarget && (
        <UnblockModal
          isOpen={isUnblockModalOpen}
          onClose={() => {
            setIsUnblockModalOpen(false);
            setUnblockTarget(null);
          }}
          blockedUser={unblockTarget}
          onSuccess={handleUnblockSuccess}
        />
      )}

      {/* Recommend Modal - Recommend this connection to others */}
      {recommendTarget && (
        <RecommendModal
          isOpen={isRecommendModalOpen}
          onClose={() => {
            setIsRecommendModalOpen(false);
            setRecommendTarget(null);
          }}
          entityType="user"
          entityId={recommendTarget.user_id.toString()}
          entityPreview={{
            type: 'user',
            id: recommendTarget.user_id.toString(),
            title: recommendTarget.display_name || recommendTarget.username,
            description: null,
            image_url: recommendTarget.avatar_url || null,
            url: `/profile/${recommendTarget.username}`
          }}
          onShareSuccess={() => {
            setIsRecommendModalOpen(false);
            setRecommendTarget(null);
          }}
        />
      )}

      {/* People You May Know - Recommendations */}
      <div className="mt-8">
        <PeopleYouMayKnow
          variant="full"
          limit={10}
          onConnectionRequestSent={handleConnectionRequestSent}
        />
      </div>
    </div>
  );
}

export default function ConnectionsPage() {
  return (
    <ErrorBoundary componentName="DashboardConnectionsPage">
      <ConnectionsPageContent />
    </ErrorBoundary>
  );
}
