'use client';

/**
 * JoinPageClient - Client-side referral landing page logic
 *
 * - Records referral view on mount
 * - Displays welcome message with referrer info (if available)
 * - Opens registration modal with pre-filled referral code
 *
 * @authority docs/components/contacts/README.md
 * @tier SIMPLE
 * @phase Referral System Connection
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/core/context/AuthContext';
import RegisterModal from '@/features/auth/components/RegisterModal';

interface JoinPageClientProps {
  referralCode: string | null;
}

interface ReferrerInfo {
  name: string;
  avatar_url: string | null;
}

export default function JoinPageClient({ referralCode }: JoinPageClientProps) {
  const router = useRouter();
  const { user, loading: isLoading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [referrer, setReferrer] = useState<ReferrerInfo | null>(null);
  const [viewRecorded, setViewRecorded] = useState(false);

  // Record referral view and fetch referrer info
  useEffect(() => {
    if (!referralCode || viewRecorded) return;

    const recordView = async () => {
      try {
        const response = await fetch(`/api/referrals/view?code=${encodeURIComponent(referralCode)}`, {
          method: 'POST',
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          if (data.data?.referrer) {
            setReferrer(data.data.referrer);
          }
        }
        setViewRecorded(true);
      } catch (error) {
        console.error('[JoinPage] Failed to record view:', error);
        setViewRecorded(true);
      }
    };

    recordView();
  }, [referralCode, viewRecorded]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  // Open register modal after initial render
  useEffect(() => {
    if (!isLoading && !user) {
      // Small delay for smooth UX
      const timer = setTimeout(() => setShowRegister(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, user]);

  const handleRegisterClose = useCallback(() => {
    setShowRegister(false);
    // Redirect to home if user closes modal without registering
    router.push('/');
  }, [router]);

  const handleRegisterSuccess = useCallback(() => {
    setShowRegister(false);
    // Redirect to dashboard after successful registration
    router.push('/dashboard?welcome=true');
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bizconekt-primary/5 to-bizconekt-secondary/5">
        <div className="animate-pulse text-bizconekt-primary text-xl">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bizconekt-primary/5 via-white to-bizconekt-secondary/5">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* Logo */}
          <Link href="/" className="inline-block mb-8">
            <h1 className="text-4xl font-bold text-bizconekt-primary">
              Bizconekt
            </h1>
          </Link>

          {/* Referral Welcome Message */}
          {referrer ? (
            <div className="mb-8 p-6 bg-white rounded-xl shadow-lg border border-bizconekt-primary/10">
              <div className="flex items-center justify-center gap-4 mb-4">
                {referrer.avatar_url ? (
                  <img
                    src={referrer.avatar_url}
                    alt={referrer.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-bizconekt-primary"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-bizconekt-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-bizconekt-primary">
                      {referrer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-lg text-gray-700">
                <span className="font-semibold text-bizconekt-primary">{referrer.name}</span>
                {' '}invited you to join Bizconekt!
              </p>
            </div>
          ) : (
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                You&apos;ve Been Invited!
              </h2>
              <p className="text-lg text-gray-600">
                Someone special wants you to join the Bizconekt community.
              </p>
            </div>
          )}

          {/* Value Proposition */}
          <div className="mb-8 space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">
              Why Join Bizconekt?
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-white rounded-lg shadow-sm">
                <div className="text-3xl mb-2">🤝</div>
                <p className="text-sm text-gray-600">Connect with professionals in your industry</p>
              </div>
              <div className="p-4 bg-white rounded-lg shadow-sm">
                <div className="text-3xl mb-2">🚀</div>
                <p className="text-sm text-gray-600">Grow your business network</p>
              </div>
              <div className="p-4 bg-white rounded-lg shadow-sm">
                <div className="text-3xl mb-2">💡</div>
                <p className="text-sm text-gray-600">Discover new opportunities</p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => setShowRegister(true)}
            className="px-8 py-4 bg-bizconekt-primary text-white text-lg font-semibold rounded-lg shadow-lg hover:bg-bizconekt-primary/90 transition-colors"
          >
            Create Your Free Account
          </button>

          {/* Already have account */}
          <p className="mt-6 text-gray-600">
            Already have an account?{' '}
            <Link href="/" className="text-bizconekt-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Registration Modal */}
      {showRegister && (
        <RegisterModal
          isOpen={showRegister}
          onClose={handleRegisterClose}
          onSuccess={handleRegisterSuccess}
          referralCode={referralCode || undefined}
        />
      )}
    </div>
  );
}
