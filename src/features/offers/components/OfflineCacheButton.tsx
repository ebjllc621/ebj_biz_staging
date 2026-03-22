/**
 * OfflineCacheButton - Save claim for offline redemption
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState } from 'react';
import { Download, CheckCircle, Loader2, WifiOff } from 'lucide-react';

interface OfflineCacheButtonProps {
  claimId: number;
  alreadyCached?: boolean;
  onCached?: () => void;
  className?: string;
}

export function OfflineCacheButton({
  claimId,
  alreadyCached = false,
  onCached,
  className = '',
}: OfflineCacheButtonProps) {
  const [caching, setCaching] = useState(false);
  const [cached, setCached] = useState(alreadyCached);
  const [error, setError] = useState<string | null>(null);

  const handleCache = async () => {
    if (cached) return;

    setCaching(true);
    setError(null);

    try {
      const response = await fetch(`/api/claims/${claimId}/offline-cache`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to cache for offline');
      }

      const data = await response.json();
      const cacheData = data.cacheData;

      // Store in localStorage for offline access
      const offlineClaims = JSON.parse(localStorage.getItem('offlineClaims') || '[]');
      offlineClaims.push(cacheData);
      localStorage.setItem('offlineClaims', JSON.stringify(offlineClaims));

      setCached(true);
      onCached?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setCaching(false);
    }
  };

  if (cached) {
    return (
      <button
        disabled
        className={`inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg cursor-default ${className}`}
      >
        <CheckCircle className="w-4 h-4" />
        Saved Offline
      </button>
    );
  }

  return (
    <div className={className}>
      <button
        onClick={handleCache}
        disabled={caching}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
        title="Save for offline redemption"
      >
        {caching ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            Save Offline
          </>
        )}
      </button>
      {error && (
        <p className="text-red-600 text-xs mt-1">{error}</p>
      )}
    </div>
  );
}
