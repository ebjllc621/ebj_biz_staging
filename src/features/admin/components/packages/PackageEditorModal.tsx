/**
 * PackageEditorModal - Create/Edit Subscription Packages
 *
 * @authority docs/packages/phases/PHASE_2_BRAIN_PLAN.md
 * @tier ADVANCED (has form validation and rich text)
 *
 * Features:
 * - Create new packages
 * - Edit existing packages (password collected via modal popup on save)
 * - Rich text description using TipTapEditor
 * - Form validation
 * - Tier selection dropdown
 * - Pricing inputs (monthly/annual)
 *
 * Password Flow (Edit Mode):
 * 1. User fills form and clicks "Save Changes"
 * 2. Password modal popup opens to collect password
 * 3. Password sent with API request for verification
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { TipTapEditor } from '@features/listings/components/NewListingModal/shared/RichTextEditor/TipTapEditor';
import { fetchWithCsrf } from '@core/utils/csrf';
import { ListingTier } from '@core/types/subscription';
import type { AdminSubscriptionPlan, CreatePackageInput, UpdatePackageInput } from '@/types/admin-packages';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface PackageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  package?: AdminSubscriptionPlan | null; // null = create mode
}

interface FormState {
  name: string;
  description: string;
  tier: ListingTier;
  version: string;
  pricing_monthly: string;
  pricing_annual: string;
  effective_date: string;
}

interface FormErrors {
  name?: string;
  tier?: string;
  version?: string;
  effective_date?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TIER_OPTIONS: { value: ListingTier; label: string }[] = [
  { value: ListingTier.ESSENTIALS, label: 'Essentials' },
  { value: ListingTier.PLUS, label: 'Plus' },
  { value: ListingTier.PREFERRED, label: 'Preferred' },
  { value: ListingTier.PREMIUM, label: 'Premium' },
];

const INITIAL_FORM_STATE: FormState = {
  name: '',
  description: '',
  tier: ListingTier.ESSENTIALS,
  version: '1.0.0',
  pricing_monthly: '',
  pricing_annual: '',
  effective_date: new Date().toISOString().split('T')[0] ?? '',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function PackageEditorModal({
  isOpen,
  onClose,
  onSave,
  package: existingPackage,
}: PackageEditorModalProps) {
  const isEditMode = !!existingPackage;

  // Form state
  const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Password modal state (for edit mode)
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Reset form when modal opens/closes or package changes
  useEffect(() => {
    if (isOpen) {
      if (existingPackage) {
        setFormState({
          name: existingPackage.name,
          description: existingPackage.description || '',
          tier: existingPackage.tier,
          version: existingPackage.version,
          pricing_monthly: existingPackage.pricing_monthly?.toString() || '',
          pricing_annual: existingPackage.pricing_annual?.toString() || '',
          effective_date: existingPackage.effective_date.split('T')[0] ?? '',
        });
      } else {
        setFormState(INITIAL_FORM_STATE);
      }
      setErrors({});
      setSubmitError(null);
      setShowPasswordModal(false);
      setPasswordInput('');
      setShowPasswordInput(false);
      setPasswordError(null);
    }
  }, [isOpen, existingPackage]);

  // Handle field changes
  const handleFieldChange = useCallback((field: keyof FormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    // Clear error when field is modified
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  // Validate form (no password validation - handled by modal)
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formState.name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Only validate version/effective_date in create mode (immutable after creation)
    if (!isEditMode) {
      if (!formState.version.trim()) {
        newErrors.version = 'Version is required';
      } else if (!/^\d+\.\d+\.\d+$/.test(formState.version.trim())) {
        newErrors.version = 'Version must be in format X.Y.Z';
      }

      if (!formState.effective_date) {
        newErrors.effective_date = 'Effective date is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formState, isEditMode]);

  // Handle Save button click - validates form and shows password modal (edit mode) or submits (create mode)
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      setSubmitError('Please fill in all required fields');
      return;
    }

    if (isEditMode) {
      // In edit mode, show password modal instead of submitting directly
      setShowPasswordModal(true);
      setPasswordInput('');
      setPasswordError(null);
      return;
    }

    // Create mode - submit directly (no password required)
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const createData: CreatePackageInput = {
        name: formState.name.trim(),
        tier: formState.tier,
        version: formState.version.trim(),
        effective_date: formState.effective_date,
        features: {
          categories: 6,
          images: 6,
          videos: 1,
          offers: 4,
          events: 4,
        }, // Default features - can be edited later
        ...(formState.description.trim() ? { description: formState.description.trim() } : {}),
        ...(formState.pricing_monthly ? { pricing_monthly: parseFloat(formState.pricing_monthly) } : {}),
        ...(formState.pricing_annual ? { pricing_annual: parseFloat(formState.pricing_annual) } : {}),
      };

      const response = await fetchWithCsrf('/api/admin/packages', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(createData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create package');
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving package:', error);
      setSubmitError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, isEditMode, formState, onSave, onClose]);

  // Handle password modal submission - sends update with password
  const handlePasswordSubmit = useCallback(async () => {
    if (!passwordInput.trim()) {
      setPasswordError('Password is required');
      return;
    }

    if (!existingPackage) return;

    setIsSubmitting(true);
    setPasswordError(null);

    try {
      // Update existing package (password included for verification)
      const updateData = {
        name: formState.name.trim(),
        password: passwordInput, // Required for API verification
        ...(formState.description.trim() ? { description: formState.description.trim() } : {}),
        ...(formState.pricing_monthly ? { pricing_monthly: parseFloat(formState.pricing_monthly) } : {}),
        ...(formState.pricing_annual ? { pricing_annual: parseFloat(formState.pricing_annual) } : {}),
      };

      const response = await fetchWithCsrf(`/api/admin/packages/${existingPackage.id}`, {
        method: 'PUT',
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to update package');
      }

      setShowPasswordModal(false);
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving package:', error);
      setPasswordError(error instanceof Error ? error.message : 'An error occurred');
      setPasswordInput(''); // Clear password on error
    } finally {
      setIsSubmitting(false);
    }
  }, [passwordInput, existingPackage, formState, onSave, onClose]);

  // Close password modal
  const handlePasswordModalClose = useCallback(() => {
    setShowPasswordModal(false);
    setPasswordInput('');
    setPasswordError(null);
  }, []);

  return (
  <>
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Package' : 'Create Package'}
      subtitle={isEditMode ? `Editing ${existingPackage?.name}` : 'Add a new subscription package'}
      maxWidth="lg"
      footer={
        <div className="flex justify-end gap-3">
          <BizModalButton variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </BizModalButton>
          <BizModalButton
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Package'}
          </BizModalButton>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Error Alert */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {submitError}
          </div>
        )}

        {/* Name Field */}
        <div>
          <label htmlFor="package-name" className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="package-name"
            type="text"
            value={formState.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="Enter package name"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
        </div>

        {/* Tier and Version Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Tier Field - Only for create mode */}
          <div>
            <label htmlFor="package-tier" className="block text-sm font-medium text-gray-700 mb-1">
              Tier {!isEditMode && <span className="text-red-500">*</span>}
            </label>
            <select
              id="package-tier"
              value={formState.tier}
              onChange={(e) => handleFieldChange('tier', e.target.value)}
              disabled={isEditMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
            >
              {TIER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {isEditMode && (
              <p className="mt-1 text-xs text-gray-500">Tier cannot be changed after creation</p>
            )}
          </div>

          {/* Version Field */}
          <div>
            <label htmlFor="package-version" className="block text-sm font-medium text-gray-700 mb-1">
              Version <span className="text-red-500">*</span>
            </label>
            <input
              id="package-version"
              type="text"
              value={formState.version}
              onChange={(e) => handleFieldChange('version', e.target.value)}
              placeholder="1.0.0"
              disabled={isEditMode}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 ${errors.version ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.version && <p className="mt-1 text-sm text-red-500">{errors.version}</p>}
            {isEditMode && (
              <p className="mt-1 text-xs text-gray-500">Version cannot be changed after creation</p>
            )}
          </div>
        </div>

        {/* Description Field */}
        <div>
          <label htmlFor="package-description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <TipTapEditor
            value={formState.description}
            onChange={(value) => handleFieldChange('description', value)}
            maxLength={2000}
            placeholder="Enter package description..."
            className="min-h-[120px]"
          />
        </div>

        {/* Pricing Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="pricing-monthly" className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Price ($)
            </label>
            <input
              id="pricing-monthly"
              type="number"
              min="0"
              step="0.01"
              value={formState.pricing_monthly}
              onChange={(e) => handleFieldChange('pricing_monthly', e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="pricing-annual" className="block text-sm font-medium text-gray-700 mb-1">
              Annual Price ($)
            </label>
            <input
              id="pricing-annual"
              type="number"
              min="0"
              step="0.01"
              value={formState.pricing_annual}
              onChange={(e) => handleFieldChange('pricing_annual', e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Effective Date - Only for create mode */}
        {!isEditMode && (
          <div>
            <label htmlFor="effective-date" className="block text-sm font-medium text-gray-700 mb-1">
              Effective Date <span className="text-red-500">*</span>
            </label>
            <input
              id="effective-date"
              type="date"
              value={formState.effective_date}
              onChange={(e) => handleFieldChange('effective_date', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.effective_date ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.effective_date && (
              <p className="mt-1 text-sm text-red-500">{errors.effective_date}</p>
            )}
          </div>
        )}

      </div>
    </BizModal>

    {/* Password Confirmation Modal - Edit Mode Only */}
    {isEditMode && (
      <BizModal
        isOpen={showPasswordModal}
        onClose={handlePasswordModalClose}
        title="Admin Password Required"
        maxWidth="sm"
      >
        <form onSubmit={(e) => { e.preventDefault(); handlePasswordSubmit(); }} className="p-6">
          {/* Warning Banner */}
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Authentication Required
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                You are about to <span className="font-semibold">save changes to {existingPackage?.name}</span>.
                Please verify your admin password to continue.
              </p>
            </div>
          </div>

          {/* Password Input */}
          <div className="mb-4">
            <label htmlFor="package-admin-password" className="block text-sm font-medium text-gray-700 mb-2">
              Admin Password
            </label>
            <div className="relative">
              <input
                id="package-admin-password"
                type={showPasswordInput ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError(null);
                }}
                placeholder="Enter your admin password"
                className={`w-full px-4 py-2 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  passwordError ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
                autoComplete="current-password"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPasswordInput(!showPasswordInput)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label={showPasswordInput ? 'Hide password' : 'Show password'}
                disabled={isSubmitting}
              >
                {showPasswordInput ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {passwordError && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {passwordError}
              </p>
            )}
          </div>

          {/* Security Note */}
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>Security Note:</strong> Your password is verified securely and never stored in plaintext.
              This verification is required for all package modifications.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <BizModalButton
              variant="secondary"
              onClick={handlePasswordModalClose}
              disabled={isSubmitting}
            >
              Cancel
            </BizModalButton>
            <BizModalButton
              variant="primary"
              type="submit"
              disabled={isSubmitting || !passwordInput.trim()}
            >
              {isSubmitting ? 'Saving...' : 'Confirm & Save'}
            </BizModalButton>
          </div>
        </form>
      </BizModal>
    )}
  </>
  );
}
