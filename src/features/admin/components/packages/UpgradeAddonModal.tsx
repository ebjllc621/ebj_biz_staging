/**
 * UpgradeAddonModal - Upgrade Addon Version
 *
 * @authority docs/packages/phases/PHASE_5.0_BRAIN_PLAN.md
 * @tier ADVANCED (has form validation and password requirement)
 *
 * Features:
 * - Create new addon version with updated pricing/features
 * - Auto-hides previous displayed version
 * - Password verification required
 * - Form validation
 *
 * Password Flow:
 * 1. User fills form and clicks "Create New Version"
 * 2. Password input required in modal
 * 3. Password sent with API request for verification
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { fetchWithCsrf } from '@core/utils/csrf';
import type { AdminAddonSuite } from '@/types/admin-packages';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface UpgradeAddonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  addon: AdminAddonSuite;
}

interface FormState {
  pricing_monthly: string;
  pricing_annual: string;
  effective_date: string;
  password: string;
}

interface FormErrors {
  pricing_monthly?: string;
  pricing_annual?: string;
  effective_date?: string;
  password?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function UpgradeAddonModal({
  isOpen,
  onClose,
  onSuccess,
  addon: existingAddon,
}: UpgradeAddonModalProps) {
  // Form state
  const [formState, setFormState] = useState<FormState>({
    pricing_monthly: existingAddon.pricing_monthly?.toString() || '',
    pricing_annual: existingAddon.pricing_annual?.toString() || '',
    effective_date: new Date().toISOString().split('T')[0] ?? '',
    password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormState({
        pricing_monthly: existingAddon.pricing_monthly?.toString() || '',
        pricing_annual: existingAddon.pricing_annual?.toString() || '',
        effective_date: new Date().toISOString().split('T')[0] ?? '',
        password: '',
      });
      setErrors({});
      setSubmitError(null);
      setShowPassword(false);
    }
  }, [isOpen, existingAddon]);

  // Handle field changes
  const handleFieldChange = useCallback((field: keyof FormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    // Clear error when field is modified
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formState.effective_date) {
      newErrors.effective_date = 'Effective date is required';
    }

    if (!formState.password.trim()) {
      newErrors.password = 'Password is required for upgrade';
    }

    // Validate at least one pricing field is filled
    if (!formState.pricing_monthly && !formState.pricing_annual) {
      newErrors.pricing_monthly = 'At least one pricing field is required';
      newErrors.pricing_annual = 'At least one pricing field is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formState]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      setSubmitError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const upgradeData = {
        password: formState.password,
        effective_date: formState.effective_date,
        ...(formState.pricing_monthly ? { pricing_monthly: parseFloat(formState.pricing_monthly) } : {}),
        ...(formState.pricing_annual ? { pricing_annual: parseFloat(formState.pricing_annual) } : {}),
      };

      const response = await fetchWithCsrf(`/api/admin/addons/${existingAddon.id}/upgrade`, {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(upgradeData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to upgrade addon');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error upgrading addon:', error);
      setSubmitError(error instanceof Error ? error.message : 'An error occurred');
      setFormState(prev => ({ ...prev, password: '' })); // Clear password on error
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, formState, existingAddon.id, onSuccess, onClose]);

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Upgrade Addon Version"
      subtitle={`Creating new version for ${existingAddon.display_name} (${existingAddon.suite_name})`}
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
            {isSubmitting ? 'Creating...' : 'Create New Version'}
          </BizModalButton>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Error Alert */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          </div>
        )}

        {/* Warning Notice */}
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
          <p className="text-sm">
            <strong>Note:</strong> Creating a new version will automatically hide the current displayed version for this addon.
            Existing subscribers will remain grandfathered on their current version.
          </p>
        </div>

        {/* Current Version Info */}
        <div className="bg-gray-50 p-4 rounded-md space-y-2">
          <p className="text-sm text-gray-600">Current Version: <span className="font-medium text-gray-900">{existingAddon.version}</span></p>
          <p className="text-sm text-gray-600">Current Monthly: <span className="font-medium text-gray-900">${existingAddon.pricing_monthly || 'N/A'}</span></p>
          <p className="text-sm text-gray-600">Current Annual: <span className="font-medium text-gray-900">${existingAddon.pricing_annual || 'N/A'}</span></p>
        </div>

        {/* Pricing Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="pricing_monthly" className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Price ($)
            </label>
            <input
              type="number"
              id="pricing_monthly"
              step="0.01"
              value={formState.pricing_monthly}
              onChange={(e) => handleFieldChange('pricing_monthly', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.pricing_monthly
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="9.99"
            />
            {errors.pricing_monthly && (
              <p className="mt-1 text-xs text-red-600">{errors.pricing_monthly}</p>
            )}
          </div>

          <div>
            <label htmlFor="pricing_annual" className="block text-sm font-medium text-gray-700 mb-1">
              Annual Price ($)
            </label>
            <input
              type="number"
              id="pricing_annual"
              step="0.01"
              value={formState.pricing_annual}
              onChange={(e) => handleFieldChange('pricing_annual', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.pricing_annual
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="99.99"
            />
            {errors.pricing_annual && (
              <p className="mt-1 text-xs text-red-600">{errors.pricing_annual}</p>
            )}
          </div>
        </div>

        {/* Effective Date */}
        <div>
          <label htmlFor="effective_date" className="block text-sm font-medium text-gray-700 mb-1">
            Effective Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="effective_date"
            value={formState.effective_date}
            onChange={(e) => handleFieldChange('effective_date', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.effective_date
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {errors.effective_date && (
            <p className="mt-1 text-xs text-red-600">{errors.effective_date}</p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Admin Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={formState.password}
              onChange={(e) => handleFieldChange('password', e.target.value)}
              className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 ${
                errors.password
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="Enter your admin password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password}</p>
          )}
        </div>
      </div>
    </BizModal>
  );
}
