/**
 * CampaignsManager - Main Campaigns Management Container
 *
 * @tier ADVANCED
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST wrap in ErrorBoundary (ADVANCED tier)
 * - MUST use useListingCampaigns hook
 * - MUST use BizModal for all modals
 */
'use client';

import React, { useState } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useListingCampaigns } from '@features/dashboard/hooks/useListingCampaigns';
import type { Campaign, CampaignFormData } from '@features/dashboard/types';
import { CampaignCard } from './campaigns/CampaignCard';
import { CampaignFormModal } from './campaigns/CampaignFormModal';
import { CampaignPerformanceModal } from './campaigns/CampaignPerformanceModal';
import { AlertCircle, Loader2, Plus, Megaphone } from 'lucide-react';

export function CampaignsManager() {
  const { selectedListingId } = useListingContext();
  const {
    campaigns,
    isLoading,
    error,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    submitForApproval,
    actionLoading
  } = useListingCampaigns(selectedListingId);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | undefined>(undefined);

  const handleCreate = () => {
    setEditingCampaign(undefined);
    setIsFormModalOpen(true);
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setIsFormModalOpen(true);
  };

  const handleViewPerformance = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsPerformanceModalOpen(true);
  };

  const handleFormSubmit = async (data: CampaignFormData) => {
    if (editingCampaign) {
      await updateCampaign(editingCampaign.id, data);
    } else {
      await createCampaign(data);
    }
  };

  const handleSubmit = async (campaign: Campaign) => {
    if (confirm('Submit this campaign for admin approval?')) {
      try {
        await submitForApproval(campaign.id);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to submit campaign');
      }
    }
  };

  const handleDelete = async (campaign: Campaign) => {
    if (confirm(`Delete campaign "${campaign.title}"? This action cannot be undone.`)) {
      try {
        await deleteCampaign(campaign.id);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete campaign');
      }
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-900">Failed to Load Campaigns</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-900 font-semibold">Something went wrong loading campaigns</p>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Marketing Campaigns</h2>
            <p className="text-sm text-gray-600 mt-1">
              Create and manage promotional campaigns for your listing
            </p>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Campaign
          </button>
        </div>

        {/* Empty State */}
        {campaigns.length === 0 ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 mb-4">
              <Megaphone className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Campaigns Yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Create your first marketing campaign to promote your listing and reach more customers.
            </p>
            <button
              type="button"
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Your First Campaign
            </button>
          </div>
        ) : (
          /* Campaigns Grid */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onEdit={handleEdit}
                onViewPerformance={handleViewPerformance}
                onSubmit={handleSubmit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Form Modal */}
        <CampaignFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          onSubmit={handleFormSubmit}
          campaign={editingCampaign}
          isLoading={actionLoading}
        />

        {/* Performance Modal */}
        <CampaignPerformanceModal
          isOpen={isPerformanceModalOpen}
          onClose={() => setIsPerformanceModalOpen(false)}
          campaign={selectedCampaign}
        />
      </div>
    </ErrorBoundary>
  );
}

export default CampaignsManager;
