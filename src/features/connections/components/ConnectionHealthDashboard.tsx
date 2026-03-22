/**
 * ConnectionHealthDashboard - Connection health analytics dashboard
 *
 * @component Client Component
 * @tier ADVANCED (ErrorBoundary Required)
 * @phase Connect Phase 5
 * @generated ComponentBuilder v3.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * Advanced dashboard with health score visualization and recommendations
 * Uses SVG ring chart for health score display
 * Shows connection stats and actionable recommendations
 *
 * @see docs/pages/layouts/home/user/phases/troubleshooting/connect/fixes/connectP2/phases/PHASE_5_ADVANCED_FEATURES_BRAIN_PLAN.md
 */
'use client';

import { useState, useEffect } from 'react';
import { Activity, Users, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import type { ConnectionHealth } from '../types';

interface ConnectionHealthDashboardProps {
  /** Optional initial health data */
  initialHealth?: ConnectionHealth;
}

/**
 * StatCard subcomponent - displays a single metric
 */
function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  color = 'blue'
}: {
  icon: any;
  label: string;
  value: number | string;
  subtext?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full ${colorClasses[color] || colorClasses.blue} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtext && (
            <p className="text-xs text-gray-500 mt-0.5">{subtext}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * HealthScoreRing subcomponent - SVG circular progress ring
 */
function HealthScoreRing({ score }: { score: number }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Color based on score
  let strokeColor = '#10b981'; // green
  if (score < 50) {
    strokeColor = '#ef4444'; // red
  } else if (score < 75) {
    strokeColor = '#f59e0b'; // yellow/orange
  }

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="160" height="160" className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke="#e5e7eb"
          strokeWidth="12"
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          stroke={strokeColor}
          strokeWidth="12"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      {/* Score text in center */}
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold text-gray-900">{score}</span>
        <span className="text-xs text-gray-500">Health Score</span>
      </div>
    </div>
  );
}

/**
 * ConnectionHealthDashboard component
 * ADVANCED tier - requires ErrorBoundary wrapper when used
 */
export function ConnectionHealthDashboard({
  initialHealth
}: ConnectionHealthDashboardProps) {
  const [health, setHealth] = useState<ConnectionHealth | null>(initialHealth || null);
  const [loading, setLoading] = useState(!initialHealth);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialHealth) {
      fetchHealth();
    }
  }, [initialHealth]);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/users/connections/health', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch connection health');
      }

      const data = await response.json();
      setHealth(data.health);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-gray-600 animate-spin" />
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || 'Failed to load health data'}</p>
        <button
          onClick={fetchHealth}
          className="mt-4 px-4 py-2 bg-[#ed6437] text-white rounded-md hover:bg-[#d5582f]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Health Score Ring + Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Score Visualization */}
        <div className="bg-white border border-gray-200 rounded-lg p-8 flex flex-col items-center justify-center">
          <HealthScoreRing score={health.healthScore} />
          <p className="text-sm text-gray-600 mt-4 text-center max-w-xs">
            Your connection health score is based on activity, engagement, and network growth.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            icon={Users}
            label="Total Connections"
            value={health.totalConnections}
            color="blue"
          />
          <StatCard
            icon={Activity}
            label="Active Connections"
            value={health.activeConnections}
            subtext={`${Math.round((health.activeConnections / Math.max(1, health.totalConnections)) * 100)}% active`}
            color="green"
          />
          <StatCard
            icon={TrendingUp}
            label="Avg Interactions"
            value={health.averageInteractionFrequency.toFixed(1)}
            color="purple"
          />
          <StatCard
            icon={AlertCircle}
            label="Stale Connections"
            value={health.staleConnections}
            subtext="No recent activity"
            color={health.staleConnections > 10 ? 'red' : 'yellow'}
          />
        </div>
      </div>

      {/* Recommendations Section */}
      {health.recommendations.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[#ed6437]" />
            Recommendations
          </h3>
          <ul className="space-y-3">
            {health.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ed6437] mt-2 flex-shrink-0" />
                <p className="text-sm text-gray-700">{recommendation}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ConnectionHealthDashboard;
