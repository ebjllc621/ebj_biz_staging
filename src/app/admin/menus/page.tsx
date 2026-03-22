/**
 * Admin Site Menus Page
 *
 * GOVERNANCE COMPLIANCE:
 * - Template: AdminDashboardTemplate with menu editor (STANDARD tier)
 * - Authentication: Admin-only access required
 * - Service Boundary: MenuService via API routes (NO direct database)
 * - Credentials: 'include' for all fetch requests
 *
 * Features:
 * - Menu location selection (header, footer, sidebar, mobile)
 * - Nested menu item support
 * - Drag-and-drop ordering (display_order)
 * - Menu item CRUD operations
 * - Active/inactive status toggle
 * - Icon and URL configuration
 *
 * @authority PHASE_5.2_BRAIN_PLAN.md - Section 3.2.4
 * @component
 * @returns {JSX.Element} Admin menu management interface
 */

'use client';


// Force dynamic rendering (required for useAuth() - React Context cannot be used in SSG)
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { BizModal, BizModalButton } from '@/components/ui/BizModal';
import { useAuth } from '@core/hooks/useAuth';
import { fetchWithCsrf } from '@core/utils/csrf';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type MenuLocation = 'header' | 'footer' | 'sidebar' | 'mobile';

interface MenuItem {
  id: number;
  location: MenuLocation;
  label: string;
  url: string;
  icon: string | null;
  parent_id: number | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  children?: MenuItem[];
}

