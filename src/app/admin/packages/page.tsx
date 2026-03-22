/**
 * Admin Packages Management Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: AdminTableTemplate (MANDATORY)
 * - Authentication: Admin-only access required
 * - Service Boundary: NO direct database access (API routes only)
 * - Credentials: 'include' for all fetch requests
 * - Complexity: ADVANCED tier (error boundaries required)
 *
 * Features:
 * - Subscription packages table with pagination (20 per page)
 * - Add-on suites subsection with table
 * - CRUD operations: View, Create, Edit, Archive
 * - Status toggle: Immediate toggle (no password)
 * - Edit/Archive: Password required
 * - Package statistics sidebar
 * - Rich text editor for descriptions
 *
 * @authority docs/packages/phases/PHASE_2_BRAIN_PLAN.md
 * @component
 * @returns {JSX.Element} Admin packages management interface
 */

'use client';

// Force dynamic rendering (required for useAuth() - React Context cannot be used in SSG)
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { AdminTableTemplate, TableColumn, TableAction } from '@/components/admin/templates/AdminTableTemplate';
import { useAuth } from '@core/hooks/useAuth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ErrorFallback } from '@/components/common/ErrorFallback';
import { fetchWithCsrf } from '@core/utils/csrf';
import { Edit2, Archive, Package as PackageIcon, ArrowUpCircle } from 'lucide-react';
import type { AdminSubscriptionPlan, AdminAddonSuite, PackageStatus } from '@/types/admin-packages';
import {
  PackageStatistics,
  StatusToggle,
  DisplayToggle,
  TierBadge,
  AdminPasswordModal,
  PackageEditorModal,
  AddonEditorModal,
  ArchiveConfirmModal,
  UpgradePackageModal,
  UpgradeAddonModal
} from '@features/admin/components/packages';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface PackageStatistics {
  total_packages: number;
  active_packages: number;
  total_addons: number;
  active_addons: number;
}

interface PendingPasswordOperation {
  type: 'archive_package' | 'archive_addon'; // Edit operations collect password in the editor modal
  item: AdminSubscriptionPlan | AdminAddonSuite;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * AdminPackagesPageContent
 * Main packages management page (wrapped in ErrorBoundary)
 */
function AdminPackagesPageContent() {
  const { user, loading: authLoading } = useAuth();

  // Data state
  const [packages, setPackages] = useState<AdminSubscriptionPlan[]>([]);
  const [addons, setAddons] = useState<AdminAddonSuite[]>([]);
  const [statistics, setStatistics] = useState<PackageStatistics>({
    total_packages: 0,
    active_packages: 0,
    total_addons: 0,
    active_addons: 0
  });

  // Loading states
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);
  const [isLoadingAddons, setIsLoadingAddons] = useState(true);

  // Pagination state - packages
  const [packagePage, setPackagePage] = useState(1);
  const [packageTotal, setPackageTotal] = useState(0);
  const packagePageSize = 20;

  // Pagination state - addons
  const [addonPage, setAddonPage] = useState(1);
  const [addonTotal, setAddonTotal] = useState(0);
  const addonPageSize = 20;

