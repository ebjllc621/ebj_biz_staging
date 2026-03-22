/**
 * ListingQuickActions - Quick Action Grid for Listings
 *
 * @description Grid of 6 common listing management actions
 * @component Client Component
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 6 - Listing Manager Dashboard
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_6_BRAIN_PLAN.md
 * @reference src/features/dashboard/components/DashboardQuickActions.tsx
 *
 * Phase 1B: Added "Share Listing" quick action with ListingShareModal trigger.
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - Uses ListingContext for selectedListingId
 * - Construction icon for "Coming Soon" unimplemented pages
 * - Orange theme consistent with listing manager routes
 *
 * USAGE:
 * Rendered in ListingManagerDashboard below stats grid for quick navigation.
 */
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { Route } from 'next';
import { Edit, Images, Calendar, Tag, MessageSquare, BarChart3, Construction, Briefcase, UserPlus, Megaphone, Share2, Copy, ChevronDown } from 'lucide-react';
import { useListingContext } from '@features/dashboard/context/ListingContext';
import type { KpiColorMode } from './ListingStatCard';

// Dynamic import: MediaManagerLiteModal triggers useUniversalMedia → MediaService →
// LocalMediaProvider → sharp (Node.js-only). Using ssr: false prevents sharp from
// being bundled into the client-side webpack output.
const MediaManagerLiteModal = dynamic(
  () => import('@features/media/lite/components/MediaManagerLiteModal').then(
    (mod) => mod.MediaManagerLiteModal
  ),
  { ssr: false }
);

// Dynamic import: ListingShareModal uses browser APIs (clipboard, window.open)
const ListingShareModal = dynamic(
  () => import('@features/listings/components/ListingShareModal').then(
    (mod) => mod.ListingShareModal
  ),
  { ssr: false }
);

// Dynamic import: DuplicateListingModal uses fetchWithCsrf and browser state
const DuplicateListingModal = dynamic(
  () => import('@features/dashboard/components/managers/DuplicateListingModal').then(
    (mod) => ({ default: mod.DuplicateListingModal })
  ),
  { ssr: false }
);

interface QuickAction {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string | null; // null for "Coming Soon" or modal-triggered actions
  color: string;
  onClick?: () => void; // Optional click handler for modal-triggered actions
}

/**
 * ListingQuickActions Component
 *
 * Displays grid of quick action buttons for common listing management tasks.
 * Uses selectedListingId and selectedListing from context to populate hrefs dynamically.
 *
 * @returns Quick actions grid
 *
 * @example
 * ```tsx
 * <ListingQuickActions />
 * ```
 */
