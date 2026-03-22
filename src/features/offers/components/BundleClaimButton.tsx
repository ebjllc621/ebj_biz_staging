/**
 * BundleClaimButton - Claim all offers in a bundle
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState } from 'react';
import { Package, Loader2, CheckCircle, Lock } from 'lucide-react';

interface BundleClaimButtonProps {
  bundleSlug: string;
  isAuthenticated?: boolean;
  alreadyClaimed?: boolean;
  isExpired?: boolean;
  isInactive?: boolean;
  onSuccess?: (claimIds: number[]) => void;
  onAuthRequired?: () => void;
  className?: string;
}

export function BundleClaimButton({
  bundleSlug,
  isAuthenticated = false,
  alreadyClaimed = false,
  isExpired = false,
  isInactive = false,
  onSuccess,
  onAuthRequired,
  className = '',
}: BundleClaimButtonProps) {
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(alreadyClaimed);
  const [error, setError] = useState<string | null>(null);

  const handleClaim = async () => {
    if (!isAuthenticated) {
      onAuthRequired?.();
      return;
    }

    if (claimed || isExpired || isInactive) return;

    setClaiming(true);
    setError(null);

    try {
      const response = await fetch(`/api/bundles/${bundleSlug}/claim`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to claim bundle');
      }

      const data = await response.json();
      setClaimed(true);
      onSuccess?.(data.claimIds || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setClaiming(false);
    }
  };

  // Already claimed state
  if (claimed) {
    return (
      <button
        disabled
        className={`w-full py-4 px-6 bg-green-100 text-green-700 rounded-xl font-semibold flex items-center justify-center gap-2 cursor-default ${className}`}
      >
        <CheckCircle className="w-5 h-5" />
        Bundle Claimed
      </button>
    );
  }

  // Expired state
  if (isExpired) {
    return (
      <button
        disabled
        className={`w-full py-4 px-6 bg-gray-100 text-gray-500 rounded-xl font-semibold flex items-center justify-center gap-2 cursor-not-allowed ${className}`}
      >
        <Lock className="w-5 h-5" />
        Bundle Expired
      </button>
    );
  }

  // Inactive state
  if (isInactive) {
    return (
      <button
        disabled
        className={`w-full py-4 px-6 bg-gray-100 text-gray-500 rounded-xl font-semibold flex items-center justify-center gap-2 cursor-not-allowed ${className}`}
      >
        <Lock className="w-5 h-5" />
        Bundle Unavailable
      </button>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className={className}>
        <button
          onClick={handleClaim}
          className="w-full py-4 px-6 bg-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors"
        >
          <Package className="w-5 h-5" />
          Sign In to Claim Bundle
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        onClick={handleClaim}
        disabled={claiming}
        className="w-full py-4 px-6 bg-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {claiming ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Claiming Bundle...
          </>
        ) : (
          <>
            <Package className="w-5 h-5" />
            Claim All Offers
          </>
        )}
      </button>
      {error && (
        <p className="text-red-600 text-sm mt-2 text-center">{error}</p>
      )}
    </div>
  );
}
