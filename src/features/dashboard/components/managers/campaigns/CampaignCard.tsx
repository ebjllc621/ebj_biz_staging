/**
 * CampaignCard - Individual Campaign Display Card
 *
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * Displays campaign details with status, performance metrics, and actions
 */
'use client';

import React from 'react';
import type { Campaign } from '@core/services/CampaignService';
import { CampaignStatusBadge } from './CampaignStatusBadge';
import {
  Megaphone,
  Calendar,
  DollarSign,
  Eye,
  MousePointer,
  TrendingUp,
  Edit,
  BarChart3,
  Send,
  Trash2
} from 'lucide-react';

export interface CampaignCardProps {
  /** Campaign data */
  campaign: Campaign;
  /** Edit callback */
  onEdit: (campaign: Campaign) => void;
  /** View performance callback */
  onViewPerformance: (campaign: Campaign) => void;
  /** Submit for approval callback */
  onSubmit: (campaign: Campaign) => void;
  /** Delete callback */
  onDelete: (campaign: Campaign) => void;
}

const campaignTypeLabels: Record<string, string> = {
  sponsored_listing: 'Sponsored Listing',
  featured_event: 'Featured Event',
  featured_offer: 'Featured Offer',
  banner_ad: 'Banner Ad',
  email_blast: 'Email Blast'
};

export function CampaignCard({
  campaign,
  onEdit,
  onViewPerformance,
  onSubmit,
  onDelete
}: CampaignCardProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString()}`;
  };

  const ctr = campaign.impressions > 0
    ? ((campaign.clicks / campaign.impressions) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-orange-50 rounded-lg">
            <Megaphone className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{campaign.title}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {campaignTypeLabels[campaign.campaign_type] || campaign.campaign_type}
            </p>
          </div>
        </div>
        <CampaignStatusBadge status={campaign.status} />
      </div>

      {/* Description */}
      {campaign.description && (
        <p className="text-sm text-gray-700 mb-4 line-clamp-2">{campaign.description}</p>
      )}

      {/* Budget & Dates */}
      <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-gray-600">Budget</p>
            <p className="font-semibold text-gray-900">{formatCurrency(campaign.budget)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-gray-600">Spent</p>
            <p className="font-semibold text-gray-900">{formatCurrency(campaign.total_spent)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-gray-600">Start</p>
            <p className="font-medium text-gray-900">{formatDate(campaign.start_date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-gray-500" />
          <div>
            <p className="text-gray-600">End</p>
            <p className="font-medium text-gray-900">{formatDate(campaign.end_date)}</p>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
            <Eye className="w-3.5 h-3.5" />
            <span className="text-xs">Impressions</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">{campaign.impressions.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
            <MousePointer className="w-3.5 h-3.5" />
            <span className="text-xs">Clicks</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">{campaign.clicks.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-xs">CTR</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">{ctr}%</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-xs">Conversions</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">{campaign.conversions}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onEdit(campaign)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Edit className="w-4 h-4" />
          Edit
        </button>

        <button
          type="button"
          onClick={() => onViewPerformance(campaign)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          Performance
        </button>

        {campaign.status === 'draft' && (
          <button
            type="button"
            onClick={() => onSubmit(campaign)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Send className="w-4 h-4" />
            Submit for Approval
          </button>
        )}

        {(campaign.status === 'draft' || campaign.status === 'rejected') && (
          <button
            type="button"
            onClick={() => onDelete(campaign)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export default CampaignCard;
