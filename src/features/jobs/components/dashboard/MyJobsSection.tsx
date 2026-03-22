/**
 * MyJobsSection - 3-tab dashboard component for user's job search activity
 *
 * Tabs:
 *   - Applications: Jobs the user has applied to
 *   - Saved Jobs: Jobs the user has bookmarked
 *   - Alerts: Job alert subscriptions
 *
 * @tier STANDARD
 * @phase Jobs Phase 3 - Dashboard My Jobs Section
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Clock,
  Eye,
  MessageCircle,
  CheckCircle,
  Award,
  XCircle,
  MapPin,
  Bell,
  BellOff,
  Trash2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plus,
  Megaphone,
  MessageSquare as MessageIcon,
  Bookmark,
  BookmarkCheck,
  Filter,
} from 'lucide-react';
import { CommunityGigForm } from '../CommunityGigForm';
import type { LucideIcon } from 'lucide-react';
import { fetchWithCsrf } from '@core/utils/csrf';

// ============================================================================
// Types
// ============================================================================

type MyJobsTab = 'applications' | 'saved' | 'alerts' | 'my-gigs';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface JobApplication {
  id: number;
  job_id: number;
  job_title: string;
  job_slug: string;
  business_name: string;
  status: string;
  created_at: string;
}

interface SavedJob {
  id: number;
  job_id: number;
  job_title: string;
  job_slug: string;
  business_name: string;
  employment_type: string | null;
  location: string | null;
  status: string;
  saved_at: string;
}

interface JobAlert {
  id: number;
  user_id: number;
  alert_type: string;
  target_id: number | null;
  keyword_filter: string | null;
  employment_type_filter: string | null;
  location_filter: string | null;
  compensation_min: number | null;
  compensation_max: number | null;
  notification_frequency: string;
  is_active: boolean;
  last_sent_at: string | null;
  created_at: string;
  updated_at: string;
  target_name: string | null;
}

interface ApplicationsResponse {
  applications: JobApplication[];
  pagination: PaginationMeta;
}

interface SavedJobsResponse {
  saved_jobs: SavedJob[];
}

interface AlertsResponse {
  alerts: JobAlert[];
}

interface MyGig {
  id: number;
  title: string;
  slug: string;
  status: string;
  employment_type: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
}

interface MyGigsResponse {
  jobs: MyGig[];
}

interface NearbyGig {
  id: number;
  title: string;
  slug: string;
  employment_type: string | null;
  compensation_type: string | null;
  compensation_min: number | null;
  compensation_max: number | null;
  city: string | null;
  state: string | null;
  creator_user_id: number | null;
  created_at: string;
}

interface NearbyGigsResponse {
  jobs: NearbyGig[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ============================================================================
// Status Config
// ============================================================================

const STATUS_CONFIG: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  new: { icon: Clock, color: 'text-gray-500', label: 'Submitted' },
  reviewed: { icon: Eye, color: 'text-blue-500', label: 'Reviewed' },
  contacted: { icon: MessageCircle, color: 'text-blue-600', label: 'Contacted' },
  interviewed: { icon: CheckCircle, color: 'text-green-500', label: 'Interviewed' },
  hired: { icon: Award, color: 'text-green-600', label: 'Hired' },
  declined: { icon: XCircle, color: 'text-red-500', label: 'Declined' },
};

// ============================================================================
// Sub-components
// ============================================================================

const DEFAULT_STATUS_CFG: { icon: LucideIcon; color: string; label: string } = {
  icon: Clock,
  color: 'text-gray-500',
  label: 'Submitted',
};

function ApplicationCard({ application }: { application: JobApplication }) {
  const cfg = STATUS_CONFIG[application.status] ?? DEFAULT_STATUS_CFG;
  const StatusIcon = cfg.icon;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex gap-0">
        {/* Icon placeholder */}
        <div className="w-24 sm:w-32 flex-shrink-0 bg-gray-100 flex items-center justify-center">
          <Briefcase className="w-8 h-8 text-gray-300" />
        </div>

        {/* Content */}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/jobs/${application.job_slug}`}
                className="font-semibold text-gray-900 hover:text-[#ed6437] transition-colors line-clamp-1"
              >
                {application.job_title}
              </Link>
              <p className="text-sm text-gray-500 mt-0.5 truncate">{application.business_name}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 ${cfg.color}`}
              >
                <StatusIcon className="w-3 h-3" />
                {cfg.label}
              </span>
            </div>
          </div>

          <div className="mt-2 text-sm text-gray-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            Applied {formatDate(application.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
}

