/**
 * OrganizerOnboardingModal - Guided wizard for organizer feature discovery
 *
 * A read-only educational wizard that walks Preferred/Premium tier event owners
 * through the organizer toolkit: co-hosts, exhibitors, and service procurement.
 * Does not create or mutate data — links to the relevant manager pages.
 *
 * @component Client Component
 * @tier STANDARD
 * @phase Phase 6D - Organizer Onboarding
 * @governance Build Map v2.1 ENHANCED
 * @authority CLAUDE.md - BizModal mandatory for all modals
 */

'use client';

import { useState, useEffect } from 'react';
import BizModal, { BizModalSectionHeader } from '@/components/BizModal/BizModal';
import { Users, Store, Wrench, Trophy, ExternalLink, ChevronRight, ChevronLeft } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type OnboardingStep = 'welcome' | 'co-hosts' | 'exhibitors' | 'services';

interface TierCounts {
  co_hosts: number;
  exhibitors: number;
  service_requests: number;
}

interface TierLimits {
  co_hosts: number;
  exhibitors: number;
  service_requests: number;
}

const STEP_ORDER: OnboardingStep[] = ['welcome', 'co-hosts', 'exhibitors', 'services'];

const TIER_LIMITS: Record<string, TierLimits> = {
  preferred: { co_hosts: 10, exhibitors: 15, service_requests: 5 },
  premium: { co_hosts: 999, exhibitors: 999, service_requests: 999 },
};

// ============================================================================
// PROPS
// ============================================================================

export interface OrganizerOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  listingId: number;
  tier: string;
}

// ============================================================================
// HELPER: format limit display
// ============================================================================

function formatLimit(limit: number): string {
  return limit >= 999 ? 'Unlimited' : String(limit);
}

// ============================================================================
// COMPONENT
// ============================================================================

