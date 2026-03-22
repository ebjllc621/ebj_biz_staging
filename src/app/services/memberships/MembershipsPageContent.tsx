/**
 * MembershipsPageContent - Client wrapper for memberships page
 *
 * @tier STANDARD
 * @phase Phase 3 - Public Memberships Page
 * @pattern PublicHomeView client wrapper pattern
 */
'use client';

import { useState, useCallback } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { LoginModal, RegisterModal } from '@features/auth/components';

// Section components
import {
  MembershipsHero,
  TierComparisonSection,
  FeatureComparisonTable,
  AddOnShowcase,
  MembershipsFAQ,
  MembershipsCTA
} from '@features/memberships/components/sections';

export function MembershipsPageContent() {
  // Pricing toggle state
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  // Auth modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  // Modal handlers
  const handleStartTier = useCallback((tier: string) => {
    setSelectedTier(tier);
    setShowRegisterModal(true);
  }, []);

  const handleCloseLogin = useCallback(() => setShowLoginModal(false), []);
  const handleCloseRegister = useCallback(() => {
    setShowRegisterModal(false);
    setSelectedTier(null);
  }, []);

  const handleSwitchToRegister = useCallback(() => {
    setShowLoginModal(false);
    setShowRegisterModal(true);
  }, []);

  const handleSwitchToLogin = useCallback(() => {
    setShowRegisterModal(false);
    setShowLoginModal(true);
  }, []);

  return (
    <ErrorBoundary componentName="MembershipsPage">
      <div className="min-h-screen bg-gray-50">
        <MembershipsHero onGetStarted={() => handleStartTier('essentials')} />

        <TierComparisonSection
          billingPeriod={billingPeriod}
          onBillingPeriodChange={setBillingPeriod}
          onSelectTier={handleStartTier}
        />

        <FeatureComparisonTable />

        <AddOnShowcase billingPeriod={billingPeriod} />

        <MembershipsFAQ />

        <MembershipsCTA onGetStarted={() => handleStartTier('essentials')} />

        {/* Auth Modals */}
        <LoginModal
          isOpen={showLoginModal}
          onClose={handleCloseLogin}
          onSwitchToRegister={handleSwitchToRegister}
        />

        <RegisterModal
          isOpen={showRegisterModal}
          onClose={handleCloseRegister}
          onSwitchToLogin={handleSwitchToLogin}
          onRegistrationSuccess={(email) => {
            // On successful registration, close modal
            // User will be redirected to dashboard via auth flow
            handleCloseRegister();
          }}
        />
      </div>
    </ErrorBoundary>
  );
}
