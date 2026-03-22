/**
 * JobAnalyticsDashboard - Main Analytics Dashboard for Jobs
 *
 * @component Client Component
 * @tier ADVANCED
 * @phase Jobs Analytics Dashboard
 * @authority docs/pages/layouts/job_ops/build/phases/JOBS_ANALYTICS_DASHBOARD_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - MUST wrap in ErrorBoundary (ADVANCED tier)
 * - MUST use BizModal for display
 * - Orange theme (#ed6437)
 */
'use client';

import React, { useState } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { BizModal } from '@/components/ui/BizModal';
import { Loader2, AlertCircle, Download, UserPlus } from 'lucide-react';
import { useJobAnalyticsDashboard } from '@features/jobs/hooks/useJobAnalyticsDashboard';
import { JobFunnelChart } from './analytics/JobFunnelChart';
import { JobSharesChart } from './analytics/JobSharesChart';
import { DateRangeSelector } from '../analytics/DateRangeSelector';
import { HireReportModal } from './HireReportModal';
import { downloadFile, generateTimestampedFilename } from '@core/utils/export/fileDownload';
import type { Job } from '@features/jobs/types';

interface JobAnalyticsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
}

function JobAnalyticsDashboardContent({ job, onClose }: Omit<JobAnalyticsDashboardProps, 'isOpen'>) {
  const [showHireModal, setShowHireModal] = useState(false);
  const {
    data,
    isLoading,
    error,
    refresh,
    dateRange,
    setDateRange
  } = useJobAnalyticsDashboard(job.id);

  const handleHireReported = () => {
    // Refresh analytics data to show updated hire count
    void refresh();
  };

  const handleExportCSV = () => {
    if (!data) return;

    const rows: string[] = [];
    rows.push('Job Analytics Report');
    rows.push(`Job: ${job.title}`);
    rows.push(`Date Range: ${dateRange.start} to ${dateRange.end}`);
    rows.push(`Generated: ${new Date().toLocaleString()}`);
    rows.push('');

    // Funnel metrics
    rows.push('RECRUITMENT FUNNEL');
    rows.push('Stage,Count,Conversion Rate');
    rows.push(`Impressions,${data.funnel.impressions},-`);
    rows.push(`Page Views,${data.funnel.page_views},${data.funnel.conversion_rates.view_rate.toFixed(1)}%`);
    rows.push(`Saves,${data.funnel.saves},${data.funnel.conversion_rates.save_rate.toFixed(1)}%`);
    rows.push(`Applications,${data.funnel.applications},${data.funnel.conversion_rates.apply_rate.toFixed(1)}%`);
    rows.push(`Hires,${data.funnel.hires},${data.funnel.conversion_rates.hire_rate.toFixed(1)}%`);
    rows.push('');

    // Share metrics
    rows.push('SOCIAL SHARE PERFORMANCE');
    rows.push('Platform,Shares,Clicks,Click Rate');
    data.shares.forEach(s => {
      rows.push(`${s.platform},${s.shares},${s.clicks},${s.clickRate.toFixed(1)}%`);
    });

    const csvContent = '\uFEFF' + rows.join('\r\n');
    const filename = generateTimestampedFilename(`job-analytics-${job.slug}`, 'csv');
    downloadFile(csvContent, filename, 'text/csv;charset=utf-8');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#ed6437] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-red-900">Failed to Load Analytics</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{job.title}</h2>
          <p className="text-sm text-gray-600">Performance analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHireModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-[#ed6437] text-white rounded-lg hover:bg-[#d55a31] text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Report Hire
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <DateRangeSelector dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <SummaryCard label="Impressions" value={data.funnel.impressions} />
        <SummaryCard label="Applications" value={data.funnel.applications} />
        <SummaryCard label="Hires" value={data.funnel.hires} />
        <SummaryCard label="Apply Rate" value={`${data.funnel.conversion_rates.apply_rate.toFixed(1)}%`} />
        <SummaryCard label="Shares" value={data.shares.reduce((sum, s) => sum + s.shares, 0)} />
        <SummaryCard label="Referrals" value={data.referrals ?? 0} />
      </div>

      {/* Charts */}
      <JobFunnelChart
        data={data.funnel}
        shares={data.shares.reduce((sum, s) => sum + s.shares, 0)}
        referrals={data.referrals ?? 0}
      />
      <JobSharesChart data={data.shares} />

      {/* Hire Report Modal */}
      <HireReportModal
        isOpen={showHireModal}
        onClose={() => setShowHireModal(false)}
        jobId={job.id}
        jobTitle={job.title}
        onSuccess={handleHireReported}
      />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

export function JobAnalyticsDashboard({ isOpen, onClose, job }: JobAnalyticsDashboardProps) {
  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Job Analytics"
      size="full"
    >
      <ErrorBoundary componentName="JobAnalyticsDashboard">
        <JobAnalyticsDashboardContent job={job} onClose={onClose} />
      </ErrorBoundary>
    </BizModal>
  );
}

export default JobAnalyticsDashboard;
