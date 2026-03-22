/**
 * Package Management Components
 * Barrel export for admin packages components
 *
 * @authority docs/packages/phases/PHASE_2_BRAIN_PLAN.md
 */

// Core components
export { PackageStatistics } from './PackageStatistics';
export { StatusToggle } from './StatusToggle';
export { DisplayToggle } from './DisplayToggle';
export { TierBadge } from './TierBadge';

// Modal components
export { AdminPasswordModal } from './AdminPasswordModal';
export { PackageEditorModal } from './PackageEditorModal';
export { AddonEditorModal } from './AddonEditorModal';
export { ArchiveConfirmModal } from './ArchiveConfirmModal';
export { UpgradePackageModal } from './UpgradePackageModal';
export { UpgradeAddonModal } from './UpgradeAddonModal';

// Export types
export type { PackageStatisticsProps } from './PackageStatistics';
export type { StatusToggleProps } from './StatusToggle';
export type { DisplayToggleProps } from './DisplayToggle';
export type { TierBadgeProps } from './TierBadge';
export type { AdminPasswordModalProps } from './AdminPasswordModal';
