/**
 * Admin Cron Jobs Management Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: Custom grouped layout (STANDARD tier)
 * - Authentication: Admin-only access required
 * - Service Boundary: API routes for database access (NO direct database)
 * - Credentials: 'include' for all fetch requests
 * - CSRF: fetchWithCsrf for all state-changing operations
 *
 * Features:
 * - View all registered cron jobs grouped by category
 * - Status indicators (implemented, planned, disabled)
 * - Manual trigger with execution feedback
 * - Create/edit cron job definitions
 * - Execution history per job
 * - Export crontab/Vercel configuration
 *
 * @authority docs/reports/system/crons/CRON_JOBS_AUDIT.md
 * @tier STANDARD
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { useAuth } from '@core/hooks/useAuth';
import { fetchWithCsrf } from '@core/utils/csrf';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CronJob {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  endpoint: string;
  method: 'POST' | 'GET';
  schedule: string;
  schedule_description: string | null;
  auth_type: 'admin_rbac' | 'cron_secret' | 'none';
  request_body: Record<string, unknown> | null;
  request_headers: Record<string, string> | null;
  is_active: boolean;
  status: 'implemented' | 'planned' | 'disabled';
  category: string;
  timeout_ms: number;
  last_run_at: string | null;
  last_run_status: 'success' | 'failure' | 'timeout' | null;
  last_run_duration_ms: number | null;
  last_run_result: Record<string, unknown> | null;
  run_count: number;
  failure_count: number;
  created_at: string;
  updated_at: string;
}

interface CronJobRun {
  id: number;
  cron_job_id: number;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  status: 'running' | 'success' | 'failure' | 'timeout';
  response_status: number | null;
  error_message: string | null;
  triggered_by: 'scheduler' | 'manual' | 'system';
}

interface Stats {
  total: number;
  active: number;
  implemented: number;
  planned: number;
  disabled: number;
  recent_failures: number;
}

interface JobFormData {
  name: string;
  slug: string;
  description: string;
  endpoint: string;
  method: 'POST' | 'GET';
  schedule: string;
  schedule_description: string;
  auth_type: 'admin_rbac' | 'cron_secret' | 'none';
  request_body: string;
  is_active: boolean;
  status: 'implemented' | 'planned' | 'disabled';
  category: string;
  timeout_ms: number;
}

const EMPTY_FORM: JobFormData = {
  name: '',
  slug: '',
  description: '',
  endpoint: '',
  method: 'POST',
  schedule: '',
  schedule_description: '',
  auth_type: 'admin_rbac',
  request_body: '',
  is_active: true,
  status: 'planned',
  category: 'general',
  timeout_ms: 30000,
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    implemented: 'bg-green-100 text-green-800',
    planned: 'bg-yellow-100 text-yellow-800',
    disabled: 'bg-gray-100 text-gray-600',
    success: 'bg-green-100 text-green-800',
    failure: 'bg-red-100 text-red-800',
    timeout: 'bg-orange-100 text-orange-800',
    running: 'bg-blue-100 text-blue-800',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`p-4 rounded-lg border ${color}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

function JobFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  title,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: JobFormData) => Promise<void>;
  initialData: JobFormData;
  title: string;
}) {
  const [form, setForm] = useState<JobFormData>(initialData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(initialData);
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleSubmit = async () => {
    if (!form.name || !form.slug || !form.endpoint || !form.schedule) {
      setError('Name, slug, endpoint, and schedule are required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof JobFormData, value: string | boolean | number) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value } as JobFormData;
      // Auto-generate slug from name
      if (field === 'name' && !initialData.slug) {
        updated.slug = String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }
      return updated;
    });
  };

  return (
    <BizModal isOpen={isOpen} onClose={onClose} title={title} size="large">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        {error && (
          <div className="p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="Job Share Reminders"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slug *</label>
            <input
              type="text"
              value={form.slug}
              onChange={e => handleChange('slug', e.target.value)}
              className="w-full px-3 py-2 border rounded font-mono text-sm"
              placeholder="job-share-reminders"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={e => handleChange('description', e.target.value)}
            className="w-full px-3 py-2 border rounded"
            rows={2}
            placeholder="What this job does..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">API Endpoint *</label>
            <input
              type="text"
              value={form.endpoint}
              onChange={e => handleChange('endpoint', e.target.value)}
              className="w-full px-3 py-2 border rounded font-mono text-sm"
              placeholder="/api/admin/jobs/cron/share-reminders"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">HTTP Method</label>
            <select
              value={form.method}
              onChange={e => handleChange('method', e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="POST">POST</option>
              <option value="GET">GET</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Cron Schedule *</label>
            <input
              type="text"
              value={form.schedule}
              onChange={e => handleChange('schedule', e.target.value)}
              className="w-full px-3 py-2 border rounded font-mono text-sm"
              placeholder="0 10 * * *"
            />
            <p className="text-xs text-gray-500 mt-1">Standard cron format: min hour day month weekday</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Schedule Description</label>
            <input
              type="text"
              value={form.schedule_description}
              onChange={e => handleChange('schedule_description', e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="Daily at 10:00 AM"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Auth Type</label>
            <select
              value={form.auth_type}
              onChange={e => handleChange('auth_type', e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="admin_rbac">Admin RBAC</option>
              <option value="cron_secret">CRON_SECRET Bearer</option>
              <option value="none">None</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={form.status}
              onChange={e => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="implemented">Implemented</option>
              <option value="planned">Planned</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <input
              type="text"
              value={form.category}
              onChange={e => handleChange('category', e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="notifications"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Timeout (ms)</label>
            <input
              type="number"
              value={form.timeout_ms}
              onChange={e => handleChange('timeout_ms', parseInt(e.target.value) || 30000)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => handleChange('is_active', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Active (enabled for scheduling)</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Request Body (JSON)</label>
          <textarea
            value={form.request_body}
            onChange={e => handleChange('request_body', e.target.value)}
            className="w-full px-3 py-2 border rounded font-mono text-sm"
            rows={3}
            placeholder='{"frequency": "daily"}'
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t mt-4">
        <BizModalButton variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </BizModalButton>
        <BizModalButton variant="primary" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </BizModalButton>
      </div>
    </BizModal>
  );
}

function RunHistoryModal({
  isOpen,
  onClose,
  job,
  runs,
}: {
  isOpen: boolean;
  onClose: () => void;
  job: CronJob | null;
  runs: CronJobRun[];
}) {
  if (!job) return null;

  return (
    <BizModal isOpen={isOpen} onClose={onClose} title={`Run History: ${job.name}`} size="large">
      <div className="max-h-[60vh] overflow-y-auto">
        {runs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No execution history yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Duration</th>
                <th className="px-3 py-2 text-left">HTTP</th>
                <th className="px-3 py-2 text-left">Triggered By</th>
                <th className="px-3 py-2 text-left">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {runs.map(run => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs">
                    {new Date(run.started_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="px-3 py-2">
                    {run.duration_ms != null ? `${run.duration_ms}ms` : '-'}
                  </td>
                  <td className="px-3 py-2">
                    {run.response_status || '-'}
                  </td>
                  <td className="px-3 py-2 capitalize">
                    {run.triggered_by}
                  </td>
                  <td className="px-3 py-2 text-red-600 text-xs max-w-[200px] truncate">
                    {run.error_message || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex justify-end pt-4 border-t mt-4">
        <BizModalButton variant="secondary" onClick={onClose}>Close</BizModalButton>
      </div>
    </BizModal>
  );
}

function CronJobCard({
  job,
  onEdit,
  onTrigger,
  onViewHistory,
  triggering,
}: {
  job: CronJob;
  onEdit: (job: CronJob) => void;
  onTrigger: (job: CronJob) => void;
  onViewHistory: (job: CronJob) => void;
  triggering: number | null;
}) {
  const isTriggering = triggering === job.id;

  return (
    <div className={`bg-white border rounded-lg p-4 ${!job.is_active ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-medium text-sm">{job.name}</h4>
          <p className="text-xs text-gray-500 font-mono">{job.endpoint}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={job.status} />
          {!job.is_active && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-200 text-gray-600">inactive</span>
          )}
        </div>
      </div>

      {job.description && (
        <p className="text-xs text-gray-600 mb-3">{job.description}</p>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div>
          <span className="text-gray-500">Schedule:</span>{' '}
          <span className="font-mono">{job.schedule}</span>
          {job.schedule_description && (
            <span className="text-gray-400 ml-1">({job.schedule_description})</span>
          )}
        </div>
        <div>
          <span className="text-gray-500">Auth:</span>{' '}
          <span>{job.auth_type.replace('_', ' ')}</span>
        </div>
        <div>
          <span className="text-gray-500">Last Run:</span>{' '}
          {job.last_run_at ? (
            <>
              <span>{new Date(job.last_run_at).toLocaleString()}</span>
              {job.last_run_status && <StatusBadge status={job.last_run_status} />}
            </>
          ) : (
            <span className="text-gray-400">Never</span>
          )}
        </div>
        <div>
          <span className="text-gray-500">Runs:</span>{' '}
          <span>{job.run_count}</span>
          {job.failure_count > 0 && (
            <span className="text-red-600 ml-1">({job.failure_count} failed)</span>
          )}
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t">
        <button
          onClick={() => onTrigger(job)}
          disabled={isTriggering || job.status !== 'implemented'}
          className="px-3 py-1 text-xs bg-[#ed6437] text-white rounded hover:bg-[#d55a2f] disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isTriggering ? 'Running...' : 'Trigger Now'}
        </button>
        <button
          onClick={() => onViewHistory(job)}
          className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
        >
          History
        </button>
        <button
          onClick={() => onEdit(job)}
          className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
        >
          Edit
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdminCronJobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyJob, setHistoryJob] = useState<CronJob | null>(null);
  const [historyRuns, setHistoryRuns] = useState<CronJobRun[]>([]);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchJobs = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/cron-jobs', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setJobs(data.data?.items ?? []);
        setStats(data.data?.stats ?? null);
      }
    } catch {
      // Silently fail on network error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchJobs();
    }
  }, [user, fetchJobs]);

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

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleTrigger = async (job: CronJob) => {
    setTriggering(job.id);
    setMessage(null);
    try {
      const response = await fetchWithCsrf(`/api/admin/cron-jobs/${job.id}/trigger`, { method: 'POST' });
      const data = await response.json() as { data?: { run?: CronJobRun }; message?: string };

      if (response.ok) {
        const run = data.data?.run;
        setMessage({
          type: run?.status === 'success' ? 'success' : 'error',
          text: `${job.name}: ${run?.status ?? 'unknown'} (${run?.duration_ms ?? 0}ms)${run?.error_message ? ` - ${run.error_message}` : ''}`
        });
        await fetchJobs();
      } else {
        setMessage({ type: 'error', text: data.message ?? 'Failed to trigger job' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error triggering job' });
    } finally {
      setTriggering(null);
    }
  };

  const handleSaveJob = async (form: JobFormData) => {
    let parsedBody: Record<string, unknown> | null = null;
    if (form.request_body.trim()) {
      try {
        parsedBody = JSON.parse(form.request_body);
      } catch {
        throw new Error('Request body must be valid JSON');
      }
    }

    const payload = {
      ...form,
      request_body: parsedBody,
    };

    if (editingJob) {
      const response = await fetchWithCsrf(`/api/admin/cron-jobs/${editingJob.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message ?? 'Failed to update job');
      }
      setMessage({ type: 'success', text: `Updated: ${form.name}` });
    } else {
      const response = await fetchWithCsrf('/api/admin/cron-jobs', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message ?? 'Failed to create job');
      }
      setMessage({ type: 'success', text: `Created: ${form.name}` });
    }

    await fetchJobs();
  };

  const handleEdit = (job: CronJob) => {
    setEditingJob(job);
    setFormModalOpen(true);
  };

  const handleCreate = () => {
    setEditingJob(null);
    setFormModalOpen(true);
  };

  const handleViewHistory = async (job: CronJob) => {
    setHistoryJob(job);
    setHistoryModalOpen(true);
    try {
      const response = await fetch(`/api/admin/cron-jobs/${job.id}/runs`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setHistoryRuns(data.data?.items ?? []);
      }
    } catch {
      setHistoryRuns([]);
    }
  };

  const handleExport = async (format: 'crontab' | 'vercel') => {
    try {
      const response = await fetch(`/api/admin/cron-jobs/export?format=${format}`, { credentials: 'include' });
      if (format === 'crontab') {
        const text = await response.text();
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'crontab';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data.data?.config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vercel-crons.json';
        a.click();
        URL.revokeObjectURL(url);
      }
      setMessage({ type: 'success', text: `Exported ${format} configuration` });
    } catch {
      setMessage({ type: 'error', text: 'Export failed' });
    }
  };

  // ============================================================================
  // GROUPING & FILTERING
  // ============================================================================

  const filteredJobs = statusFilter === 'all'
    ? jobs
    : jobs.filter(j => j.status === statusFilter);

  const categories = [...new Set(filteredJobs.map(j => j.category))].sort();

  const groupedJobs: Record<string, CronJob[]> = {};
  for (const cat of categories) {
    groupedJobs[cat] = filteredJobs.filter(j => j.category === cat);
  }

  // ============================================================================
  // FORM DATA PREP
  // ============================================================================

  const formInitialData: JobFormData = editingJob ? {
    name: editingJob.name,
    slug: editingJob.slug,
    description: editingJob.description || '',
    endpoint: editingJob.endpoint,
    method: editingJob.method,
    schedule: editingJob.schedule,
    schedule_description: editingJob.schedule_description || '',
    auth_type: editingJob.auth_type,
    request_body: editingJob.request_body ? JSON.stringify(editingJob.request_body, null, 2) : '',
    is_active: editingJob.is_active,
    status: editingJob.status,
    category: editingJob.category,
    timeout_ms: editingJob.timeout_ms,
  } : EMPTY_FORM;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Cron Jobs Manager</h1>
            <p className="text-gray-600">Manage scheduled tasks and view execution history</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('crontab')}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Export Crontab
            </button>
            <button
              onClick={() => handleExport('vercel')}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Export Vercel
            </button>
            <button
              onClick={handleCreate}
              className="px-4 py-2 text-sm bg-[#ed6437] text-white rounded hover:bg-[#d55a2f]"
            >
              + New Cron Job
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mt-4 p-3 rounded text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          <StatCard label="Total Jobs" value={stats.total} color="border-gray-200" />
          <StatCard label="Active" value={stats.active} color="border-blue-200 bg-blue-50" />
          <StatCard label="Implemented" value={stats.implemented} color="border-green-200 bg-green-50" />
          <StatCard label="Planned" value={stats.planned} color="border-yellow-200 bg-yellow-50" />
          <StatCard label="Disabled" value={stats.disabled} color="border-gray-200 bg-gray-50" />
          <StatCard label="Failures (24h)" value={stats.recent_failures} color={stats.recent_failures > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200'} />
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {['all', 'implemented', 'planned', 'disabled'].map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 text-sm rounded ${
              statusFilter === f
                ? 'bg-[#ed6437] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white p-8 rounded shadow text-center text-gray-500">
          Loading cron jobs...
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white p-8 rounded shadow text-center text-gray-500">
          No cron jobs found. Click &quot;+ New Cron Job&quot; to create one.
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map(category => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {(groupedJobs[category] ?? []).map(job => (
                  <CronJobCard
                    key={job.id}
                    job={job}
                    onEdit={handleEdit}
                    onTrigger={handleTrigger}
                    onViewHistory={handleViewHistory}
                    triggering={triggering}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <JobFormModal
        isOpen={formModalOpen}
        onClose={() => { setFormModalOpen(false); setEditingJob(null); }}
        onSave={handleSaveJob}
        initialData={formInitialData}
        title={editingJob ? `Edit: ${editingJob.name}` : 'Create Cron Job'}
      />

      <RunHistoryModal
        isOpen={historyModalOpen}
        onClose={() => { setHistoryModalOpen(false); setHistoryJob(null); setHistoryRuns([]); }}
        job={historyJob}
        runs={historyRuns}
      />
    </>
  );
}
