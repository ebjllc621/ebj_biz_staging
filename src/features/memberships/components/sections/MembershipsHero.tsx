/**
 * MembershipsHero - Hero section for memberships page
 *
 * @tier SIMPLE
 * @phase Phase 3 - Public Memberships Page
 * @pattern PublicHomeView hero structure
 */
'use client';

import { ArrowRight } from 'lucide-react';
import BizButton from '@/components/BizButton/BizButton';

interface MembershipsHeroProps {
  onGetStarted: () => void;
}

export function MembershipsHero({ onGetStarted }: MembershipsHeroProps) {
  const handleScrollToPlans = () => {
    const plansSection = document.getElementById('tier-comparison');
    if (plansSection) {
      plansSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="relative bg-gradient-to-br from-biz-navy via-blue-800 to-purple-800 text-white overflow-hidden">
      <div className="absolute inset-0 bg-black/20" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Grow Your Business with{' '}
            <span className="text-biz-orange">Bizconekt</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-3xl mx-auto">
            Choose the plan that fits your needs. Start free, upgrade when you're ready.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <BizButton
              variant="primary"
              onClick={handleScrollToPlans}
              className="bg-biz-orange hover:bg-biz-orange/90 text-white px-8 py-3 text-base font-semibold flex items-center gap-2"
            >
              View Plans
              <ArrowRight className="w-5 h-5" />
            </BizButton>

            <BizButton
              variant="secondary"
              onClick={onGetStarted}
              className="bg-white/20 border-2 border-white text-white px-8 py-3 text-base font-semibold hover:bg-white/30"
            >
              Start Free
            </BizButton>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-200">
            <span className="flex items-center gap-1">
              <span className="text-green-400">✓</span> No credit card required
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1">
              <span className="text-green-400">✓</span> Cancel anytime
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1">
              <span className="text-green-400">✓</span> 30-day money-back guarantee
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
