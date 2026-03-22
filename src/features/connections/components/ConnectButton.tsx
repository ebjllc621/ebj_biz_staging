/**
 * ConnectButton - Interactive Connection Button with State Machine
 *
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @authority docs/pages/layouts/home/user/phases/troubleshooting/connect/CONNECT_SYSTEM_REMEDIATION_BRAIN_PLAN.md
 *
 * REMEDIATION: Updated to open ConnectionRequestModal instead of direct POST
 */

'use client';

import { useState } from 'react';
import { ConnectionStatus } from '../types';
import { ConnectionRequestModal } from './ConnectionRequestModal';

interface ConnectButtonProps {
  targetUserId: number;
  targetUsername: string;
  targetDisplayName?: string | null;
  targetAvatarUrl?: string | null;
  initialStatus: ConnectionStatus;
  onStatusChange?: (newStatus: ConnectionStatus) => void;
}

export function ConnectButton({
  targetUserId,
  targetUsername,
  targetDisplayName = null,
  targetAvatarUrl = null,
  initialStatus,
  onStatusChange
}: ConnectButtonProps) {
  const [status, setStatus] = useState<ConnectionStatus>(initialStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Opens the connection request modal instead of direct POST
  const handleConnect = () => {
    setShowModal(true);
  };

  // Called when request is successfully sent from modal
  const handleRequestSent = () => {
    setStatus('pending_sent');
    onStatusChange?.('pending_sent');
    setShowModal(false);
  };

  const handleAccept = async () => {
    // Implementation will be added when we have request ID
    console.log('Accept connection from:', targetUsername);
  };

  const handleRemove = async () => {
    // Implementation will be added when we have connection ID
    console.log('Remove connection with:', targetUsername);
    setShowDropdown(false);
  };

  if (status === 'none') {
    return (
      <>
        <button
          onClick={handleConnect}
          disabled={isLoading}
          className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50"
        >
          Connect
        </button>
        {showModal && (
          <ConnectionRequestModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            targetUser={{
              id: targetUserId,
              username: targetUsername,
              display_name: targetDisplayName,
              avatar_url: targetAvatarUrl
            }}
            onRequestSent={handleRequestSent}
          />
        )}
      </>
    );
  }

  if (status === 'pending_sent') {
    return (
      <button
        disabled
        className="px-4 py-2 bg-gray-300 text-gray-600 rounded-md cursor-not-allowed"
      >
        Pending
      </button>
    );
  }

  if (status === 'pending_received') {
    return (
      <button
        onClick={handleAccept}
        disabled={isLoading}
        className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
      >
        {isLoading ? 'Accepting...' : 'Accept Request'}
      </button>
    );
  }

  if (status === 'connected') {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-2"
        >
          Connected
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
            <button
              onClick={handleRemove}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
            >
              Remove Connection
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
