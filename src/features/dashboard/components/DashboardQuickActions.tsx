/**
 * DashboardQuickActions - Quick Action Grid
 *
 * @tier SIMPLE
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 * @reference src/features/homepage/components/AuthenticatedHomeView.tsx
 */
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import {
  Building2,
  FileEdit,
  PlusCircle,
  Shield,
  BarChart3,
  Puzzle,
  ChevronDown,
  Megaphone
} from 'lucide-react';
import type { KpiColorMode } from './ListingStatCard';

export interface DashboardQuickActionsProps {
  /** Optional className */
  className?: string;
  /** Callback when Privacy Settings is clicked (opens modal instead of navigation) */
  onPrivacySettingsClick?: () => void;
  /** Callback when Create Listing is clicked (opens NewListingModal) */
  onCreateListingClick?: () => void;
  /** Callback when Manage Listings is clicked (expands listing manager sidebar + navigates) */
  onManageListingsClick?: () => void;
  /** Callback when Post a Gig is clicked (opens CommunityGigForm modal) */
  onPostGigClick?: () => void;
}

interface QuickAction {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    key: 'create-listing',
    label: 'Create Listing',
    href: '/listings/create',
    icon: PlusCircle,
    color: 'orange'
  },
  {
    key: 'privacy',
    label: 'Privacy Settings',
    href: '/settings/privacy',
    icon: Shield,
    color: 'gray'
  },
  {
    key: 'listings',
    label: 'Manage Listings',
    href: '/dashboard/listings',
    icon: Building2,
    color: 'green'
  },
  {
    key: 'content',
    label: 'Create Content',
    href: '/content/create',
    icon: FileEdit,
    color: 'blue'
  },
  {
    key: 'analytics',
    label: 'Profile Analytics',
    href: '/analytics',
    icon: BarChart3,
    color: 'purple'
  },
  {
    key: 'post-gig',
    label: 'Post a Gig',
    href: '/jobs',
    icon: Megaphone,
    color: 'green'
  },
  {
    key: 'plugins',
    label: 'AI Plugins',
    href: '/plugins',
    icon: Puzzle,
    color: 'indigo'
  }
];

const cardStyles: Record<string, { bg: string; border: string; hover: string }> = {
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', hover: 'hover:bg-orange-100' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', hover: 'hover:bg-blue-100' },
  green: { bg: 'bg-green-50', border: 'border-green-200', hover: 'hover:bg-green-100' },
  gray: { bg: 'bg-gray-50', border: 'border-gray-200', hover: 'hover:bg-gray-100' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', hover: 'hover:bg-purple-100' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', hover: 'hover:bg-indigo-100' }
};

const iconColors: Record<string, string> = {
  orange: 'text-orange-700',
  blue: 'text-blue-700',
  green: 'text-green-700',
  gray: 'text-gray-700',
  purple: 'text-purple-700',
  indigo: 'text-indigo-700'
};

const colorModeOverrides: Record<KpiColorMode, { bg: string; border: string; hover: string } | null> = {
  default: null,
  option1: { bg: 'bg-gray-100', border: 'border-gray-500', hover: 'hover:bg-gray-200' },
  option2: { bg: 'bg-[#e8edf2]', border: 'border-[#002641]', hover: 'hover:bg-[#dce3eb]' },
  option3: { bg: 'bg-[#fdf0ec]', border: 'border-[#ed6437]', hover: 'hover:bg-[#fbe4dc]' },
  option4: { bg: 'bg-[#e8edf2]', border: 'border-[#ed6437]', hover: 'hover:bg-[#dce3eb]' },
};

