'use client';

/**
 * Admin Hiring Campaigns Approval Page
 *
 * Admin page for reviewing and approving/rejecting hiring campaigns
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchWithCsrf } from '@core/utils/csrf';

interface Campaign {
  id: number;
  listing_id: number;
  listing_name: string;
  campaign_name: string;
  campaign_type: string;
  hiring_goal: number | null;
  target_roles: string[] | null;
  season: string | null;
  start_date: string;
  end_date: string;
  budget: number | null;
  status: string;
  approved_by_email: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
}

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('pending_approval');
  const [processing, setProcessing] = useState<number | null>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      const url = filter ? `/api/admin/jobs/campaigns?status=${filter}` : '/api/admin/jobs/campaigns';
      const response = await fetchWithCsrf(url);
      const result = await response.json();
      if (result.data?.campaigns) {
        setCampaigns(result.data.campaigns);
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleAction = async (campaignId: number, action: 'approve' | 'reject', notes?: string) => {
    setProcessing(campaignId);
    try {
      const response = await fetchWithCsrf('/api/admin/jobs/campaigns', {
        method: 'PUT',
        body: JSON.stringify({ campaign_id: campaignId, action, notes })
      });
      const result = await response.json();
      if (result.data) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Failed to process campaign:', error);
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending_approval: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      active: 'bg-blue-100 text-blue-800',
      draft: 'bg-gray-100 text-gray-800',
      completed: 'bg-purple-100 text-purple-800',
      paused: 'bg-orange-100 text-orange-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Campaign Management</h1>
        <p className="text-gray-600 mt-2">Review and approve hiring campaigns</p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-4">
          {['pending_approval', 'approved', 'active', 'completed', ''].map((status) => (
            <button
              key={status || 'all'}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 border-b-2 transition-colors ${
                filter === status
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {status === '' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </nav>
      </div>

      {/* Campaigns Table */}
      {campaigns.length > 0 ? (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{campaign.campaign_name}</div>
                    {campaign.target_roles && (
                      <div className="text-sm text-gray-500">
                        Roles: {campaign.target_roles.slice(0, 3).join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{campaign.listing_name}</td>
                  <td className="px-6 py-4">
                    <span className="capitalize">{campaign.campaign_type}</span>
                    {campaign.season && (
                      <span className="ml-2 text-sm text-gray-500">({campaign.season})</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(campaign.status)}`}>
                      {campaign.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {campaign.status === 'pending_approval' && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleAction(campaign.id, 'approve')}
                          disabled={processing === campaign.id}
                          className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 disabled:opacity-50"
                        >
                          {processing === campaign.id ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleAction(campaign.id, 'reject')}
                          disabled={processing === campaign.id}
                          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {campaign.status !== 'pending_approval' && campaign.approved_by_email && (
                      <span className="text-xs text-gray-500">
                        by {campaign.approved_by_email}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Campaigns Found</h3>
          <p className="text-gray-500">
            {filter === 'pending_approval'
              ? 'No campaigns pending approval'
              : 'No campaigns match the selected filter'}
          </p>
        </div>
      )}
    </div>
  );
}
