/**
 * Dashboard Saved Searches Page
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 */
'use client';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';

function SavedSearchesPageContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Saved Searches</h1>
        <p className="text-gray-600 mt-1">Search alerts and saves</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-gray-500 text-center py-8">
          Coming soon - Saved Searches functionality will be implemented in future phases.
        </p>
      </div>
    </div>
  );
}

export default function SavedSearchesPage() {
  return (
    <ErrorBoundary componentName="DashboardSavedSearchesPage">
      <SavedSearchesPageContent />
    </ErrorBoundary>
  );
}
