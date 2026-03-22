/**
 * CategoryBadgeProgress - Entity-specific badge progress cards
 *
 * @tier SIMPLE
 * @phase Unified Leaderboard - Phase 6
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 */

'use client';

import { memo } from 'react';
import { MapPin, Calendar, Users, Tag, FileText, Mail, Mic, Video, BriefcaseBusiness, UserPlus } from 'lucide-react';

// Phase 1 + Phase 8 content categories + Jobs + Referrals
type CategoryType =
  | 'listing' | 'event' | 'user' | 'offer' | 'job' | 'referral'  // Phase 1 + Jobs + Referrals
  | 'article' | 'newsletter' | 'podcast' | 'video';  // Phase 8

interface CategoryProgress {
  category: CategoryType;
  count: number;
  target: number;
  badgeName: string;
  earned: boolean;
}

interface CategoryBadgeProgressProps {
  progress: CategoryProgress[];
  className?: string;
}

const categoryIcons: Record<CategoryType, React.ComponentType<{ className?: string }>> = {
  // Phase 1 + Jobs + Referrals
  listing: MapPin,
  event: Calendar,
  user: Users,
  offer: Tag,
  job: BriefcaseBusiness,
  referral: UserPlus,
  // Phase 8 content types
  article: FileText,
  newsletter: Mail,
  podcast: Mic,
  video: Video
};

const categoryColors: Record<CategoryType, string> = {
  // Phase 1 + Jobs + Referrals
  listing: 'text-blue-600 bg-blue-50',
  event: 'text-purple-600 bg-purple-50',
  user: 'text-green-600 bg-green-50',
  offer: 'text-orange-600 bg-orange-50',
  job: 'text-amber-600 bg-amber-50',
  referral: 'text-teal-600 bg-teal-50',
  // Phase 8 content types
  article: 'text-indigo-600 bg-indigo-50',
  newsletter: 'text-pink-600 bg-pink-50',
  podcast: 'text-cyan-600 bg-cyan-50',
  video: 'text-red-600 bg-red-50'
};

export const CategoryBadgeProgress = memo(function CategoryBadgeProgress({
  progress,
  className = ''
}: CategoryBadgeProgressProps) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      {progress.map(item => {
        const Icon = categoryIcons[item.category];
        const colorClass = categoryColors[item.category];
        const percentage = Math.min(100, Math.round((item.count / item.target) * 100));

        return (
          <div
            key={item.category}
            className={`
              p-3 rounded-lg border
              ${item.earned ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}
            `}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${colorClass}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.badgeName}
                </p>
                <p className="text-xs text-gray-500">
                  {item.count}/{item.target} recommendations
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  item.earned ? 'bg-green-500' : 'bg-[#ed6437]'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>

            {item.earned && (
              <p className="text-xs text-green-600 mt-1 text-center">
                ✓ Earned
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
});

export default CategoryBadgeProgress;
