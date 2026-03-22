/**
 * ErrorFallback - Consistent error UI component for error boundaries
 *
 * GOVERNANCE COMPLIANCE:
 * - Phase R4.2 - Error Boundary Implementation
 * - Tailwind CSS styling with Bizconekt theme
 * - Accessible error messaging
 *
 * Features:
 * - User-friendly error messages
 * - Development mode error details
 * - Retry functionality
 * - Customizable title and message
 *
 * @authority docs/codeReview/12-8-25/phases/R4_BRAIN_PLAN.md
 * @phase Phase R4.2 - Error Boundary Implementation
 * @tier SIMPLE
 */

'use client';

export interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  title?: string;
  message?: string;
  showRetry?: boolean;
}

/**
 * ErrorFallback - Reusable error fallback UI component
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   fallback={
 *     <ErrorFallback
 *       title="Dashboard Error"
 *       message="Unable to load dashboard data."
 *     />
 *   }
 * >
 *   <Dashboard />
 * </ErrorBoundary>
 * ```
 */
export function ErrorFallback({
  error,
  resetError,
  title = 'Something went wrong',
  message = 'This component encountered an error.',
  showRetry = true
}: ErrorFallbackProps) {
  return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-start">
        {/* Error Icon */}
        <svg
          className="w-6 h-6 text-red-600 mr-3 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>

        {/* Error Content */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-800 mb-1">{title}</h3>
          <p className="text-sm text-red-600 mb-3">{message}</p>

          {/* Development Mode Error Details */}
          {process.env.NODE_ENV === 'development' && error && (
            <details className="mb-3">
              <summary className="text-xs text-red-700 cursor-pointer hover:text-red-800">
                Error details (development only)
              </summary>
              <pre className="mt-2 text-xs text-red-700 bg-red-100 p-3 rounded overflow-auto max-h-48 border border-red-300">
                <strong>Error:</strong> {error.message}
                {error.stack && (
                  <>
                    {'\n\n'}
                    <strong>Stack Trace:</strong>
                    {'\n'}
                    {error.stack}
                  </>
                )}
              </pre>
            </details>
          )}

          {/* Retry Button */}
          {showRetry && resetError && (
            <button
              onClick={resetError}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              type="button"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
