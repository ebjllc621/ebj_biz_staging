/**
 * Admin Media Manager Page
 *
 * Thin wrapper that imports and renders the AdminMediaManagerPage component.
 * All logic, state, and UI is in @features/media/admin.
 *
 * @authority Phase 4A - Admin Media Manager Core
 * @see src/features/media/admin/components/AdminMediaManagerPage.tsx
 */

'use client';

import { AdminMediaManagerPage } from '@features/media/admin/components/AdminMediaManagerPage';

export default function AdminMediaPage() {
  return <AdminMediaManagerPage />;
}
