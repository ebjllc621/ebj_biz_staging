/**
 * Dashboard Bookmarks Page
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 */
'use client';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';

function BookmarksPageContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Bookmarks</h1>
        <p className="text-gray-600 mt-1">Saved listings, events, and offers</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-gray-500 text-center py-8">
          Coming soon - Bookmarks functionality will be implemented in future phases.
        </p>
      </div>
    </div>
  );
}

export default function BookmarksPage() {
  return (
    <ErrorBoundary componentName="DashboardBookmarksPage">
      <BookmarksPageContent />
    </ErrorBoundary>
  );
}
