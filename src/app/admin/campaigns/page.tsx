/**
 * Admin Marketing Campaigns Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: AdminTableTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: CampaignService via API routes
 * - Credentials: 'include' for all fetch requests
 * - Complexity: ADVANCED tier
 *
 * Features:
 * - Campaign CRUD operations
 * - Approval workflow (approve/reject)
 * - Performance metrics
 * - Campaign status management
 *
 * @authority PHASE_5.3_BRAIN_PLAN.md - Section 3.3
 * @component
 * @returns {JSX.Element} Admin campaigns manager
 */

'use client';


// Force dynamic rendering (required for useAuth() - React Context cannot be used in SSG)
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { AdminTableTemplate, TableColumn, TableAction } from '@/components/admin/templates/AdminTableTemplate';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { useAuth } from '@core/hooks/useAuth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorFallback } from '@/components/common/ErrorFallback';

interface Campaign {
  id: number;
  user_id: number;
  campaign_type: string;
  title: string;
  budget: number;
  status: string;
  impressions: number;
  clicks: number;
  conversions: number;
  created_at: string;
}

function AdminCampaignsPageContent() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // GOVERNANCE FIX: useEffect MUST be called before any early returns
  // React Rules of Hooks: Hooks must be called in the same order on every render
  useEffect(() => {
    // Only fetch if user is admin - conditional logic INSIDE the hook
    if (user?.role === 'admin') {
      fetchCampaigns();
    }
  }, [user]);

  // Conditional returns AFTER all hooks
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600 font-medium">Access Denied: Admin privileges required</div>
      </div>
    );
  }

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/campaigns', { credentials: 'include' });
      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedCampaign) return;

    try {
      await fetch(`/api/admin/campaigns/${selectedCampaign.id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ admin_id: user?.id })
      });
      setShowApproveModal(false);
      fetchCampaigns();
    } catch (error) {

    }
  };

  const handleReject = async () => {
    if (!selectedCampaign || !rejectionReason) return;

    try {
      await fetch(`/api/admin/campaigns/${selectedCampaign.id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: rejectionReason })
      });
      setShowRejectModal(false);
      setRejectionReason('');
      fetchCampaigns();
    } catch (error) {

    }
  };

  const columns: TableColumn<Campaign>[] = [
    { key: 'id', header: 'ID', accessor: (row) => row.id, sortable: true },
    { key: 'title', header: 'Title', accessor: (row) => row.title, sortable: true },
    { key: 'campaign_type', header: 'Type', accessor: (row) => row.campaign_type, sortable: true },
    {
      key: 'budget',
      header: 'Budget',
      accessor: (c) => `$${c.budget.toLocaleString()}`
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (c) => (
        <span className={`px-2 py-1 rounded text-xs ${
          c.status === 'active' ? 'bg-green-100 text-green-800' :
          c.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {c.status}
        </span>
      )
    },
    {
      key: 'impressions',
      header: 'Impressions',
      accessor: (c) => c.impressions.toLocaleString()
    },
    { key: 'clicks', header: 'Clicks', accessor: (row) => row.clicks, sortable: true },
    { key: 'conversions', header: 'Conversions', accessor: (row) => row.conversions, sortable: true }
  ];

  const actions: TableAction<Campaign>[] = [
    {
      label: 'Approve',
      onClick: (campaign) => {
        setSelectedCampaign(campaign);
        setShowApproveModal(true);
      }
    },
    {
      label: 'Reject',
      onClick: (campaign) => {
        setSelectedCampaign(campaign);
        setShowRejectModal(true);
      }
    }
  ];

  return (
    <>
      <AdminTableTemplate<Campaign>         title="Marketing Campaigns"
        data={campaigns}
        columns={columns}
        rowKey={(row) => row.id}
        loading={loading}
        actions={actions}
      />

      {/* Approve Modal */}
      <BizModal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="Approve Campaign"
        size="medium"
      >
        <div className="space-y-4">
          <p>Approve campaign: <strong>{selectedCampaign?.title}</strong>?</p>
          <div className="flex justify-end gap-2">
            <BizModalButton onClick={() => setShowApproveModal(false)} variant="secondary">
              Cancel
            </BizModalButton>
            <BizModalButton onClick={handleApprove} variant="primary">
              Approve
            </BizModalButton>
          </div>
        </div>
      </BizModal>

      {/* Reject Modal */}
      <BizModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Campaign"
        size="medium"
      >
        <div className="space-y-4">
          <p>Reject campaign: <strong>{selectedCampaign?.title}</strong></p>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Reason for rejection..."
            className="w-full px-3 py-2 border rounded"
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <BizModalButton onClick={() => setShowRejectModal(false)} variant="secondary">
              Cancel
            </BizModalButton>
            <BizModalButton onClick={handleReject} variant="danger" disabled={!rejectionReason}>
              Reject
            </BizModalButton>
          </div>
        </div>
      </BizModal>
    </>
  );
}

/**
 * AdminCampaignsPage - Error boundary wrapper for campaigns manager
 * @phase Phase R4.2 - Error Boundary Implementation
 */
export default function AdminCampaignsPage() {
  return (
    <ErrorBoundary
      fallback={
        <ErrorFallback
          title="Campaigns Manager Error"
          message="Unable to load marketing campaigns. Please try again."
        />
      }
      isolate={true}
      componentName="AdminCampaignsPage"
    >
      <AdminCampaignsPageContent />
    </ErrorBoundary>
  );
}