export function OrganizerOnboardingModal({
  isOpen,
  onClose,
  eventId,
  listingId,
  tier,
}: OrganizerOnboardingModalProps) {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [counts, setCounts] = useState<TierCounts>({ co_hosts: 0, exhibitors: 0, service_requests: 0 });
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const limits: TierLimits = TIER_LIMITS[tier] ?? TIER_LIMITS['preferred'] ?? { co_hosts: 10, exhibitors: 15, service_requests: 5 };
  const storageKey = `bk_organizer_onboarding_seen_${listingId}`;

  // Mark as seen on open; fetch live counts
  useEffect(() => {
    if (!isOpen) return;

    // Set seen flag immediately on open
    localStorage.setItem(storageKey, 'true');

    // Fetch current co-host count
    const fetchCounts = async () => {
      try {
        const [chRes, exRes, srRes] = await Promise.all([
          fetch(`/api/events/${eventId}/co-hosts?includeAll=true`, { credentials: 'include' }),
          fetch(`/api/events/${eventId}/exhibitors?includeAll=true`, { credentials: 'include' }),
          fetch(`/api/events/${eventId}/service-requests`, { credentials: 'include' }),
        ]);

        const newCounts = { co_hosts: 0, exhibitors: 0, service_requests: 0 };

        if (chRes.ok) {
          const data = await chRes.json();
          const coHosts = data?.data?.co_hosts ?? [];
          newCounts.co_hosts = Array.isArray(coHosts) ? coHosts.length : 0;
        }
        if (exRes.ok) {
          const data = await exRes.json();
          const exhibitors = data?.data?.exhibitors ?? [];
          newCounts.exhibitors = Array.isArray(exhibitors) ? exhibitors.length : 0;
        }
        if (srRes.ok) {
          const data = await srRes.json();
          const requests = data?.data?.service_requests ?? [];
          newCounts.service_requests = Array.isArray(requests) ? requests.length : 0;
        }

        setCounts(newCounts);
      } catch {
        // Silently fail — counts are informational only
      }
    };

    void fetchCounts();
  }, [isOpen, eventId, storageKey]);

  // Reset to first step on open
  useEffect(() => {
    if (isOpen) setStep('welcome');
  }, [isOpen]);

  const currentIndex = STEP_ORDER.indexOf(step);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === STEP_ORDER.length - 1;

  const handleNext = () => {
    if (!isLast) setStep(STEP_ORDER[currentIndex + 1]!);
  };

  const handleBack = () => {
    if (!isFirst) setStep(STEP_ORDER[currentIndex - 1]!);
  };

  const handleDone = () => {
    if (dontShowAgain) {
      localStorage.setItem(storageKey, 'true');
    }
    onClose();
  };

  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);

  // ============================================================================
  // FOOTER
  // ============================================================================

  const footer = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {isLast && (
          <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-gray-300"
            />
            Don&apos;t show again
          </label>
        )}
      </div>
      <div className="flex items-center gap-3">
        {!isFirst && (
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        )}
        {!isLast ? (
          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
            style={{ backgroundColor: '#ed6437' }}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleDone}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
            style={{ backgroundColor: '#ed6437' }}
          >
            <Trophy className="w-4 h-4" />
            Done
          </button>
        )}
      </div>
    </div>
  );

  // ============================================================================
  // STEP CONTENT
  // ============================================================================

  const renderStepContent = () => {
    switch (step) {
      case 'welcome':
        return (
          <div className="space-y-4">
            <BizModalSectionHeader step={1} title="Welcome to the Organizer Toolkit" />
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 text-xs font-bold text-white rounded-full" style={{ backgroundColor: '#ed6437' }}>
                  {tierLabel} Member
                </span>
              </div>
              <p className="text-sm text-gray-700">
                As a <strong>{tierLabel}</strong> member, you have access to powerful event organization features that help you build a professional team, attract exhibitors, and coordinate vendor services.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                <Users className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                <p className="text-xs font-semibold text-blue-900">Co-Hosts</p>
                <p className="text-xs text-blue-700">{formatLimit(limits.co_hosts)} available</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                <Store className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                <p className="text-xs font-semibold text-purple-900">Exhibitors</p>
                <p className="text-xs text-purple-700">{formatLimit(limits.exhibitors)} available</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <Wrench className="w-6 h-6 text-green-600 mx-auto mb-1" />
                <p className="text-xs font-semibold text-green-900">Services</p>
                <p className="text-xs text-green-700">{formatLimit(limits.service_requests)} available</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">Let&apos;s walk through each feature so you can get the most out of your events.</p>
          </div>
        );

      case 'co-hosts':
        return (
          <div className="space-y-4">
            <BizModalSectionHeader step={2} title="Co-Host Management" />
            <p className="text-sm text-gray-700">
              Co-hosts are businesses or organizations that help you organize and run your events. They can take on different roles to support your event team.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-blue-900">Current Usage</span>
                <span className="text-sm font-bold text-blue-700">
                  {counts.co_hosts} / {formatLimit(limits.co_hosts)}
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: limits.co_hosts >= 999
                      ? `${Math.min(100, (counts.co_hosts / 10) * 100)}%`
                      : `${Math.min(100, (counts.co_hosts / limits.co_hosts) * 100)}%`
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Available Roles</p>
              <div className="grid grid-cols-2 gap-2">
                {['Organizer', 'Vendor', 'Performer', 'Exhibitor'].map(role => (
                  <div key={role} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg p-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                    {role}
                  </div>
                ))}
              </div>
            </div>

            <a
              href={`/dashboard/listings/${listingId}/events/co-hosts`}
              className="flex items-center gap-2 text-sm font-medium text-white px-4 py-2 rounded-lg w-full justify-center transition-colors"
              style={{ backgroundColor: '#ed6437' }}
            >
              Manage Co-Hosts
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        );

      case 'exhibitors':
        return (
          <div className="space-y-4">
            <BizModalSectionHeader step={3} title="Exhibitor Management" />
            <p className="text-sm text-gray-700">
              Exhibitors are businesses showcasing their products or services at your event. Each exhibitor gets their own booth with impression and click tracking.
            </p>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-purple-900">Current Usage</span>
                <span className="text-sm font-bold text-purple-700">
                  {counts.exhibitors} / {formatLimit(limits.exhibitors)}
                </span>
              </div>
              <div className="w-full bg-purple-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{
                    width: limits.exhibitors >= 999
                      ? `${Math.min(100, (counts.exhibitors / 15) * 100)}%`
                      : `${Math.min(100, (counts.exhibitors / limits.exhibitors) * 100)}%`
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Booth Sizes</p>
              <div className="grid grid-cols-2 gap-2">
                {['Small', 'Medium', 'Large', 'Premium'].map(size => (
                  <div key={size} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg p-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
                    {size}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
              Analytics tracked per exhibitor: impressions, clicks, and click-through rate.
            </div>

            <a
              href={`/dashboard/listings/${listingId}/events/exhibitors`}
              className="flex items-center gap-2 text-sm font-medium text-white px-4 py-2 rounded-lg w-full justify-center transition-colors"
              style={{ backgroundColor: '#ed6437' }}
            >
              Manage Exhibitors
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        );

      case 'services':
        return (
          <div className="space-y-4">
            <BizModalSectionHeader step={4} title="Service Procurement" />
            <p className="text-sm text-gray-700">
              Service requests let you hire vendors for event needs: catering, AV equipment, security, decor, photography, and more. Vendors respond with quotes through the integrated quote system.
            </p>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-green-900">Current Usage</span>
                <span className="text-sm font-bold text-green-700">
                  {counts.service_requests} / {formatLimit(limits.service_requests)}
                </span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{
                    width: limits.service_requests >= 999
                      ? `${Math.min(100, (counts.service_requests / 5) * 100)}%`
                      : `${Math.min(100, (counts.service_requests / limits.service_requests) * 100)}%`
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Service Categories</p>
              <div className="grid grid-cols-2 gap-2">
                {['Catering', 'AV & Sound', 'Security', 'Decor', 'Photography', 'Other'].map(cat => (
                  <div key={cat} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg p-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                    {cat}
                  </div>
                ))}
              </div>
            </div>

            <a
              href={`/dashboard/listings/${listingId}/events/service-requests`}
              className="flex items-center gap-2 text-sm font-medium text-white px-4 py-2 rounded-lg w-full justify-center transition-colors"
              style={{ backgroundColor: '#ed6437' }}
            >
              Manage Service Requests
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        );
    }
  };

  // Step indicator dots
  const stepDots = (
    <div className="flex items-center justify-center gap-2 py-3">
      {STEP_ORDER.map((s, i) => (
        <button
          key={s}
          onClick={() => setStep(s)}
          className={`w-2 h-2 rounded-full transition-all ${
            s === step ? 'w-4' : 'opacity-40'
          }`}
          style={{ backgroundColor: s === step ? '#ed6437' : '#d1d5db' }}
          aria-label={`Go to step ${i + 1}`}
        />
      ))}
    </div>
  );

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Organizer Toolkit Guide"
      maxWidth="lg"
      footer={footer}
    >
      <div className="min-h-[360px] flex flex-col">
        {stepDots}
        <div className="flex-1">
          {renderStepContent()}
        </div>
      </div>
    </BizModal>
  );
}

export default OrganizerOnboardingModal;
