/**
 * Admin Offer Disputes Page
 *
 * @phase Phase 6 - Dispute Resolution
 * @authority CLAUDE.md - Admin page conventions
 *
 * Server Component — no 'use client'.
 * Delegates all interactivity to AdminDisputesClient.
 */

import type { Metadata } from 'next';
import { AdminDisputesClient } from './AdminDisputesClient';

export const metadata: Metadata = {
  title: 'Offer Disputes | Admin',
};

export default function AdminDisputesPage() {
  return <AdminDisputesClient />;
}
