/**
 * NewListingModal - Main Modal Component
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier ENTERPRISE - 7-section multi-phase form
 * @phase Phase 1 - Foundation
 *
 * FEATURES:
 * - 7-section accordion system
 * - BizModal wrapper with fullScreenMobile
 * - useReducer form state management
 * - Section validation framework
 * - One section open at a time
 * - Section 1 expanded by default
 */

/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import BizModal, { BizModalButton } from '@/components/BizModal';
import type { ListingTemplate } from '@core/services/ListingTemplateService';
import type { ListingFormData } from '../../types/listing-form.types';
import { SECTIONS } from './constants';
import { useNewListingForm } from './useNewListingForm';
import { useSectionState } from './useSectionState';
import { useListingSubmit } from './hooks/useListingSubmit';
import { validateAllSections } from './validation';

// Dynamic import: DraftSaveButton is only needed on client, avoid SSR
const DraftSaveButton = dynamic(
  () => import('@features/listings/components/DraftSaveButton').then((m) => ({ default: m.DraftSaveButton })),
  { ssr: false }
);

// Dynamic import: ListingTemplateSelector — non-critical, avoid SSR
const ListingTemplateSelector = dynamic(
  () => import('@features/listings/components/ListingTemplateSelector').then((m) => ({ default: m.ListingTemplateSelector })),
  { ssr: false }
);
import { SectionAccordion } from './components/SectionAccordion';
import { Section1Membership } from './sections/Section1Membership';
import { Section2BasicInfo } from './sections/Section2BasicInfo';
import { Section3Hours } from './sections/Section3Hours';
import { Section4Contact } from './sections/Section4Contact';
import { Section5Media } from './sections/Section5Media';
import { Section6SEO } from './sections/Section6SEO';
import { Section7Role } from './sections/Section7Role';
import { ListingSuccessModal } from './components/ListingSuccessModal';

// ============================================================================
// TYPES
// ============================================================================

