/**
 * Dashboard Events Page
 *
 * @tier STANDARD
 * @phase Phase 6A - Dashboard My Events Page
 * @updated Events Phase 2 - Added EventNotificationSettings
 * @updated Events Phase 3A - Added Community Event submission
 */
'use client';

import { useState } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { MyEventsSection } from '@features/events/components/dashboard/MyEventsSection';
import { EventNotificationSettings } from '@features/events/components/EventNotificationSettings';
import { CommunityEventForm } from '@features/events/components/CommunityEventForm';

function EventsPageContent() {
  const [communityFormOpen, setCommunityFormOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Events</h1>
        <button
          onClick={() => setCommunityFormOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Submit Community Event
        </button>
      </div>

      <MyEventsSection />
      <EventNotificationSettings />

      <CommunityEventForm
        isOpen={communityFormOpen}
        onClose={() => setCommunityFormOpen(false)}
      />
    </div>
  );
}

export default function EventsPage() {
  return (
    <ErrorBoundary componentName="DashboardEventsPage">
      <EventsPageContent />
    </ErrorBoundary>
  );
}