export function DashboardQuickActions({ className = '', onPrivacySettingsClick, onCreateListingClick, onManageListingsClick, onPostGigClick }: DashboardQuickActionsProps) {
  const [colorMode, setColorMode] = useState<KpiColorMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('bk_dash_qa_color_mode') as KpiColorMode) || 'default';
    }
    return 'default';
  });
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);

  const handleColorModeChange = (mode: KpiColorMode) => {
    setColorMode(mode);
    localStorage.setItem('bk_dash_qa_color_mode', mode);
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        {/* View Options Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)}
            onBlur={() => setTimeout(() => setIsViewDropdownOpen(false), 150)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            View: {colorMode === 'default' ? 'Medley' : colorMode === 'option1' ? 'BizSlate' : colorMode === 'option2' ? 'BizNavy' : colorMode === 'option3' ? 'BizOrange' : 'Bizconekt'}
            <ChevronDown className={`w-4 h-4 transition-transform ${isViewDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {isViewDropdownOpen && (
            <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <button
                onClick={() => { handleColorModeChange('default'); setIsViewDropdownOpen(false); }}
                className={`w-full text-left px-4 py-2 text-sm rounded-t-lg transition-colors ${colorMode === 'default' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                Medley
              </button>
              <button
                onClick={() => { handleColorModeChange('option1'); setIsViewDropdownOpen(false); }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${colorMode === 'option1' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                BizSlate
              </button>
              <button
                onClick={() => { handleColorModeChange('option2'); setIsViewDropdownOpen(false); }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${colorMode === 'option2' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                BizNavy
              </button>
              <button
                onClick={() => { handleColorModeChange('option3'); setIsViewDropdownOpen(false); }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${colorMode === 'option3' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                BizOrange
              </button>
              <button
                onClick={() => { handleColorModeChange('option4'); setIsViewDropdownOpen(false); }}
                className={`w-full text-left px-4 py-2 text-sm rounded-b-lg transition-colors ${colorMode === 'option4' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                Bizconekt
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {quickActions.map(action => {
          const Icon = action.icon;
          const defaultCard = cardStyles[action.color] || cardStyles.gray;
          const override = colorModeOverrides[colorMode];
          const cardBg = override?.bg ?? defaultCard?.bg ?? 'bg-gray-50';
          const cardBorder = override?.border ?? defaultCard?.border ?? 'border-gray-200';
          const cardHover = override?.hover ?? defaultCard?.hover ?? 'hover:bg-gray-100';
          const iconColor = iconColors[action.color] ?? iconColors.gray;
          const baseClassName = `
            p-4 rounded-xl border transition-all duration-200
            flex flex-col items-center justify-center gap-3
            ${cardBg} ${cardBorder} ${cardHover}
          `;

          // Manage Listings uses callback to expand listing manager sidebar + navigate
          if (action.key === 'listings' && onManageListingsClick) {
            return (
              <button
                key={action.key}
                onClick={onManageListingsClick}
                className={baseClassName}
              >
                <Icon className={`w-8 h-8 ${iconColor}`} />
                <span className={`text-sm font-medium text-center ${iconColor}`}>
                  {action.label}
                </span>
              </button>
            );
          }

          // Create Listing uses callback when provided (opens modal instead of navigation)
          if (action.key === 'create-listing' && onCreateListingClick) {
            return (
              <button
                key={action.key}
                onClick={onCreateListingClick}
                className={baseClassName}
              >
                <Icon className={`w-8 h-8 ${iconColor}`} />
                <span className={`text-sm font-medium text-center ${iconColor}`}>
                  {action.label}
                </span>
              </button>
            );
          }

          // Privacy Settings uses callback when provided (opens modal instead of navigation)
          if (action.key === 'privacy' && onPrivacySettingsClick) {
            return (
              <button
                key={action.key}
                onClick={onPrivacySettingsClick}
                className={baseClassName}
              >
                <Icon className={`w-8 h-8 ${iconColor}`} />
                <span className={`text-sm font-medium text-center ${iconColor}`}>
                  {action.label}
                </span>
              </button>
            );
          }

          // Post a Gig uses callback when provided (opens CommunityGigForm modal)
          if (action.key === 'post-gig' && onPostGigClick) {
            return (
              <button
                key={action.key}
                onClick={onPostGigClick}
                className={baseClassName}
              >
                <Icon className={`w-8 h-8 ${iconColor}`} />
                <span className={`text-sm font-medium text-center ${iconColor}`}>
                  {action.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={action.key}
              href={action.href as Route}
              className={baseClassName}
            >
              <Icon className={`w-8 h-8 ${iconColor}`} />
              <span className={`text-sm font-medium text-center ${iconColor}`}>
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default DashboardQuickActions;
