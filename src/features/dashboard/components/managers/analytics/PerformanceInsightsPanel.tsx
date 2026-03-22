/**
 * PerformanceInsightsPanel - Key Performance Metrics & Recommendations
 *
 * @tier SIMPLE
 * @generated ComponentBuilder v3.0
 * @phase Phase 10 - Marketing & Advanced Features
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_10_BRAIN_PLAN.md
 *
 * Displays calculated performance metrics:
 * - Performance Score (weighted composite)
 * - Conversion Rate (views to actions)
 * - Source Diversity Index (traffic balance)
 */
'use client';

import React, { useState } from 'react';
import { TrendingUp, Target, PieChart, ChevronDown, ChevronUp, Award, AlertTriangle, CheckCircle } from 'lucide-react';

export interface PerformanceData {
  totalViews: number;
  totalClicks: number;
  conversions: number;
  bounceRate: number;
  ctr: number;
  sources: { source: string; percentage: number }[];
}

export interface PerformanceInsightsPanelProps {
  data: PerformanceData;
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  status: 'good' | 'warning' | 'poor';
  description: string;
  guidance: string;
  benchmark: string;
  isExpanded: boolean;
  onToggle: () => void;
}

function MetricCard({ icon, label, value, status, description, guidance, benchmark, isExpanded, onToggle }: MetricCardProps) {
  const statusColors = {
    good: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: CheckCircle },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: AlertTriangle },
    poor: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: AlertTriangle }
  };

  const colors = statusColors[status];
  const StatusIcon = colors.icon;

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-3`}>
      <button
        onClick={onToggle}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className={colors.text}>{icon}</span>
            <span className="text-sm font-medium text-gray-700">{label}</span>
          </div>
          <div className="flex items-center gap-1">
            <StatusIcon className={`w-4 h-4 ${colors.text}`} />
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{benchmark}</p>
      </button>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2 animate-in slide-in-from-top-2 duration-200">
          <p className="text-sm text-gray-600">{description}</p>
          <div className="bg-white/50 rounded p-2">
            <p className="text-xs font-medium text-gray-700">Recommendation:</p>
            <p className="text-xs text-gray-600">{guidance}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Calculate Performance Score (0-100)
 * Weighted: CTR (40%), Bounce Rate inverse (30%), Conversion Rate (30%)
 */
function calculatePerformanceScore(data: PerformanceData): number {
  // Normalize CTR (0-10% range mapped to 0-100)
  const ctrScore = Math.min(data.ctr * 10, 100);

  // Bounce rate (lower is better, invert it)
  const bounceScore = Math.max(0, 100 - data.bounceRate);

  // Conversion rate (views to conversions)
  const conversionRate = data.totalViews > 0 ? (data.conversions / data.totalViews) * 100 : 0;
  const conversionScore = Math.min(conversionRate * 20, 100); // 5% = 100 score

  // Weighted average
  const score = (ctrScore * 0.4) + (bounceScore * 0.3) + (conversionScore * 0.3);
  return Math.round(score);
}

/**
 * Calculate Conversion Rate
 */
function calculateConversionRate(data: PerformanceData): number {
  if (data.totalViews === 0) return 0;
  return (data.conversions / data.totalViews) * 100;
}

/**
 * Calculate Source Diversity Index (0-100)
 * Higher = more balanced traffic sources (healthier)
 * Uses Shannon diversity index normalized
 */
function calculateSourceDiversity(sources: { source: string; percentage: number }[]): number {
  if (sources.length === 0) return 0;
  if (sources.length === 1) return 0;

  // Calculate Shannon entropy
  let entropy = 0;
  sources.forEach(s => {
    const p = s.percentage / 100;
    if (p > 0) {
      entropy -= p * Math.log(p);
    }
  });

  // Normalize by max entropy (log of number of sources)
  const maxEntropy = Math.log(sources.length);
  const diversity = maxEntropy > 0 ? (entropy / maxEntropy) * 100 : 0;

  return Math.round(diversity);
}

function getScoreStatus(score: number): 'good' | 'warning' | 'poor' {
  if (score >= 70) return 'good';
  if (score >= 40) return 'warning';
  return 'poor';
}

function getConversionStatus(rate: number): 'good' | 'warning' | 'poor' {
  if (rate >= 3) return 'good';
  if (rate >= 1) return 'warning';
  return 'poor';
}

function getDiversityStatus(index: number): 'good' | 'warning' | 'poor' {
  if (index >= 60) return 'good';
  if (index >= 30) return 'warning';
  return 'poor';
}

export function PerformanceInsightsPanel({ data }: PerformanceInsightsPanelProps) {
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  const performanceScore = calculatePerformanceScore(data);
  const conversionRate = calculateConversionRate(data);
  const diversityIndex = calculateSourceDiversity(data.sources);

  const toggleMetric = (metric: string) => {
    setExpandedMetric(expandedMetric === metric ? null : metric);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Award className="w-5 h-5 text-orange-600" />
        <h3 className="text-lg font-semibold text-gray-900">Performance Insights</h3>
      </div>

      <div className="space-y-3">
        {/* Performance Score */}
        <MetricCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Performance Score"
          value={`${performanceScore}/100`}
          status={getScoreStatus(performanceScore)}
          benchmark={performanceScore >= 70 ? 'Excellent' : performanceScore >= 40 ? 'Room for improvement' : 'Needs attention'}
          description="A composite score based on your click-through rate, bounce rate, and conversion performance."
          guidance={
            performanceScore >= 70
              ? "Your listing is performing well! Keep your content fresh and respond quickly to inquiries."
              : performanceScore >= 40
              ? "Consider improving your main photo, adding more details to your description, or updating your business hours."
              : "Focus on the basics: ensure your contact info is visible, add high-quality photos, and write a compelling business description."
          }
          isExpanded={expandedMetric === 'score'}
          onToggle={() => toggleMetric('score')}
        />

        {/* Conversion Rate */}
        <MetricCard
          icon={<Target className="w-4 h-4" />}
          label="Conversion Rate"
          value={`${conversionRate.toFixed(2)}%`}
          status={getConversionStatus(conversionRate)}
          benchmark={conversionRate >= 3 ? 'Above average' : conversionRate >= 1 ? 'Average' : 'Below average'}
          description="Percentage of visitors who take meaningful action (contact, directions, calls) after viewing your listing."
          guidance={
            conversionRate >= 3
              ? "Great conversion rate! Your listing clearly communicates value. Consider A/B testing different photos or descriptions to optimize further."
              : conversionRate >= 1
              ? "Add clear calls-to-action. Make sure your phone number and address are prominent. Consider adding special offers."
              : "Review your listing from a customer's perspective. Is it easy to contact you? Are your services clearly listed? Add customer testimonials."
          }
          isExpanded={expandedMetric === 'conversion'}
          onToggle={() => toggleMetric('conversion')}
        />

        {/* Source Diversity */}
        <MetricCard
          icon={<PieChart className="w-4 h-4" />}
          label="Traffic Diversity"
          value={`${diversityIndex}%`}
          status={getDiversityStatus(diversityIndex)}
          benchmark={diversityIndex >= 60 ? 'Well-balanced' : diversityIndex >= 30 ? 'Moderately diverse' : 'Concentrated'}
          description="How evenly distributed your traffic sources are. Higher diversity means less dependence on any single channel."
          guidance={
            diversityIndex >= 60
              ? "Excellent! Your traffic comes from multiple sources, reducing risk. Continue nurturing all channels."
              : diversityIndex >= 30
              ? "Consider expanding to underutilized channels. If most traffic is Direct, work on SEO. If mostly Search, build social presence."
              : "Your traffic is concentrated in one source. Diversify by promoting on social media, getting listed in directories, or encouraging referrals."
          }
          isExpanded={expandedMetric === 'diversity'}
          onToggle={() => toggleMetric('diversity')}
        />
      </div>

      {/* Quick Summary */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 text-center">
          Click any metric above for improvement tips
        </p>
      </div>
    </div>
  );
}

export default PerformanceInsightsPanel;
