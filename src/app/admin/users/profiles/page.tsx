'use client';

export const dynamic = 'force-dynamic';

/**
 * Admin Profile Layouts Preview Page
 *
 * @tier STANDARD
 * @authority CLAUDE.md
 *
 * Displays profile layout mockups for review and comparison.
 * Links to HTML previews in /public for the 3 user profile v2 layouts
 * and the existing creator profile mockups.
 */

import { useState } from 'react';
import { useAuth } from '@core/hooks/useAuth';
import { Eye, ExternalLink, Layout, Columns, PanelTop, Users, Palette } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface MockupCard {
  id: string;
  title: string;
  description: string;
  htmlPath: string;
  category: 'user-v2' | 'creator';
  features: string[];
  persona?: string;
  accentColor: string;
}

// ============================================================================
// MOCKUP DATA
// ============================================================================

const USER_V2_MOCKUPS: MockupCard[] = [
  {
    id: 'unified',
    title: 'Unified Hybrid Layout',
    description: 'Creator-style 2-column layout with personal sections on the left and creator sidebar on the right. Uses a section divider to separate personal and creator content. Merge toggle in the toolbar.',
    htmlPath: '/user-profile-v2-unified.html',
    category: 'user-v2',
    persona: 'Jordan Davis — UX Designer & Content Creator',
    accentColor: '#022641',
    features: [
      '2-column layout (content + sidebar)',
      'Creator profile merge toggle',
      'Section divider between personal & creator content',
      'Combined stats (personal + creator)',
      'Draggable panel management preserved',
      'Edit/Published view mode toggle',
      'Completion banner in edit mode',
      'Rate card in sidebar',
      'Platform badges in hero',
    ],
  },
  {
    id: 'tabbed',
    title: 'Tabbed Sections Layout',
    description: 'Creator-style hero with tabbed content navigation below. Tabs: Personal, Creator, Reviews, Panels. Sidebar remains visible across all tabs. Clean separation of concerns.',
    htmlPath: '/user-profile-v2-tabbed.html',
    category: 'user-v2',
    persona: 'Sarah Mitchell — Affiliate Marketer',
    accentColor: '#ed6437',
    features: [
      'Tab navigation: Personal | Creator | Reviews | Panels',
      'Sidebar always visible',
      'Creator type badge in hero',
      '"Creator Profile Merged" status badge',
      'Review tab with rating summary',
      'Panel management in dedicated tab',
      'Rate card in sidebar',
      'Combined stats with separator',
    ],
  },
  {
    id: 'enhanced',
    title: 'Enhanced Card Layout',
    description: 'Modern floating hero card over cover image with rounded avatar. Horizontal stats strip below hero. 3-way profile mode selector (Personal Only / Merged / Creator Only). List-style creator collaborations.',
    htmlPath: '/user-profile-v2-enhanced.html',
    category: 'user-v2',
    persona: 'Marcus Chen — Podcaster',
    accentColor: '#059669',
    features: [
      'Floating hero card with rounded avatar',
      'Horizontal stats strip',
      '3-way mode: Personal Only / Merged / Creator Only',
      'Info grid layout for details',
      'List-style collaborations with play counts',
      'Creator section header with gradient icon',
      'Draggable panels preserved',
      'Education & interests in sidebar',
    ],
  },
];

