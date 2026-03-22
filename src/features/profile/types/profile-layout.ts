/**
 * Profile Layout Type Definitions
 *
 * Defines types for user profile panel layout customization
 *
 * @tier ENTERPRISE
 * @phase Phase 6
 * @generated DNA v11.4.0
 */

/**
 * Panel identifiers for configurable panels
 */
export type PanelId = 'shared-connections' | 'listings' | 'content' | 'recommendations';

/**
 * Individual panel configuration
 */
export interface PanelConfig {
  /** Panel identifier */
  id: PanelId;
  /** Display order (lower = higher position) */
  order: number;
  /** Whether panel is visible */
  visible: boolean;
}

/**
 * Complete profile layout configuration
 */
export interface ProfileLayout {
  /** Panel configurations */
  panels: PanelConfig[];
  /** Layout version for migration support */
  version: number;
  /** When layout was last updated */
  updatedAt: string;
}

/**
 * Default profile layout
 */
export const DEFAULT_PROFILE_LAYOUT: ProfileLayout = {
  panels: [
    { id: 'recommendations', order: 0, visible: true },
    { id: 'shared-connections', order: 1, visible: true },
    { id: 'listings', order: 2, visible: true },
    { id: 'content', order: 3, visible: true }
  ],
  version: 2,
  updatedAt: new Date().toISOString()
};

/**
 * Panel metadata for UI rendering
 */
export const PANEL_METADATA: Record<PanelId, { title: string; icon: string }> = {
  'recommendations': { title: 'Recommendations Made', icon: 'Share2' },
  'shared-connections': { title: 'Shared Connections', icon: 'Users' },
  'listings': { title: 'Associated Listings', icon: 'Store' },
  'content': { title: 'Content', icon: 'FileText' }
};

/**
 * Merge user layout with defaults to ensure all panels exist
 */
export function mergeWithDefaultLayout(userLayout: ProfileLayout | null | undefined): ProfileLayout {
  if (!userLayout) return { ...DEFAULT_PROFILE_LAYOUT, updatedAt: new Date().toISOString() };

  const defaultPanelIds = DEFAULT_PROFILE_LAYOUT.panels.map(p => p.id);
  const userPanelIds = userLayout.panels.map(p => p.id);

  // Check if all default panels exist in user layout
  const missingPanels = defaultPanelIds.filter(id => !userPanelIds.includes(id));

  if (missingPanels.length === 0) return userLayout;

  // Add missing panels at the end
  const maxOrder = Math.max(...userLayout.panels.map(p => p.order), -1);
  const updatedPanels = [
    ...userLayout.panels,
    ...missingPanels.map((id, idx) => ({
      id,
      order: maxOrder + 1 + idx,
      visible: true
    }))
  ];

  return {
    ...userLayout,
    panels: updatedPanels,
    updatedAt: new Date().toISOString()
  };
}
