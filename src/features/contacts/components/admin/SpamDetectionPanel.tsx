/**
 * SpamDetectionPanel - Spam alert management interface
 *
 * GOVERNANCE COMPLIANCE:
 * - Component tier: STANDARD (requires ErrorBoundary wrapper)
 * - Client Component: 'use client'
 * - credentials: 'include' on all fetch
 * - NO direct database access
 *
 * @tier STANDARD
 * @phase Phase 10 - Analytics & Admin Dashboard
 * @authority docs/components/connections/userrecommendations/phases/PHASE_10_BRAIN_PLAN.md
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, ShieldAlert } from 'lucide-react';
import { ErrorService } from '@core/services/ErrorService';

interface SpamAlert {
  id: number;
  user_id: number;
  alert_type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  status: string;
  created_at: Date;
}

export function SpamDetectionPanel() {
  const [alerts, setAlerts] = useState<SpamAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('pending');

  useEffect(() => {
    loadAlerts();
  }, [filter]);

  const loadAlerts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const statusParam = filter === 'all' ? '' : `&status=${filter}`;
      const response = await fetch(
        `/api/admin/sharing/spam/alerts?limit=20${statusParam}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to load spam alerts');
      }

      const data = await response.json();
      setAlerts(data.data?.alerts || data.alerts || []);
    } catch (err) {
      ErrorService.capture('[SpamDetectionPanel] Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setIsLoading(false);
    }
  };

  const dismissAlert = async (alertId: number) => {
    try {
      const response = await fetch(
        `/api/admin/sharing/spam/${alertId}/dismiss`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Dismissed by admin' })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to dismiss alert');
      }

      // Remove from list
      setAlerts(alerts.filter(a => a.id !== alertId));
    } catch (err) {
      ErrorService.capture('[SpamDetectionPanel] Dismiss error:', err);
      alert('Failed to dismiss alert');
    }
  };

  const takeAction = async (alertId: number, action: string) => {
    try {
      const response = await fetch(
        `/api/admin/sharing/spam/${alertId}/action`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, notes: `Action taken: ${action}` })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to take action');
      }

      // Refresh alerts
      loadAlerts();
    } catch (err) {
      ErrorService.capture('[SpamDetectionPanel] Action error:', err);
      alert('Failed to take action');
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      low: 'bg-yellow-100 text-yellow-800',
      medium: 'bg-orange-100 text-orange-800',
      high: 'bg-red-100 text-red-800'
    };
    return colors[severity as keyof typeof colors] || colors.medium;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-semibold text-gray-900">Spam Detection</h2>
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | 'pending' | 'reviewed')}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#ed6437]"
        >
          <option value="all">All Alerts</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-20" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
          <p>No spam alerts found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityBadge(alert.severity)}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500">
                    {alert.alert_type.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(alert.created_at).toLocaleString()}
                </span>
              </div>

              <p className="text-sm text-gray-700 mb-3">{alert.description}</p>

              {alert.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Dismiss
                  </button>
                  <button
                    onClick={() => takeAction(alert.id, 'warn_user')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded text-sm hover:bg-yellow-200 transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Warn
                  </button>
                  <button
                    onClick={() => takeAction(alert.id, 'rate_limit')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    Rate Limit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
