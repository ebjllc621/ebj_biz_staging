/**
 * Dashboard Calendar Page
 *
 * @tier ADVANCED
 * @phase Phase 6B - Dashboard Calendar & .ics Export
 */
'use client';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { EventCalendarView } from '@features/events/components/dashboard/EventCalendarView';

function CalendarPageContent() {
  return <EventCalendarView />;
}

export default function CalendarPage() {
  return (
    <ErrorBoundary componentName="DashboardCalendarPage">
      <CalendarPageContent />
    </ErrorBoundary>
  );
}
