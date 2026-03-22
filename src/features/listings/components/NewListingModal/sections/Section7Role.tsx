'use client';

/**
 * NewListingModal - Section 7: Role & Authorization
 * User role selection, authorization form, and terms acceptance
 * Authority: PHASE_6_BRAIN_PLAN.md
 * Tier: ENTERPRISE
 */

import React, { useState } from 'react';
import { ListingFormData } from '../../../types/listing-form.types';
import { RoleSelectionCard } from '../components/RoleSelectionCard';

export interface Section7RoleProps {
  formData: ListingFormData;
  onUpdateField: <K extends keyof ListingFormData>(
    field: K,
    value: ListingFormData[K]
  ) => void;
  onUpdateSection: (data: Partial<ListingFormData>) => void;
  errors?: Record<string, string>;
  onAuthorizationComplete?: () => void;
}

export function Section7Role({
  formData,
  onUpdateField,
  errors,
  onAuthorizationComplete,
}: Section7RoleProps) {
  const [authCompleted, setAuthCompleted] = useState(false);

  const handleAuthComplete = () => {
    setAuthCompleted(true);
    if (onAuthorizationComplete) {
      onAuthorizationComplete();
    }
  };

  const isSelectUserRole = formData.userRole === 'user';

  return (
    <div className="space-y-6">
      {/* Role & Authorization Info Box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg
              className="w-6 h-6 text-orange-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-navy-900">Role & Authorization:</h4>
            <p className="text-sm text-gray-700 mt-1">
              Please specify your relationship to this business or organization.
              This helps us ensure listings are created and managed by authorized
              individuals.
            </p>
          </div>
        </div>
      </div>

      {/* Role Selection Cards */}
      <div className="space-y-3" role="radiogroup" aria-label="User role selection">
        <RoleSelectionCard
          value="owner"
          label="Owner"
          description="I own this business/organization"
          isSelected={formData.userRole === 'owner'}
          onSelect={(value) => onUpdateField('userRole', value)}
        />
        <RoleSelectionCard
          value="manager"
          label="Manager/Admin"
          description="I manage or administer this business/organization"
          isSelected={formData.userRole === 'manager'}
          onSelect={(value) => onUpdateField('userRole', value)}
        />
        <RoleSelectionCard
          value="user"
          label="Select User"
          description="I am creating this listing on behalf of someone else"
          isSelected={formData.userRole === 'user'}
          onSelect={(value) => onUpdateField('userRole', value)}
        />
      </div>

      {/* Authorization Form (conditional) */}
      {isSelectUserRole && (
        <div
          className="p-4 bg-amber-50 border-2 border-amber-300 rounded-lg"
          aria-expanded={isSelectUserRole}
        >
          <div className="flex items-start space-x-3 mb-4">
            <div className="flex-shrink-0">
              <svg
                className="w-6 h-6 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h5 className="font-semibold text-amber-900">
                Admin Authorization Required:
              </h5>
              <p className="text-sm text-amber-800 mt-1">
                When creating a listing on behalf of someone else, your listing will
                be placed in pending status until the business owner verifies and
                approves it. Please provide the contact details of the business owner
                or authorized representative.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Contact Person's Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Person's Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.ownerName || ''}
                onChange={(e) => onUpdateField('ownerName', e.target.value)}
                placeholder="Full name of business owner/manager"
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  errors?.ownerName ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors?.ownerName && (
                <p className="mt-1 text-xs text-red-600">{errors.ownerName}</p>
              )}
            </div>

            {/* Contact Person's Email Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Person's Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.ownerEmail || ''}
                onChange={(e) => onUpdateField('ownerEmail', e.target.value)}
                placeholder="email@example.com"
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  errors?.ownerEmail ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors?.ownerEmail && (
                <p className="mt-1 text-xs text-red-600">{errors.ownerEmail}</p>
              )}
            </div>

            {/* Contact Person's Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Person's Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.ownerPhone || ''}
                onChange={(e) => onUpdateField('ownerPhone', e.target.value)}
                placeholder="(555) 123-4567"
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  errors?.ownerPhone ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors?.ownerPhone && (
                <p className="mt-1 text-xs text-red-600">{errors.ownerPhone}</p>
              )}
            </div>

            {/* Authorization Complete Button */}
            <div>
              <button
                type="button"
                onClick={handleAuthComplete}
                disabled={authCompleted}
                className={`w-full px-4 py-2 rounded-md font-medium transition-colors ${
                  authCompleted
                    ? 'bg-green-500 text-white cursor-not-allowed'
                    : 'bg-amber-500 text-white hover:bg-amber-600'
                }`}
              >
                {authCompleted ? '✓ Authorization Info Completed' : 'Finished - Complete Authorization Info'}
              </button>
              <p className="mt-2 text-xs text-gray-600 text-center">
                Click this button after entering all owner contact details
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Terms & Conditions Checkbox */}
      <div className="border-t pt-4">
        <label className="flex items-start space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.termsAccepted || false}
            onChange={(e) => onUpdateField('termsAccepted', e.target.checked)}
            className="mt-1 h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
            aria-required="true"
          />
          <span className="text-sm text-gray-700">
            By submitting, I agree with the{' '}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-500 underline hover:text-orange-600"
            >
              Bizconekt Terms and Conditions
            </a>{' '}
            and{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-500 underline hover:text-orange-600"
            >
              Privacy Policy
            </a>
            .
          </span>
        </label>
        {errors?.termsAccepted && (
          <p className="mt-2 text-xs text-red-600">{errors.termsAccepted}</p>
        )}
      </div>
    </div>
  );
}
