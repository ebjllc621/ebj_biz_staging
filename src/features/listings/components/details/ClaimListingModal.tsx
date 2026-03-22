'use client';

import BizModal, { BizModalButton } from '@/components/BizModal';
import {
  Mail,
  Phone,
  Globe,
  FileText,
  ArrowLeft,
  Check,
  Loader2,
} from 'lucide-react';
import type { Listing } from '@core/services/ListingService';
import type { UseClaimListingReturn } from '@/features/listings/hooks/useClaimListing';
import type { ClaimType } from '@core/services/ClaimListingService';

interface ClaimListingModalProps {
  listing: Listing;
  claim: UseClaimListingReturn;
}

// Helper to mask email
function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!domain || !localPart) return email;
  const prefix = localPart.slice(0, Math.min(3, localPart.length));
  return `${prefix}***@${domain}`;
}

// Helper to mask phone
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return phone;
  const lastFour = digits.slice(-4);
  return `(***) ***-${lastFour}`;
}

export function ClaimListingModal({ listing, claim }: ClaimListingModalProps) {
  // Step 1: Select Claim Type
  const renderSelectTypeStep = () => (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Please select your relationship to this business and provide any additional details.
      </p>

      <div className="space-y-3">
        <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            name="claimType"
            value="owner"
            checked={claim.formData.claimType === 'owner'}
            onChange={(e) => claim.setClaimType(e.target.value as ClaimType)}
            className="mt-1"
          />
          <div>
            <div className="font-medium">Business Owner</div>
            <div className="text-sm text-gray-600">
              I am the legal owner of this business
            </div>
          </div>
        </label>

        <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            name="claimType"
            value="manager"
            checked={claim.formData.claimType === 'manager'}
            onChange={(e) => claim.setClaimType(e.target.value as ClaimType)}
            className="mt-1"
          />
          <div>
            <div className="font-medium">Business Manager</div>
            <div className="text-sm text-gray-600">
              I manage this business on behalf of the owner
            </div>
          </div>
        </label>

        <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            name="claimType"
            value="authorized_representative"
            checked={claim.formData.claimType === 'authorized_representative'}
            onChange={(e) => claim.setClaimType(e.target.value as ClaimType)}
            className="mt-1"
          />
          <div>
            <div className="font-medium">Authorized Representative</div>
            <div className="text-sm text-gray-600">
              I am authorized to claim this business on behalf of the owner
            </div>
          </div>
        </label>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Additional Information (Optional)
        </label>
        <textarea
          id="description"
          rows={4}
          maxLength={500}
          value={claim.formData.claimantDescription}
          onChange={(e) => claim.updateFormData('claimantDescription', e.target.value)}
          placeholder="Provide any additional details about your relationship to this business..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        <div className="text-xs text-gray-500 mt-1">
          {claim.formData.claimantDescription.length}/500 characters
        </div>
      </div>
    </div>
  );

  // Step 2: Choose Verification Method
  const renderVerificationStep = () => {
    const methods = claim.availableVerificationMethods;

    return (
      <div className="space-y-6">
        <p className="text-sm text-gray-600">
          Choose how you would like to verify your claim to this business.
        </p>

        <div className="space-y-3">
          {methods.includes('email') && listing.email && (
            <button
              type="button"
              onClick={() => claim.setVerificationMethod('email')}
              className={`w-full flex items-start gap-4 p-4 border rounded-lg transition-all ${
                claim.formData.verificationMethod === 'email'
                  ? 'border-green-600 bg-green-50'
                  : 'hover:bg-gray-50'
              }`}
            >
              <Mail className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div className="text-left flex-1">
                <div className="font-medium">Email Verification</div>
                <div className="text-sm text-gray-600">
                  We&apos;ll send a code to {maskEmail(listing.email)}
                </div>
              </div>
            </button>
          )}

          {methods.includes('phone') && listing.phone && (
            <button
              type="button"
              onClick={() => claim.setVerificationMethod('phone')}
              className={`w-full flex items-start gap-4 p-4 border rounded-lg transition-all ${
                claim.formData.verificationMethod === 'phone'
                  ? 'border-green-600 bg-green-50'
                  : 'hover:bg-gray-50'
              }`}
            >
              <Phone className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div className="text-left flex-1">
                <div className="font-medium">Phone Verification</div>
                <div className="text-sm text-gray-600">
                  We&apos;ll send a code to {maskPhone(listing.phone)}
                </div>
              </div>
            </button>
          )}

          {methods.includes('domain') && listing.website && (
            <button
              type="button"
              onClick={() => claim.setVerificationMethod('domain')}
              className={`w-full flex items-start gap-4 p-4 border rounded-lg transition-all ${
                claim.formData.verificationMethod === 'domain'
                  ? 'border-green-600 bg-green-50'
                  : 'hover:bg-gray-50'
              }`}
            >
              <Globe className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div className="text-left flex-1">
                <div className="font-medium">Website Verification</div>
                <div className="text-sm text-gray-600">
                  Verify ownership of {new URL(listing.website).hostname}
                </div>
              </div>
            </button>
          )}

          {methods.includes('manual') && (
            <button
              type="button"
              onClick={() => claim.setVerificationMethod('manual')}
              className={`w-full flex items-start gap-4 p-4 border rounded-lg transition-all ${
                claim.formData.verificationMethod === 'manual'
                  ? 'border-green-600 bg-green-50'
                  : 'hover:bg-gray-50'
              }`}
            >
              <FileText className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div className="text-left flex-1">
                <div className="font-medium">Manual Verification</div>
                <div className="text-sm text-gray-600">
                  Submit documents for admin review (slower process)
                </div>
              </div>
            </button>
          )}
        </div>
      </div>
    );
  };

  // Step 3: Enter Verification Code
  const renderEnterCodeStep = () => (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Enter the 6-digit verification code we sent to your{' '}
        {claim.formData.verificationMethod === 'email' ? 'email' : 'phone'}.
      </p>

      <div>
        <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-2">
          Verification Code
        </label>
        <input
          type="text"
          id="verificationCode"
          maxLength={6}
          value={claim.formData.verificationCode}
          onChange={(e) => claim.updateFormData('verificationCode', e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      <button
        type="button"
        onClick={claim.sendVerificationCode}
        disabled={claim.isSubmitting}
        className="text-sm text-green-600 hover:text-green-700 underline disabled:text-gray-600"
      >
        Resend Code
      </button>
    </div>
  );

  // Step 4: Confirmation
  const renderConfirmationStep = () => (
    <div className="space-y-6 text-center py-8">
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <Check className="w-10 h-10 text-green-600" />
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Claim Submitted Successfully!</h3>
        <p className="text-gray-600">
          {claim.formData.verificationMethod === 'manual'
            ? 'Your claim has been submitted for admin review. You will be notified once your claim is processed.'
            : 'Your claim has been verified and submitted. You will be notified once approved.'}
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 text-left">
        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Business:</span>
            <span className="font-medium">{listing.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Claim Type:</span>
            <span className="font-medium capitalize">
              {claim.formData.claimType.replace('_', ' ')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Verification:</span>
            <span className="font-medium capitalize">{claim.formData.verificationMethod}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Dynamic footer based on step
  const renderFooter = () => {
    const { currentStep, canGoBack, goBack, isSubmitting } = claim;

    if (currentStep === 'confirmation') {
      return (
        <BizModalButton variant="primary" onClick={claim.closeModal}>
          Done
        </BizModalButton>
      );
    }

    return (
      <div className="flex gap-3">
        {canGoBack && (
          <BizModalButton variant="secondary" onClick={goBack} disabled={isSubmitting}>
            <ArrowLeft className="w-4 h-4" />
            Back
          </BizModalButton>
        )}

        {currentStep === 'select-type' && (
          <BizModalButton
            variant="primary"
            onClick={claim.initiateClaim}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Next'
            )}
          </BizModalButton>
        )}

        {currentStep === 'verification' && (
          <BizModalButton
            variant="primary"
            onClick={claim.sendVerificationCode}
            disabled={!claim.formData.verificationMethod || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : claim.formData.verificationMethod === 'manual' ? (
              'Submit for Review'
            ) : (
              'Send Code'
            )}
          </BizModalButton>
        )}

        {currentStep === 'enter-code' && (
          <BizModalButton
            variant="primary"
            onClick={claim.submitVerificationCode}
            disabled={claim.formData.verificationCode.length !== 6 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Code'
            )}
          </BizModalButton>
        )}
      </div>
    );
  };

  return (
    <BizModal
      isOpen={claim.isModalOpen}
      onClose={claim.closeModal}
      title="Claim This Business"
      subtitle={listing.name}
      maxWidth="lg"
      fullScreenMobile={true}
      closeOnBackdropClick={false}
      footer={renderFooter()}
    >
      <div className="space-y-6">
        {claim.error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">{claim.error}</p>
          </div>
        )}

        {claim.currentStep === 'select-type' && renderSelectTypeStep()}
        {claim.currentStep === 'verification' && renderVerificationStep()}
        {claim.currentStep === 'enter-code' && renderEnterCodeStep()}
        {claim.currentStep === 'confirmation' && renderConfirmationStep()}
      </div>
    </BizModal>
  );
}