interface MenuItemFormData {
  label: string;
  url: string;
  icon: string;
  parent_id: number | null;
  is_active: boolean;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Menu Item Editor Modal Component
 */
function MenuItemEditorModal({
  item,
  location,
  parentItem,
  availableParents,
  isOpen,
  onClose,
  onSave
}: {
  item?: MenuItem | null;
  location: MenuLocation;
  parentItem?: MenuItem | null;
  availableParents: MenuItem[];
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState<MenuItemFormData>({
    label: item?.label ?? '',
    url: item?.url ?? '',
    icon: item?.icon ?? '',
    parent_id: parentItem?.id ?? item?.parent_id ?? null,
    is_active: item?.is_active ?? true
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        label: item.label,
        url: item.url,
        icon: item.icon ?? '',
        parent_id: item.parent_id,
        is_active: item.is_active
      });
    } else if (parentItem) {
      setFormData(prev => ({
        ...prev,
        parent_id: parentItem.id
      }));
    }
  }, [item, parentItem]);

  const handleSubmit = async () => {
    if (!formData.label.trim() || !formData.url.trim()) {
      alert('Label and URL are required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        location,
        icon: formData.icon || null
      };

      const url = item
        ? `/api/admin/menus/${item.id}`
        : '/api/admin/menus';

      const method = item ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        onSave();
        onClose();
      } else {
        const error = await response.json();
        alert(error.message ?? 'Failed to save menu item');
      }
    } catch (error) {
      alert('Error saving menu item');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BizModal
      isOpen={isOpen}
      onClose={onClose}
      title={item ? `Edit Menu Item: ${item.label}` : 'Create Menu Item'}
      size="medium"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Label *</label>
          <input
            type="text"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            className="w-full px-3 py-2 border rounded"
            placeholder="Home"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">URL *</label>
          <input
            type="text"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            className="w-full px-3 py-2 border rounded"
            placeholder="/home"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Absolute or relative URL</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Icon (optional)</label>
          <input
            type="text"
            value={formData.icon}
            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
            className="w-full px-3 py-2 border rounded"
            placeholder="home-icon"
          />
          <p className="text-xs text-gray-500 mt-1">Icon identifier (e.g., FontAwesome class)</p>
        </div>

        {!parentItem && availableParents.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1">Parent Menu (optional)</label>
            <select
              value={formData.parent_id ?? ''}
              onChange={(e) => setFormData({
                ...formData,
                parent_id: e.target.value ? parseInt(e.target.value) : null
              })}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">None (Root Level)</option>
              {availableParents.map(parent => (
                <option key={parent.id} value={parent.id}>
                  {parent.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            />
            <span className="text-sm font-medium">Active</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <BizModalButton variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </BizModalButton>
          <BizModalButton variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : item ? 'Update' : 'Create'}
          </BizModalButton>
        </div>
      </div>
    </BizModal>
  );
}

/**
 * Menu Item Tree Node Component (Recursive)
 */
function MenuItemNode({
  item,
  level = 0,
  onEdit,
  onAddChild,
  onDelete,
  onMove
}: {
  item: MenuItem;
  level: number;
  onEdit: (item: MenuItem) => void;
  onAddChild: (parent: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
  onMove: (item: MenuItem, direction: 'up' | 'down') => void;
}) {
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div className="border-l border-gray-300" style={{ marginLeft: `${level * 20}px` }}>
      <div className="flex items-center gap-2 py-2 px-3 hover:bg-gray-50">
        {/* Menu Info */}
        <div className="flex-1 flex items-center gap-3">
          {item.icon && (
            <span className="text-gray-600 text-sm">{item.icon}</span>
          )}
          <span className="font-medium">{item.label}</span>
          <span className="text-sm text-gray-500">→ {item.url}</span>
          {!item.is_active && (
            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
              INACTIVE
            </span>
          )}
          <span className="text-xs text-gray-600">
            Order: {item.display_order}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-1">
          <button
            onClick={() => onMove(item, 'up')}
            className="px-2 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            title="Move Up"
          >
            ▲
          </button>
          <button
            onClick={() => onMove(item, 'down')}
            className="px-2 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            title="Move Down"
          >
            ▼
          </button>
          <button
            onClick={() => onAddChild(item)}
            className="px-2 py-1 text-sm bg-[#ed6437] text-white rounded hover:bg-[#d55a2f]"
          >
            Add Child
          </button>
          <button
            onClick={() => onEdit(item)}
            className="px-2 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(item)}
            className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Render Children */}
      {hasChildren && (
        <div>
          {item.children!.map(child => (
            <MenuItemNode
              key={child.id}
              item={child}
              level={level + 1}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onMove={onMove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * AdminMenusPage - Site navigation menu management for platform administrators
 *
 * Provides CRUD operations for hierarchical menu structures.
 * Requires admin role for access.
 *
 * @component
 * @returns {JSX.Element} Admin menu management interface
 */
export default function AdminMenusPage() {
  const { user } = useAuth();
  const [location, setLocation] = useState<MenuLocation>('header');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [parentItem, setParentItem] = useState<MenuItem | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  // GOVERNANCE FIX: useEffect MUST be called before any early returns
  // React Rules of Hooks: Hooks must be called in the same order on every render
  useEffect(() => {
    // Only fetch if user is admin - conditional logic INSIDE the hook
    if (user?.role === 'admin') {
      fetchMenuItems();
    }
  }, [user, location]);

  // Conditional returns AFTER all hooks
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600 font-medium">Access Denied: Admin privileges required</div>
      </div>
    );
  }

  const fetchMenuItems = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/menus?location=${location}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setMenuItems(data.data?.items ?? []);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================

  const handleDelete = async (item: MenuItem) => {
    if (!confirm(`Delete menu item "${item.label}"?${item.children?.length ? ' This will also delete all child items.' : ''}`)) {
      return;
    }

    try {
      // @governance MANDATORY - CSRF protection for DELETE requests
      // Source: osi-production-compliance.mdc, Layer 7 Security
      const response = await fetchWithCsrf(`/api/admin/menus/${item.id}`, {method: 'DELETE'});

      if (response.ok) {
        await fetchMenuItems();
      } else {
        alert('Failed to delete menu item');
      }
    } catch (error) {
      alert('Error deleting menu item');
    }
  };

  const handleMove = async (item: MenuItem, direction: 'up' | 'down') => {
    try {
      const response = await fetch(`/api/admin/menus/${item.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_order: direction === 'up' ? item.display_order - 1 : item.display_order + 1
        })
      });

      if (response.ok) {
        await fetchMenuItems();
      }
    } catch (error) {
    }
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const flattenMenuItems = (items: MenuItem[]): MenuItem[] => {
    const result: MenuItem[] = [];
    const flatten = (items: MenuItem[]) => {
      items.forEach(item => {
        result.push(item);
        if (item.children) {
          flatten(item.children);
        }
      });
    };
    flatten(items);
    return result;
  };

  const availableParents = flattenMenuItems(menuItems).filter(item =>
    !selectedItem || item.id !== selectedItem.id
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  const locations: { key: MenuLocation; label: string }[] = [
    { key: 'header', label: 'Header Menu' },
    { key: 'footer', label: 'Footer Menu' },
    { key: 'sidebar', label: 'Sidebar Menu' },
    { key: 'mobile', label: 'Mobile Menu' }
  ];

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Site Menus</h1>

        <div className="flex gap-4">
          {/* Location Selector */}
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value as MenuLocation)}
            className="px-4 py-2 border rounded"
          >
            {locations.map(loc => (
              <option key={loc.key} value={loc.key}>{loc.label}</option>
            ))}
          </select>

          <button
            onClick={() => {
              setSelectedItem(null);
              setParentItem(null);
              setEditorOpen(true);
            }}
            className="px-4 py-2 bg-[#ed6437] text-white rounded hover:bg-[#d55a2f]"
          >
            Create Root Item
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white p-8 rounded shadow text-center text-gray-500">
          Loading menu items...
        </div>
      ) : menuItems.length === 0 ? (
        <div className="bg-white p-8 rounded shadow text-center text-gray-500">
          No menu items found for this location
        </div>
      ) : (
        <div className="bg-white rounded shadow">
          {menuItems.map(item => (
            <MenuItemNode
              key={item.id}
              item={item}
              level={0}
              onEdit={(item) => {
                setSelectedItem(item);
                setParentItem(null);
                setEditorOpen(true);
              }}
              onAddChild={(parent) => {
                setParentItem(parent);
                setSelectedItem(null);
                setEditorOpen(true);
              }}
              onDelete={handleDelete}
              onMove={handleMove}
            />
          ))}
        </div>
      )}

      {/* Editor Modal */}
      <MenuItemEditorModal
        item={selectedItem}
        location={location}
        parentItem={parentItem}
        availableParents={availableParents}
        isOpen={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setSelectedItem(null);
          setParentItem(null);
        }}
        onSave={fetchMenuItems}
      />
    </>
  );
}
