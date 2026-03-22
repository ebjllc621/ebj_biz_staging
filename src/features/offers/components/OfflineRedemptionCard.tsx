/**
 * OfflineRedemptionCard - Cached redemption card for offline use
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useEffect } from 'react';
import { WifiOff, QrCode, Clock, Building2, Tag, Trash2 } from 'lucide-react';
import type { OfflineCacheData } from '@features/offers/types';

interface OfflineRedemptionCardProps {
  cacheData: OfflineCacheData;
  onRemove?: () => void;
  showQR?: boolean;
}

export function OfflineRedemptionCard({
  cacheData,
  onRemove,
  showQR = true,
}: OfflineRedemptionCardProps) {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateTimeRemaining = () => {
      const now = new Date().getTime();
      const expires = new Date(cacheData.expires_at).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeRemaining('Expired');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h remaining`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`);
      } else {
        setTimeRemaining(`${minutes}m remaining`);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000);
    return () => clearInterval(interval);
  }, [cacheData.expires_at]);

  const handleRemove = () => {
    const offlineClaims = JSON.parse(localStorage.getItem('offlineClaims') || '[]');
    const filtered = offlineClaims.filter(
      (c: OfflineCacheData) => c.claim_id !== cacheData.claim_id
    );
    localStorage.setItem('offlineClaims', JSON.stringify(filtered));
    onRemove?.();
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border ${
      isExpired ? 'border-red-200 opacity-75' : 'border-gray-200'
    } overflow-hidden`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">Offline Redemption</span>
        </div>
        <button
          onClick={handleRemove}
          className="p-1 text-gray-400 hover:text-white rounded"
          aria-label="Remove cached claim"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4">
        {/* Offer Info */}
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 mb-1">{cacheData.offer_title}</h3>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Building2 className="w-4 h-4" />
            {cacheData.business_name}
          </div>
        </div>

        {/* Promo Code */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Promo Code</p>
              <p className="font-mono text-xl font-bold text-gray-900">
                {cacheData.promo_code}
              </p>
            </div>
            {showQR && (
              <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center border border-gray-200">
                <QrCode className="w-10 h-10 text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className={`flex items-center gap-2 text-sm ${
          isExpired ? 'text-red-600' : 'text-gray-600'
        }`}>
          <Clock className="w-4 h-4" />
          <span>{timeRemaining}</span>
        </div>

        {/* Cached At */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
          <Tag className="w-3 h-3" />
          <span>
            Cached {new Date(cacheData.cached_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {isExpired && (
        <div className="px-4 pb-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <p className="text-red-700 text-sm font-medium">
              This offer has expired
            </p>
            <p className="text-red-600 text-xs mt-1">
              Remove it to free up space
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