export interface NewListingModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close modal callback */
  onClose: () => void;
  /** Success callback with created listing ID */
  onSuccess: (listingId: number) => void;
  /** Edit mode (default: false for create mode) */
  editMode?: boolean;
  /** Listing ID for edit mode */
  listingId?: number;
  /** Initial data for edit mode */
  initialData?: Partial<ListingFormData>;
  /** User's role (determines available tiers) */
  userRole?: 'visitor' | 'general' | 'listing_member' | 'admin';
  /** Custom submit handler for edit mode (overrides default create behavior) */
  onEditSubmit?: (formData: ListingFormData) => Promise<boolean>;
  /** Called when draft is saved successfully — receives listingId */
  onDraftSaved?: (listingId: number) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function NewListingModal({
  isOpen,
  onClose,
  onSuccess,
  editMode = false,
  listingId,
  initialData,
  userRole = 'general',
  onEditSubmit,
  onDraftSaved,
}: NewListingModalProps) {
  // Form state management (unused variables will be used in future phases)
  const {
    formData,
    updateField,
    updateSection,
    setTier,
    toggleAddon,
    resetForm,
    loadListing,
    tierLimits,
  } = useNewListingForm(editMode);

  // Load initial data when in edit mode
  useEffect(() => {
    if (editMode && initialData && isOpen) {
      loadListing(initialData);
    }
  }, [editMode, initialData, isOpen, loadListing]);

  // Section accordion state
  const {
    expandedSection,
    sectionsWithErrors,
    completedSections,
    toggleSection,
    markSectionError,
    markSectionComplete,
    isSectionExpanded,
    hasSectionError,
    isSectionComplete,
  } = useSectionState();

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Template selector state — shown in create mode only, hidden in edit mode
  const [showTemplateSelector, setShowTemplateSelector] = useState(!editMode);

  // Handle template selection — pre-fills form fields from template_fields
  const handleSelectTemplate = useCallback((template: ListingTemplate) => {
    if (template.template_fields) {
      const fields = template.template_fields as Record<string, unknown>;
      if (typeof fields.description === 'string') updateField('description', fields.description);
      if (Array.isArray(fields.keywords)) updateField('keywords', fields.keywords as string[]);
      if (typeof fields.phone === 'string') updateField('phone', fields.phone);
      if (typeof fields.website === 'string') updateField('website', fields.website);
      if (typeof fields.address === 'string') updateField('address', fields.address);
    }
    if (template.default_type) updateField('type', template.default_type);
    if (template.default_tier) setTier(template.default_tier as Parameters<typeof setTier>[0]);
    setShowTemplateSelector(false);
    // Increment usage count — fire and forget
    fetch(`/api/listings/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ templateId: template.id, action: 'increment_usage' }),
    }).catch(() => {});
  }, [updateField, setTier]);

  // Handle "Start from Scratch" — hide selector and show blank form
  const handleSkipTemplate = useCallback(() => {
    setShowTemplateSelector(false);
  }, []);

  // Edit mode state (for update operations)
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editSubmitError, setEditSubmitError] = useState<string | null>(null);

  // Listing submission hook (used for CREATE mode only)
  const {
    isSubmitting: isCreateSubmitting,
    submitError: createSubmitError,
    createdListing,
    handleSubmit: submitListing,
    setCreatedListing,
    clearError: clearCreateError,
  } = useListingSubmit(formData, tierLimits, (firstErrorSection) => {
    // On validation error, expand first section with error
    toggleSection(firstErrorSection);
  });

  // Combined submitting/error state for UI (handles both create and edit modes)
  const isSubmitting = editMode ? isEditSubmitting : isCreateSubmitting;
  const submitError = editMode ? editSubmitError : createSubmitError;
  const clearError = useCallback(() => {
    if (editMode) {
      setEditSubmitError(null);
    } else {
      clearCreateError();
    }
  }, [editMode, clearCreateError]);

  // Validate all sections for button enable state
  const isFormValid = useMemo(() => {
    const { valid } = validateAllSections(formData, tierLimits);
    return valid;
  }, [formData, tierLimits]);

  // Handle modal close
  const handleClose = useCallback(() => {
    onClose();
    clearError();
    // Reset form after modal close animation
    setTimeout(() => {
      resetForm();
      setCreatedListing(null);
      setEditSubmitError(null);
    }, 300);
  }, [onClose, resetForm, clearError, setCreatedListing]);

  // Handle form submission (branched for create vs edit mode)
  const handleSubmit = useCallback(async () => {
    if (editMode && onEditSubmit) {
      // Edit mode: use custom edit submit handler
      setIsEditSubmitting(true);
      setEditSubmitError(null);
      try {
        const success = await onEditSubmit(formData);
        if (success) {
          // Edit succeeded, close modal and trigger success callback
          onClose();
          if (listingId) {
            onSuccess(listingId);
          }
        }
      } catch (err) {
        setEditSubmitError(err instanceof Error ? err.message : 'Failed to save changes');
      } finally {
        setIsEditSubmitting(false);
      }
    } else {
      // Create mode: use standard create flow
      await submitListing();
    }
  }, [editMode, onEditSubmit, formData, listingId, onSuccess, onClose, submitListing]);

  // Handle success modal close
  const handleSuccessModalClose = useCallback(() => {
    setShowSuccessModal(false);
    handleClose();
    if (createdListing) {
      onSuccess(createdListing.id);
    }
  }, [handleClose, createdListing, onSuccess]);

  // Show success modal when listing is created
  if (createdListing && !showSuccessModal) {
    setShowSuccessModal(true);
  }

  return (
    <>
      <BizModal
        isOpen={isOpen}
        onClose={handleClose}
        title={editMode ? 'Edit Business Listing' : 'New Business Listing'}
        maxWidth="2xl"
        fullScreenMobile={true}
        closeOnBackdropClick={false}
        footer={
          showTemplateSelector ? undefined : (
            <div className="flex flex-col gap-2">
              {submitError && (
                <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                  {submitError}
                </div>
              )}
              <div className="flex justify-end gap-3 items-center">
                <BizModalButton
                  variant="secondary"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </BizModalButton>
                {/* Save as Draft — available in both create and edit mode */}
                <DraftSaveButton
                  formData={formData}
                  tierLimits={tierLimits}
                  editMode={editMode}
                  listingId={listingId}
                  disabled={isSubmitting}
                  onDraftSaved={(savedId) => {
                    handleClose();
                    onDraftSaved?.(savedId);
                  }}
                />
                <BizModalButton
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={!isFormValid || isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : editMode ? 'Save Changes' : 'Create Listing'}
                </BizModalButton>
              </div>
            </div>
          )
        }
      >
      {/* Template Selector — shown in create mode before Section 1 */}
      {showTemplateSelector ? (
        <ListingTemplateSelector
          onSelectTemplate={handleSelectTemplate}
          onSkip={handleSkipTemplate}
          isVisible={showTemplateSelector}
        />
      ) : (
        <>
      {/* Section 1: Membership */}
      <SectionAccordion
        sectionNumber={1}
        title={SECTIONS[0].title}
        required={SECTIONS[0].required}
        isExpanded={isSectionExpanded(1)}
        hasError={hasSectionError(1)}
        isComplete={isSectionComplete(1)}
        onToggle={() => toggleSection(1)}
      >
        <Section1Membership
          selectedTier={formData.tier}
          selectedAddons={formData.selectedAddons}
          isMockListing={formData.isMockListing}
          assignedUser={formData.assignedUser}
          onTierChange={setTier}
          onAddonToggle={toggleAddon}
          onMockToggle={(value) => updateField('isMockListing', value)}
          onAssignedUserChange={(user) => updateField('assignedUser', user)}
          userRole={userRole}
          tierLimits={tierLimits}
        />
      </SectionAccordion>

      {/* Section 2: Basic Information */}
      <SectionAccordion
        sectionNumber={2}
        title={SECTIONS[1].title}
        required={SECTIONS[1].required}
        isExpanded={isSectionExpanded(2)}
        hasError={hasSectionError(2)}
        isComplete={isSectionComplete(2)}
        onToggle={() => toggleSection(2)}
      >
        <Section2BasicInfo
          formData={formData}
          onUpdateField={updateField}
          onUpdateSection={updateSection}
          tier={formData.tier}
          tierLimits={tierLimits}
        />
      </SectionAccordion>

      {/* Section 3: Hours of Operation */}
      <SectionAccordion
        sectionNumber={3}
        title={SECTIONS[2].title}
        required={SECTIONS[2].required}
        isExpanded={isSectionExpanded(3)}
        hasError={hasSectionError(3)}
        isComplete={isSectionComplete(3)}
        onToggle={() => toggleSection(3)}
      >
        <Section3Hours
          formData={formData}
          onUpdateField={updateField}
          onUpdateSection={updateSection}
        />
      </SectionAccordion>

      {/* Section 4: Contact Information */}
      <SectionAccordion
        sectionNumber={4}
        title={SECTIONS[3].title}
        required={SECTIONS[3].required}
        isExpanded={isSectionExpanded(4)}
        hasError={hasSectionError(4)}
        isComplete={isSectionComplete(4)}
        onToggle={() => toggleSection(4)}
      >
        <Section4Contact
          formData={formData}
          onUpdateField={updateField}
          onUpdateSection={updateSection}
          tier={formData.tier}
        />
      </SectionAccordion>

      {/* Section 5: Media Uploads */}
      <SectionAccordion
        sectionNumber={5}
        title={SECTIONS[4].title}
        required={SECTIONS[4].required}
        isExpanded={isSectionExpanded(5)}
        hasError={hasSectionError(5)}
        isComplete={isSectionComplete(5)}
        onToggle={() => toggleSection(5)}
      >
        <Section5Media
          formData={formData}
          onUpdateField={updateField}
          onUpdateSection={updateSection}
          tier={formData.tier}
          tierLimits={tierLimits}
        />
      </SectionAccordion>

      {/* Section 6: SEO Information */}
      <SectionAccordion
        sectionNumber={6}
        title={SECTIONS[5].title}
        required={SECTIONS[5].required}
        isExpanded={isSectionExpanded(6)}
        hasError={hasSectionError(6)}
        isComplete={isSectionComplete(6)}
        onToggle={() => toggleSection(6)}
      >
        <Section6SEO
          formData={formData}
          onUpdateField={updateField}
          onUpdateSection={updateSection}
        />
      </SectionAccordion>

      {/* Section 7: Role & Authorization */}
      <SectionAccordion
        sectionNumber={7}
        title={SECTIONS[6].title}
        required={SECTIONS[6].required}
        isExpanded={isSectionExpanded(7)}
        hasError={hasSectionError(7)}
        isComplete={isSectionComplete(7)}
        onToggle={() => toggleSection(7)}
      >
        <Section7Role
          formData={formData}
          onUpdateField={updateField}
          onUpdateSection={updateSection}
        />
      </SectionAccordion>
        </>
      )}
    </BizModal>

      {/* Success Modal */}
      {createdListing && (
        <ListingSuccessModal
          isOpen={showSuccessModal}
          onClose={handleSuccessModalClose}
          listingId={createdListing.id}
          listingSlug={createdListing.slug}
          listingName={createdListing.name}
          requiresApproval={formData.userRole === 'user'}
        />
      )}
    </>
  );
}
