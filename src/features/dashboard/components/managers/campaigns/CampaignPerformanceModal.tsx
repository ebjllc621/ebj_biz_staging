/**
 * CampaignPerformanceModal - Campaign Performance Metrics Modal
 *
 * @tier SIMPLE
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST use BizModal wrapper
 * - Display detailed campaign metrics
 */
'use client';

import React from 'react';
import BizModal from '@/components/BizModal/BizModal';
import type { Campaign } from '@core/services/CampaignService';
import { Eye, MousePointer, TrendingUp, DollarSign, Target, Percent } from 'lucide-react';

export interface CampaignPerformanceModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
  /** Campaign data */
  campaign: Campaign | null;
}

export function CampaignPerformanceModal({
  isOpen,
  onClose,
  campaign
}: CampaignPerformanceModalProps) {
  if (!campaign) return null;

  const ctr = campaign.impressions > 0
    ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2)
    : '0.00';

  const conversionRate = campaign.clicks > 0
    ? ((campaign.conversions / campaign.clicks) * 100).toFixed(2)
    : '0.00';

  const costPerClick = campaign.clicks > 0
    ? (campaign.total_spent / campaign.clicks).toFixed(2)
    : '0.00';

  const costPerConversion = campaign.conversions > 0
    ? (campaign.total_spent / campaign.conversions).toFixed(2)
    : '0.00';

  const budgetUsed = campaign.budget > 0
    ? ((campaign.total_spent / campaign.budget) * 100).toFixed(1)
    : '0.0';

  const metrics = [
    {
      label: 'Impressions',
      value: campaign.impressions.toLocaleString(),
      icon: Eye,
      color: 'blue'
    },
    {
      label: 'Clicks',
      value: campaign.clicks.toLocaleString(),
      icon: MousePointer,
      color: 'green'
    },
    {
      label: 'Conversions',
      value: campaign.conversions.toLocaleString(),
      icon: TrendingUp,
      color: 'purple'
    },
    {
      label: 'Click-Through Rate',
      value: `${ctr}%`,
      icon: Percent,
      color: 'orange'
    },
    {
      label: 'Conversion Rate',
      value: `${conversionRate}%`,
      icon: Target,
      color: 'pink'
    },
    {
      label: 'Cost Per Click',
      value: `$${costPerClick}`,
      icon: DollarSign,
      color: 'yellow'
    },
    {
      label: 'Cost Per Conversion',
      value: `$${costPerConversion}`,
      icon: DollarSign,
      color: 'red'
    },
    {
      label: 'Budget Used',
      value: `${budgetUsed}%`,
      icon: DollarSign,
      color: 'indigo'
    }
  ];

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    pink: 'bg-pink-100 text-pink-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
    indigo: 'bg-indigo-100 text-indigo-600'
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Campaign Performance"
      subtitle={campaign.title}
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Budget Overview */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Budget Progress</span>
            <span className="text-sm font-semibold text-gray-900">
              ${campaign.total_spent.toLocaleString()} / ${campaign.budget.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-orange-600 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(parseFloat(budgetUsed), 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">{budgetUsed}% of budget used</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm text-gray-600">{metric.label}</span>
                  <div className={`p-2 rounded-lg ${colorClasses[metric.color]}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              </div>
            );
          })}
        </div>

        {/* Campaign Details */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Campaign Details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Type:</span>
              <span className="font-medium text-gray-900">{campaign.campaign_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Start Date:</span>
              <span className="font-medium text-gray-900">
                {new Date(campaign.start_date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">End Date:</span>
              <span className="font-medium text-gray-900">
                {new Date(campaign.end_date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="font-medium text-gray-900 capitalize">{campaign.status}</span>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </BizModal>
  );
}

export default CampaignPerformanceModal;
