/**
 * Dashboard Appointments Page
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 */
'use client';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';

function AppointmentsPageContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
        <p className="text-gray-600 mt-1">Scheduled appointments</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-gray-500 text-center py-8">
          Coming soon - Appointments functionality will be implemented in future phases.
        </p>
      </div>
    </div>
  );
}

export default function AppointmentsPage() {
  return (
    <ErrorBoundary componentName="DashboardAppointmentsPage">
      <AppointmentsPageContent />
    </ErrorBoundary>
  );
}
