/**
 * GeoFenceList - List of active geo-fences for an offer
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 4.5 - Deferred Items
 * @generated DNA v11.4.0
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, Trash2, Loader2, RefreshCw, Radio } from 'lucide-react';
import type { GeoTrigger } from '@features/offers/types';

interface GeoFenceListProps {
  offerId: number;
  onDelete?: (triggerId: number) => void;
}

export function GeoFenceList({ offerId, onDelete }: GeoFenceListProps) {
  const [triggers, setTriggers] = useState<GeoTrigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchTriggers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/offers/${offerId}/geo-trigger`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch geo-fences');
      }

      const data = await response.json();
      setTriggers(data.triggers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [offerId]);

  useEffect(() => {
    if (offerId) {
      fetchTriggers();
    }
  }, [offerId, fetchTriggers]);

  const handleDelete = async (triggerId: number) => {
    setDeletingId(triggerId);

    try {
      const response = await fetch(`/api/offers/${offerId}/geo-trigger/${triggerId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete geo-fence');
      }

      setTriggers((prev) => prev.filter((t) => t.id !== triggerId));
      onDelete?.(triggerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const formatRadius = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 text-sm mb-2">{error}</p>
        <button
          onClick={fetchTriggers}
          className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  if (triggers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Radio className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No geo-fences configured</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {triggers.map((trigger) => (
        <div
          key={trigger.id}
          className={`flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 ${
            deletingId === trigger.id ? 'opacity-50' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              trigger.is_active ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <MapPin className={`w-5 h-5 ${
                trigger.is_active ? 'text-green-600' : 'text-gray-400'
              }`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {trigger.latitude.toFixed(4)}, {trigger.longitude.toFixed(4)}
              </p>
              <p className="text-xs text-gray-500">
                Radius: {formatRadius(trigger.radius_meters)}
                {trigger.is_active ? ' • Active' : ' • Inactive'}
              </p>
              {trigger.notification_message && (
                <p className="text-xs text-gray-400 truncate max-w-xs">
                  &quot;{trigger.notification_message}&quot;
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => handleDelete(trigger.id)}
            disabled={deletingId === trigger.id}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Delete geo-fence"
          >
            {deletingId === trigger.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