  // Modal states
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pendingPasswordOperation, setPendingPasswordOperation] = useState<PendingPasswordOperation | null>(null);

  // Editor modal states
  const [isPackageEditorOpen, setIsPackageEditorOpen] = useState(false);
  const [selectedPackageForEdit, setSelectedPackageForEdit] = useState<AdminSubscriptionPlan | null>(null);
  const [isAddonEditorOpen, setIsAddonEditorOpen] = useState(false);
  const [selectedAddonForEdit, setSelectedAddonForEdit] = useState<AdminAddonSuite | null>(null);

  // Archive modal states
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<{
    type: 'package' | 'addon';
    id: number;
    name: string;
  } | null>(null);

  // Upgrade modal states (Phase 5.4)
  const [isUpgradePackageModalOpen, setIsUpgradePackageModalOpen] = useState(false);
  const [selectedPackageForUpgrade, setSelectedPackageForUpgrade] = useState<AdminSubscriptionPlan | null>(null);
  const [isUpgradeAddonModalOpen, setIsUpgradeAddonModalOpen] = useState(false);
  const [selectedAddonForUpgrade, setSelectedAddonForUpgrade] = useState<AdminAddonSuite | null>(null);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  /**
   * Fetch packages from API
   */
  const fetchPackages = useCallback(async () => {
    try {
      setIsLoadingPackages(true);
      const response = await fetch(
        `/api/admin/packages?page=${packagePage}&pageSize=${packagePageSize}`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch packages');
      }

      const data = await response.json();
      // Handle nested response format (data.data.packages) with fallback
      const packages = data.data?.packages ?? data.packages ?? [];
      const pagination = data.data?.pagination ?? data.pagination;

      setPackages(packages);
      setPackageTotal(pagination?.total ?? 0);

      // Update statistics
      setStatistics(prev => ({
        ...prev,
        total_packages: pagination?.total ?? 0,
        active_packages: packages.filter((p: AdminSubscriptionPlan) => p.status === 'active').length
      }));
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setIsLoadingPackages(false);
    }
  }, [packagePage, packagePageSize]);

  /**
   * Fetch addons from API
   */
  const fetchAddons = useCallback(async () => {
    try {
      setIsLoadingAddons(true);
      const response = await fetch(
        `/api/admin/addons?page=${addonPage}&pageSize=${addonPageSize}`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch addons');
      }

      const data = await response.json();
      // Handle nested response format (data.data.addons) with fallback
      const addons = data.data?.addons ?? data.addons ?? [];
      const pagination = data.data?.pagination ?? data.pagination;

      setAddons(addons);
      setAddonTotal(pagination?.total ?? 0);

      // Update statistics
      setStatistics(prev => ({
        ...prev,
        total_addons: pagination?.total ?? 0,
        active_addons: addons.filter((a: AdminAddonSuite) => a.status === 'active').length
      }));
    } catch (error) {
      console.error('Error fetching addons:', error);
    } finally {
      setIsLoadingAddons(false);
    }
  }, [addonPage, addonPageSize]);

  // Initial data fetch
  useEffect(() => {
    if (!authLoading && user?.role === 'admin') {
      void fetchPackages();
      void fetchAddons();
    }
  }, [authLoading, user, fetchPackages, fetchAddons]);

  // ============================================================================
  // STATUS TOGGLE HANDLERS (NO PASSWORD)
  // ============================================================================

  /**
   * Toggle package status (active/inactive)
   */
  const handleTogglePackageStatus = useCallback(async (pkg: AdminSubscriptionPlan) => {
    try {
      // Optimistic update
      setPackages(prev =>
        prev.map(p =>
          p.id === pkg.id
            ? { ...p, status: (p.status === 'active' ? 'inactive' : 'active') as PackageStatus }
            : p
        )
      );

      const response = await fetchWithCsrf(`/api/admin/packages/${pkg.id}/status`, {
        method: 'PATCH',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to toggle package status');
      }

      const data = await response.json();

      // Update with server response - handle nested response format
      const updatedPackage = data.data?.package ?? data.package;
      if (updatedPackage) {
        setPackages(prev =>
          prev.map(p => (p.id === pkg.id ? updatedPackage : p))
        );
      }
    } catch (error) {
      console.error('Error toggling package status:', error);
      // Revert optimistic update
      void fetchPackages();
    }
  }, [fetchPackages]);

  /**
   * Toggle addon status (active/inactive)
   */
  const handleToggleAddonStatus = useCallback(async (addon: AdminAddonSuite) => {
    try {
      // Optimistic update
      setAddons(prev =>
        prev.map(a =>
          a.id === addon.id
            ? { ...a, status: (a.status === 'active' ? 'inactive' : 'active') as PackageStatus }
            : a
        )
      );

      const response = await fetchWithCsrf(`/api/admin/addons/${addon.id}/status`, {
        method: 'PATCH',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to toggle addon status');
      }

      const data = await response.json();

      // Update with server response - handle nested response format
      const updatedAddon = data.data?.addon ?? data.addon;
      if (updatedAddon) {
        setAddons(prev =>
          prev.map(a => (a.id === addon.id ? updatedAddon : a))
        );
      }
    } catch (error) {
      console.error('Error toggling addon status:', error);
      // Revert optimistic update
      void fetchAddons();
    }
  }, [fetchAddons]);

  // ============================================================================
  // DISPLAY TOGGLE HANDLERS (NO PASSWORD - Phase 5.4)
  // ============================================================================

  /**
   * Toggle package display (shown/hidden)
   */
  const handleTogglePackageDisplay = useCallback(async (pkg: AdminSubscriptionPlan) => {
    try {
      // Optimistic update
      setPackages(prev =>
        prev.map(p =>
          p.id === pkg.id
            ? { ...p, is_displayed: !p.is_displayed }
            : p
        )
      );

      const response = await fetchWithCsrf(`/api/admin/packages/${pkg.id}/display`, {
        method: 'PATCH',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to toggle package display');
      }

      const data = await response.json();

      // Update with server response - handle nested response format
      const updatedPackage = data.data?.package ?? data.package;
      if (updatedPackage) {
        setPackages(prev =>
          prev.map(p => (p.id === pkg.id ? updatedPackage : p))
        );
      }
    } catch (error) {
      console.error('Error toggling package display:', error);
      // Revert optimistic update
      void fetchPackages();
    }
  }, [fetchPackages]);

  /**
   * Toggle addon display (shown/hidden)
   */
  const handleToggleAddonDisplay = useCallback(async (addon: AdminAddonSuite) => {
    try {
      // Optimistic update
      setAddons(prev =>
        prev.map(a =>
          a.id === addon.id
            ? { ...a, is_displayed: !a.is_displayed }
            : a
        )
      );

      const response = await fetchWithCsrf(`/api/admin/addons/${addon.id}/display`, {
        method: 'PATCH',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to toggle addon display');
      }

      const data = await response.json();

      // Update with server response - handle nested response format
      const updatedAddon = data.data?.addon ?? data.addon;
      if (updatedAddon) {
        setAddons(prev =>
          prev.map(a => (a.id === addon.id ? updatedAddon : a))
        );
      }
    } catch (error) {
      console.error('Error toggling addon display:', error);
      // Revert optimistic update
      void fetchAddons();
    }
  }, [fetchAddons]);

  // ============================================================================
  // PASSWORD FLOW (FOR EDIT/ARCHIVE)
  // ============================================================================

  /**
   * Initiate password verification for edit/archive operations
   */
  const handleInitiatePasswordOperation = useCallback((
    type: PendingPasswordOperation['type'],
    item: AdminSubscriptionPlan | AdminAddonSuite
  ) => {
    setPendingPasswordOperation({ type, item });
    setIsPasswordModalOpen(true);
  }, []);

  /**
   * Handle password verification success (archive operations only)
   * Note: Edit operations now collect password within the editor modal on save
   */
  const handlePasswordVerified = useCallback(() => {
    setIsPasswordModalOpen(false);

    if (!pendingPasswordOperation) return;

    // Execute the pending operation (archive only - edit goes directly to editor)
    switch (pendingPasswordOperation.type) {
      case 'archive_package': {
        // Open ArchiveConfirmModal for package
        const pkg = pendingPasswordOperation.item as AdminSubscriptionPlan;
        setArchiveTarget({
          type: 'package',
          id: pkg.id,
          name: pkg.name
        });
        setIsArchiveModalOpen(true);
        break;
      }
      case 'archive_addon': {
        // Open ArchiveConfirmModal for addon
        const addon = pendingPasswordOperation.item as AdminAddonSuite;
        setArchiveTarget({
          type: 'addon',
          id: addon.id,
          name: addon.display_name
        });
        setIsArchiveModalOpen(true);
        break;
      }
    }

    setPendingPasswordOperation(null);
  }, [pendingPasswordOperation]);

  // ============================================================================
  // TABLE CONFIGURATIONS
  // ============================================================================

  /**
   * Packages table columns
   */
  const packageColumns: TableColumn<AdminSubscriptionPlan>[] = useMemo(() => [
    {
      key: 'tier',
      header: 'Tier',
      accessor: (pkg) => <TierBadge tier={pkg.tier} />,
      sortable: true,
      width: '120px'
    },
    {
      key: 'name',
      header: 'Name',
      accessor: (pkg) => pkg.name,
      sortable: true,
      width: '200px'
    },
    {
      key: 'version',
      header: 'Version',
      accessor: (pkg) => pkg.version,
      width: '80px'
    },
    {
      key: 'pricing',
      header: 'Pricing',
      accessor: (pkg) => (
        <div className="text-sm">
          <div>Monthly: ${pkg.pricing_monthly || 0}</div>
          <div className="text-gray-500">Annual: ${pkg.pricing_annual || 0}</div>
        </div>
      ),
      width: '150px'
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (pkg) => (
        <StatusToggle
          status={pkg.status}
          onClick={() => void handleTogglePackageStatus(pkg)}
        />
      ),
      sortable: true,
      width: '100px'
    },
    {
      key: 'display',
      header: 'Display',
      accessor: (pkg) => (
        <DisplayToggle
          isDisplayed={pkg.is_displayed}
          onClick={() => void handleTogglePackageDisplay(pkg)}
        />
      ),
      sortable: true,
      width: '100px'
    },
    {
      key: 'effective_date',
      header: 'Effective Date',
      accessor: (pkg) => new Date(pkg.effective_date).toLocaleDateString(),
      sortable: true,
      width: '120px'
    }
  ], [handleTogglePackageStatus, handleTogglePackageDisplay]);

  /**
   * Open package editor directly (password collected on save)
   */
  const handleEditPackage = useCallback((pkg: AdminSubscriptionPlan) => {
    setSelectedPackageForEdit(pkg);
    setIsPackageEditorOpen(true);
  }, []);

  /**
   * Open upgrade package modal (Phase 5.4)
   */
  const handleUpgradePackage = useCallback((pkg: AdminSubscriptionPlan) => {
    setSelectedPackageForUpgrade(pkg);
    setIsUpgradePackageModalOpen(true);
  }, []);

  /**
   * Packages table actions
   * @canonical ADMIN_ACTION_BUTTON_PATTERN - iconOnly with consistent coloring
   * @see docs/governance/admin-action-button-canon.md
   */
  const packageActions: TableAction<AdminSubscriptionPlan>[] = useMemo(() => [
    {
      label: 'Upgrade',
      icon: <ArrowUpCircle className="w-4 h-4" />,
      iconOnly: true,
      onClick: (pkg) => handleUpgradePackage(pkg),
      isHidden: (pkg) => !pkg.is_displayed // Only show on displayed versions
    },
    {
      label: 'Edit',
      icon: <Edit2 className="w-4 h-4" />,
      iconOnly: true,
      onClick: (pkg) => handleEditPackage(pkg) // Opens editor directly, password on save
    },
    {
      label: 'Archive',
      icon: <Archive className="w-4 h-4" />,
      iconOnly: true,
      onClick: (pkg) => handleInitiatePasswordOperation('archive_package', pkg),
      variant: 'danger'
    }
  ], [handleEditPackage, handleUpgradePackage, handleInitiatePasswordOperation]);

  /**
   * Addons table columns
   */
  const addonColumns: TableColumn<AdminAddonSuite>[] = useMemo(() => [
    {
      key: 'suite_name',
      header: 'Suite',
      accessor: (addon) => (
        <span className="font-medium capitalize">{addon.suite_name.replace('_', ' ')}</span>
      ),
      sortable: true,
      width: '150px'
    },
    {
      key: 'display_name',
      header: 'Display Name',
      accessor: (addon) => addon.display_name,
      sortable: true,
      width: '200px'
    },
    {
      key: 'version',
      header: 'Version',
      accessor: (addon) => addon.version,
      width: '80px'
    },
    {
      key: 'pricing',
      header: 'Pricing',
      accessor: (addon) => (
        <div className="text-sm">
          <div>Monthly: ${addon.pricing_monthly || 0}</div>
          <div className="text-gray-500">Annual: ${addon.pricing_annual || 0}</div>
        </div>
      ),
      width: '150px'
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (addon) => (
        <StatusToggle
          status={addon.status}
          onClick={() => void handleToggleAddonStatus(addon)}
        />
      ),
      sortable: true,
      width: '100px'
    },
    {
      key: 'display',
      header: 'Display',
      accessor: (addon) => (
        <DisplayToggle
          isDisplayed={addon.is_displayed}
          onClick={() => void handleToggleAddonDisplay(addon)}
        />
      ),
      sortable: true,
      width: '100px'
    },
    {
      key: 'effective_date',
      header: 'Effective Date',
      accessor: (addon) => new Date(addon.effective_date).toLocaleDateString(),
      sortable: true,
      width: '120px'
    }
  ], [handleToggleAddonStatus, handleToggleAddonDisplay]);

  /**
   * Open addon editor directly (password collected on save)
   */
  const handleEditAddon = useCallback((addon: AdminAddonSuite) => {
    setSelectedAddonForEdit(addon);
    setIsAddonEditorOpen(true);
  }, []);

  /**
   * Open upgrade addon modal (Phase 5.4)
   */
  const handleUpgradeAddon = useCallback((addon: AdminAddonSuite) => {
    setSelectedAddonForUpgrade(addon);
    setIsUpgradeAddonModalOpen(true);
  }, []);

  /**
   * Addons table actions
   * @canonical ADMIN_ACTION_BUTTON_PATTERN - iconOnly with consistent coloring
   * @see docs/governance/admin-action-button-canon.md
   */
  const addonActions: TableAction<AdminAddonSuite>[] = useMemo(() => [
    {
      label: 'Upgrade',
      icon: <ArrowUpCircle className="w-4 h-4" />,
      iconOnly: true,
      onClick: (addon) => handleUpgradeAddon(addon),
      isHidden: (addon) => !addon.is_displayed // Only show on displayed versions
    },
    {
      label: 'Edit',
      icon: <Edit2 className="w-4 h-4" />,
      iconOnly: true,
      onClick: (addon) => handleEditAddon(addon) // Opens editor directly, password on save
    },
    {
      label: 'Archive',
      icon: <Archive className="w-4 h-4" />,
      iconOnly: true,
      onClick: (addon) => handleInitiatePasswordOperation('archive_addon', addon),
      variant: 'danger'
    }
  ], [handleEditAddon, handleUpgradeAddon, handleInitiatePasswordOperation]);

  // ============================================================================
  // AUTH GUARD
  // ============================================================================

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="mt-2 text-gray-600">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <PackageIcon className="h-8 w-8 text-[#ed6437]" />
          Packages & Add-Ons Management
        </h1>
        <p className="mt-2 text-gray-600">
          Manage subscription packages and add-on suites
        </p>
      </div>

      {/* Statistics */}
      <PackageStatistics
        totalPackages={statistics.total_packages}
        activePackages={statistics.active_packages}
        totalAddons={statistics.total_addons}
        activeAddons={statistics.active_addons}
        onAddPackage={() => {
          // Open PackageEditorModal for create (no password required)
          setSelectedPackageForEdit(null);
          setIsPackageEditorOpen(true);
        }}
        onAddAddon={() => {
          // Open AddonEditorModal for create (no password required)
          setSelectedAddonForEdit(null);
          setIsAddonEditorOpen(true);
        }}
      />

      {/* Packages Table */}
      <div className="mb-12">
        <AdminTableTemplate
          title="Subscription Packages"
          data={packages}
          columns={packageColumns}
          rowKey={(pkg) => pkg.id}
          actions={packageActions}
          loading={isLoadingPackages}
          emptyMessage="No packages found"
          pagination={{
            page: packagePage,
            pageSize: packagePageSize,
            total: packageTotal,
            onPageChange: setPackagePage
          }}
        />
      </div>

      {/* Add-Ons Table */}
      <div>
        <AdminTableTemplate
          title="Add-On Suites"
          data={addons}
          columns={addonColumns}
          rowKey={(addon) => addon.id}
          actions={addonActions}
          loading={isLoadingAddons}
          emptyMessage="No add-ons found"
          pagination={{
            page: addonPage,
            pageSize: addonPageSize,
            total: addonTotal,
            onPageChange: setAddonPage
          }}
        />
      </div>

      {/* Password Modal */}
      <AdminPasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setPendingPasswordOperation(null);
        }}
        onVerified={handlePasswordVerified}
        operationDescription={
          pendingPasswordOperation
            ? pendingPasswordOperation.type === 'archive_package'
              ? `archive package "${(pendingPasswordOperation.item as AdminSubscriptionPlan).name}"`
              : `archive add-on "${(pendingPasswordOperation.item as AdminAddonSuite).display_name}"`
            : ''
        }
      />

      {/* Package Editor Modal */}
      <PackageEditorModal
        isOpen={isPackageEditorOpen}
        onClose={() => {
          setIsPackageEditorOpen(false);
          setSelectedPackageForEdit(null);
        }}
        onSave={() => {
          void fetchPackages();
        }}
        package={selectedPackageForEdit}
      />

      {/* Addon Editor Modal */}
      <AddonEditorModal
        isOpen={isAddonEditorOpen}
        onClose={() => {
          setIsAddonEditorOpen(false);
          setSelectedAddonForEdit(null);
        }}
        onSave={() => {
          void fetchAddons();
        }}
        addon={selectedAddonForEdit}
      />

      {/* Archive Confirmation Modal */}
      {archiveTarget && (
        <ArchiveConfirmModal
          isOpen={isArchiveModalOpen}
          onClose={() => {
            setIsArchiveModalOpen(false);
            setArchiveTarget(null);
          }}
          onConfirm={() => {
            if (archiveTarget.type === 'package') {
              void fetchPackages();
            } else {
              void fetchAddons();
            }
          }}
          itemType={archiveTarget.type}
          itemId={archiveTarget.id}
          itemName={archiveTarget.name}
        />
      )}

      {/* Upgrade Package Modal (Phase 5.4) */}
      {selectedPackageForUpgrade && (
        <UpgradePackageModal
          isOpen={isUpgradePackageModalOpen}
          onClose={() => {
            setIsUpgradePackageModalOpen(false);
            setSelectedPackageForUpgrade(null);
          }}
          onSuccess={() => {
            void fetchPackages();
          }}
          package={selectedPackageForUpgrade}
        />
      )}

      {/* Upgrade Addon Modal (Phase 5.4) */}
      {selectedAddonForUpgrade && (
        <UpgradeAddonModal
          isOpen={isUpgradeAddonModalOpen}
          onClose={() => {
            setIsUpgradeAddonModalOpen(false);
            setSelectedAddonForUpgrade(null);
          }}
          onSuccess={() => {
            void fetchAddons();
          }}
          addon={selectedAddonForUpgrade}
        />
      )}
    </div>
  );
}

// ============================================================================
// PAGE EXPORT WITH ERROR BOUNDARY
// ============================================================================

export default function AdminPackagesPage() {
  return (
    <ErrorBoundary fallback={<ErrorFallback error={new Error('Component error')} resetError={() => window.location.reload()} />}>
      <AdminPackagesPageContent />
    </ErrorBoundary>
  );
}
