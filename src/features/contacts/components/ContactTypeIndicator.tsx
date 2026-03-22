/**
 * ContactTypeIndicator - Visual indicator for contact type
 *
 * @tier SIMPLE
 * @authority Phase C Brain Plan
 *
 * Shows whether a contact is:
 * - Connected (existing connection)
 * - Manual (added without connection)
 * - With source badge if manual
 *
 * GOVERNANCE COMPLIANCE:
 * - 'use client' directive for client component
 * - Import paths: Uses @features/ alias
 * - Component tier: SIMPLE (no ErrorBoundary required)
 *
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @brain-plan docs/pages/layouts/home/user/user_dash/contacts/phases/PHASE_C_MANUAL_CONTACTS_BRAIN_PLAN.md
 */

'use client';

import { Users, UserPlus, Building2, Calendar, Edit3 } from 'lucide-react';
import type { ContactSource } from '../types';

interface ContactTypeIndicatorProps {
  isConnected: boolean;
  source?: ContactSource;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const SOURCE_CONFIG: Record<ContactSource, { icon: typeof Users; label: string; color: string }> = {
  connection: {
    icon: Users,
    label: 'Connection',
    color: 'bg-green-100 text-green-700 border-green-200'
  },
  listing_inquiry: {
    icon: Building2,
    label: 'Inquiry',
    color: 'bg-purple-100 text-purple-700 border-purple-200'
  },
  event: {
    icon: Calendar,
    label: 'Event',
    color: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  referral: {
    icon: UserPlus,
    label: 'Referral',
    color: 'bg-amber-100 text-amber-700 border-amber-200'
  },
  import: {
    icon: UserPlus,
    label: 'Imported',
    color: 'bg-teal-100 text-teal-700 border-teal-200'
  },
  manual: {
    icon: Edit3,
    label: 'Manual',
    color: 'bg-gray-100 text-gray-700 border-gray-200'
  }
};

export function ContactTypeIndicator({
  isConnected,
  source = 'manual',
  size = 'sm',
  showLabel = true
}: ContactTypeIndicatorProps) {
  const config = isConnected ? SOURCE_CONFIG.connection : SOURCE_CONFIG[source];
  const Icon = config.icon;

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5'
    : 'text-sm px-2.5 py-1';

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border ${config.color} ${sizeClasses} font-medium`}
    >
      <Icon className={iconSize} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

export default ContactTypeIndicator;
