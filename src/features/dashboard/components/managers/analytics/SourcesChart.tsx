/**
 * SourcesChart - Bar Chart for Traffic Sources
 *
 * @tier SIMPLE
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * Uses Recharts to display traffic sources breakdown
 */
'use client';

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { HelpCircle, ChevronDown, ChevronUp, ExternalLink, Share2, Search, Globe } from 'lucide-react';

export interface SourceData {
  source: string;
  views: number;
  percentage: number;
}

export interface SourcesChartProps {
  /** Sources data */
  data: SourceData[];
}

// Color palette for bars
const COLORS = ['#ed6437', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

// Traffic source descriptions and guidance
const SOURCE_INFO: Record<string, {
  icon: React.ReactNode;
  description: string;
  whatItMeans: string;
  howToImprove: string;
}> = {
  Direct: {
    icon: <Globe className="w-4 h-4" />,
    description: 'Visitors who typed your URL directly or used a bookmark.',
    whatItMeans: 'High direct traffic indicates strong brand awareness. People remember your business and return intentionally.',
    howToImprove: 'Encourage repeat visits by providing excellent service. Include your listing URL on business cards, receipts, and signage.'
  },
  Referral: {
    icon: <ExternalLink className="w-4 h-4" />,
    description: 'Visitors who clicked a link from another website to reach your listing.',
    whatItMeans: 'Shows other sites are linking to you. Quality referrals from relevant sites indicate good online reputation.',
    howToImprove: 'Partner with complementary businesses for cross-promotion. Get listed in local directories and industry websites.'
  },
  Search: {
    icon: <Search className="w-4 h-4" />,
    description: 'Visitors who found your listing through search engines like Google.',
    whatItMeans: 'Indicates your listing is discoverable when people search for your type of business or services.',
    howToImprove: 'Use relevant keywords in your business description. Keep your listing information complete and up-to-date.'
  },
  Social: {
    icon: <Share2 className="w-4 h-4" />,
    description: 'Visitors from social media platforms like Facebook, Instagram, or Twitter.',
    whatItMeans: 'Your listing is being discovered or shared on social networks. Good for brand visibility.',
    howToImprove: 'Share your listing on your business social profiles. Encourage satisfied customers to share their experience.'
  }
};

export function SourcesChart({ data }: SourcesChartProps) {
  const [isGuidanceOpen, setIsGuidanceOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">Traffic Sources</h3>
          <div className="group relative">
            <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
            <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Shows where your visitors come from. Understanding traffic sources helps optimize your marketing efforts.
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsGuidanceOpen(!isGuidanceOpen)}
          className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
        >
          {isGuidanceOpen ? 'Hide' : 'Learn more'}
          {isGuidanceOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expandable Guidance Section */}
      {isGuidanceOpen && (
        <div className="mb-4 bg-blue-50 border border-blue-100 rounded-lg p-4 animate-in slide-in-from-top-2 duration-200">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Understanding Your Traffic Sources</h4>
          <div className="space-y-3 text-sm text-blue-800">
            <p>
              <strong>What to look for:</strong> A healthy mix of traffic sources indicates good visibility. Over-reliance on one source can be risky.
            </p>
            <p>
              <strong>Key considerations:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>High Direct traffic = Strong brand recognition</li>
              <li>High Referral traffic = Good partnerships and backlinks</li>
              <li>High Search traffic = Good SEO and discoverability</li>
              <li>High Social traffic = Effective social media presence</li>
            </ul>
            <p className="text-blue-600 italic">
              Click on any source in the legend below for specific improvement tips.
            </p>
          </div>
        </div>
      )}

      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          No source data available
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="source"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                labelStyle={{ color: '#374151', fontWeight: 600 }}
              />
              <Bar dataKey="views" radius={[8, 8, 0, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Legend with percentages - Clickable */}
          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {data.map((item, index) => {
                const info = SOURCE_INFO[item.source];
                const isSelected = selectedSource === item.source;

                return (
                  <button
                    key={item.source}
                    onClick={() => setSelectedSource(isSelected ? null : item.source)}
                    className={`flex items-center gap-2 p-2 rounded-lg transition-colors text-left ${
                      isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-gray-700">
                      {item.source}: <span className="font-medium">{item.percentage.toFixed(1)}%</span>
                    </span>
                    {info && (
                      <ChevronDown className={`w-3 h-3 text-gray-400 ml-auto transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Source Details */}
            {selectedSource && SOURCE_INFO[selectedSource] && (
              <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-600">{SOURCE_INFO[selectedSource].icon}</span>
                  <h5 className="font-semibold text-gray-900">{selectedSource} Traffic</h5>
                </div>
                <p className="text-sm text-gray-600 mb-3">{SOURCE_INFO[selectedSource].description}</p>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="font-medium text-gray-800">What it means:</p>
                    <p className="text-gray-600">{SOURCE_INFO[selectedSource].whatItMeans}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">How to improve:</p>
                    <p className="text-gray-600">{SOURCE_INFO[selectedSource].howToImprove}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default SourcesChart;