export function ListingQuickActions() {
  const { selectedListingId, selectedListing } = useListingContext();
  const [showMediaManager, setShowMediaManager] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [colorMode, setColorMode] = useState<KpiColorMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('bk_qa_color_mode') as KpiColorMode) || 'default';
    }
    return 'default';
  });
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);

  const handleColorModeChange = (mode: KpiColorMode) => {
    setColorMode(mode);
    localStorage.setItem('bk_qa_color_mode', mode);
  };

  // Define actions with dynamic hrefs
  const actions: QuickAction[] = [
    {
      title: 'Edit Listing',
      description: 'Update listing details',
      icon: Edit,
      href: selectedListingId ? `/dashboard/listings/${selectedListingId}/edit` : null,
      color: 'orange'
    },
    {
      title: 'Media Manager',
      description: 'Manage all listing media',
      icon: Images,
      href: null, // Modal trigger
      color: 'purple',
      onClick: selectedListingId ? () => setShowMediaManager(true) : undefined
    },
    {
      title: 'Share Listing',
      description: 'Share on social media',
      icon: Share2,
      href: null, // Modal trigger
      color: 'green',
      onClick: selectedListingId ? () => setShowShareModal(true) : undefined
    },
    {
      title: 'Create Event',
      description: 'Add a new event',
      icon: Calendar,
      href: selectedListingId ? `/dashboard/listings/${selectedListingId}/events?create=true` : null,
      color: 'blue'
    },
    {
      title: 'Create Offer',
      description: 'Set up a special offer',
      icon: Tag,
      href: selectedListingId ? `/dashboard/listings/${selectedListingId}/offers?create=true` : null,
      color: 'green'
    },
    {
      title: 'View Messages',
      description: 'Check customer inquiries',
      icon: MessageSquare,
      href: selectedListingId ? `/dashboard/listings/${selectedListingId}/bizwire` : null,
      color: 'blue'
    },
    {
      title: 'View Analytics',
      description: 'See performance data',
      icon: BarChart3,
      href: selectedListingId ? `/dashboard/listings/${selectedListingId}/analytics` : null,
      color: 'purple'
    },
    {
      title: 'Create Job Posting',
      description: 'Post a new job opening',
      icon: Briefcase,
      href: selectedListingId ? `/dashboard/listings/${selectedListingId}/jobs?create=true` : null,
      color: 'orange'
    },
    {
      title: 'Collect Leads',
      description: 'Capture customer interest',
      icon: UserPlus,
      href: null,
      color: 'green'
    },
    {
      title: 'Manage Featured Campaigns',
      description: 'Run and track featured campaigns',
      icon: Megaphone,
      href: selectedListingId ? `/dashboard/listings/${selectedListingId}/jobs/campaigns` : null,
      color: 'blue'
    },
    {
      title: 'Duplicate Listing',
      description: 'Create a draft copy of this listing',
      icon: Copy,
      href: null, // Modal trigger
      color: 'purple',
      onClick: selectedListingId ? () => setShowDuplicateModal(true) : undefined
    }
  ];

  // Separate card bg/border from icon colors so color mode can override card only
  const cardStyles = {
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', hover: 'hover:bg-orange-100' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', hover: 'hover:bg-purple-100' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', hover: 'hover:bg-blue-100' },
    green: { bg: 'bg-green-50', border: 'border-green-200', hover: 'hover:bg-green-100' }
  };

  const iconColors = {
    orange: 'text-orange-600',
    purple: 'text-purple-600',
    blue: 'text-blue-600',
    green: 'text-green-600'
  };

  const iconBorderColors = {
    orange: 'border-orange-200',
    purple: 'border-purple-200',
    blue: 'border-blue-200',
    green: 'border-green-200'
  };

  // Color mode overrides for card bg/border (icons unchanged)
  const colorModeOverrides: Record<KpiColorMode, { bg: string; border: string; hover: string } | null> = {
    default: null,
    option1: { bg: 'bg-gray-100', border: 'border-gray-500', hover: 'hover:bg-gray-200' },
    option2: { bg: 'bg-[#e8edf2]', border: 'border-[#002641]', hover: 'hover:bg-[#dce3eb]' },
    option3: { bg: 'bg-[#fdf0ec]', border: 'border-[#ed6437]', hover: 'hover:bg-[#fbe4dc]' },
    option4: { bg: 'bg-[#e8edf2]', border: 'border-[#ed6437]', hover: 'hover:bg-[#dce3eb]' },
  };

  return (
    <section aria-labelledby="quick-actions-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 id="quick-actions-heading" className="text-xl font-semibold text-gray-900">
          Quick Actions
        </h2>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((action) => {
          const Icon = action.icon;
          const colorKey = action.color as keyof typeof cardStyles;
          const defaultCard = cardStyles[colorKey];
          const override = colorModeOverrides[colorMode];
          const cardBg = override?.bg ?? defaultCard.bg;
          const cardBorder = override?.border ?? defaultCard.border;
          const cardHover = override?.hover ?? defaultCard.hover;
          const iconColor = iconColors[colorKey];
          const iconBorder = iconBorderColors[colorKey];
          // An action is "coming soon" only if it has no href AND no onClick handler
          const isComingSoon = action.href === null && !action.onClick;
          const isModalTrigger = action.href === null && !!action.onClick;

          const content = (
            <div
              className={`
                relative p-6 rounded-xl border transition-all duration-200
                ${cardBg} ${cardBorder} ${cardHover} ${iconColor}
                ${isComingSoon ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg bg-white border ${iconBorder}`}>
                  {isComingSoon ? (
                    <Construction className="w-6 h-6 text-gray-400" />
                  ) : (
                    <Icon className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {action.title}
                    {isComingSoon && (
                      <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        Coming Soon
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </div>
            </div>
          );

          // Link-based navigation
          if (action.href && !isComingSoon) {
            return (
              <Link key={action.title} href={action.href as Route}>
                {content}
              </Link>
            );
          }

          // Modal-trigger button
          if (isModalTrigger && action.onClick) {
            return (
              <button
                key={action.title}
                type="button"
                onClick={action.onClick}
                className="text-left w-full"
              >
                {content}
              </button>
            );
          }

          // Coming soon (non-interactive)
          return <div key={action.title}>{content}</div>;
        })}
      </div>

      {/* Media Manager Modal */}
      {selectedListingId && (
        <MediaManagerLiteModal
          isOpen={showMediaManager}
          onClose={() => setShowMediaManager(false)}
          listingId={selectedListingId}
        />
      )}

      {/* Share Listing Modal */}
      {selectedListing && (
        <ListingShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          listing={{
            id: selectedListing.id,
            slug: selectedListing.slug,
            name: selectedListing.name,
            image: selectedListing.logo_url ?? undefined,
          }}
          context="share"
        />
      )}

      {/* Duplicate Listing Modal */}
      {selectedListing && selectedListingId && (
        <DuplicateListingModal
          isOpen={showDuplicateModal}
          onClose={() => setShowDuplicateModal(false)}
          sourceListingId={selectedListingId}
          sourceListingName={selectedListing.name}
          sourceListingSlug={selectedListing.slug}
          onSuccess={() => {
            setShowDuplicateModal(false);
          }}
        />
      )}
    </section>
  );
}

export default ListingQuickActions;
