/**
 * Root 404 Not Found Page
 *
 * @description App Router 404 page for invalid routes
 * @component Server Component (no hooks, can fetch data)
 * @architecture Build Map v2.1 ENHANCED - Next.js 14 not-found handling
 * @see .cursor/rules/react18-nextjs14-governance.mdc for not-found standards
 *
 * GOVERNANCE RULES:
 * - not-found.tsx SHOULD be server component
 * - MUST provide user-friendly 404 UI
 * - SHOULD offer navigation to valid routes
 * - CAN fetch data for dynamic 404 content
 */
import Link from 'next/link';

/**
 * NotFound Component
 *
 * Displays friendly 404 page for invalid routes.
 * Server Component allows static generation for better performance.
 *
 * @returns 404 UI with navigation options
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* 404 visual */}
        <div className="mb-6">
          <h1 className="text-8xl font-bold text-gray-800 mb-2">404</h1>
          <div className="w-16 h-1 bg-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            Page Not Found
          </h2>
          <p className="text-gray-600 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Navigation options */}
        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Go to Homepage
          </Link>
          <Link
            href="/listings"
            className="block w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-md hover:bg-gray-200 transition-colors font-medium"
          >
            Browse Listings
          </Link>
        </div>

        {/* Help text */}
        <p className="mt-8 text-sm text-gray-500">
          If you believe this is an error, please{' '}
          <a
            href="mailto:support@bizconekt.com"
            className="text-blue-600 hover:text-blue-700 underline"
          >
            contact support
          </a>
        </p>
      </div>
    </div>
  );
}
