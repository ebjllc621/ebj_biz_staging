/**
 * Manage Listings Page - User's listing management
 *
 * @tier STANDARD
 * @generated DNA v11.4.0
 * @phase Phase 8 - Listing Modals Integration
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@core/context/AuthContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { MyListingsManager } from '@features/listings/components/MyListingsManager';

function ManageListingsPageContent() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Allow any authenticated user to access listings management
  // General users can create listings (pending approval)
  // Users are auto-upgraded to listing_member when first listing is approved

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return <MyListingsManager />;
}

export default function ManageListingsPage() {
  return (
    <ErrorBoundary componentName="ManageListingsPage">
      <ManageListingsPageContent />
    </ErrorBoundary>
  );
}
