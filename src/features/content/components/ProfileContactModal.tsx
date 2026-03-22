/**
 * ProfileContactModal - Shared modal for sending contact proposals to creator profiles
 *
 * @authority Tier3_Phases/PHASE_5_CONTACT_PROPOSAL_SYSTEM.md
 * @tier STANDARD
 * @reference src/features/bizwire/components/ContactListingModal.tsx - Exact pattern replicated
 *
 * GOVERNANCE:
 * - Uses branded BizModal from @/components/BizModal (governance mandate)
 * - CSRF protection via useProfileContact hook (fetchWithCsrf)
 * - Client Component ('use client')
 * - ErrorBoundary wrapper export pattern
 * - Auth guard: shows login prompt if user not authenticated
 */

'use client';

import { useState, useEffect } from 'react';
import BizModal from '@/components/BizModal';
import { useAuth } from '@core/hooks/useAuth';
import { useProfileContact } from '../hooks/useProfileContact';
import { CheckCircle } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import type { ProfileContactType, ProposalType } from '@core/types/content-contact-proposal';

// ============================================================================
// Props
// ============================================================================

interface ProfileContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileType: ProfileContactType;
  profileSlug: string;
  profileName: string;
  onSuccess?: () => void;
}

// ============================================================================
// Proposal Type Options
// ============================================================================

const AM_PROPOSAL_OPTIONS: Array<{ value: ProposalType; label: string }> = [
  { value: 'hire', label: 'Hire for Campaign' },
  { value: 'inquiry', label: 'General Inquiry' },
];

const IP_PROPOSAL_OPTIONS: Array<{ value: ProposalType; label: string }> = [
  { value: 'collaborate', label: 'Brand Collaboration' },
  { value: 'hire', label: 'Sponsored Content' },
  { value: 'inquiry', label: 'General Inquiry' },
];

const POD_PROPOSAL_OPTIONS: Array<{ value: ProposalType; label: string }> = [
  { value: 'sponsor', label: 'Podcast Sponsorship' },
  { value: 'guest_booking', label: 'Guest Booking' },
  { value: 'inquiry', label: 'General Inquiry' },
];

// ============================================================================
// Component (Inner)
// ============================================================================

