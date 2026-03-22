/**
 * ListingTemplateSelector - Industry template picker for listing creation flow
 *
 * GOVERNANCE COMPLIANCE:
 * - 'use client' directive (client component)
 * - credentials: 'include' on all fetch calls
 * - ErrorBoundary wrapper (STANDARD tier)
 * - Fetches from /api/listings/templates (public endpoint)
 *
 * @authority Phase 4C Brain Plan - 4.3 + 4.18 ListingTemplateSelector
 * @tier STANDARD
 */

'use client';

import { useState, useEffect } from 'react';
import { Plus, Store, ShoppingBag, Briefcase, Home, Heart, Car, Scissors, Dumbbell, Building, Code, GraduationCap, Music, Layout } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import type { ListingTemplate } from '@core/services/ListingTemplateService';

// ============================================================================
// Types
// ============================================================================

interface ListingTemplateSelectorProps {
  /** Called when user selects a template — provides template object for form pre-fill */
  onSelectTemplate: (template: ListingTemplate) => void;
  /** Called when user chooses "Start from Scratch" (no template) */
  onSkip: () => void;
  /** Whether this selector is currently visible */
  isVisible: boolean;
}

// ============================================================================
// Industry icon map
// ============================================================================

const INDUSTRY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  restaurant: Store,
  retail: ShoppingBag,
  professional_services: Briefcase,
  home_services: Home,
  healthcare: Heart,
  automotive: Car,
  beauty_salon: Scissors,
  fitness: Dumbbell,
  real_estate: Building,
  technology: Code,
  education: GraduationCap,
  entertainment: Music,
  custom: Layout,
};

const INDUSTRY_LABELS: Record<string, string> = {
  restaurant: 'Restaurant',
  retail: 'Retail',
  professional_services: 'Professional Services',
  home_services: 'Home Services',
  healthcare: 'Healthcare',
  automotive: 'Automotive',
  beauty_salon: 'Beauty & Salon',
  fitness: 'Fitness',
  real_estate: 'Real Estate',
  technology: 'Technology',
  education: 'Education',
  entertainment: 'Entertainment',
  custom: 'Custom',
};

// ============================================================================
// Skeleton card component
// ============================================================================

function SkeletonCard() {
  return (
    <div className="border border-gray-200 rounded-lg p-4 animate-pulse">
      <div className="w-10 h-10 bg-gray-200 rounded-lg mb-3" />
      <div className="h-4 bg-gray-200 rounded mb-2 w-3/4" />
      <div className="h-3 bg-gray-200 rounded mb-4 w-1/3" />
      <div className="h-3 bg-gray-200 rounded mb-1" />
      <div className="h-3 bg-gray-200 rounded w-2/3 mb-4" />
      <div className="h-8 bg-gray-200 rounded w-full" />
    </div>
  );
}

// ============================================================================
// Template card component
// ============================================================================

interface TemplateCardProps {
  template: ListingTemplate;
  onSelect: (template: ListingTemplate) => void;
}

function TemplateCard({ template, onSelect }: TemplateCardProps) {
  const IconComponent: React.ComponentType<{ className?: string }> =
    (template.icon ? INDUSTRY_ICONS[template.icon] : null) ??
    INDUSTRY_ICONS[template.industry] ??
    Layout;

  const industryLabel = INDUSTRY_LABELS[template.industry] ?? template.industry;

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-orange-400 hover:shadow-sm transition-all flex flex-col">
      <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center mb-3 flex-shrink-0">
        <IconComponent className="w-5 h-5 text-orange-600" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">{template.name}</h3>
      <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full mb-2 w-fit">
        {industryLabel}
      </span>
      {template.description && (
        <p className="text-xs text-gray-500 mb-3 flex-1 line-clamp-2">{template.description}</p>
      )}
      <button
        type="button"
        onClick={() => onSelect(template)}
        className="mt-auto w-full px-3 py-2 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
      >
        Use Template
      </button>
    </div>
  );
}

// ============================================================================
// Scratch card (always first)
// ============================================================================

interface ScratchCardProps {
  onSkip: () => void;
}

function ScratchCard({ onSkip }: ScratchCardProps) {
  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-orange-400 hover:shadow-sm transition-all flex flex-col">
      <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center mb-3 flex-shrink-0">
        <Plus className="w-5 h-5 text-gray-500" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Start from Scratch</h3>
      <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full mb-2 w-fit">
        Blank slate
      </span>
      <p className="text-xs text-gray-500 mb-3 flex-1">
        Build your listing with full control over every field. No pre-filled content.
      </p>
      <button
        type="button"
        onClick={onSkip}
        className="mt-auto w-full px-3 py-2 text-sm font-medium bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
      >
        Start Blank
      </button>
    </div>
  );
}

// ============================================================================
// Main component (inner — wrapped by ErrorBoundary)
// ============================================================================

function ListingTemplateSelectorInner({ onSelectTemplate, onSkip, isVisible }: ListingTemplateSelectorProps) {
  const [templates, setTemplates] = useState<ListingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isVisible) return;

    let cancelled = false;

    async function fetchTemplates() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/listings/templates', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load templates');
        const json = await res.json();
        if (!cancelled) {
          setTemplates(json.data?.templates ?? []);
        }
      } catch {
        if (!cancelled) setError('Could not load templates. You can start from scratch.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTemplates();
    return () => { cancelled = true; };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="px-1 py-2">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Choose a Template</h2>
        <p className="text-sm text-gray-500 mt-1">
          Pick an industry template to get started quickly, or start from scratch.
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {/* "Start from Scratch" is always first */}
        <ScratchCard onSkip={onSkip} />

        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={onSelectTemplate}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Exported component with ErrorBoundary
// ============================================================================

export function ListingTemplateSelector(props: ListingTemplateSelectorProps) {
  return (
    <ErrorBoundary>
      <ListingTemplateSelectorInner {...props} />
    </ErrorBoundary>
  );
}
