/**
 * Admin Feature Flags Management Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: Custom layout (similar to settings page)
 * - Authentication: Admin-only access required
 * - Service Boundary: API routes for database access (NO direct database)
 * - Credentials: 'include' for all fetch requests
 *
 * Features:
 * - View all feature flags in data table
 * - Create new feature flag (modal)
 * - Edit existing flag (modal)
 * - Delete flag (confirmation modal)
 * - Toggle flag on/off with switch
 * - A/B testing rollout percentage slider
 * - Tier and user targeting
 *
 * @authority PHASE_6.1_BRAIN_PLAN.md - Section 6
 * @component
 * @returns {JSX.Element} Admin feature flags interface
 */

'use client';


// Force dynamic rendering (required for useAuth() - React Context cannot be used in SSG)
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { useAuth } from '@core/hooks/useAuth';
import { fetchWithCsrf } from '@core/utils/csrf';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface FeatureFlag {
  id: number;
  flag_key: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  rollout_percentage: number;
  target_tiers: string[] | null;
  target_user_ids: number[] | null;
  environment: string;
  created_at: string;
  updated_at: string;
}

interface FlagFormData {
  flag_key: string;
  name: string;
  description: string;
  is_enabled: boolean;
  rollout_percentage: number;
  target_tiers: string;
  target_user_ids: string;
  environment: string;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Create/Edit Flag Modal Component
 */
function FlagModal({
  isOpen,
  onClose,
  onSave,
  flag
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: FlagFormData) => Promise<void>;
  flag?: FeatureFlag | null;
}) {
  const [formData, setFormData] = useState<FlagFormData>({
    flag_key: '',
    name: '',
    description: '',
    is_enabled: false,
    rollout_percentage: 100,
    target_tiers: '',
    target_user_ids: '',
    environment: 'production'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (flag) {
      setFormData({
        flag_key: flag.flag_key,
        name: flag.name,
        description: flag.description || '',
        is_enabled: flag.is_enabled,
        rollout_percentage: flag.rollout_percentage,
        target_tiers: flag.target_tiers ? flag.target_tiers.join(', ') : '',
        target_user_ids: flag.target_user_ids ? flag.target_user_ids.join(', ') : '',
        environment: flag.environment
      });
    } else {
      setFormData({
        flag_key: '',
        name: '',
        description: '',
        is_enabled: false,
        rollout_percentage: 100,
        target_tiers: '',
        target_user_ids: '',
        environment: 'production'
      });
    }
  }, [flag]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      alert('Error saving flag');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BizModal isOpen={isOpen} onClose={onClose} title={flag ? 'Edit Feature Flag' : 'Create Feature Flag'} size="medium">
      <div className="space-y-4">
        {/* Flag Key */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Flag Key <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.flag_key}
            onChange={(e) => setFormData({ ...formData, flag_key: e.target.value })}
            className="w-full px-3 py-2 border rounded"
            placeholder="premium_dark_mode"
            disabled={!!flag} // Cannot edit key
            required
          />
          <p className="text-xs text-gray-500 mt-1">Unique identifier (snake_case)</p>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border rounded"
            placeholder="Premium Dark Mode"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border rounded"
            rows={3}
            placeholder="Dark mode UI theme for premium members"
          />
        </div>

        {/* Enabled Toggle */}
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_enabled}
              onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">Enabled</span>
          </label>
          <p className="text-xs text-gray-500 mt-1">Master switch for this feature</p>
        </div>

        {/* Rollout Percentage */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Rollout Percentage: {formData.rollout_percentage}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="10"
            value={formData.rollout_percentage}
            onChange={(e) => setFormData({ ...formData, rollout_percentage: parseInt(e.target.value) })}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">A/B testing: 0% = nobody, 100% = everyone</p>
        </div>

        {/* Target Tiers */}
        <div>
          <label className="block text-sm font-medium mb-1">Target Tiers (optional)</label>
          <input
            type="text"
            value={formData.target_tiers}
            onChange={(e) => setFormData({ ...formData, target_tiers: e.target.value })}
            className="w-full px-3 py-2 border rounded"
            placeholder="premium, preferred"
          />
          <p className="text-xs text-gray-500 mt-1">Comma-separated list (leave empty for all)</p>
        </div>

        {/* Target User IDs */}
        <div>
          <label className="block text-sm font-medium mb-1">Target User IDs (optional)</label>
          <input
            type="text"
            value={formData.target_user_ids}
            onChange={(e) => setFormData({ ...formData, target_user_ids: e.target.value })}
            className="w-full px-3 py-2 border rounded"
            placeholder="1, 2, 3"
          />
          <p className="text-xs text-gray-500 mt-1">Comma-separated list (leave empty for all)</p>
        </div>

        {/* Environment */}
        <div>
          <label className="block text-sm font-medium mb-1">Environment</label>
          <select
            value={formData.environment}
            onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <BizModalButton variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </BizModalButton>
          <BizModalButton variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : flag ? 'Update Flag' : 'Create Flag'}
          </BizModalButton>
        </div>
      </div>
    </BizModal>
  );
}