function SavedJobCard({
  job,
  onRemove,
}: {
  job: SavedJob;
  onRemove: (_jobId: number) => void;
}) {
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    setRemoving(true);
    try {
      const res = await fetch(`/api/jobs/${job.job_id}/save`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        onRemove(job.job_id);
      }
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex gap-0">
        {/* Icon placeholder */}
        <div className="w-24 sm:w-32 flex-shrink-0 bg-gray-100 flex items-center justify-center">
          <Briefcase className="w-8 h-8 text-gray-300" />
        </div>

        {/* Content */}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/jobs/${job.job_slug}`}
                className="font-semibold text-gray-900 hover:text-[#ed6437] transition-colors line-clamp-1"
              >
                {job.job_title}
              </Link>
              <p className="text-sm text-gray-500 mt-0.5 truncate">{job.business_name}</p>
            </div>
            <button
              onClick={handleRemove}
              disabled={removing}
              className="flex-shrink-0 text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50 flex items-center gap-1"
              aria-label="Remove saved job"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
            {job.employment_type && (
              <span className="capitalize">{job.employment_type.replace('_', ' ')}</span>
            )}
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                {job.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              Saved {formatDate(job.saved_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertCard({
  alert,
  onToggle,
  onDelete,
}: {
  alert: JobAlert;
  onToggle: (_alertId: number, _isActive: boolean) => void;
  onDelete: (_alertId: number) => void;
}) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleToggle() {
    setToggling(true);
    try {
      const res = await fetchWithCsrf('/api/user/jobs/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: alert.id, is_active: !alert.is_active }),
      });
      if (res.ok) {
        onToggle(alert.id, !alert.is_active);
      }
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetchWithCsrf(`/api/user/jobs/alerts?alert_id=${alert.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onDelete(alert.id);
      }
    } finally {
      setDeleting(false);
    }
  }

  // Build a human-readable label for the alert
  const labelParts: string[] = [];
  if (alert.keyword_filter) labelParts.push(`"${alert.keyword_filter}"`);
  if (alert.target_name) labelParts.push(alert.target_name);
  if (alert.employment_type_filter)
    labelParts.push(alert.employment_type_filter.replace('_', ' '));
  if (alert.location_filter) labelParts.push(alert.location_filter);
  const displayLabel = labelParts.length > 0 ? labelParts.join(' · ') : 'All jobs';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 flex-shrink-0">
            {alert.is_active ? (
              <Bell className="w-5 h-5 text-[#ed6437]" />
            ) : (
              <BellOff className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{displayLabel}</p>
            <p className="text-sm text-gray-500 mt-0.5 capitalize">
              {alert.notification_frequency} notifications
            </p>
            {alert.last_sent_at && (
              <p className="text-xs text-gray-400 mt-0.5">
                Last sent {formatDate(alert.last_sent_at)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              alert.is_active
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {alert.is_active ? 'Active' : 'Paused'}
          </span>

          <button
            onClick={handleToggle}
            disabled={toggling}
            className="ml-1 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
            aria-label={alert.is_active ? 'Pause alert' : 'Resume alert'}
            title={alert.is_active ? 'Pause alert' : 'Resume alert'}
          >
            {alert.is_active ? (
              <BellOff className="w-4 h-4" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            aria-label="Delete alert"
            title="Delete alert"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse bg-white rounded-xl border border-gray-200 overflow-hidden"
        >
          <div className="flex gap-0">
            <div className="w-24 sm:w-32 h-28 bg-gray-200 flex-shrink-0" />
            <div className="flex-1 p-4 space-y-3">
              <div className="h-5 bg-gray-200 rounded w-2/3" />
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const GIG_STATUS_STYLES: Record<string, string> = {
  pending_moderation: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  expired: 'bg-gray-100 text-gray-500',
  closed: 'bg-red-100 text-red-600',
};

function GigCard({ gig }: { gig: MyGig }) {
  const statusStyle = GIG_STATUS_STYLES[gig.status] ?? 'bg-gray-100 text-gray-500';
  const statusLabel = gig.status === 'pending_moderation' ? 'Pending Review' : gig.status.charAt(0).toUpperCase() + gig.status.slice(1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex gap-0">
        <div className="w-24 sm:w-32 flex-shrink-0 bg-green-50 flex items-center justify-center">
          <Megaphone className="w-8 h-8 text-green-300" />
        </div>
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/jobs/${gig.slug}`}
                className="font-semibold text-gray-900 hover:text-[#ed6437] transition-colors line-clamp-1"
              >
                {gig.title}
              </Link>
              {gig.employment_type && (
                <p className="text-sm text-gray-500 mt-0.5 capitalize">{gig.employment_type.replace('_', ' ')}</p>
              )}
            </div>
            <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle}`}>
              {statusLabel}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
            {(gig.city || gig.state) && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                {[gig.city, gig.state].filter(Boolean).join(', ')}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              Posted {formatDate(gig.created_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: MyJobsTab }) {
  const configs: Record<MyJobsTab, { title: string; description: string }> = {
    applications: {
      title: 'No applications yet',
      description: "Jobs you apply to will appear here.",
    },
    saved: {
      title: 'No saved jobs',
      description: "Save jobs you are interested in to revisit them later.",
    },
    alerts: {
      title: 'No job alerts',
      description: "Set up job alerts to get notified about new opportunities.",
    },
    'my-gigs': {
      title: 'No community gigs posted',
      description: "Post a gig to find help from the community.",
    },
  };

  const { title, description } = configs[tab];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
      <Briefcase className="w-14 h-14 text-gray-200 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-5">{description}</p>
      <Link
        href="/jobs"
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg font-medium hover:bg-[#d55a31] transition-colors"
      >
        Browse Jobs
        <ExternalLink className="w-4 h-4" />
      </Link>
    </div>
  );
}

function Pagination({
  pagination,
  onPageChange,
}: {
  pagination: PaginationMeta;
  onPageChange: (_page: number) => void;
}) {
  if (pagination.totalPages <= 1) return null;

  const hasPrevPage = pagination.page > 1;
  const hasNextPage = pagination.page < pagination.totalPages;

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-gray-500">
        Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={!hasPrevPage}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={!hasNextPage}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

function NearbyGigCard({ gig, onSave, onContact, isSaved }: {
  gig: NearbyGig;
  onSave: (jobId: number) => void;
  onContact: (jobId: number, creatorUserId: number) => void;
  isSaved: boolean;
}) {
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${gig.id}/save`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) onSave(gig.id);
    } finally {
      setSaving(false);
    }
  }

  const compLabel = gig.compensation_min || gig.compensation_max
    ? `$${gig.compensation_min ?? '?'} - $${gig.compensation_max ?? '?'}`
    : gig.compensation_type === 'volunteer' ? 'Volunteer' : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/jobs/${gig.slug}`}
            className="font-semibold text-gray-900 hover:text-[#ed6437] transition-colors line-clamp-1"
          >
            {gig.title}
          </Link>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-gray-500">
            {gig.employment_type && (
              <span className="capitalize">{gig.employment_type.replace('_', ' ')}</span>
            )}
            {(gig.city || gig.state) && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                {[gig.city, gig.state].filter(Boolean).join(', ')}
              </span>
            )}
            {compLabel && (
              <span className="text-green-600 font-medium">{compLabel}</span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {formatDate(gig.created_at)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {gig.creator_user_id && (
            <button
              onClick={() => onContact(gig.id, gig.creator_user_id!)}
              className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
              title="Message poster"
              aria-label="Contact gig poster"
            >
              <MessageIcon className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || isSaved}
            className={`p-2 rounded-lg transition-colors ${
              isSaved
                ? 'text-[#ed6437] bg-orange-50'
                : 'text-gray-400 hover:text-[#ed6437] hover:bg-orange-50'
            } disabled:opacity-50`}
            title={isSaved ? 'Saved' : 'Save this gig'}
            aria-label={isSaved ? 'Already saved' : 'Save gig'}
          >
            {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

const TABS: { id: MyJobsTab; label: string }[] = [
  { id: 'my-gigs', label: 'Community Gigs' },
  { id: 'applications', label: 'Applications' },
  { id: 'saved', label: 'Saved Jobs' },
  { id: 'alerts', label: 'Job Alerts' },
];

export function MyJobsSection() {
  const [activeTab, setActiveTab] = useState<MyJobsTab>('my-gigs');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-tab state
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [applicationsPagination, setApplicationsPagination] = useState<PaginationMeta | null>(
    null
  );
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [myGigs, setMyGigs] = useState<MyGig[]>([]);
  const [isGigFormOpen, setIsGigFormOpen] = useState(false);

  // Nearby gigs state
  const [nearbyEnabled, setNearbyEnabled] = useState(false);
  const [nearbyGigs, setNearbyGigs] = useState<NearbyGig[]>([]);
  const [nearbyTotal, setNearbyTotal] = useState(0);
  const [nearbyPage, setNearbyPage] = useState(1);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyCity, setNearbyCity] = useState('');
  const [nearbyState, setNearbyState] = useState('');
  const [nearbyType, setNearbyType] = useState('');
  const [nearbyComp, setNearbyComp] = useState('');
  const [savedGigIds, setSavedGigIds] = useState<Set<number>>(new Set());
  const [userLocationLoaded, setUserLocationLoaded] = useState(false);

  const fetchTab = useCallback(async (tab: MyJobsTab, currentPage: number) => {
    setIsLoading(true);
    setError(null);

    try {
      if (tab === 'applications') {
        const res = await fetch(
          `/api/user/jobs/applied?page=${currentPage}&limit=10`,
          { credentials: 'include' }
        );
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(
            (errBody as { message?: string }).message ?? 'Failed to load applications'
          );
        }
        const body = await res.json();
        const envelope = (body.data ?? body) as ApplicationsResponse;
        setApplications(envelope.applications ?? []);
        setApplicationsPagination(envelope.pagination ?? null);
      } else if (tab === 'saved') {
        const res = await fetch('/api/user/saved-jobs', { credentials: 'include' });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(
            (errBody as { message?: string }).message ?? 'Failed to load saved jobs'
          );
        }
        const body = await res.json();
        const envelope = (body.data ?? body) as SavedJobsResponse;
        setSavedJobs(envelope.saved_jobs ?? []);
      } else if (tab === 'alerts') {
        const res = await fetch('/api/user/jobs/alerts', { credentials: 'include' });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(
            (errBody as { message?: string }).message ?? 'Failed to load alerts'
          );
        }
        const body = await res.json();
        const envelope = (body.data ?? body) as AlertsResponse;
        setAlerts(envelope.alerts ?? []);
      } else if (tab === 'my-gigs') {
        const res = await fetch('/api/jobs?my_gigs=true', { credentials: 'include' });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(
            (errBody as { message?: string }).message ?? 'Failed to load your gigs'
          );
        }
        const body = await res.json();
        const envelope = (body.data ?? body) as MyGigsResponse;
        setMyGigs(envelope.jobs ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTab(activeTab, page);
  }, [activeTab, page, fetchTab]);

  function handleTabChange(tab: MyJobsTab) {
    setActiveTab(tab);
    setPage(1);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
  }

  function handleRemoveSavedJob(jobId: number) {
    setSavedJobs((prev) => prev.filter((j) => j.job_id !== jobId));
  }

  function handleAlertToggle(alertId: number, isActive: boolean) {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, is_active: isActive } : a))
    );
  }

  function handleAlertDelete(alertId: number) {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }

  // Nearby gigs: load user location on first toggle
  const loadUserLocation = useCallback(async () => {
    if (userLocationLoaded) return;
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const body = await res.json();
        const profile = body.data?.user ?? body.user ?? body.data ?? {};
        if (profile.city) setNearbyCity(profile.city);
        if (profile.state) setNearbyState(profile.state);
      }
    } catch { /* silent */ }
    setUserLocationLoaded(true);
  }, [userLocationLoaded]);

  // Fetch nearby community gigs
  const fetchNearbyGigs = useCallback(async (pg: number) => {
    setNearbyLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('is_community_gig', 'true');
      params.set('page', String(pg));
      params.set('limit', '5');
      if (nearbyCity) params.set('city', nearbyCity);
      if (nearbyState) params.set('state', nearbyState);
      if (nearbyType) params.set('employment_type', nearbyType);
      if (nearbyComp === 'paid') {
        params.set('compensation_type', 'hourly');
      } else if (nearbyComp === 'volunteer') {
        params.set('compensation_type', 'volunteer');
      }

      const res = await fetch(`/api/jobs?${params.toString()}`, { credentials: 'include' });
      if (res.ok) {
        const body = await res.json();
        const envelope = (body.data ?? body) as NearbyGigsResponse;
        setNearbyGigs(envelope.jobs ?? []);
        setNearbyTotal(envelope.pagination?.total ?? 0);
      }
    } catch { /* silent */ }
    setNearbyLoading(false);
  }, [nearbyCity, nearbyState, nearbyType, nearbyComp]);

  // Toggle nearby gigs
  function handleNearbyToggle() {
    const next = !nearbyEnabled;
    setNearbyEnabled(next);
    if (next) {
      void loadUserLocation();
      setNearbyPage(1);
      void fetchNearbyGigs(1);
    }
  }

  // Refetch when filters or page change
  useEffect(() => {
    if (nearbyEnabled) {
      void fetchNearbyGigs(nearbyPage);
    }
  }, [nearbyEnabled, nearbyPage, fetchNearbyGigs]);

  function handleNearbySave(jobId: number) {
    setSavedGigIds(prev => new Set(prev).add(jobId));
  }

  function handleNearbyContact(_jobId: number, creatorUserId: number) {
    // Navigate to messages with the gig poster
    window.location.href = `/dashboard/messages?to=${creatorUserId}`;
  }

  const nearbyTotalPages = Math.ceil(nearbyTotal / 5);

  // Determine whether the current tab has items
  const isEmpty =
    !isLoading &&
    !error &&
    ((activeTab === 'applications' && applications.length === 0) ||
      (activeTab === 'saved' && savedJobs.length === 0) ||
      (activeTab === 'alerts' && alerts.length === 0) ||
      (activeTab === 'my-gigs' && myGigs.length === 0));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Assistant</h1>
          <p className="text-gray-600 mt-1">Track applications, saved jobs, alerts, and your community gigs</p>
        </div>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#ed6437] text-white rounded-lg font-medium hover:bg-[#d55a31] transition-colors self-start sm:self-auto"
        >
          <Briefcase className="w-4 h-4" />
          Browse Jobs
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'text-[#ed6437] border-b-2 border-[#ed6437] -mb-px bg-white'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Post a Gig Panel — shown on community gigs tab */}
      {activeTab === 'my-gigs' && (
        <div className="rounded-xl p-5 flex items-center justify-between gap-4" style={{ backgroundColor: '#002641' }}>
          <div className="min-w-0">
            <p className="text-white font-semibold">Need something done but don&apos;t have the time?</p>
            <p className="text-blue-200 text-sm mt-1">Post a Community Gig and find the help you&apos;re looking for.</p>
          </div>
          <button
            onClick={() => setIsGigFormOpen(true)}
            className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#002641] rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Post a Gig
          </button>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-800">{error}</p>
            <button
              onClick={() => fetchTab(activeTab, page)}
              className="text-sm text-red-600 underline mt-1 hover:text-red-800 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      ) : isEmpty ? (
        <EmptyState tab={activeTab} />
      ) : (
        <>
          {activeTab === 'applications' && (
            <>
              <div className="space-y-3">
                {applications.map((application) => (
                  <ApplicationCard key={application.id} application={application} />
                ))}
              </div>
              {applicationsPagination && (
                <Pagination
                  pagination={applicationsPagination}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}

          {activeTab === 'saved' && (
            <div className="space-y-3">
              {savedJobs.map((job) => (
                <SavedJobCard key={job.id} job={job} onRemove={handleRemoveSavedJob} />
              ))}
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onToggle={handleAlertToggle}
                  onDelete={handleAlertDelete}
                />
              ))}
            </div>
          )}

          {activeTab === 'my-gigs' && (
            <div className="space-y-3">
              {myGigs.map((gig) => (
                <GigCard key={gig.id} gig={gig} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Nearby Community Gigs Section — shown on community gigs tab */}
      {activeTab === 'my-gigs' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Toggle header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div>
              <h3 className="font-semibold text-gray-900">Community Gigs Near You</h3>
              <p className="text-sm text-gray-500 mt-0.5">Browse gigs posted in your area</p>
            </div>
            <button
              onClick={handleNearbyToggle}
              className={`relative w-11 h-6 rounded-full transition-colors ${nearbyEnabled ? 'bg-[#ed6437]' : 'bg-gray-300'}`}
              aria-label={nearbyEnabled ? 'Disable nearby gigs' : 'Enable nearby gigs'}
            >
              <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${nearbyEnabled ? 'translate-x-[22px]' : 'translate-x-[2px]'} mt-[2px]`} />
            </button>
          </div>

          {nearbyEnabled && (
            <div className="p-4 space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs font-medium text-gray-500 mb-1">City</label>
                  <input
                    type="text"
                    value={nearbyCity}
                    onChange={(e) => { setNearbyCity(e.target.value); setNearbyPage(1); }}
                    placeholder="e.g. Austin"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ed6437] focus:border-[#ed6437]"
                  />
                </div>
                <div className="w-20">
                  <label className="block text-xs font-medium text-gray-500 mb-1">State</label>
                  <input
                    type="text"
                    value={nearbyState}
                    onChange={(e) => { setNearbyState(e.target.value); setNearbyPage(1); }}
                    placeholder="TX"
                    maxLength={2}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ed6437] focus:border-[#ed6437]"
                  />
                </div>
                <div className="min-w-[130px]">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                  <select
                    value={nearbyType}
                    onChange={(e) => { setNearbyType(e.target.value); setNearbyPage(1); }}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ed6437] focus:border-[#ed6437] bg-white"
                  >
                    <option value="">All Types</option>
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="freelance">Freelance</option>
                    <option value="temporary">Temporary</option>
                  </select>
                </div>
                <div className="min-w-[130px]">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Compensation</label>
                  <select
                    value={nearbyComp}
                    onChange={(e) => { setNearbyComp(e.target.value); setNearbyPage(1); }}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#ed6437] focus:border-[#ed6437] bg-white"
                  >
                    <option value="">Any</option>
                    <option value="paid">Paid</option>
                    <option value="volunteer">Volunteer</option>
                  </select>
                </div>
                <button
                  onClick={() => { setNearbyPage(1); void fetchNearbyGigs(1); }}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <Filter className="w-3.5 h-3.5" />
                  Apply
                </button>
              </div>

              {/* Results */}
              {nearbyLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse bg-gray-50 rounded-xl p-4">
                      <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-1/3" />
                    </div>
                  ))}
                </div>
              ) : nearbyGigs.length === 0 ? (
                <div className="text-center py-8">
                  <Megaphone className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500">No community gigs found in this area.</p>
                  <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or expanding your search area.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {nearbyGigs.map(gig => (
                      <NearbyGigCard
                        key={gig.id}
                        gig={gig}
                        onSave={handleNearbySave}
                        onContact={handleNearbyContact}
                        isSaved={savedGigIds.has(gig.id)}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {nearbyTotalPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-sm text-gray-500">
                        Showing {(nearbyPage - 1) * 5 + 1}-{Math.min(nearbyPage * 5, nearbyTotal)} of {nearbyTotal}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setNearbyPage(p => Math.max(1, p - 1))}
                          disabled={nearbyPage === 1}
                          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          aria-label="Previous 5"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm text-gray-600">
                          Page {nearbyPage} of {nearbyTotalPages}
                        </span>
                        <button
                          onClick={() => setNearbyPage(p => Math.min(nearbyTotalPages, p + 1))}
                          disabled={nearbyPage >= nearbyTotalPages}
                          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          aria-label="Next 5"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Community Gig Form Modal */}
      <CommunityGigForm
        isOpen={isGigFormOpen}
        onClose={() => setIsGigFormOpen(false)}
        onSuccess={() => {
          setIsGigFormOpen(false);
          void fetchTab('my-gigs', 1);
        }}
      />
    </div>
  );
}
