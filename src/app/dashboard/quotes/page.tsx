/**
 * Dashboard Quotes Page
 *
 * @tier STANDARD
 * @phase Phase 3A - Quote System Foundation
 * @generated DNA v11.4.0
 */

'use client';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useAuth } from '@core/context/AuthContext';
import { QuotesDashboard } from '@features/quotes/components/QuotesDashboard';

function QuotesPageContent() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <QuotesDashboard userId={parseInt(user.id, 10)} />;
}

export default function QuotesPage() {
  return (
    <ErrorBoundary componentName="DashboardQuotesPage">
      <QuotesPageContent />
    </ErrorBoundary>
  );
}
