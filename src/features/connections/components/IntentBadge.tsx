/**
 * IntentBadge - Visual indicator for connection request intent type
 *
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @phase Connect P2 Phase 1
 * @reference src/features/contacts/components/ContactTypeIndicator.tsx - Pattern source
 *
 * GOVERNANCE:
 * - Client Component ('use client')
 * - Lucide icons only
 * - Tailwind CSS styling
 */

'use client';

import React from 'react';
import {
  Users,
  Briefcase,
  Handshake,
  GraduationCap,
  MessageSquare,
  Heart
} from 'lucide-react';
import { ConnectionIntentType } from '../types';

interface IntentBadgeProps {
  intentType: ConnectionIntentType;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

/**
 * Intent type configuration with icons and colors
 */
const INTENT_CONFIG: Record<ConnectionIntentType, {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  textColor: string;
  borderColor: string;
}> = {
  networking: {
    label: 'Networking',
    description: 'General professional networking',
    icon: Users,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
  hiring: {
    label: 'Hiring',
    description: 'Recruitment or job opportunity',
    icon: Briefcase,
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200'
  },
  partnership: {
    label: 'Partnership',
    description: 'Business collaboration',
    icon: Handshake,
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    borderColor: 'border-green-200'
  },
  mentorship: {
    label: 'Mentorship',
    description: 'Seeking or offering guidance',
    icon: GraduationCap,
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200'
  },
  client_inquiry: {
    label: 'Client Inquiry',
    description: 'Potential client relationship',
    icon: MessageSquare,
    bgColor: 'bg-teal-100',
    textColor: 'text-teal-700',
    borderColor: 'border-teal-200'
  },
  personal: {
    label: 'Personal',
    description: 'Personal connection',
    icon: Heart,
    bgColor: 'bg-pink-100',
    textColor: 'text-pink-700',
    borderColor: 'border-pink-200'
  }
};

/**
 * IntentBadge component
 * Displays intent type with icon and optional label
 */
export function IntentBadge({
  intentType,
  size = 'sm',
  showLabel = true
}: IntentBadgeProps) {
  const config = INTENT_CONFIG[intentType];

  if (!config) {
    return null;
  }

  const Icon = config.icon;
  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5'
    : 'text-sm px-2.5 py-1';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full border font-medium
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        ${sizeClasses}
      `}
      title={config.description}
    >
      <Icon className={iconSize} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

/**
 * Export intent configuration for use in dropdowns
 */
export { INTENT_CONFIG };
export default IntentBadge;
