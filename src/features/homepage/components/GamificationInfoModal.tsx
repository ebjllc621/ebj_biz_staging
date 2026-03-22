/**
 * GamificationInfoModal - Describes the rewards/points system benefits
 *
 * @tier SIMPLE
 * @phase Homepage Leaderboard Enhancement
 * @generated Manual
 *
 * Features:
 * - User benefits section
 * - Listing owner benefits section
 * - Accessible modal with BizModal pattern
 */

'use client';

import { BizModal } from '@/components/ui/BizModal';
import {
  Trophy,
  Gift,
  Users,
  TrendingUp,
  Star,
  Share2,
  BadgeCheck,
  Building2,
  Megaphone,
  HandshakeIcon,
  Target,
  Sparkles
} from 'lucide-react';

interface GamificationInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BenefitItem {
  icon: React.ElementType;
  title: string;
  description: string;
}

const userBenefits: BenefitItem[] = [
  {
    icon: Trophy,
    title: 'Earn Points',
    description: 'Get rewarded for sharing the things you love with friends and family.'
  },
  {
    icon: Star,
    title: 'Climb the Leaderboard',
    description: 'Compete with other members and see your name at the top of our community rankings.'
  },
  {
    icon: BadgeCheck,
    title: 'Unlock Badges',
    description: 'Earn recognition badges for milestones like first referral, top sharer, and more.'
  },
  {
    icon: Gift,
    title: 'Exclusive Rewards',
    description: 'Redeem your points for special offers, discounts, and exclusive perks.'
  },
  {
    icon: Users,
    title: 'Build Your Network',
    description: 'Connect with like-minded people and grow your local community.'
  },
  {
    icon: Sparkles,
    title: 'Community Recognition',
    description: 'Get featured as a top contributor and be recognized for supporting your community.'
  }
];

const listingOwnerBenefits: BenefitItem[] = [
  {
    icon: Share2,
    title: 'Word-of-Mouth Marketing',
    description: 'Members actively share your listing with their networks, driving organic referrals.'
  },
  {
    icon: Target,
    title: 'Qualified Leads',
    description: 'Receive referrals from trusted community members who genuinely recommend you.'
  },
  {
    icon: TrendingUp,
    title: 'Increased Visibility',
    description: 'Get featured prominently when members share and recommend your listing.'
  },
  {
    icon: HandshakeIcon,
    title: 'Trust & Credibility',
    description: 'Personal recommendations carry more weight than traditional advertising.'
  },
  {
    icon: Building2,
    title: 'Local Community Support',
    description: 'Tap into a network of engaged community members passionate about supporting local favorites.'
  },
  {
    icon: Megaphone,
    title: 'Amplified Reach',
    description: 'Every share extends your reach to new potential customers through trusted connections.'
  }
];

function BenefitCard({ benefit }: { benefit: BenefitItem }) {
  const Icon = benefit.icon;
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#ed6437]/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-[#ed6437]" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-900 text-sm">{benefit.title}</h4>
        <p className="text-xs text-gray-600 mt-0.5">{benefit.description}</p>
      </div>
    </div>
  );
}

export function GamificationInfoModal({ isOpen, onClose }: GamificationInfoModalProps) {
  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title="Share & Earn Rewards"
      subtitle="Discover how you can benefit from the Bizconekt community"
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* User Benefits Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-[#022641]">For Members</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {userBenefits.map((benefit, index) => (
              <BenefitCard key={index} benefit={benefit} />
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* Listing Owner Benefits Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-[#022641]">For Listing Owners</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {listingOwnerBenefits.map((benefit, index) => (
              <BenefitCard key={index} benefit={benefit} />
            ))}
          </div>
        </div>

        {/* How It Works Summary */}
        <div className="bg-gradient-to-r from-[#022641] to-[#ed6437] rounded-lg p-4 text-white">
          <h4 className="font-bold mb-2">How It Works</h4>
          <ol className="text-sm space-y-1 list-decimal list-inside opacity-90">
            <li>Share the things you love with the people who matter to you</li>
            <li>Earn points when people check out your recommendations</li>
            <li>Climb the leaderboard and earn badges</li>
            <li>Redeem points for exclusive rewards and offers</li>
          </ol>
        </div>
      </div>
    </BizModal>
  );
}

export default GamificationInfoModal;
