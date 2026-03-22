/**
 * MembershipsCTA - Final conversion call-to-action section
 *
 * @tier SIMPLE
 * @phase Phase 3 - Public Memberships Page
 */
'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';
import BizButton from '@/components/BizButton/BizButton';

interface MembershipsCTAProps {
  onGetStarted: () => void;
}

export function MembershipsCTA({ onGetStarted }: MembershipsCTAProps) {
  return (
    <section className="py-16 bg-gradient-to-r from-[#022641] to-[#ed6437]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Ready to Grow Your Business?
        </h2>
        <p className="text-xl text-white/90 mb-8">
          Join thousands of businesses already using Bizconekt to reach more customers and grow their online presence.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <BizButton
            variant="primary"
            onClick={onGetStarted}
            className="bg-white text-[#022641] hover:bg-gray-100 px-8 py-3 text-lg font-semibold flex items-center gap-2"
          >
            Start Free Today
            <ArrowRight className="w-5 h-5" />
          </BizButton>

          <Link href={'/contact?subject=premium' as Route}>
            <BizButton
              variant="secondary"
              className="bg-white/20 border-2 border-white text-white px-8 py-3 text-lg font-semibold hover:bg-white/30"
            >
              Contact Sales
            </BizButton>
          </Link>
        </div>

        <p className="text-sm text-white/80 mt-6">
          No credit card required • Free tier available forever • Upgrade anytime
        </p>
      </div>
    </section>
  );
}
