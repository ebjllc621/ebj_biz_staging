/**
 * HiringCampaignCard Component
 *
 * Display card for hiring campaigns with performance metrics
 *
 * GOVERNANCE COMPLIANCE:
 * - 'use client' directive for client component
 * - Import aliases: @core/, @features/, @components/
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @tier STANDARD
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 * @reference src/core/services/CampaignService.ts - Campaign pattern
 */

'use client';

import { useState } from 'react';
import type { HiringCampaign } from '@features/jobs/types';

interface HiringCampaignCardProps {
  campaign: HiringCampaign;
  onEdit?: (campaign: HiringCampaign) => void;
  onPause?: (campaignId: number) => void;
  onViewAnalytics?: (campaignId: number) => void;
}

export function HiringCampaignCard({
  campaign,
  onEdit,
  onPause,
  onViewAnalytics
}: HiringCampaignCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePause = async () => {
    if (!onPause) return;
    setIsProcessing(true);
    try {
      await onPause(campaign.id);
    } catch (error) {
      console.error('Pause failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    pending_approval: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    paused: 'bg-orange-100 text-orange-800',
    completed: 'bg-purple-100 text-purple-800',
    archived: 'bg-gray-100 text-gray-600'
  };

  const campaignTypeLabels: Record<string, string> = {
    seasonal: 'Seasonal',
    event: 'Event-Based',
    blitz: 'Hiring Blitz',
    evergreen: 'Evergreen'
  };

  const statusColor = statusColors[campaign.status] || 'bg-gray-100 text-gray-800';
  const campaignTypeLabel = campaignTypeLabels[campaign.campaign_type] || campaign.campaign_type;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isActive = campaign.status === 'active';
  const hasMetrics = campaign.performance_metrics && isActive;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {campaign.campaign_name}
          </h3>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusColor}`}>
              {campaign.status.replace('_', ' ')}
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">
              {campaignTypeLabel}
            </span>
            {campaign.season && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-50 text-purple-700 capitalize">
                {campaign.season}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <svg
            className="w-4 h-4 mr-1 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
        </div>
      </div>

      {/* Hiring Goal */}
      {campaign.hiring_goal && (
        <div className="mb-4">
          <div className="text-sm text-gray-600">
            Goal: <span className="font-semibold text-gray-900">{campaign.hiring_goal} hires</span>
          </div>
        </div>
      )}

      {/* Target Roles */}
      {campaign.target_roles && campaign.target_roles.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Target Roles</h4>
          <div className="flex flex-wrap gap-1">
            {campaign.target_roles.slice(0, 3).map((role, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
              >
                {role}
              </span>
            ))}
            {campaign.target_roles.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs text-gray-600">
                +{campaign.target_roles.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {hasMetrics && campaign.performance_metrics && (
        <div className="mb-4 p-4 bg-blue-50 rounded-md">
          <h4 className="text-xs font-semibold text-gray-700 uppercase mb-3">Performance</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">
                {campaign.performance_metrics.impressions || 0}
              </div>
              <div className="text-xs text-gray-600">Impressions</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600">
                {campaign.performance_metrics.applications || 0}
              </div>
              <div className="text-xs text-gray-600">Applications</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">
                {campaign.performance_metrics.hires || 0}
              </div>
              <div className="text-xs text-gray-600">Hires</div>
            </div>
          </div>
          {campaign.performance_metrics.cost_per_hire && (
            <div className="mt-3 text-center text-sm text-gray-700">
              Cost per Hire: <span className="font-semibold">${campaign.performance_metrics.cost_per_hire}</span>
            </div>
          )}
        </div>
      )}

      {/* Budget */}
      {campaign.budget && (
        <div className="mb-4 text-sm text-gray-600">
          Budget: <span className="font-semibold text-gray-900">${parseFloat(String(campaign.budget)).toFixed(2)}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
        {onEdit && (
          <button
            onClick={() => onEdit(campaign)}
            className="flex-1 text-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Edit
          </button>
        )}
        {onPause && isActive && (
          <button
            onClick={handlePause}
            disabled={isProcessing}
            className="flex-1 text-center px-3 py-2 border border-orange-300 rounded-md text-sm font-medium text-orange-700 hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Pausing...' : 'Pause'}
          </button>
        )}
        {onViewAnalytics && (
          <button
            onClick={() => onViewAnalytics(campaign.id)}
            className="flex-1 text-center px-3 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            Analytics
          </button>
        )}
      </div>
    </div>
  );
}
