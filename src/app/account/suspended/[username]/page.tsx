/**
 * Suspended Account Page
 *
 * @description Public page displaying suspended account information
 * @component Server Component
 * @architecture Build Map v2.1 ENHANCED - Next.js 14 dynamic route
 * @see docs/dna/brain-plans/ACCOUNT_STATUS_PAGES_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - Server Component (fetches data server-side)
 * - Uses DatabaseService for data operations
 * - Professional Bizconekt brand styling
 * - Shows @username and suspension reason
 */

import { getDatabaseService } from '@core/services/DatabaseService';
import { AccountStatusService } from '@core/services/AccountStatusService';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PageProps {
  params: {
    username: string;
  };
}

export default async function SuspendedAccountPage({ params }: PageProps) {
  const { username } = params;

  // Get account status
  const db = getDatabaseService();
  const statusService = new AccountStatusService(db);
  const statusInfo = await statusService.getAccountStatus(username);

  // If user not found or not suspended, show 404
  if (!statusInfo || statusInfo.status !== 'suspended') {
    notFound();
  }

  const displayUsername = `@${statusInfo.username}`;
  const reason = statusInfo.reason || 'Violation of community guidelines';
  const actionDate = statusInfo.actionDate
    ? new Date(statusInfo.actionDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null;

  return (
    <div className="account-status-card">
      {/* Warning Icon */}
      <div className="mb-6">
        <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-amber-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-gray-800 mb-2">
        Account Suspended
      </h1>

      {/* Username */}
      <p className="text-xl font-semibold text-[#002641] mb-6">
        {displayUsername}
      </p>

      {/* Reason Box */}
      <div className="account-status-reason">
        <div className="mb-2">
          <strong className="text-gray-800">Reason:</strong>
        </div>
        <p className="text-gray-700">{reason}</p>
        {actionDate && (
          <p className="text-sm text-gray-600 mt-2">
            <strong>Date:</strong> {actionDate}
          </p>
        )}
      </div>

      {/* Terms and Conditions Statement */}
      <p className="text-sm text-gray-600 mb-6">
        For more information, please review our{' '}
        <Link href={"/terms" as any} className="text-[#ed6437] hover:text-[#d55530] underline">Terms</Link>,{' '}
        <Link href={"/privacy" as any} className="text-[#ed6437] hover:text-[#d55530] underline">Privacy Policy</Link>,{' '}
        <Link href={"/security" as any} className="text-[#ed6437] hover:text-[#d55530] underline">Security</Link>, and{' '}
        <Link href={"/cookies" as any} className="text-[#ed6437] hover:text-[#d55530] underline">Cookies</Link> policies.
      </p>

      {/* Information Text */}
      <p className="text-gray-600 mb-6">
        If you are the account owner and believe this was made in error, you may appeal this decision.
      </p>

      {/* Action Buttons */}
      <div className="account-status-cta">
        <a
          href="mailto:support@bizconekt.com?subject=Account%20Suspension%20Appeal"
          className="inline-block bg-[#ed6437] text-white py-3 px-6 rounded-md hover:bg-[#d55530] transition-colors font-medium"
        >
          Contact Support
        </a>
        <Link
          href={"/help" as any}
          className="inline-block bg-[#002641] text-white py-3 px-6 rounded-md hover:bg-[#001a2e] transition-colors font-medium"
        >
          Help Center
        </Link>
      </div>

      {/* Additional Info */}
      <p className="mt-6 text-sm text-gray-500">
        For questions about account suspensions, please contact{' '}
        <a
          href="mailto:support@bizconekt.com"
          className="text-[#ed6437] hover:text-[#d55530] underline"
        >
          support@bizconekt.com
        </a>
      </p>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { username } = params;
  return {
    title: `@${username} - Account Suspended - Bizconekt`,
    description: `The account @${username} is currently suspended.`
  };
}
