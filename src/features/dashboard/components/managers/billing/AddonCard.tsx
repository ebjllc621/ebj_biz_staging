/**
 * AddonCard - Individual Add-on Display Card
 *
 * @tier SIMPLE
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * Shows add-on details with add/remove action
 */
'use client';

import React from 'react';
import type { AddonSuite } from '@features/dashboard/types';
import { Check, Plus, X } from 'lucide-react';

export interface AddonCardProps {
  /** Add-on data */
  addon: AddonSuite;
  /** Whether addon is currently active */
  isActive: boolean;
  /** Add callback */
  onAdd: (addon: AddonSuite) => void;
  /** Remove callback */
  onRemove: (addon: AddonSuite) => void;
  /** Loading state */
  isLoading?: boolean;
}

export function AddonCard({
  addon,
  isActive,
  onAdd,
  onRemove,
  isLoading = false
}: AddonCardProps) {
  return (
    <div
      className={`
        bg-white rounded-lg border-2 p-6 transition-all
        ${isActive ? 'border-green-500 shadow-md' : 'border-gray-200'}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">{addon.display_name}</h4>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold text-gray-900">
              ${addon.pricing_monthly?.toFixed(2)}
            </span>
            <span className="text-sm text-gray-600">/month</span>
          </div>
        </div>
        {isActive && (
          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            <Check className="w-3 h-3" />
            Active
          </div>
        )}
      </div>

      {/* Features */}
      <div className="space-y-2 mb-6">
        {addon.features.map((feature, index) => (
          <div key={index} className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-gray-700">{feature}</span>
          </div>
        ))}
      </div>

      {/* Action Button */}
      <button
        type="button"
        onClick={() => (isActive ? onRemove(addon) : onAdd(addon))}
        disabled={isLoading}
        className={`
          w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2
          ${
            isActive
              ? 'bg-white text-red-700 border-2 border-red-300 hover:bg-red-50'
              : 'bg-orange-600 text-white hover:bg-orange-700'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {isLoading ? (
          'Processing...'
        ) : isActive ? (
          <>
            <X className="w-4 h-4" />
            Remove Add-on
          </>
        ) : (
          <>
            <Plus className="w-4 h-4" />
            Add to Subscription
          </>
        )}
      </button>
    </div>
  );
}

export default AddonCard;
