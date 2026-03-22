'use client';

// Force dynamic rendering - required for React Context (useAuth, etc.)
// Prevents 'Cannot read properties of null (reading useContext)' in production build
export const dynamic = 'force-dynamic';

/**
 * Email Verification Page (Alias)
 *
 * Redirects to /auth/verify with the same token parameter.
 * This handles the /verify-email?token=... URL from MailSender.
 *
 * URL: /verify-email?token=...
 */

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function VerifyEmailRedirectPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      router.replace(`/auth/verify?token=${encodeURIComponent(token)}`);
    } else {
      router.replace('/auth/verify');
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
