/**
 * Admin Type Definitions
 * @authority PHASE_1_ADMIN_SHELL_BRAIN_PLAN.md
 * @authority PHASE_2_ADMIN_SIDEBAR_BRAIN_PLAN.md
 * @tier STANDARD
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Admin Module - Menu item definition for sidebar navigation
 * @phase Phase 2 - Enhanced with icon support
 */
export interface AdminModule {
  key: string;
  label: string;
  icon?: LucideIcon;
  component?: React.ComponentType<any>;
  children?: AdminModule[];
  href?: string;
  roles?: string[];
  badge?: string | number;
}

/**
 * Admin Menu Section - Groups of menu items
 */
export interface AdminMenuSection {
  id: string;
  title: string;
  items: AdminModule[];
}

/**
 * Admin Shell Props
 */
export interface AdminShellProps {
  children: React.ReactNode;
  selected?: string;
  onSelect?: (key: string) => void;
}

/**
 * Admin Sidebar Props
 */
export interface AdminSidebarProps {
  selected: string;
  isOpen: boolean;
  onClose: () => void;
}
