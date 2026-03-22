/**
 * PushPermissionBanner Component
 *
 * Displays a dismissable banner prompting users to enable push notifications.
 * Includes compact mode for dashboard sidebar integration.
 *
 * GOVERNANCE COMPLIANCE:
 * - Uses Bizconekt orange theme (#ed6437)
 * - Client component with localStorage persistence
 * - Follows established UI patterns
 *
 * @authority docs/notificationService/phases/PHASE_3_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/features/notifications/components/NotificationPreferencesSection.tsx - UI pattern
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { usePushPermission } from '../hooks/usePushPermission';

// ============================================================================
// Types
// ============================================================================

interface PushPermissionBannerProps {
  /** Use compact layout for sidebar */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DISMISS_STORAGE_KEY = 'bizconekt_push_banner_dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ============================================================================
// Component
// ============================================================================

export function PushPermissionBanner({
  compact = false,
  className = ''
}: PushPermissionBannerProps) {
  const { permission, isRequesting, isRegistered, error, requestPermission, isPushSupported } =
    usePushPermission();

  const [isDismissed, setIsDismissed] = useState(true);

  // Check dismiss state on mount
  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_STORAGE_KEY);

    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      const now = Date.now();

      // Check if dismiss period has expired
      if (now - dismissedAt < DISMISS_DURATION_MS) {
        setIsDismissed(true);
        return;
      } else {
        // Clear expired dismiss
        localStorage.removeItem(DISMISS_STORAGE_KEY);
      }
    }

    // Show banner if push is supported and not granted/registered
    if (isPushSupported && permission !== 'granted' && !isRegistered) {
      setIsDismissed(false);
    }
  }, [isPushSupported, permission, isRegistered]);

  // Handle dismiss
  const handleDismiss = () => {
    localStorage.setItem(DISMISS_STORAGE_KEY, Date.now().toString());
    setIsDismissed(true);
  };

  // Handle enable click
  const handleEnable = async () => {
    await requestPermission();
  };

  // Don't render if:
  // - Banner is dismissed
  // - Push not supported
  // - Already granted/registered
  // - Permission denied
  if (
    isDismissed ||
    !isPushSupported ||
    permission === 'granted' ||
    permission === 'denied' ||
    isRegistered
  ) {
    return null;
  }

  // Compact mode for sidebar
  if (compact) {
    return (
      <div className={`p-3 bg-[#ed6437] bg-opacity-10 border border-[#ed6437] rounded-lg ${className}`}>
        <div className="flex items-start gap-2">
          <Bell size={16} className="text-[#ed6437] mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-700 mb-2">Enable push notifications for real-time updates</p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleEnable}
                disabled={isRequesting}
                className="text-xs bg-[#ed6437] text-white px-3 py-1 rounded hover:bg-[#d55831] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRequesting ? 'Enabling...' : 'Enable'}
              </button>
              <button
                onClick={handleDismiss}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Later
              </button>
            </div>
            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  // Full banner mode
  return (
    <div className={`p-4 bg-[#ed6437] bg-opacity-10 border border-[#ed6437] rounded-lg ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Bell size={24} className="text-[#ed6437] mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 mb-1">Enable Push Notifications</h4>
            <p className="text-sm text-gray-700 mb-3">
              Get instant notifications for messages, connections, and important updates.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleEnable}
                disabled={isRequesting}
                className="bg-[#ed6437] text-white px-4 py-2 rounded-md hover:bg-[#d55831] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isRequesting ? 'Enabling...' : 'Enable Notifications'}
              </button>
              <button
                onClick={handleDismiss}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Remind me later
              </button>
            </div>
            {error && (
              <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                <span className="font-medium">Error:</span> {error}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dismiss"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}

export default PushPermissionBanner;
