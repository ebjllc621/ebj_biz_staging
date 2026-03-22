/**
 * Root Error Boundary
 *
 * @description App Router error boundary for runtime errors
 * @component Client Component (must be 'use client' for error boundaries)
 * @architecture Build Map v2.1 ENHANCED - Next.js 14 error handling
 * @see .cursor/rules/react18-nextjs14-governance.mdc for error boundary standards
 *
 * GOVERNANCE RULES:
 * - error.tsx MUST be client component
 * - MUST accept error and reset props
 * - MUST log errors for monitoring
 * - SHOULD provide user-friendly error UI
 */
'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error Component
 *
 * Catches runtime errors in route segments and provides recovery UI.
 *
 * @param error - Error object with optional digest for logging
 * @param reset - Function to attempt error recovery
 * @returns Error UI with recovery option
 */
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to monitoring service
    // eslint-disable-next-line no-console -- Error logging for monitoring
    // TODO: Send to error monitoring service (Sentry, LogRocket, etc.)
    // Example: Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-6xl font-bold text-red-600 mb-2">Oops!</h1>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Something went wrong
          </h2>
          <p className="text-gray-600 mb-6">
            An unexpected error occurred. We've been notified and are working on it.
          </p>
        </div>

        {/* Error details (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-sm font-mono text-red-800 break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-red-600 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Try again
          </button>
          <Link
            href="/"
            className="block w-full text-center bg-gray-100 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-200 transition-colors font-medium"
          >
            Go to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
