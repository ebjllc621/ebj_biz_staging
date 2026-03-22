/**
 * useCategoryDragDrop - Drag and Drop Hook for Category Management
 *
 * @authority CLAUDE.md - Build Map v2.1 compliance
 * @tier STANDARD
 * @phase Phase 3 - Section 2 Basic Information
 *
 * FEATURES:
 * - Drag-and-drop between active and bank zones
 * - Tier-based limits enforcement
 * - Parent category auto-selection
 */

'use client';

import { useState, useCallback } from 'react';
import type { Category } from '../../../../types/listing-form.types';

// ============================================================================
// TYPES
// ============================================================================

export interface UseCategoryDragDropProps {
  activeCategories: Category[];
  bankCategories: Category[];
  onUpdateCategories: (_active: Category[], _bank: Category[]) => void;
  activeCategoryLimit: number;
  totalCategoryLimit: number;
}

// ============================================================================
// HOOK
// ============================================================================

export function useCategoryDragDrop({
  activeCategories,
  bankCategories,
  onUpdateCategories,
  activeCategoryLimit,
  totalCategoryLimit
}: UseCategoryDragDropProps) {
  const [draggedCategory, setDraggedCategory] = useState<Category | null>(null);
  const [draggedFrom, setDraggedFrom] = useState<'active' | 'bank' | null>(null);

  // Handle drag start
  const handleDragStart = useCallback((category: Category, zone: 'active' | 'bank') => {
    setDraggedCategory(category);
    setDraggedFrom(zone);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedCategory(null);
    setDraggedFrom(null);
  }, []);

  // Handle drop in active zone
  const handleDropInActive = useCallback(() => {
    if (!draggedCategory || !draggedFrom) return;

    if (draggedFrom === 'bank') {
      // Moving from bank to active
      if (activeCategories.length >= activeCategoryLimit) {
        // At limit, cannot add more
        handleDragEnd();
        return;
      }

      const newActive = [...activeCategories, draggedCategory];
      const newBank = bankCategories.filter(c => c.id !== draggedCategory.id);
      onUpdateCategories(newActive, newBank);
    }

    handleDragEnd();
  }, [draggedCategory, draggedFrom, activeCategories, bankCategories, activeCategoryLimit, onUpdateCategories, handleDragEnd]);

  // Handle drop in bank zone
  const handleDropInBank = useCallback(() => {
    if (!draggedCategory || !draggedFrom) return;

    if (draggedFrom === 'active') {
      // Moving from active to bank
      const newActive = activeCategories.filter(c => c.id !== draggedCategory.id);
      const newBank = [...bankCategories, draggedCategory];
      onUpdateCategories(newActive, newBank);
    }

    handleDragEnd();
  }, [draggedCategory, draggedFrom, activeCategories, bankCategories, onUpdateCategories, handleDragEnd]);

  // Remove category from active zone
  const removeFromActive = useCallback((categoryId: number) => {
    const category = activeCategories.find(c => c.id === categoryId);
    if (!category) return;

    const newActive = activeCategories.filter(c => c.id !== categoryId);
    const newBank = [...bankCategories, category];
    onUpdateCategories(newActive, newBank);
  }, [activeCategories, bankCategories, onUpdateCategories]);

  // Remove category from bank zone
  const removeFromBank = useCallback((categoryId: number) => {
    const newBank = bankCategories.filter(c => c.id !== categoryId);
    onUpdateCategories(activeCategories, newBank);
  }, [activeCategories, bankCategories, onUpdateCategories]);

  // Add category to active (from search)
  const addToActive = useCallback((category: Category) => {
    // Check if already in active or bank
    const inActive = activeCategories.find(c => c.id === category.id);
    const inBank = bankCategories.find(c => c.id === category.id);

    if (inActive) return; // Already in active

    // Check total limit
    const totalCategories = activeCategories.length + bankCategories.length;
    if (totalCategories >= totalCategoryLimit) {
      return; // At total limit
    }

    if (inBank) {
      // Move from bank to active if there's room
      if (activeCategories.length >= activeCategoryLimit) {
        return; // Active zone is full
      }
      const newActive = [...activeCategories, category];
      const newBank = bankCategories.filter(c => c.id !== category.id);
      onUpdateCategories(newActive, newBank);
    } else {
      // Add new category
      if (activeCategories.length < activeCategoryLimit) {
        // Add to active if there's room
        const newActive = [...activeCategories, category];
        onUpdateCategories(newActive, bankCategories);
      } else {
        // Add to bank if active is full
        const newBank = [...bankCategories, category];
        onUpdateCategories(activeCategories, newBank);
      }
    }
  }, [activeCategories, bankCategories, activeCategoryLimit, totalCategoryLimit, onUpdateCategories]);

  // Check if category is already selected
  const isCategorySelected = useCallback((categoryId: number): boolean => {
    return activeCategories.some(c => c.id === categoryId) ||
           bankCategories.some(c => c.id === categoryId);
  }, [activeCategories, bankCategories]);

  return {
    draggedCategory,
    draggedFrom,
    handleDragStart,
    handleDragEnd,
    handleDropInActive,
    handleDropInBank,
    removeFromActive,
    removeFromBank,
    addToActive,
    isCategorySelected
  };
}
