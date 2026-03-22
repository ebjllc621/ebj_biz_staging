/**
 * JobCard - Dashboard job card for management
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Jobs Phase 1 - Core Job CRUD & Display
 *
 * WORKFLOW ENHANCEMENT:
 * - Displays remaining openings count
 * - Quick action buttons for pause/resume, mark filled, archive
 */
'use client';

import { Edit, Trash2, Share2, Briefcase, MapPin, DollarSign, Eye, Users, BarChart3, Pause, Play, CheckCircle, Archive, UserPlus, FileText } from 'lucide-react';
import type { Job } from '@features/jobs/types';

/**
 * Extended Job type with optional share/referral counts
 * These are added dynamically by the /api/listings/[id]/jobs endpoint
 */
interface JobWithMetrics extends Job {
  share_count?: number;
  referral_count?: number;
}

interface JobCardProps {
  job: JobWithMetrics;
  onEdit: () => void;
  onDelete: () => void;
  onPublish: () => void;
  onViewAnalytics: () => void;
  onStatusChange?: (_status: string) => void;
  onSaveAsTemplate?: () => void;
}

/**
 * Format employment type for display
 */
function formatEmploymentType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Format compensation for display
 */
function formatCompensation(
  type: string,
  min: number | string | null,
  max: number | string | null
): string {
  if (type === 'unpaid') return 'Unpaid';
  if (type === 'competitive') return 'Competitive';

  const minNum = min != null ? Number(min) : null;
  const maxNum = max != null ? Number(max) : null;

  if (minNum && maxNum) {
    return `$${minNum.toFixed(0)} - $${maxNum.toFixed(0)}`;
  } else if (minNum) {
    return `$${minNum.toFixed(0)}+`;
  }

  return formatEmploymentType(type);
}

/**
 * Get status badge color
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'draft':
      return 'bg-gray-100 text-gray-800';
    case 'paused':
      return 'bg-yellow-100 text-yellow-800';
    case 'filled':
      return 'bg-blue-100 text-blue-800';
    case 'expired':
      return 'bg-red-100 text-red-800';
    case 'archived':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Format status for display
 */
function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function JobCard({ job, onEdit, onDelete, onPublish, onViewAnalytics, onStatusChange, onSaveAsTemplate }: JobCardProps) {
  const location = job.work_location_type === 'remote'
    ? 'Remote'
    : [job.city, job.state].filter(Boolean).join(', ') || 'Location TBD';

  // Determine which quick actions are available based on current status
  const canPause = job.status === 'active';
  const canResume = job.status === 'paused';
  const canMarkFilled = job.status === 'active' || job.status === 'paused';
  const canArchive = job.status !== 'archived' && job.status !== 'draft';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{job.title}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`inline-flex text-xs px-2 py-0.5 rounded-full ${getStatusColor(job.status)}`}>
              {formatStatus(job.status)}
            </span>
            {job.is_featured && (
              <span className="inline-flex text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                Featured
              </span>
            )}
            {/* Openings indicator */}
            {job.number_of_openings > 0 && job.status !== 'filled' && job.status !== 'archived' && (
              <span className="inline-flex text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                {job.number_of_openings} {job.number_of_openings === 1 ? 'opening' : 'openings'}
              </span>
            )}
            {job.number_of_openings === 0 && job.status !== 'filled' && (
              <span className="inline-flex text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                All filled
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onViewAnalytics}
            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="View analytics"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          <button
            onClick={onPublish}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Share job"
          >
            <Share2 className="w-4 h-4" />
          </button>
          {onSaveAsTemplate && (
            <button
              onClick={onSaveAsTemplate}
              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              title="Save as template"
            >
              <FileText className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onEdit}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Edit job"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete job"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 flex-shrink-0" />
          <span>{formatEmploymentType(job.employment_type)}</span>
        </div>

        {job.compensation_min && (
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 flex-shrink-0" />
            <span>{formatCompensation(job.compensation_type, job.compensation_min, job.compensation_max)}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{location}</span>
        </div>

        {/* Stats */}
        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1 text-xs">
            <Eye className="w-3.5 h-3.5" />
            <span>{job.view_count} views</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <Users className="w-3.5 h-3.5" />
            <span>{job.application_count} applications</span>
          </div>
          {(job.share_count !== undefined && job.share_count > 0) && (
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <Share2 className="w-3.5 h-3.5" />
              <span>{job.share_count} shares</span>
            </div>
          )}
          {(job.referral_count !== undefined && job.referral_count > 0) && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <UserPlus className="w-3.5 h-3.5" />
              <span>{job.referral_count} referrals</span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {onStatusChange && (canPause || canResume || canMarkFilled || canArchive) && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            {canPause && (
              <button
                onClick={() => onStatusChange('paused')}
                className="flex items-center gap-1 px-2 py-1 text-xs text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded transition-colors"
                title="Pause listing (hide from search)"
              >
                <Pause className="w-3 h-3" />
                Pause
              </button>
            )}
            {canResume && (
              <button
                onClick={() => onStatusChange('active')}
                className="flex items-center gap-1 px-2 py-1 text-xs text-green-700 bg-green-50 hover:bg-green-100 rounded transition-colors"
                title="Resume listing"
              >
                <Play className="w-3 h-3" />
                Resume
              </button>
            )}
            {canMarkFilled && (
              <button
                onClick={() => onStatusChange('filled')}
                className="flex items-center gap-1 px-2 py-1 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                title="Mark as filled"
              >
                <CheckCircle className="w-3 h-3" />
                Filled
              </button>
            )}
            {canArchive && (
              <button
                onClick={() => onStatusChange('archived')}
                className="flex items-center gap-1 px-2 py-1 text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 rounded transition-colors"
                title="Archive for future reuse"
              >
                <Archive className="w-3 h-3" />
                Archive
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default JobCard;
