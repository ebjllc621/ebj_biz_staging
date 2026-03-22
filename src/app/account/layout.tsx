/**
 * Account Status Layout
 *
 * @description Minimal layout for account status pages (suspended/deleted)
 * @component Server Component
 * @architecture Build Map v2.1 ENHANCED - Next.js 14 layout pattern
 * @see docs/dna/brain-plans/ACCOUNT_STATUS_PAGES_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - Server Component (no 'use client')
 * - Minimal header with logo only
 * - Full-height centered content area
 * - No authentication required
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account Status - Bizconekt',
  description: 'Account status information'
};

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="account-status-page">
      {/* Main content area - header/footer provided by site layout */}
      <main className="account-status-content">
        {children}
      </main>
    </div>
  );
}