const CREATOR_MOCKUPS: MockupCard[] = [
  {
    id: 'affiliate-creative',
    title: 'Affiliate Marketer (Creative)',
    description: 'Creative design mockup for affiliate marketer creator profile type.',
    htmlPath: '/creator-profile-affiliate.html',
    category: 'creator',
    persona: 'Sarah Mitchell — Affiliate Marketer',
    accentColor: '#ed6437',
    features: ['Orange accent', 'Campaign portfolio grid', 'Conversion metrics'],
  },
  {
    id: 'affiliate-actual',
    title: 'Affiliate Marketer (Code-Accurate)',
    description: 'Code-accurate version matching actual React component layout.',
    htmlPath: '/creator-profile-affiliate-actual.html',
    category: 'creator',
    accentColor: '#ed6437',
    features: ['Matches React components', 'Exact layout replication'],
  },
  {
    id: 'ip-creative',
    title: 'Internet Personality (Creative)',
    description: 'Creative design mockup for internet personality creator profile type.',
    htmlPath: '/creator-profile-ip.html',
    category: 'creator',
    persona: 'Alex Rivera — Tech Creator',
    accentColor: '#7c3aed',
    features: ['Purple accent', 'Platform badges', 'Collaboration timeline'],
  },
  {
    id: 'ip-actual',
    title: 'Internet Personality (Code-Accurate)',
    description: 'Code-accurate version matching actual React component layout.',
    htmlPath: '/creator-profile-ip-actual.html',
    category: 'creator',
    accentColor: '#7c3aed',
    features: ['Matches React components', 'Exact layout replication'],
  },
  {
    id: 'podcaster-creative',
    title: 'Podcaster (Creative)',
    description: 'Creative design mockup for podcaster creator profile type.',
    htmlPath: '/creator-profile-podcaster.html',
    category: 'creator',
    persona: 'Marcus Chen — Podcaster',
    accentColor: '#059669',
    features: ['Green accent', 'Episode list', 'Listen-on badges'],
  },
  {
    id: 'podcaster-actual',
    title: 'Podcaster (Code-Accurate)',
    description: 'Code-accurate version matching actual React component layout.',
    htmlPath: '/creator-profile-podcaster-actual.html',
    category: 'creator',
    accentColor: '#059669',
    features: ['Matches React components', 'Exact layout replication'],
  },
  {
    id: 'compare',
    title: 'Creator Profile Comparison',
    description: 'Interactive comparison viewer with filter controls for all 3 creator profile types.',
    htmlPath: '/creator-profile-compare.html',
    category: 'creator',
    accentColor: '#1d4ed8',
    features: ['Side-by-side comparison', 'Filter controls', 'All 3 types'],
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function AdminProfilesPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'user-v2' | 'creator'>('all');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (!user || user.role !== 'admin') {
    return (
      <div className="p-8 text-center text-gray-500">
        Admin access required.
      </div>
    );
  }

  const allMockups = [...USER_V2_MOCKUPS, ...CREATOR_MOCKUPS];
  const filtered = filter === 'all' ? allMockups : allMockups.filter(m => m.category === filter);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#022641] flex items-center gap-3">
                <Layout className="w-7 h-7 text-[#ed6437]" />
                Profile Layouts
              </h1>
              <p className="text-gray-500 mt-1">
                Preview and compare user profile layout mockups
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Total:</span>
              <span className="font-semibold text-[#022641]">{allMockups.length} mockups</span>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'all'
                  ? 'bg-[#022641] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All ({allMockups.length})
            </button>
            <button
              onClick={() => setFilter('user-v2')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'user-v2'
                  ? 'bg-[#ed6437] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                User Profile v2 ({USER_V2_MOCKUPS.length})
              </span>
            </button>
            <button
              onClick={() => setFilter('creator')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'creator'
                  ? 'bg-[#7c3aed] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Creator Profiles ({CREATOR_MOCKUPS.length})
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Profile v2 Section */}
        {(filter === 'all' || filter === 'user-v2') && (
          <div className="mb-12">
            {filter === 'all' && (
              <h2 className="text-lg font-bold text-[#022641] mb-4 flex items-center gap-2">
                <Columns className="w-5 h-5 text-[#ed6437]" />
                User Profile v2 — Layout Options
              </h2>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {USER_V2_MOCKUPS.map((mockup) => (
                <MockupCardComponent key={mockup.id} mockup={mockup} onPreview={setPreviewUrl} />
              ))}
            </div>
          </div>
        )}

        {/* Creator Profiles Section */}
        {(filter === 'all' || filter === 'creator') && (
          <div>
            {filter === 'all' && (
              <h2 className="text-lg font-bold text-[#022641] mb-4 flex items-center gap-2">
                <PanelTop className="w-5 h-5 text-[#7c3aed]" />
                Creator Profile Mockups
              </h2>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {CREATOR_MOCKUPS.map((mockup) => (
                <MockupCardComponent key={mockup.id} mockup={mockup} onPreview={setPreviewUrl} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
              <span className="text-sm font-medium text-gray-700">{previewUrl}</span>
              <div className="flex items-center gap-2">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#ed6437] hover:bg-orange-50 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in New Tab
                </a>
                <button
                  onClick={() => setPreviewUrl(null)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
            <iframe
              src={previewUrl}
              className="flex-1 w-full border-0"
              title="Profile Preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MOCKUP CARD SUB-COMPONENT
// ============================================================================

function MockupCardComponent({
  mockup,
  onPreview,
}: {
  mockup: MockupCard;
  onPreview: (url: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Color accent bar */}
      <div className="h-2" style={{ background: mockup.accentColor }} />

      <div className="p-5">
        {/* Category badge */}
        <div className="flex items-center justify-between mb-3">
          <span
            className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
              mockup.category === 'user-v2'
                ? 'bg-orange-50 text-[#ed6437]'
                : 'bg-purple-50 text-purple-700'
            }`}
          >
            {mockup.category === 'user-v2' ? 'User v2' : 'Creator'}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-[#022641] mb-1">{mockup.title}</h3>

        {/* Persona */}
        {mockup.persona && (
          <p className="text-xs text-gray-400 mb-2">{mockup.persona}</p>
        )}

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-3">{mockup.description}</p>

        {/* Features */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {mockup.features.slice(0, 5).map((feature) => (
            <span
              key={feature}
              className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
            >
              {feature}
            </span>
          ))}
          {mockup.features.length > 5 && (
            <span className="text-xs text-gray-400">+{mockup.features.length - 5} more</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onPreview(mockup.htmlPath)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[#022641] rounded-lg hover:bg-[#033562] transition-colors"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <a
            href={mockup.htmlPath}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
