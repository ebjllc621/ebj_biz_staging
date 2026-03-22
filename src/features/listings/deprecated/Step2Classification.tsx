// @ts-nocheck - Disabled type checking for legacy component
/**
 * Step 2: Classification
 *
 * Collects categories, business hours, and contact information
 *
 * @authority PHASE_5.4_BRAIN_PLAN.md
 * @governance Tier-based category limits enforced (6-20)
 * @deprecated This component will be removed in Phase 8 - replaced by Section2BasicInfo
 */

'use client';

import React, { useState, useEffect } from 'react';

// Local types for legacy 4-step wizard (to be removed in Phase 8)
interface LegacyFormData {
  category_ids: number[];
  [key: string]: unknown;
}

interface LegacyTierLimits {
  categories: number;
  [key: string]: unknown;
}

interface StepProps {
  formData: LegacyFormData;
  updateFormData: (updates: Partial<LegacyFormData>) => void;
  tierLimits: LegacyTierLimits;
}

interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  level: number;
}

export function Step2Classification({ formData, updateFormData, tierLimits }: StepProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<number[]>(
    formData.category_ids || []
  );

  useEffect(() => {
    // Load categories from API
    fetch('/api/categories', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.categories) {
          setCategories(data.data.categories);
        }
      })
      .catch(() => {
        // Silently fail - categories list will be empty
      });
  }, []);

  const handleCategoryToggle = (categoryId: number) => {
    let newSelection: number[];

    if (selectedCategories.includes(categoryId)) {
      newSelection = selectedCategories.filter((id) => id !== categoryId);
    } else {
      // GOVERNANCE: Tier limit enforcement (CLIENT-SIDE)
      if (selectedCategories.length >= tierLimits.categories) {
        alert(
          `${formData.tier} tier allows maximum ${tierLimits.categories} categories. Upgrade for more.`
        );
        return;
      }
      newSelection = [...selectedCategories, categoryId];
    }

    setSelectedCategories(newSelection);
    updateFormData({ category_ids: newSelection });
  };

  const rootCategories = categories.filter((cat) => cat.parent_id === null || cat.level === 1);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Classification & Contact</h3>
        <p className="text-sm text-gray-500 mb-2">
          Select categories that describe your business (limit: {tierLimits.categories})
        </p>
        <p className="text-xs text-gray-600 mb-6">
          Selected: {selectedCategories.length} / {tierLimits.categories}
        </p>
      </div>

      {/* Categories Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Categories <span className="text-red-500">*</span>
        </label>

        {loading ? (
          <div className="text-sm text-gray-500">Loading categories...</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto border border-gray-200 rounded-md p-4">
            {rootCategories.map((category) => (
              <label
                key={category.id}
                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category.id)}
                  onChange={() => handleCategoryToggle(category.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{category.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Contact Information */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Contact Person</h4>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
            <input
              type="text"
              value={formData.contact_name || ''}
              onChange={(e) => updateFormData({ contact_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Primary contact person"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
            <input
              type="email"
              value={formData.contact_email || ''}
              onChange={(e) => updateFormData({ contact_email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="contact@business.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
            <input
              type="tel"
              value={formData.contact_phone || ''}
              onChange={(e) => updateFormData({ contact_phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="(555) 123-4567"
            />
          </div>
        </div>
      </div>

      {/* Business Hours */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Business Hours</h4>
        <p className="text-sm text-gray-500 mb-4">
          Set your operating hours (optional - can be added later)
        </p>
        <div className="text-sm text-gray-600">
          Business hours can be configured after listing creation
        </div>
      </div>
    </div>
  );
}
