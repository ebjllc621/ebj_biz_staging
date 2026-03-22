/**
 * NewListingModal - Form State Management Hook
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @pattern useReducer for complex form state
 * @tier ENTERPRISE
 * @phase Phase 1 - Foundation
 */

/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */

'use client';

import { useReducer, useCallback } from 'react';
import type { ListingFormData, AddonSuite, ListingTier } from '../../types/listing-form.types';
import { TIER_LIMITS } from '../../types/listing-form.types';
import { INITIAL_FORM_DATA } from './constants';

// ============================================================================
// ACTION TYPES
// ============================================================================

type FormAction =
  | { type: 'UPDATE_FIELD'; field: keyof ListingFormData; value: ListingFormData[keyof ListingFormData] }
  | { type: 'UPDATE_SECTION'; data: Partial<ListingFormData> }
  | { type: 'SET_TIER'; tier: ListingTier }
  | { type: 'TOGGLE_ADDON'; addon: AddonSuite }
  | { type: 'RESET_FORM' }
  | { type: 'LOAD_LISTING'; data: Partial<ListingFormData> };

// ============================================================================
// REDUCER
// ============================================================================

function formReducer(state: ListingFormData, action: FormAction): ListingFormData {
  switch (action.type) {
    case 'UPDATE_FIELD':
      return { ...state, [action.field]: action.value };

    case 'UPDATE_SECTION':
      return { ...state, ...action.data };

    case 'SET_TIER':
      return { ...state, tier: action.tier };

    case 'TOGGLE_ADDON': {
      const isSelected = state.selectedAddons.includes(action.addon);
      const selectedAddons = isSelected
        ? state.selectedAddons.filter(a => a !== action.addon)
        : [...state.selectedAddons, action.addon];
      return { ...state, selectedAddons };
    }

    case 'RESET_FORM':
      return INITIAL_FORM_DATA;

    case 'LOAD_LISTING':
      return { ...state, ...action.data };

    default:
      return state;
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useNewListingForm(editMode: boolean = false) {
  const [formData, dispatch] = useReducer(formReducer, INITIAL_FORM_DATA);

  const updateField = useCallback(<K extends keyof ListingFormData>(
    field: K,
    value: ListingFormData[K]
  ) => {
    dispatch({ type: 'UPDATE_FIELD', field, value });
  }, []);

  const updateSection = useCallback((data: Partial<ListingFormData>) => {
    dispatch({ type: 'UPDATE_SECTION', data });
  }, []);

  const setTier = useCallback((tier: ListingTier) => {
    dispatch({ type: 'SET_TIER', tier });
  }, []);

  const toggleAddon = useCallback((addon: AddonSuite) => {
    dispatch({ type: 'TOGGLE_ADDON', addon });
  }, []);

  const resetForm = useCallback(() => {
    dispatch({ type: 'RESET_FORM' });
  }, []);

  const loadListing = useCallback((data: Partial<ListingFormData>) => {
    dispatch({ type: 'LOAD_LISTING', data });
  }, []);

  const tierLimits = TIER_LIMITS[formData.tier];

  return {
    formData,
    dispatch,
    updateField,
    updateSection,
    setTier,
    toggleAddon,
    resetForm,
    loadListing,
    tierLimits
  };
}
