// @ts-nocheck - Disabled type checking for legacy component
/**
 * Step 1: Basic Details
 *
 * Collects basic listing information: name, type, year established, employees, revenue
 *
 * @authority PHASE_5.4_BRAIN_PLAN.md
 * @deprecated This component will be removed in Phase 8 - replaced by Section2BasicInfo
 */

'use client';

import React from 'react';

// Local types for legacy 4-step wizard (to be removed in Phase 8)
interface LegacyFormData {
  name: string;
  type: string | number;
  year_established?: number;
  employee_count?: number;
  annual_revenue?: number;
  [key: string]: unknown;
}

interface StepProps {
  formData: LegacyFormData;
  updateFormData: (updates: Partial<LegacyFormData>) => void;
}

const businessTypes = [
  'Business',
  'Non-Profit',
  'Government',
  'Religious',
  'Educational',
  'Healthcare',
  'Professional Services',
  'Retail',
  'Restaurant',
  'Entertainment'
];

export function Step1BasicDetails({ formData, updateFormData }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
        <p className="text-sm text-gray-500 mb-6">
          Enter the basic details about your business or organization.
        </p>
      </div>

      {/* Business Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Business Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => updateFormData({ name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter business name"
          required
        />
      </div>

      {/* Business Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Business Type <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.type}
          onChange={(e) => updateFormData({ type: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          required
        >
          <option value="">Select a type</option>
          {businessTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* Year Established */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Year Established
        </label>
        <input
          type="number"
          value={formData.year_established || ''}
          onChange={(e) =>
            updateFormData({
              year_established: e.target.value ? parseInt(e.target.value, 10) : undefined
            })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., 2020"
          min="1800"
          max={new Date().getFullYear()}
        />
      </div>

      {/* Employee Count */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Number of Employees
        </label>
        <select
          value={formData.employee_count || ''}
          onChange={(e) =>
            updateFormData({
              employee_count: e.target.value ? parseInt(e.target.value, 10) : undefined
            })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select range</option>
          <option value="1">1-10</option>
          <option value="11">11-50</option>
          <option value="51">51-200</option>
          <option value="201">201-500</option>
          <option value="501">500+</option>
        </select>
      </div>

      {/* Annual Revenue */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Annual Revenue
        </label>
        <select
          value={formData.annual_revenue || ''}
          onChange={(e) =>
            updateFormData({
              annual_revenue: e.target.value ? parseInt(e.target.value, 10) : undefined
            })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select range</option>
          <option value="1">Under $100K</option>
          <option value="100001">$100K - $500K</option>
          <option value="500001">$500K - $1M</option>
          <option value="1000001">$1M - $5M</option>
          <option value="5000001">$5M+</option>
        </select>
      </div>
    </div>
  );
}
