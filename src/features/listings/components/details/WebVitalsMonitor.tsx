/**
 * WebVitalsMonitor - Web Vitals Monitoring Component
 *
 * @component Client Component
 * @tier SIMPLE
 * @phase Phase 9 - Performance & SEO
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-build-map-v2.1.mdc
 *
 * Features:
 * - Invisible component (renders null)
 * - Activates useWebVitals hook
 * - Monitors Core Web Vitals
 * - Sends metrics to analytics
 *
 * @see docs/pages/layouts/listings/details/phases/PHASE_9_BRAIN_PLAN.md
 * @see src/core/hooks/useWebVitals.ts
 */
'use client';

import { useWebVitals } from '@core/hooks/useWebVitals';

/**
 * WebVitalsMonitor component
 * Invisible component that monitors Core Web Vitals
 */
export function WebVitalsMonitor(): null {
  useWebVitals();
  return null;
}

export default WebVitalsMonitor;
