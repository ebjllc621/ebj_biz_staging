/**
 * Admin Layouts Page - Homepage Layout Variant Previews
 *
 * Displays 5 visual variants of the homepage as hardcoded HTML previews.
 * Each variant progressively pushes further from the base Bizconekt palette.
 *
 * @tier SIMPLE
 * @authority CLAUDE.md - Admin Development
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useAuth } from '@core/hooks/useAuth';
import { LayoutTemplate, ExternalLink, Eye, ChevronRight } from 'lucide-react';

// ============================================================================
// VARIANT DATA
// ============================================================================

interface LayoutVariant {
  id: number;
  name: string;
  slug: string;
  description: string;
  palette: string[];
  fonts: string;
  aesthetic: string;
  departure: string;
  previewUrl: string;
}

const LAYOUT_VARIANTS: LayoutVariant[] = [
  {
    id: 0,
    name: 'Base Layout',
    slug: 'current',
    description: 'The current production homepage. Navy-to-blue gradient hero, Inter font, standard card-based content sliders.',
    palette: ['#002641', '#ed6437', '#fefefe', '#8d918d'],
    fonts: 'Inter (system)',
    aesthetic: 'Clean corporate',
    departure: 'Current — baseline',
    previewUrl: '/',
  },
  {
    id: 1,
    name: 'Warm Editorial',
    slug: 'variant-1',
    description: 'Introduces Poppins & Lora typography with warm cream backgrounds. Asymmetric hero with editorial magazine feel. Restrained but refined.',
    palette: ['#002641', '#ed6437', '#faf9f5', '#e8e6dc'],
    fonts: 'Poppins + Lora',
    aesthetic: 'Editorial magazine',
    departure: 'Subtle — typography & warmth',
    previewUrl: '/layouts/variant-1.html',
  },
  {
    id: 2,
    name: 'Bold Geometry',
    slug: 'variant-2',
    description: 'Geometric shapes, angular clip-paths, crosshatch patterns. Space Mono accents with numbered features. Strong corporate-premium feel.',
    palette: ['#002641', '#ed6437', '#0d7377', '#f7f5ef'],
    fonts: 'Poppins + Space Mono',
    aesthetic: 'Geometric corporate',
    departure: 'Moderate — structure & form',
    previewUrl: '/layouts/variant-2.html',
  },
  {
    id: 3,
    name: 'Organic Flow',
    slug: 'variant-3',
    description: 'Flowing blurred blobs, pill-shaped buttons, gradient accents. DM Serif Display headings with teal & sage color expansion. Soft, modern, approachable.',
    palette: ['#002641', '#ed6437', '#2d8f8f', '#788c5d'],
    fonts: 'DM Serif Display + DM Sans',
    aesthetic: 'Organic modern',
    departure: 'Significant — color & form',
    previewUrl: '/layouts/variant-3.html',
  },
  {
    id: 4,
    name: 'Brutalist Editorial',
    slug: 'variant-4',
    description: 'Exposed grid lines, oversized serif typography, monospaced labels, row-based listings. Grain texture overlay. Paper background with sharp borders.',
    palette: ['#0a0a0a', '#ed6437', '#f5f3ed', '#ddd'],
    fonts: 'Instrument Serif + IBM Plex Mono',
    aesthetic: 'Brutalist editorial',
    departure: 'Major — layout & aesthetic',
    previewUrl: '/layouts/variant-4.html',
  },
  {
    id: 5,
    name: 'Immersive Dark',
    slug: 'variant-5',
    description: 'Full dark mode with gradient orbs, glow effects, grid-line backgrounds, and glassmorphism. Playfair Display headings with teal/blue/purple accent spectrum.',
    palette: ['#0c0c0c', '#ed6437', '#2dd4bf', '#60a5fa'],
    fonts: 'Playfair Display + Outfit',
    aesthetic: 'Dark luxury tech',
    departure: 'Maximum — full rebrand feel',
    previewUrl: '/layouts/variant-5.html',
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function AdminLayoutsPage() {
  const { user, loading } = useAuth();
  const [selectedVariant, setSelectedVariant] = useState<LayoutVariant | null>(null);

  // Auth gate
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-biz-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="p-8 text-center text-gray-500">
        Admin access required.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <LayoutTemplate className="w-6 h-6 text-biz-orange" />
          <h1 className="text-2xl font-bold text-biz-navy">Homepage Layouts</h1>
        </div>
        <p className="text-gray-500 text-sm">
          Preview and compare 5 homepage layout variants. Each design progressively departs from the base Bizconekt palette.
        </p>
      </div>

      {/* Variant Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {LAYOUT_VARIANTS.map((variant) => (
          <div
            key={variant.id}
            className={`bg-white rounded-xl border transition-all cursor-pointer group ${
              selectedVariant?.id === variant.id
                ? 'border-biz-orange shadow-lg shadow-orange-100'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
            }`}
            onClick={() => setSelectedVariant(variant)}
          >
            {/* Color palette strip */}
            <div className="flex h-2 rounded-t-xl overflow-hidden">
              {variant.palette.map((color, i) => (
                <div key={i} className="flex-1" style={{ backgroundColor: color }} />
              ))}
            </div>

            <div className="p-5">
              {/* Title row */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-biz-navy">{variant.name}</h3>
                    {variant.id === 0 && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-biz-navy text-white px-2 py-0.5 rounded">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{variant.departure}</p>
                </div>
                <a
                  href={variant.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg text-gray-400 hover:text-biz-orange hover:bg-orange-50 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  title="Open preview in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                {variant.description}
              </p>

              {/* Metadata */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Typography</span>
                  <span className="text-gray-600 font-medium">{variant.fonts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Aesthetic</span>
                  <span className="text-gray-600 font-medium">{variant.aesthetic}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Palette</span>
                  <div className="flex gap-1">
                    {variant.palette.map((color, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded border border-gray-200"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview button */}
              <a
                href={variant.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium
                  bg-gray-50 text-gray-600 hover:bg-biz-orange hover:text-white transition-all group-hover:bg-gray-100"
                onClick={(e) => e.stopPropagation()}
              >
                <Eye className="w-4 h-4" />
                Preview Layout
                <ChevronRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Selected variant detail panel */}
      {selectedVariant && (
        <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-biz-navy">
              {selectedVariant.name} — Full Preview
            </h2>
            <a
              href={selectedVariant.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-biz-orange text-white rounded-lg text-sm font-medium hover:bg-biz-orange/90 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open in New Tab
            </a>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
            <iframe
              src={selectedVariant.previewUrl}
              className="w-full border-0"
              style={{ height: '600px' }}
              title={`${selectedVariant.name} Preview`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
