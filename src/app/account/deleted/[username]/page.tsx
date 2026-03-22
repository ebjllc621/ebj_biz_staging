/**
 * Deleted Account Page
 *
 * @description Public page displaying deleted account information
 * @component Server Component
 * @architecture Build Map v2.1 ENHANCED - Next.js 14 dynamic route
 * @see docs/dna/brain-plans/ACCOUNT_STATUS_PAGES_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - Server Component (fetches data server-side)
 * - Uses DatabaseService for data operations
 * - Gray/muted color scheme (permanent deletion)
 * - Shows @username
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

export default async function DeletedAccountPage({ params }: PageProps) {
  const { username } = params;

  // Get account status
  const db = getDatabaseService();
  const statusService = new AccountStatusService(db);
  const statusInfo = await statusService.getAccountStatus(username);

  // If user not found or not deleted, show 404
  if (!statusInfo || statusInfo.status !== 'deleted') {
    notFound();
  }

  const displayUsername = `@${statusInfo.username}`;

  return (
    <div className="account-status-card">
      {/* Deleted Icon */}
      <div className="mb-6">
        <div className="w-16 h-16 mx-auto bg-gray-200 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-gray-800 mb-2">
        Account Removed
      </h1>

      {/* Username */}
      <p className="text-xl font-semibold text-gray-700 mb-6">
        {displayUsername}
      </p>

      {/* Information Box */}
      <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mb-6">
        <p className="text-gray-700">
          This account was removed for violating our community guidelines or at the owner's request.
        </p>
      </div>

      {/* Terms and Conditions Statement */}
      <p className="text-sm text-gray-600 mb-6">
        For more information, please review our{' '}
        <Link href={"/terms" as any} className="text-[#002641] hover:text-[#001a2e] underline">Terms</Link>,{' '}
        <Link href={"/privacy" as any} className="text-[#002641] hover:text-[#001a2e] underline">Privacy Policy</Link>,{' '}
        <Link href={"/security" as any} className="text-[#002641] hover:text-[#001a2e] underline">Security</Link>, and{' '}
        <Link href={"/cookies" as any} className="text-[#002641] hover:text-[#001a2e] underline">Cookies</Link> policies.
      </p>

      {/* Information Text */}
      <p className="text-gray-600 mb-6">
        If you believe this was an error or have questions, please contact our support team.
      </p>

      {/* Action Buttons */}
      <div className="account-status-cta">
        <a
          href="mailto:support@bizconekt.com?subject=Deleted%20Account%20Inquiry"
          className="inline-block bg-[#002641] text-white py-3 px-6 rounded-md hover:bg-[#001a2e] transition-colors font-medium"
        >
          Contact Support
        </a>
        <Link
          href="/"
          className="inline-block bg-gray-500 text-white py-3 px-6 rounded-md hover:bg-gray-600 transition-colors font-medium"
        >
          Return to Home
        </Link>
      </div>

      {/* Additional Info */}
      <p className="mt-6 text-sm text-gray-500">
        For questions about account deletions, please contact{' '}
        <a
          href="mailto:support@bizconekt.com"
          className="text-[#002641] hover:text-[#001a2e] underline"
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
    title: `@${username} - Account Removed - Bizconekt`,
    description: `The account @${username} has been permanently removed.`
  };
}
