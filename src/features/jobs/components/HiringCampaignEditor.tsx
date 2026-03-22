/**
 * HiringCampaignEditor Component
 *
 * Campaign editor with BizModal wrapper for creating/editing hiring campaigns
 *
 * GOVERNANCE COMPLIANCE:
 * - 'use client' directive for client component
 * - BizModal wrapper: MANDATORY for modal editors
 * - Import aliases: @core/, @features/, @components/
 * - fetchWithCsrf for mutations
 *
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_4_BRAIN_PLAN.md
 * @tier STANDARD
 * @phase Jobs Phase 4 - Platform Growth & Future Features
 * @reference src/core/services/CampaignService.ts - Campaign management pattern
 */

'use client';

import { useState, useEffect } from 'react';
import { BizModal } from '@/components/ui/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { HiringCampaign, CampaignType, Season } from '@features/jobs/types';

interface HiringCampaignEditorProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: number;
  initialCampaign?: HiringCampaign | null;
  onSave?: (campaign: HiringCampaign) => void;
}

export function HiringCampaignEditor({
  isOpen,
  onClose,
  listingId,
  initialCampaign,
  onSave
}: HiringCampaignEditorProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [campaignName, setCampaignName] = useState(initialCampaign?.campaign_name || '');
  const [campaignType, setCampaignType] = useState<CampaignType>(initialCampaign?.campaign_type || 'evergreen');
  const [hiringGoal, setHiringGoal] = useState<number | ''>(initialCampaign?.hiring_goal || '');
  const [targetRoles, setTargetRoles] = useState<string[]>(initialCampaign?.target_roles || []);
  const [roleInput, setRoleInput] = useState('');
  const [season, setSeason] = useState<Season | ''>(initialCampaign?.season || '');
  const [startDate, setStartDate] = useState(
    initialCampaign?.start_date
      ? new Date(initialCampaign.start_date).toISOString().split('T')[0]
      : ''
  );
  const [endDate, setEndDate] = useState(
    initialCampaign?.end_date
      ? new Date(initialCampaign.end_date).toISOString().split('T')[0]
      : ''
  );
  const [budget, setBudget] = useState<number | ''>(initialCampaign?.budget ? parseFloat(String(initialCampaign.budget)) : '');
  const [notes, setNotes] = useState(initialCampaign?.notes || '');

  useEffect(() => {
    if (initialCampaign) {
      setCampaignName(initialCampaign.campaign_name);
      setCampaignType(initialCampaign.campaign_type);
      setHiringGoal(initialCampaign.hiring_goal || '');
      setTargetRoles(initialCampaign.target_roles || []);
      setSeason(initialCampaign.season || '');
      setStartDate(new Date(initialCampaign.start_date).toISOString().split('T')[0]);
      setEndDate(new Date(initialCampaign.end_date).toISOString().split('T')[0]);
      setBudget(initialCampaign.budget ? parseFloat(String(initialCampaign.budget)) : '');
      setNotes(initialCampaign.notes || '');
    }
  }, [initialCampaign]);

  const addRole = () => {
    const trimmedRole = roleInput.trim();
    if (trimmedRole && !targetRoles.includes(trimmedRole)) {
      setTargetRoles([...targetRoles, trimmedRole]);
      setRoleInput('');
    }
  };

  const removeRole = (role: string) => {
    setTargetRoles(targetRoles.filter(r => r !== role));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!campaignName || !startDate || !endDate) {
      setError('Campaign name, start date, and end date are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        listing_id: listingId,
        campaign_name: campaignName,
        campaign_type: campaignType,
        hiring_goal: hiringGoal || null,
        target_roles: targetRoles.length > 0 ? targetRoles : null,
        season: season || null,
        start_date: startDate,
        end_date: endDate,
        budget: budget || null,
        notes: notes || null
      };

      const method = initialCampaign ? 'PUT' : 'POST';
      const url = initialCampaign
        ? `/api/listings/${listingId}/jobs/campaigns/${initialCampaign.id}`
        : `/api/listings/${listingId}/jobs/campaigns`;

      const response = await fetchWithCsrf(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save campaign');
      }

      const result = await response.json();
      if (onSave && result.data?.campaign) {
        onSave(result.data.campaign);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const campaignTypeOptions: { value: CampaignType; label: string }[] = [
    { value: 'seasonal', label: 'Seasonal' },
    { value: 'event', label: 'Event-Based' },
    { value: 'blitz', label: 'Hiring Blitz' },
    { value: 'evergreen', label: 'Evergreen' }
  ];

  const seasonOptions: { value: Season; label: string }[] = [
    { value: 'spring', label: 'Spring' },
    { value: 'summer', label: 'Summer' },
    { value: 'fall', label: 'Fall' },
    { value: 'winter', label: 'Winter' },
    { value: 'holiday', label: 'Holiday' }
  ];

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={initialCampaign ? 'Edit Hiring Campaign' : 'Create Hiring Campaign'}
      size="large"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Campaign Name */}
        <div>
          <label htmlFor="campaignName" className="block text-sm font-medium text-gray-700 mb-1">
            Campaign Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="campaignName"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            required
            placeholder="e.g., Summer 2026 Seasonal Hiring"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            maxLength={255}
          />
        </div>

        {/* Campaign Type and Season */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="campaignType" className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Type <span className="text-red-500">*</span>
            </label>
            <select
              id="campaignType"
              value={campaignType}
              onChange={(e) => setCampaignType(e.target.value as CampaignType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            >
              {campaignTypeOptions.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="season" className="block text-sm font-medium text-gray-700 mb-1">
              Season (Optional)
            </label>
            <select
              id="season"
              value={season}
              onChange={(e) => setSeason(e.target.value as Season)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            >
              <option value="">None</option>
              {seasonOptions.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              End Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        {/* Hiring Goal and Budget */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="hiringGoal" className="block text-sm font-medium text-gray-700 mb-1">
              Hiring Goal (Optional)
            </label>
            <input
              type="number"
              id="hiringGoal"
              value={hiringGoal}
              onChange={(e) => setHiringGoal(e.target.value ? parseInt(e.target.value) : '')}
              min="1"
              placeholder="Number of hires"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">
              Budget (Optional)
            </label>
            <input
              type="number"
              id="budget"
              value={budget}
              onChange={(e) => setBudget(e.target.value ? parseFloat(e.target.value) : '')}
              min="0"
              step="0.01"
              placeholder="Campaign budget"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        {/* Target Roles */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target Roles (Optional)</label>
          <div className="flex space-x-2 mb-2">
            <input
              type="text"
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addRole();
                }
              }}
              placeholder="Add a role (press Enter)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
            <button
              type="button"
              onClick={addRole}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {targetRoles.map((role, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
              >
                {role}
                <button
                  type="button"
                  onClick={() => removeRole(role)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional campaign notes or strategy details"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : initialCampaign ? 'Update Campaign' : 'Create Campaign'}
          </button>
        </div>
      </form>
    </BizModal>
  );
}
