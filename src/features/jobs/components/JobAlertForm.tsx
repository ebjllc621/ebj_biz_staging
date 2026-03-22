/**
 * Job Alert Form Component
 *
 * @description Create and manage job alert subscriptions
 * @component Client Component
 * @tier STANDARD
 * @phase Jobs Phase 2 - Native Applications
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_2_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - Orange theme (#ed6437) for submit button
 * - fetchWithCsrf for mutations
 * - Full validation with error display
 */
'use client';

import React, { useState } from 'react';
import { Bell, Loader2, AlertCircle } from 'lucide-react';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { AlertType, AlertFrequency, JobAlertSubscription } from '@features/jobs/types';

interface JobAlertFormProps {
  existingAlert?: JobAlertSubscription;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function JobAlertForm({ existingAlert, onSuccess, onCancel }: JobAlertFormProps) {
  const [formData, setFormData] = useState({
    alert_type: existingAlert?.alert_type || ('all_jobs' as AlertType),
    keyword_filter: existingAlert?.keyword_filter || '',
    notification_frequency: existingAlert?.notification_frequency || ('daily' as AlertFrequency),
    compensation_min: existingAlert?.compensation_min?.toString() || '',
    compensation_max: existingAlert?.compensation_max?.toString() || ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Build submission data
      const submitData: any = {
        alert_type: formData.alert_type,
        keyword_filter: formData.keyword_filter.trim() || undefined,
        notification_frequency: formData.notification_frequency,
        compensation_min: formData.compensation_min ? parseFloat(formData.compensation_min) : undefined,
        compensation_max: formData.compensation_max ? parseFloat(formData.compensation_max) : undefined
      };

      let response;
      if (existingAlert) {
        // Update existing alert
        submitData.alert_id = existingAlert.id;
        response = await fetchWithCsrf('/api/user/jobs/alerts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData)
        });
      } else {
        // Create new alert
        response = await fetchWithCsrf('/api/user/jobs/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData)
        });
      }

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to save alert');
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Alert Type */}
      <div>
        <label htmlFor="alert_type" className="block text-sm font-medium text-gray-700 mb-1">
          Alert Type <span className="text-red-500">*</span>
        </label>
        <select
          id="alert_type"
          name="alert_type"
          value={formData.alert_type}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
        >
          <option value="all_jobs">All new jobs</option>
          <option value="keyword">Jobs matching keywords</option>
          <option value="employment_type">Specific employment type</option>
          <option value="category">Specific category</option>
          <option value="business">Specific business</option>
        </select>
      </div>

      {/* Keyword Filter (show when alert_type is keyword) */}
      {formData.alert_type === 'keyword' && (
        <div>
          <label htmlFor="keyword_filter" className="block text-sm font-medium text-gray-700 mb-1">
            Keywords <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="keyword_filter"
            name="keyword_filter"
            value={formData.keyword_filter}
            onChange={handleChange}
            required={formData.alert_type === 'keyword'}
            placeholder="e.g., server, manager, cashier"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Separate multiple keywords with commas
          </p>
        </div>
      )}

      {/* Notification Frequency */}
      <div>
        <label htmlFor="notification_frequency" className="block text-sm font-medium text-gray-700 mb-1">
          Notification Frequency <span className="text-red-500">*</span>
        </label>
        <select
          id="notification_frequency"
          name="notification_frequency"
          value={formData.notification_frequency}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
        >
          <option value="realtime">Real-time (immediate)</option>
          <option value="daily">Daily digest</option>
          <option value="weekly">Weekly digest</option>
        </select>
      </div>

      {/* Compensation Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Compensation Range (Optional)
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="compensation_min" className="block text-xs text-gray-600 mb-1">
              Minimum
            </label>
            <input
              type="number"
              id="compensation_min"
              name="compensation_min"
              value={formData.compensation_min}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="e.g., 15.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="compensation_max" className="block text-xs text-gray-600 mb-1">
              Maximum
            </label>
            <input
              type="number"
              id="compensation_max"
              name="compensation_max"
              value={formData.compensation_max}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="e.g., 25.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Bell className="w-5 h-5" />
              {existingAlert ? 'Update Alert' : 'Create Alert'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
