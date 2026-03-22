/**
 * HomePage - Main Homepage Component with Conditional Rendering
 *
 * Renders either PublicHomeView or AuthenticatedHomeView based on
 * the user's authentication state.
 *
 * @tier STANDARD
 * @generated DNA v11.0.1
 * @dna-version 11.0.1
 */
'use client';

import { useAuth } from '@core/context/AuthContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

import { PublicHomeView } from './PublicHomeView';
import { AuthenticatedHomeView } from './AuthenticatedHomeView';

/**
 * HomePage component
 * Conditionally renders appropriate view based on authentication state
 */
export function HomePage() {
  const { user, loading } = useAuth();

  // Show loading state while auth is being determined
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-biz-orange border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Render authenticated view if user is logged in
  if (user) {
    return (
      <ErrorBoundary componentName="HomePage-Authenticated">
        <AuthenticatedHomeView
          user={{
            id: user.id,
            name: user.name,
            email: user.email
          }}
        />
      </ErrorBoundary>
    );
  }

  // Render public view for visitors
  return (
    <ErrorBoundary componentName="HomePage-Public">
      <PublicHomeView />
    </ErrorBoundary>
  );
}

export default HomePage;