function ProfileContactModalContent({
  isOpen,
  onClose,
  profileType,
  profileSlug,
  profileName,
  onSuccess,
}: ProfileContactModalProps) {
  const { user } = useAuth();
  const { sendProposal, isLoading, error, reset } = useProfileContact();

  const isAffiliate = profileType === 'affiliate_marketer';
  const isPodcaster = profileType === 'podcaster';
  const proposalOptions = isAffiliate
    ? AM_PROPOSAL_OPTIONS
    : isPodcaster
      ? POD_PROPOSAL_OPTIONS
      : IP_PROPOSAL_OPTIONS;
  const defaultProposalType: ProposalType = isAffiliate ? 'hire' : isPodcaster ? 'sponsor' : 'collaborate';

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [proposalType, setProposalType] = useState<ProposalType>(defaultProposalType);
  const [budgetRange, setBudgetRange] = useState('');
  const [timeline, setTimeline] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const MAX_SUBJECT_LENGTH = 200;
  const MAX_MESSAGE_LENGTH = 2000;
  const MIN_SUBJECT_LENGTH = 5;
  const MIN_MESSAGE_LENGTH = 10;

  const isValid =
    subject.trim().length >= MIN_SUBJECT_LENGTH &&
    subject.trim().length <= MAX_SUBJECT_LENGTH &&
    message.trim().length >= MIN_MESSAGE_LENGTH &&
    message.trim().length <= MAX_MESSAGE_LENGTH;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSubject('');
      setMessage('');
      setProposalType(defaultProposalType);
      setBudgetRange('');
      setTimeline('');
      setCompanyName('');
      setShowSuccess(false);
      reset();
    }
  }, [isOpen, reset, defaultProposalType]);

  const handleSubmit = async () => {
    if (!user || !isValid || isLoading) return;

    const success = await sendProposal(profileType, profileSlug, {
      subject,
      message,
      proposal_type: proposalType,
      budget_range: budgetRange.trim() || undefined,
      timeline: timeline.trim() || undefined,
      company_name: companyName.trim() || undefined,
    });

    if (success) {
      setShowSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const isSubmitDisabled = isLoading || !isValid || showSuccess || !user;

  const modalTitle = isAffiliate
    ? `Hire ${profileName}`
    : isPodcaster
      ? `Contact ${profileName}`
      : `Collaborate with ${profileName}`;

  const modalSubtitle = isAffiliate
    ? 'Send a hiring proposal'
    : isPodcaster
      ? 'Send a sponsorship or guest booking request'
      : 'Send a collaboration request';

  return (
    <BizModal
      isOpen={isOpen}
      onClose={handleClose}
      title={modalTitle}
      subtitle={modalSubtitle}
      maxWidth="lg"
      footer={
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-md font-medium transition-colors bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            className="px-4 py-2 rounded-md font-medium transition-colors bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending...' : 'Send Proposal'}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Auth Guard */}
        {!user && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Please{' '}
              <a href="/auth/login" className="font-semibold underline hover:text-blue-900">
                sign in
              </a>{' '}
              to send a proposal to this profile.
            </p>
          </div>
        )}

        {/* Success State */}
        {showSuccess && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm font-medium text-green-800">
                Your proposal has been sent! {profileName} will be notified.
              </p>
            </div>
          </div>
        )}

        {/* Sender Info */}
        {user && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">From</p>
            <p className="text-sm font-semibold text-gray-900">{user.name || 'Anonymous'}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        )}

        {/* Proposal Type */}
        <div>
          <label htmlFor="proposalType" className="block text-sm font-medium text-gray-700 mb-2">
            Proposal Type
          </label>
          <select
            id="proposalType"
            value={proposalType}
            onChange={(e) => setProposalType(e.target.value as ProposalType)}
            disabled={isLoading || showSuccess}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {proposalOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={MAX_SUBJECT_LENGTH}
            placeholder="Enter a subject..."
            disabled={isLoading || showSuccess}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex justify-between items-center mt-1">
            {subject.trim().length > 0 && subject.trim().length < MIN_SUBJECT_LENGTH ? (
              <p className="text-xs text-red-500">Minimum {MIN_SUBJECT_LENGTH} characters</p>
            ) : (
              <span />
            )}
            <p className="text-xs text-gray-500 ml-auto">
              {subject.length}/{MAX_SUBJECT_LENGTH}
            </p>
          </div>
        </div>

        {/* Message */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            id="message"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="Describe your proposal..."
            disabled={isLoading || showSuccess}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex justify-between items-center mt-1">
            {message.trim().length > 0 && message.trim().length < MIN_MESSAGE_LENGTH ? (
              <p className="text-xs text-red-500">Minimum {MIN_MESSAGE_LENGTH} characters</p>
            ) : (
              <p className="text-xs text-gray-500">Required field</p>
            )}
            <p
              className={`text-xs font-medium ${
                message.length > MAX_MESSAGE_LENGTH - 100 ? 'text-orange-600' : 'text-gray-500'
              }`}
            >
              {message.length}/{MAX_MESSAGE_LENGTH}
            </p>
          </div>
        </div>

        {/* Budget Range (Optional) */}
        <div>
          <label htmlFor="budgetRange" className="block text-sm font-medium text-gray-700 mb-2">
            Budget Range <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="budgetRange"
            type="text"
            value={budgetRange}
            onChange={(e) => setBudgetRange(e.target.value)}
            placeholder="e.g., $500-$1,000"
            disabled={isLoading || showSuccess}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Timeline (Optional) */}
        <div>
          <label htmlFor="timeline" className="block text-sm font-medium text-gray-700 mb-2">
            Timeline <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="timeline"
            type="text"
            value={timeline}
            onChange={(e) => setTimeline(e.target.value)}
            placeholder="e.g., 2 weeks"
            disabled={isLoading || showSuccess}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Company Name (Optional) */}
        <div>
          <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
            Company Name <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="companyName"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Your company or business name"
            disabled={isLoading || showSuccess}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </BizModal>
  );
}

// ============================================================================
// Exported Component (with ErrorBoundary)
// ============================================================================

export function ProfileContactModal(props: ProfileContactModalProps) {
  return (
    <ErrorBoundary componentName="ProfileContactModal">
      <ProfileContactModalContent {...props} />
    </ErrorBoundary>
  );
}
