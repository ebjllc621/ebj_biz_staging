'use client';

/**
 * Hiring Campaigns Dashboard Page
 *
 * Business dashboard page for managing hiring campaigns
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 */

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@core/hooks/useAuth';
import { HiringCampaignCard } from '@features/jobs/components/HiringCampaignCard';
import { HiringCampaignEditor } from '@features/jobs/components/HiringCampaignEditor';
import { useHiringCampaigns } from '@features/jobs/hooks/useHiringCampaigns';
import type { HiringCampaign } from '@features/jobs/types';

export default function HiringCampaignsPage() {
  const params = useParams();
  const listingId = parseInt(params.listingId as string, 10);
  const { user, loading: authLoading } = useAuth();
  const { campaigns, loading, refreshCampaigns } = useHiringCampaigns(listingId);

  const [showEditor, setShowEditor] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<HiringCampaign | null>(null);

  if (authLoading || loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-600">Please log in to manage campaigns</h2>
        </div>
      </div>
    );
  }

  const handleEdit = (campaign: HiringCampaign) => {
    setEditingCampaign(campaign);
    setShowEditor(true);
  };

  const handleCreate = () => {
    setEditingCampaign(null);
    setShowEditor(true);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hiring Campaigns</h1>
          <p className="text-gray-600 mt-2">
            Create and manage seasonal or targeted hiring campaigns
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          Create Campaign
        </button>
      </div>

      {/* Campaign Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Campaigns</p>
          <p className="text-2xl font-bold">{campaigns.length}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600">
            {campaigns.filter(c => c.status === 'active').length}
          </p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Pending Approval</p>
          <p className="text-2xl font-bold text-yellow-600">
            {campaigns.filter(c => c.status === 'pending_approval').length}
          </p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-blue-600">
            {campaigns.filter(c => c.status === 'completed').length}
          </p>
        </div>
      </div>

      {/* Campaigns Grid */}
      {campaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((campaign) => (
            <HiringCampaignCard
              key={campaign.id}
              campaign={campaign}
              onEdit={() => handleEdit(campaign)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Campaigns Yet</h3>
          <p className="text-gray-500 mb-4">
            Create your first hiring campaign to coordinate seasonal or targeted hiring efforts
          </p>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            Create Campaign
          </button>
        </div>
      )}

      {/* Editor Modal */}
      <HiringCampaignEditor
        isOpen={showEditor}
        onClose={() => {
          setShowEditor(false);
          setEditingCampaign(null);
        }}
        listingId={listingId}
        initialCampaign={editingCampaign || undefined}
        onSave={() => {
          setShowEditor(false);
          setEditingCampaign(null);
          refreshCampaigns();
        }}
      />
    </div>
  );
}
