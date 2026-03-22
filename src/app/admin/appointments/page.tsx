/**
 * Admin Appointment Manager Page
 *
 * @tier STANDARD
 * @complexity 2.9
 * @dependencies AdminTableTemplate
 * @osi_layers 7, 6, 5, 4
 * @buildmap v2.1
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: AdminTableTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: API routes only
 * - Credentials: 'include' for all fetch requests
 * - Complexity: STANDARD tier
 *
 * Features:
 * - Appointment list with filters
 * - Calendar view (placeholder)
 * - CSV export
 *
 * @authority PHASE_5.3_BRAIN_PLAN.md - Section 3.5
 * @component
 * @returns {JSX.Element} Admin appointments manager
 * @note Appointments table not yet created - placeholder implementation
 */

'use client';


// Force dynamic rendering (required for useAuth() - React Context cannot be used in SSG)
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { AdminTableTemplate, TableColumn } from '@/components/admin/templates/AdminTableTemplate';
import { useAuth } from '@core/hooks/useAuth';

interface Appointment {
  id: number;
  user_id: number;
  listing_id: number;
  date: string;
  status: string;
}

export default function AdminAppointmentsPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // GOVERNANCE FIX: useEffect MUST be called before any early returns
  // React Rules of Hooks: Hooks must be called in the same order on every render
  useEffect(() => {
    // Only fetch if user is admin - conditional logic INSIDE the hook
    if (user?.role === 'admin') {
      fetchAppointments();
    }
  }, [user]);

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

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/appointments', { credentials: 'include' });
      const data = await response.json();
      setAppointments(data.appointments || []);
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const columns: TableColumn<Appointment>[] = [
    { key: 'id', header: 'ID', accessor: (row) => row.id, sortable: true },
    { key: 'user_id', header: 'User ID', accessor: (row) => row.user_id, sortable: true },
    { key: 'listing_id', header: 'Listing ID', accessor: (row) => row.listing_id, sortable: true },
    {
      key: 'date',
      header: 'Date',
      accessor: (a) => new Date(a.date).toLocaleString()
    },
    { key: 'status', header: 'Status', accessor: (row) => row.status, sortable: true }
  ];

  return (
    <div className="space-y-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
        <p className="text-yellow-800">
          <strong>Note:</strong> Appointments feature is pending implementation.
          The appointments table needs to be created in Phase 5.4.
        </p>
      </div>

      <AdminTableTemplate<Appointment>         title="Appointments"
        data={appointments}
        columns={columns}
        rowKey={(row) => row.id}
        loading={loading}
      />
    </div>
  );
}
