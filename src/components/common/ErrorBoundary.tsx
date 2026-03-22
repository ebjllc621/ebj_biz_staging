/**
 * ErrorBoundary - Reusable React error boundary component
 *
 * GOVERNANCE COMPLIANCE:
 * - Class component (required for error boundaries)
 * - ErrorTrackingService integration for monitoring
 * - Phase R4.2 - Error Boundary Implementation
 * - OSI Layer 7 (Application Layer) error handling
 *
 * Features:
 * - Catch React component errors
 * - Log errors to ErrorTrackingService
 * - Provide fallback UI
 * - Allow error recovery (reset state)
 * - Optional error isolation (prevent propagation)
 *
 * @authority docs/codeReview/12-8-25/phases/R4_BRAIN_PLAN.md
 * @phase Phase R4.2 - Error Boundary Implementation
 * @tier STANDARD
 */

'use client';

import React, { Component, ReactNode } from 'react';
import { ErrorSeverity } from '@core/services/ErrorTrackingService';
import { fetchWithCsrf } from '@core/utils/csrf';
import { ErrorService } from '@core/services/ErrorService';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, resetError: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  isolate?: boolean; // If true, error doesn't propagate up
  componentName?: string; // For better error context
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary - Catch React component errors and provide fallback UI
 *
 * @component Class Component (Error boundaries must be class components)
 * @tier STANDARD
 * @authority .cursor/rules/react18-nextjs14-governance.mdc
 *
 * GOVERNANCE RULES:
 * - Error boundaries MUST be class components (not function components)
 * - MUST implement componentDidCatch lifecycle method
 * - MUST log errors to ErrorTrackingService
 * - SHOULD provide user-friendly fallback UI
 * - SHOULD allow error recovery (reset state)
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   fallback={<ErrorFallback title="Component Error" />}
 *   isolate={true}
 *   componentName="UserDashboard"
 * >
 *   <UserDashboard />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state to trigger fallback UI
    return { hasError: true, error };
  }

  async componentDidCatch(error: Error, errorInfo: React.ErrorInfo): Promise<void> {
    // Log error to API endpoint (server-side logging)
    // @governance MANDATORY - CSRF protection for POST requests
    // Source: osi-production-compliance.mdc, Layer 7 Security
    try {
      await fetchWithCsrf('/api/admin/errors', {
        method: 'POST',
        body: JSON.stringify({
          errorType: error.name || 'ComponentError',
          errorMessage: error.message,
          stackTrace: error.stack || '',
          severity: ErrorSeverity.HIGH,
          metadata: {
            componentStack: errorInfo.componentStack,
            componentName: this.props.componentName || 'Unknown',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
            url: typeof window !== 'undefined' ? window.location.href : 'unknown',
            timestamp: new Date().toISOString()
          }
        })
      });
    } catch (loggingError) {
      // Fail silently - don't crash error boundary if logging fails
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console -- Error logging failure
        ErrorService.capture('[ErrorBoundary] Failed to log error:', loggingError);
      }
    }

    // Call optional error handler
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (handlerError) {
        // Fail silently - don't crash error boundary if handler fails
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console -- Error handler failure
          ErrorService.capture('[ErrorBoundary] Error handler failed:', handlerError);
        }
      }
    }

    // If not isolated, re-throw to parent boundary
    if (!this.props.isolate) {
      // In React 18, errors caught by error boundaries don't propagate automatically
      // We log this for debugging purposes
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console -- Non-isolated error notification
        ErrorService.capture('[ErrorBoundary] Non-isolated error caught:', error);
      }
    }
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback or default
      if (this.props.fallback) {
        // If fallback is a function, call it with error and reset
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error!, this.resetError);
        }
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Something went wrong
          </h3>
          <p className="text-sm text-red-600 mb-4">
            This component encountered an error. Try refreshing the page.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mb-4">
              <summary className="text-xs text-red-700 cursor-pointer">
                Error details (development only)
              </summary>
              <pre className="mt-2 text-xs text-red-700 bg-red-100 p-2 rounded overflow-auto max-h-32">
                {this.state.error.message}
                {this.state.error.stack && `\n\n${this.state.error.stack}`}
              </pre>
            </details>
          )}
          <button
            onClick={this.resetError}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
