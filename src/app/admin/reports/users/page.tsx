/**
 * Admin User Activity Reports Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: AdminTableTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: NO direct database access (API routes only)
 * - Credentials: 'include' for all fetch requests
 * - Complexity: STANDARD tier
 *
 * Features:
 * - Activity log with filters (date, action type, user ID)
 * - CSV export functionality
 * - Pagination and search
 *
 * @authority PHASE_5.3_BRAIN_PLAN.md - Section 3.2
 * @component
 * @returns {JSX.Element} Admin user activity reports
 */

'use client';


// Force dynamic rendering (required for useAuth() - React Context cannot be used in SSG)
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { AdminTableTemplate, TableColumn } from '../../../../components/admin/templates/AdminTableTemplate';
import { useAuth } from '../../../../core/hooks/useAuth';

interface UserActivity {
  id: number;
  user_id: number;
  user_name: string;
  action_type: string;
  action_description: string;
  ip_address: string;
  timestamp: string;
}

export default function AdminUserReportsPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    actionType: 'all',
    userId: ''
  });

  // GOVERNANCE FIX: useEffect MUST be called before any early returns
  // React Rules of Hooks: Hooks must be called in the same order on every render
  useEffect(() => {
    // Only fetch if user is admin - conditional logic INSIDE the hook
    if (user?.role === 'admin') {
      fetchActivities();
    }
  }, [user, filters]);

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

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.actionType !== 'all') params.append('actionType', filters.actionType);
      if (filters.userId) params.append('userId', filters.userId);

      const response = await fetch(`/api/admin/reports/users?${params.toString()}`, {
        credentials: 'include'
      });
      const data = await response.json();
      setActivities(data.activities || []);
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.actionType !== 'all') params.append('actionType', filters.actionType);
      if (filters.userId) params.append('userId', filters.userId);
      params.append('format', 'csv');

      const response = await fetch(`/api/admin/reports/users?${params.toString()}`, {
        credentials: 'include'
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-activity-report-${new Date().toISOString()}.csv`;
      a.click();
    } catch (error) {

    }
  };

  const columns: TableColumn<UserActivity>[] = [
    {
      key: 'timestamp',
      header: 'Date/Time',
      sortable: true,
      accessor: (activity) => new Date(activity.timestamp).toLocaleString()
    },
    {
      key: 'user_name',
      header: 'User',
      sortable: true,
      accessor: (activity) => (
        <a href={`/admin/users/${activity.user_id}`} className="text-blue-600 hover:underline">
          {activity.user_name}
        </a>
      )
    },
    { key: 'action_type', header: 'Action Type', accessor: (row) => row.action_type, sortable: true },
    {
      key: 'action_description',
      header: 'Description',
      accessor: (activity) => (
        <div className="max-w-md truncate" title={activity.action_description}>
          {activity.action_description}
        </div>
      )
    },
    { key: 'ip_address', header: 'IP Address', accessor: (row) => row.ip_address, sortable: false }
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Action Type</label>
            <select
              value={filters.actionType}
              onChange={(e) => setFilters({ ...filters, actionType: e.target.value })}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="all">All Types</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="listing_create">Listing Created</option>
              <option value="listing_update">Listing Updated</option>
              <option value="subscription">Subscription Change</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">User ID (optional)</label>
            <input
              type="number"
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              placeholder="Filter by user ID"
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Export to CSV
          </button>
        </div>
      </div>

      {/* Activity Table */}
      <AdminTableTemplate<UserActivity>         title="User Activity Log"
        data={activities}
        columns={columns}
        rowKey={(row) => row.id}
        loading={loading}
      />
    </div>
  );
}