/**
 * Delete Confirmation Modal Component
 */
function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  flag
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  flag: FeatureFlag | null;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      alert('Error deleting flag');
    } finally {
      setDeleting(false);
    }
  };

  if (!flag) return null;

  return (
    <BizModal isOpen={isOpen} onClose={onClose} title="Delete Feature Flag" size="small">
      <div className="space-y-4">
        <p className="text-gray-700">
          Are you sure you want to delete the feature flag <strong>{flag.name}</strong> ({flag.flag_key})?
        </p>
        <p className="text-red-600 text-sm">
          This action cannot be undone. Any code referencing this flag will fail closed (disabled).
        </p>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <BizModalButton variant="secondary" onClick={onClose} disabled={deleting}>
            Cancel
          </BizModalButton>
          <BizModalButton variant="danger" onClick={handleConfirm} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Flag'}
          </BizModalButton>
        </div>
      </div>
    </BizModal>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * AdminFeatureFlagsPage - Feature flag management interface
 *
 * Provides complete CRUD operations for feature flags with A/B testing.
 * Requires admin role for access.
 *
 * @component
 * @returns {JSX.Element} Admin feature flags interface
 */
export default function AdminFeatureFlagsPage() {
  const { user } = useAuth();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  // GOVERNANCE FIX: useEffect MUST be called before any early returns
  // React Rules of Hooks: Hooks must be called in the same order on every render
  useEffect(() => {
    // Only fetch if user is admin - conditional logic INSIDE the hook
    if (user?.role === 'admin') {
      fetchFlags();
    }
  }, [user]);

  // Conditional returns AFTER all hooks
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600 font-medium">Access Denied: Admin privileges required</div>
      </div>
    );
  }

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/feature-flags', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setFlags(data.data?.flags ?? []);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCreate = () => {
    setSelectedFlag(null);
    setFlagModalOpen(true);
  };

  const handleEdit = (flag: FeatureFlag) => {
    setSelectedFlag(flag);
    setFlagModalOpen(true);
  };

  const handleDelete = (flag: FeatureFlag) => {
    setSelectedFlag(flag);
    setDeleteModalOpen(true);
  };

  const handleToggle = async (flag: FeatureFlag) => {
    try {
      await fetch(`/api/admin/feature-flags/${flag.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !flag.is_enabled })
      });
      await fetchFlags();
    } catch (error) {
      alert('Error toggling flag');
    }
  };

  const handleSave = async (data: FlagFormData) => {
    const payload = {
      flag_key: data.flag_key,
      name: data.name,
      description: data.description || null,
      is_enabled: data.is_enabled,
      rollout_percentage: data.rollout_percentage,
      target_tiers: data.target_tiers ? data.target_tiers.split(',').map(t => t.trim()).filter(Boolean) : null,
      target_user_ids: data.target_user_ids ? data.target_user_ids.split(',').map(id => parseInt(id.trim())).filter(Boolean) : null,
      environment: data.environment
    };

    if (selectedFlag) {
      // Update
      await fetch(`/api/admin/feature-flags/${selectedFlag.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      // Create
      await fetch('/api/admin/feature-flags', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    await fetchFlags();
  };

  const handleConfirmDelete = async () => {
    if (!selectedFlag) return;

    // @governance MANDATORY - CSRF protection for DELETE requests
    // Source: osi-production-compliance.mdc, Layer 7 Security
    await fetchWithCsrf(`/api/admin/feature-flags/${selectedFlag.id}`, {method: 'DELETE'});

    await fetchFlags();
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Feature Flags</h1>
            <p className="text-gray-600">Manage feature toggles and A/B testing</p>
          </div>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-[#ed6437] text-white rounded hover:bg-[#d55a2f]"
          >
            Create Flag
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white p-8 rounded shadow text-center text-gray-500">
          Loading flags...
        </div>
      ) : (
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Flag Key</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rollout</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Environment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {flags.map(flag => (
                <tr key={flag.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{flag.flag_key}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{flag.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={flag.is_enabled}
                        onChange={() => handleToggle(flag)}
                        className="w-4 h-4"
                      />
                      <span className={`text-sm ${flag.is_enabled ? 'text-green-600' : 'text-gray-600'}`}>
                        {flag.is_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${flag.rollout_percentage}%` }}
                        />
                      </div>
                      <span>{flag.rollout_percentage}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${
                      flag.environment === 'production' ? 'bg-green-100 text-green-800' :
                      flag.environment === 'staging' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {flag.environment}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleEdit(flag)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(flag)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {flags.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No feature flags found. Create your first flag to get started.
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <FlagModal
        isOpen={flagModalOpen}
        onClose={() => setFlagModalOpen(false)}
        onSave={handleSave}
        flag={selectedFlag}
      />

      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        flag={selectedFlag}
      />
    </>
  );
}
