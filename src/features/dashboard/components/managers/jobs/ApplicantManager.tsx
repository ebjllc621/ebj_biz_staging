/**
 * ApplicantManager - Job Applicant Management
 *
 * @description Manage job applications with status updates and filtering
 * @component Client Component
 * @tier ADVANCED
 * @phase Jobs Phase 2 - Native Applications
 * @authority docs/pages/layouts/job_ops/build/phases/PHASE_2_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use ErrorBoundary (ADVANCED tier requirement)
 * - Orange theme (#ed6437) for action buttons
 * - fetchWithCsrf for all mutations
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Users, Loader2, AlertCircle, Filter } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { JobApplication, ApplicationStatus } from '@features/jobs/types';

interface ApplicantManagerProps {
  jobId: number;
  jobTitle: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

function ApplicantManagerContent({ jobId, jobTitle }: ApplicantManagerProps) {
  // State
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch applications
  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/jobs/${jobId}/applicants?${params.toString()}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }

      const result = await response.json();
      if (result.success) {
        setApplications(result.applications || []);
        setTotalPages(result.pagination?.totalPages || 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  }, [jobId, page, statusFilter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Update application status
  const updateStatus = async (applicationId: number, newStatus: ApplicationStatus) => {
    try {
      const response = await fetchWithCsrf(`/api/jobs/applications/${applicationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'Failed to update status');
      }

      // Refresh applications
      await fetchApplications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  // Get status badge color
  const getStatusColor = (status: ApplicationStatus) => {
    const colors: Record<ApplicationStatus, string> = {
      new: 'bg-blue-100 text-blue-700',
      reviewed: 'bg-purple-100 text-purple-700',
      contacted: 'bg-yellow-100 text-yellow-700',
      interviewed: 'bg-indigo-100 text-indigo-700',
      hired: 'bg-green-100 text-green-700',
      declined: 'bg-gray-100 text-gray-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Applicants</h2>
          <p className="text-sm text-gray-600 mt-1">{jobTitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ApplicationStatus | 'all');
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#ed6437] focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="reviewed">Reviewed</option>
            <option value="contacted">Contacted</option>
            <option value="interviewed">Interviewed</option>
            <option value="hired">Hired</option>
            <option value="declined">Declined</option>
          </select>
        </div>
      </div>

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

      {/* Applications List */}
      {applications.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Applications Yet</h3>
          <p className="text-gray-600">
            {statusFilter === 'all'
              ? 'Applications will appear here as candidates apply'
              : `No applications with status "${statusFilter}"`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => (
            <div
              key={application.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:border-[#ed6437] transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{application.full_name}</h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                    <span>{application.email}</span>
                    {application.phone && <span>{application.phone}</span>}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                  {application.status}
                </span>
              </div>

              {/* Application Details */}
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                {application.availability && (
                  <p>
                    <strong>Availability:</strong> {application.availability.replace('_', ' ')}
                  </p>
                )}
                {application.cover_message && (
                  <div>
                    <strong>Cover Message:</strong>
                    <p className="mt-1 text-gray-700">{application.cover_message}</p>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  Applied {new Date(application.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {application.resume_file_url && (
                  <a
                    href={application.resume_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    View Resume
                  </a>
                )}
                {application.status === 'new' && (
                  <button
                    onClick={() => updateStatus(application.id, 'reviewed')}
                    className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                  >
                    Mark as Reviewed
                  </button>
                )}
                {application.status === 'reviewed' && (
                  <button
                    onClick={() => updateStatus(application.id, 'contacted')}
                    className="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
                  >
                    Mark as Contacted
                  </button>
                )}
                {application.status === 'contacted' && (
                  <button
                    onClick={() => updateStatus(application.id, 'interviewed')}
                    className="px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                  >
                    Mark as Interviewed
                  </button>
                )}
                {['reviewed', 'contacted', 'interviewed'].includes(application.status) && (
                  <>
                    <button
                      onClick={() => updateStatus(application.id, 'hired')}
                      className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      Hire
                    </button>
                    <button
                      onClick={() => updateStatus(application.id, 'declined')}
                      className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      Decline
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-4 py-2">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * ApplicantManager - Wrapped with ErrorBoundary
 */
export function ApplicantManager(props: ApplicantManagerProps) {
  return (
    <ErrorBoundary componentName="ApplicantManager">
      <ApplicantManagerContent {...props} />
    </ErrorBoundary>
  );
}

export default ApplicantManager;
