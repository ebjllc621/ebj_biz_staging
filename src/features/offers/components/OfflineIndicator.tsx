/**
 * OfflineIndicator - Network status indicator
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface OfflineIndicatorProps {
  showOnlineStatus?: boolean;
  className?: string;
}

export function OfflineIndicator({
  showOnlineStatus = false,
  className = '',
}: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnect, setShowReconnect] = useState(false);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnect(true);
      setTimeout(() => setShowReconnect(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnect(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Don't render if online and showOnlineStatus is false
  if (isOnline && !showOnlineStatus && !showReconnect) {
    return null;
  }

  if (showReconnect) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm ${className}`}>
        <RefreshCw className="w-4 h-4 animate-spin" />
        Reconnected
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-full text-sm ${className}`}>
        <WifiOff className="w-4 h-4" />
        Offline Mode
      </div>
    );
  }

  if (showOnlineStatus) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-600 rounded-full text-sm ${className}`}>
        <Wifi className="w-4 h-4" />
        Online
      </div>
    );
  }

  return null;
}
