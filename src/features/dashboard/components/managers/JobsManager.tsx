/**
 * JobsManager - Jobs Management
 *
 * @description Manage jobs with CRUD operations via /api/listings/[id]/jobs
 * @component Client Component
 * @tier ADVANCED
 * @phase Jobs Phase 1 - Core Job CRUD & Display
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_1_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use ErrorBoundary (ADVANCED tier requirement)
 * - Orange theme (#ed6437) for action buttons
 * - BizModal for all modals (MANDATORY)
 * - fetchWithCsrf for all mutations
 * - Tier limits enforced by JobService
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, AlertCircle, Briefcase } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import { useListingData } from '@features/dashboard/hooks/useListingData';
import { fetchWithCsrf } from '@core/utils/csrf';
import { EmptyState } from '../shared/EmptyState';
import { TierLimitBanner } from '../shared/TierLimitBanner';
import { ConfirmDeleteModal } from '../shared/ConfirmDeleteModal';
import { JobCard } from './jobs/JobCard';
import { JobFormModal } from './jobs/JobFormModal';
import { PostPublishShareModal } from './jobs/PostPublishShareModal';
import { JobAnalyticsDashboard } from './jobs/JobAnalyticsDashboard';
import { SaveJobAsTemplateModal } from './jobs/templates/SaveJobAsTemplateModal';
import type { Job } from '@features/jobs/types';
import type { MediaItem } from '@features/media/types/shared-media';

// ============================================================================
// TYPES
// ============================================================================

interface TierLimits {
  essentials: number;
  plus: number;
  preferred: number;
  premium: number;
}

const JOB_LIMITS: TierLimits = {
  essentials: 0,
  plus: 5,
  preferred: 25,
  premium: 9999
};

// ============================================================================
// COMPONENT
// ============================================================================

function JobsManagerContent() {
  const { selectedListingId } = useListingContext();
  const { listing } = useListingData(selectedListingId);

  // State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [deletingJob, setDeletingJob] = useState<Job | null>(null);
  const [publishedJob, setPublishedJob] = useState<Job | null>(null);
  const [analyticsJob, setAnalyticsJob] = useState<Job | null>(null);
  const [savingTemplateJob, setSavingTemplateJob] = useState<Job | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const tier = listing?.tier || 'essentials';
  const limit = JOB_LIMITS[tier as keyof TierLimits] || 0;
  const canAddMore = jobs.length < limit;

  // Upload pending media created before the job existed (create mode)
  const uploadPendingJobMedia = useCallback(async (
    jobId: number,
    mediaItems: MediaItem[]
  ): Promise<{ succeeded: number; failed: number }> => {
    let succeeded = 0;
    let failed = 0;

    for (const item of mediaItems) {
      try {
        if (item.media_type === 'video' && item.source === 'embed') {
          await fetchWithCsrf(`/api/jobs/${jobId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              media_type: 'video',
              file_url: item.file_url,
              embed_url: item.embed_url,
              platform: item.platform,
              source: 'embed',
            })
          });
          succeeded++;
        } else if (item.media_type === 'image' && typeof item.file_url === 'string') {
          const blob = await fetch(item.file_url).then(r => r.blob());
          const file = new File([blob], `job-image-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });

          const formData = new FormData();
          formData.append('file', file);
          formData.append('entityType', 'jobs');
          formData.append('entityId', jobId.toString());
          formData.append('mediaType', 'gallery');

          const uploadResponse = await fetchWithCsrf('/api/media/upload', {
            method: 'POST',
            body: formData
          });

          if (!uploadResponse.ok) { failed++; continue; }

          const uploadData = await uploadResponse.json();
          const fileUrl = uploadData.data?.file?.url;
          if (!fileUrl) { failed++; continue; }

          await fetchWithCsrf(`/api/jobs/${jobId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              media_type: 'image',
              file_url: fileUrl,
              alt_text: item.alt_text,
              source: 'upload',
            })
          });
          succeeded++;
        }
      } catch {
        failed++;
        // Non-blocking — job is already created
      }
    }

    return { succeeded, failed };
  }, []);

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    if (!selectedListingId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/listings/${selectedListingId}/jobs`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const result = await response.json();
      if (result.success) {
        // GOVERNANCE: API uses createSuccessResponse which wraps data in { success, data: {...} }
        setJobs(result.data?.jobs || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setIsLoading(false);
    }
  }, [selectedListingId]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Handle create
  const handleCreate = useCallback(async (data: Record<string, unknown>) => {
    if (!selectedListingId) return;

    setIsSubmitting(true);
    setError(null);

    // Extract pending media before sending to API
    const pendingMedia = data._pendingMedia as MediaItem[] | undefined;
    const apiData = { ...data };
    delete apiData._pendingMedia;

    try {
      const response = await fetchWithCsrf(`/api/listings/${selectedListingId}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData)
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to create job');
      }

      const result = await response.json();
      const newJob = result.data?.job || result.job;
      const newJobId = newJob?.id;

      if (!newJobId && pendingMedia && pendingMedia.length > 0) {
        console.warn(`[JobsManager] Job created but ID is falsy. Response shape: ${JSON.stringify(result).substring(0, 200)}`);
      }

      // Upload pending media if job was created successfully
      if (newJobId && pendingMedia && pendingMedia.length > 0) {
        const { failed } = await uploadPendingJobMedia(newJobId, pendingMedia);
        if (failed > 0) {
          setError(`Job created, but ${failed} of ${pendingMedia.length} media items failed to upload. You can add them from the edit view.`);
        }
      }

      await fetchJobs();
      setShowCreateModal(false);

      // Show publish/share modal for newly created job
      if (newJob) {
        setPublishedJob(newJob);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedListingId, fetchJobs, uploadPendingJobMedia]);

  // Handle update
  const handleUpdate = useCallback(async (data: Record<string, unknown>) => {
    if (!editingJob) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(`/api/jobs/${editingJob.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to update job');
      }

      await fetchJobs();
      setEditingJob(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update job');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [editingJob, fetchJobs]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!deletingJob) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetchWithCsrf(`/api/jobs/${deletingJob.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to delete job');
      }

      await fetchJobs();
      setDeletingJob(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete job');
    } finally {
      setIsDeleting(false);
    }
  }, [deletingJob, fetchJobs]);

  // Handle quick status change (pause/resume/filled/archive)
  const handleStatusChange = useCallback(async (jobId: number, newStatus: string) => {
    setError(null);

    try {
      const response = await fetchWithCsrf(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to update job status');
      }

      await fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update job status');
    }
  }, [fetchJobs]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Job Postings</h2>
          <p className="text-sm text-gray-600 mt-1">
            {jobs.length} of {limit === 9999 ? 'unlimited' : limit} jobs used this month
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={!canAddMore}
          className="flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Post Job
        </button>
      </div>

      {/* Tier Limit Banner */}
      {limit !== 9999 && (
        <TierLimitBanner
          current={jobs.length}
          limit={limit}
          itemType="jobs"
          tier={tier}
        />
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-sm hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Jobs List - Split into Sections */}
      {jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No Job Postings Yet"
          description={
            limit === 0
              ? "Upgrade your tier to start posting jobs"
              : "Post your first job to attract qualified candidates"
          }
          action={
            limit > 0
              ? {
                  label: 'Post First Job',
                  onClick: () => setShowCreateModal(true)
                }
              : undefined
          }
        />
      ) : (
        <>
          {/* Active Jobs Section */}
          {(() => {
            const activeJobs = jobs.filter(job =>
              ['active', 'paused', 'draft', 'pending_moderation'].includes(job.status)
            );
            return activeJobs.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Active Jobs
                  <span className="text-sm font-normal text-gray-500">({activeJobs.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onEdit={() => setEditingJob(job)}
                      onDelete={() => setDeletingJob(job)}
                      onPublish={() => setPublishedJob(job)}
                      onViewAnalytics={() => setAnalyticsJob(job)}
                      onStatusChange={(status) => handleStatusChange(job.id, status)}
                      onSaveAsTemplate={() => setSavingTemplateJob(job)}
                    />
                  ))}
                </div>
              </div>
            ) : null;
          })()}

          {/* Filled Jobs Section */}
          {(() => {
            const filledJobs = jobs.filter(job => job.status === 'filled');
            return filledJobs.length > 0 ? (
              <div className="space-y-4 mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Filled Positions
                  <span className="text-sm font-normal text-gray-500">({filledJobs.length})</span>
                </h3>
                <p className="text-sm text-gray-500">
                  Jobs that have been successfully filled. You can reactivate these to hire again.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filledJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onEdit={() => setEditingJob(job)}
                      onDelete={() => setDeletingJob(job)}
                      onPublish={() => setPublishedJob(job)}
                      onViewAnalytics={() => setAnalyticsJob(job)}
                      onStatusChange={(status) => handleStatusChange(job.id, status)}
                      onSaveAsTemplate={() => setSavingTemplateJob(job)}
                    />
                  ))}
                </div>
              </div>
            ) : null;
          })()}

          {/* Archived Jobs Section */}
          {(() => {
            const archivedJobs = jobs.filter(job => job.status === 'archived');
            return archivedJobs.length > 0 ? (
              <div className="space-y-4 mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  Archived Jobs
                  <span className="text-sm font-normal text-gray-500">({archivedJobs.length})</span>
                </h3>
                <p className="text-sm text-gray-500">
                  Jobs that are no longer active. You can restore these to draft status.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {archivedJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onEdit={() => setEditingJob(job)}
                      onDelete={() => setDeletingJob(job)}
                      onPublish={() => setPublishedJob(job)}
                      onViewAnalytics={() => setAnalyticsJob(job)}
                      onStatusChange={(status) => handleStatusChange(job.id, status)}
                      onSaveAsTemplate={() => setSavingTemplateJob(job)}
                    />
                  ))}
                </div>
              </div>
            ) : null;
          })()}

          {/* Empty state when all jobs are filtered out (shouldn't happen but safety) */}
          {jobs.filter(job => !['active', 'paused', 'draft', 'pending_moderation', 'filled', 'archived'].includes(job.status)).length > 0 && (
            <div className="space-y-4 mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-500">Other Jobs</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {jobs.filter(job => !['active', 'paused', 'draft', 'pending_moderation', 'filled', 'archived'].includes(job.status)).map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onEdit={() => setEditingJob(job)}
                    onDelete={() => setDeletingJob(job)}
                    onPublish={() => setPublishedJob(job)}
                    onViewAnalytics={() => setAnalyticsJob(job)}
                    onStatusChange={(status) => handleStatusChange(job.id, status)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      <JobFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
        listingTier={tier}
        listingId={selectedListingId ?? undefined}
      />

      {/* Edit Modal */}
      {editingJob && (
        <JobFormModal
          isOpen={true}
          onClose={() => setEditingJob(null)}
          onSubmit={handleUpdate}
          isSubmitting={isSubmitting}
          listingTier={tier}
          listingId={selectedListingId ?? undefined}
          jobId={editingJob.id}
          initialData={{
            title: editingJob.title,
            employment_type: editingJob.employment_type,
            description: editingJob.description,
            compensation_type: editingJob.compensation_type,
            compensation_min: editingJob.compensation_min?.toString() || '',
            compensation_max: editingJob.compensation_max?.toString() || '',
            work_location_type: editingJob.work_location_type,
            city: editingJob.city || '',
            state: editingJob.state || '',
            application_method: editingJob.application_method,
            external_application_url: editingJob.external_application_url || '',
            start_date: editingJob.start_date ? editingJob.start_date.toString().split('T')[0] : '',
            application_deadline: editingJob.application_deadline ? editingJob.application_deadline.toString().split('T')[0] : '',
            status: editingJob.status
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingJob && (
        <ConfirmDeleteModal
          isOpen={true}
          onClose={() => setDeletingJob(null)}
          onConfirm={handleDelete}
          itemType="job"
          itemName={deletingJob.title}
          isDeleting={isDeleting}
        />
      )}

      {/* Post-Publish Share Modal */}
      {publishedJob && (
        <PostPublishShareModal
          isOpen={true}
          onClose={() => setPublishedJob(null)}
          job={publishedJob}
        />
      )}

      {/* Analytics Modal */}
      {analyticsJob && (
        <JobAnalyticsDashboard
          isOpen={true}
          onClose={() => {
            setAnalyticsJob(null);
            // Refetch jobs to update view counts after viewing analytics
            fetchJobs();
          }}
          job={analyticsJob}
        />
      )}

      {/* Save as Template Modal */}
      {savingTemplateJob && selectedListingId && (
        <SaveJobAsTemplateModal
          isOpen={true}
          onClose={() => setSavingTemplateJob(null)}
          jobData={{
            title: savingTemplateJob.title,
            employment_type: savingTemplateJob.employment_type,
            description: savingTemplateJob.description,
            compensation_type: savingTemplateJob.compensation_type,
            required_qualifications: savingTemplateJob.required_qualifications || undefined,
            preferred_qualifications: savingTemplateJob.preferred_qualifications || undefined,
            benefits: savingTemplateJob.benefits || undefined,
          }}
          listingId={selectedListingId}
          onSuccess={() => setSavingTemplateJob(null)}
        />
      )}
    </div>
  );
}

/**
 * JobsManager - Wrapped with ErrorBoundary
 */
export function JobsManager() {
  return (
    <ErrorBoundary componentName="JobsManager">
      <JobsManagerContent />
    </ErrorBoundary>
  );
}

export default JobsManager;
