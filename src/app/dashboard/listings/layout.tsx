/**
 * Listings Layout - Wraps listing-dependent pages with ListingContext
 *
 * @description Provides listing selection context to all pages under /dashboard/listings/*
 * @component Server Component wrapper (wraps Client Component provider)
 * @tier STANDARD
 * @generated ComponentBuilder v3.0
 * @phase Phase 5 - Listing Selector & Context
 * @authority docs/pages/layouts/listings/details/userdash/phases/PHASE_5_BRAIN_PLAN.md
 *
 * GOVERNANCE RULES:
 * - 'use client' directive required for context provider
 * - ErrorBoundary wrapper for STANDARD tier
 * - Provides ListingContextProvider to entire /dashboard/listings/* route tree
 */
'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ListingContextProvider } from '@features/dashboard/context';

export default function ListingsLayout({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary componentName="ListingsLayout">
      <ListingContextProvider>
        {children}
      </ListingContextProvider>
    </ErrorBoundary>
  );
}
