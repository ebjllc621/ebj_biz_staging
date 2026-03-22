/**
 * SenderImpactCard - Shows sender's recommendation impact statistics
 *
 * Displays sender metrics including total sent, view rate, helpful rate, and recent feedback.
 * Auto-fetches stats on mount and includes loading/error states.
 *
 * @tier STANDARD
 * @phase Phase 4 - Feedback Loop
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 *
 * @example
 * <SenderImpactCard className="col-span-2" />
 */

'use client';

import { useEffect, useState } from 'react';
import { BadgeCheck, Eye, ThumbsUp, Heart, Loader2, Send, TrendingUp } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { getAvatarInitials } from '@core/utils/avatar';
import type { SenderImpactStats, FeedbackItem } from '@features/contacts/types/sharing';

interface SenderImpactCardProps {
  className?: string;
}

function SenderImpactCardContent({ className = '' }: SenderImpactCardProps) {
  const [stats, setStats] = useState<SenderImpactStats | null>(null);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImpact = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/sharing/recommendations/impact', {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch impact stats');
        }

        const result = await response.json();
        const data = result.data || result;

        setStats(data.stats);
        setFeedback(data.recent_feedback.map((f: FeedbackItem) => ({
          ...f,
          created_at: new Date(f.created_at)
        })));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load impact data');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchImpact();
  }, []);

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
        <p className="text-red-600 text-center">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 overflow-hidden min-w-0 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-orange-500 flex-shrink-0" />
        <h3 className="text-lg font-semibold text-gray-900 truncate">Your Recommendation Impact</h3>
      </div>

      {/* Horizontal layout: Stats left, Feedback right */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Stats Grid - Fixed width on left (2x2 grid) */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="grid grid-cols-2 gap-3">
            <StatBox
              icon={BadgeCheck}
              label="Sent"
              value={stats.total_sent}
              color="blue"
            />
            <StatBox
              icon={Eye}
              label="Viewed"
              value={stats.total_viewed}
              percentage={stats.view_rate}
              color="purple"
            />
            <StatBox
              icon={ThumbsUp}
              label="Helpful"
              value={stats.total_helpful}
              percentage={stats.helpful_rate}
              color="green"
            />
            <StatBox
              icon={Heart}
              label="Thank Yous"
              value={stats.total_thanked}
              percentage={stats.thank_rate}
              color="pink"
            />
          </div>
        </div>

        {/* Recent Feedback - Stretches to fill remaining width, single column list */}
        {feedback.length > 0 && (
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Feedback</h4>
            <div className="space-y-2">
              {feedback.slice(0, 4).map((item) => (
                <FeedbackItemRow key={`${item.id}-${item.type}`} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State - Only show when no feedback and no stats */}
        {feedback.length === 0 && stats.total_sent === 0 && (
          <div className="flex-1 flex items-center justify-center py-4">
            <p className="text-gray-500 text-sm">
              Start sharing recommendations to see your impact!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Stat Box Component
interface StatBoxProps {
  icon: typeof Send;
  label: string;
  value: number;
  percentage?: number;
  color: 'blue' | 'purple' | 'green' | 'pink';
}

function StatBox({ icon: Icon, label, value, percentage, color }: StatBoxProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    pink: 'bg-pink-50 text-pink-600'
  };

  return (
    <div className={`p-4 rounded-lg ${colorClasses[color].split(' ')[0]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${colorClasses[color].split(' ')[1]}`} />
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {percentage !== undefined && (
          <span className="text-sm text-gray-500">{percentage}%</span>
        )}
      </div>
    </div>
  );
}

// Feedback Item Row
function FeedbackItemRow({ item }: { item: FeedbackItem }) {
  const initials = getAvatarInitials(item.recipient_name);

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      {/* Avatar */}
      {item.recipient_avatar ? (
        <img
          src={item.recipient_avatar}
          alt={item.recipient_name}
          className="w-8 h-8 rounded-full object-cover"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium">
          {initials}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 text-sm">{item.recipient_name}</span>
          <span className="text-gray-400 text-xs">
            {formatRelativeTime(item.created_at)}
          </span>
        </div>
        {item.type === 'helpful' ? (
          <p className="text-sm text-gray-600">
            Marked your recommendation of <span className="font-medium">{item.entity_title}</span> as helpful
          </p>
        ) : (
          <p className="text-sm text-gray-600">
            Thanked you: &quot;{item.message}&quot;
          </p>
        )}
      </div>

      {/* Icon */}
      <div className={item.type === 'helpful' ? 'text-green-500' : 'text-pink-500'}>
        {item.type === 'helpful' ? (
          <ThumbsUp className="w-4 h-4" />
        ) : (
          <Heart className="w-4 h-4" />
        )}
      </div>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function SenderImpactCard(props: SenderImpactCardProps) {
  return (
    <ErrorBoundary componentName="SenderImpactCard">
      <SenderImpactCardContent {...props} />
    </ErrorBoundary>
  );
}

export default SenderImpactCard;
