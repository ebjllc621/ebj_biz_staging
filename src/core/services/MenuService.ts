/**
 * MenuService - Site Navigation Menu Management
 *
 * @authority PHASE_5.2_BRAIN_PLAN.md (P1 Admin Pages - Task 3.4)
 * @governance Build Map v2.1 ENHANCED - STANDARD tier
 * @governance Service Architecture v2.0 compliance
 * @tier STANDARD - Menu CRUD with nested structure support
 *
 * PURPOSE:
 * - Manage site navigation menus (main_nav, footer_nav, admin_nav)
 * - Support nested menu structures
 * - Drag-and-drop reordering
 * - Menu location management (header, footer, sidebar)
 *
 * PHASE 5.2 IMPLEMENTATION:
 * - 8 core methods for menu management
 * - Nested menu item support via JSON
 * - Active/inactive menu toggle
 * - Display order management
 *
 * USAGE:
 * ```typescript
 * const menuService = new MenuService();
 * const menus = await menuService.getAllMenus();
 * await menuService.createMenu({ menu_key: 'main_nav', ... });
 * await menuService.reorderMenuItems(menuId, orderedIds);
 * ```
 */

// GOVERNANCE: DatabaseService boundary for all DB access
// GOVERNANCE: Service Architecture v2.0 compliance
// GOVERNANCE: Build Map v2.1 ENHANCED patterns

import { getDatabaseService } from './DatabaseService';
import { DbResult } from '@core/types/db';
import { AllRowTypes } from '@core/types/db-rows';
import { RowDataPacket, ResultSetHeader } from '@core/types/mariadb-compat';

// Internal interface for database row mapping (schema differs from db-rows.ts)
interface SiteMenuRowData {
  id: number;
  menu_key: string;
  menu_name: string;
  menu_location: string;
  menu_items: string | MenuItem[];
  is_active: number | boolean;
  display_order: number;
  created_at: Date | string;
  updated_at: Date | string;
  updated_by: number | null;
}

/**
 * Menu item structure (supports nesting)
 */
export interface MenuItem {
  label: string;
  url: string;
  icon?: string;
  children: MenuItem[];
  order?: number;
}

/**
 * Site menu entity
 */
export interface SiteMenu {
  id: number;
  menu_key: string;
  menu_name: string;
  menu_location: 'header' | 'footer' | 'sidebar';
  menu_items: MenuItem[];
  is_active: boolean;
  display_order: number;
  created_at: Date;
  updated_at: Date;
  updated_by: number | null;
}

/**
 * Input for creating a new menu
 */
export interface CreateMenuInput {
  menu_key: string;
  menu_name: string;
  menu_location: 'header' | 'footer' | 'sidebar';
  menu_items: MenuItem[];
  is_active?: boolean;
  display_order?: number;
  updated_by?: number;
}

/**
 * MenuService - Navigation menu management
 * GOVERNANCE: DatabaseService boundary, no direct DB access
 * GOVERNANCE: All methods return Promise with error handling
 * TIER: STANDARD - 8 methods, nested structures
 *
 * @complexity STANDARD (< 300 lines, ≤4 dependencies)
 */
export class MenuService {
  private db: ReturnType<typeof getDatabaseService>;

  constructor() {
    this.db = getDatabaseService();
  }

  /**
   * Get all menus
   * GOVERNANCE: Returns all menus with JSON parsing
   */
  async getAllMenus(): Promise<SiteMenu[]> {
    const result: DbResult<AllRowTypes> = await this.db.query(
      `SELECT * FROM site_menus ORDER BY display_order ASC, menu_name ASC`
    );

    return result.rows.map((row) => {
      const menuRow = row as unknown as SiteMenuRowData;
      return {
        ...menuRow,
        menu_items: typeof menuRow.menu_items === 'string' ? JSON.parse(menuRow.menu_items) : menuRow.menu_items
      } as SiteMenu;
    });
  }

  /**
   * Get menu by ID
   * GOVERNANCE: Single menu retrieval with JSON parsing
   */
  async getMenuById(id: number): Promise<SiteMenu | null> {
    const result: DbResult<AllRowTypes> = await this.db.query(
      `SELECT * FROM site_menus WHERE id = ?`,
      [id]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0] as unknown as SiteMenuRowData;
    return {
      ...row,
      menu_items: typeof row.menu_items === 'string' ? JSON.parse(row.menu_items) : row.menu_items
    } as SiteMenu;
  }

  /**
   * Get menu by key (e.g., 'main_nav', 'footer_nav')
   * GOVERNANCE: Lookup by unique menu_key
   */
  async getMenuByKey(menu_key: string): Promise<SiteMenu | null> {
    const result: DbResult<AllRowTypes> = await this.db.query(
      `SELECT * FROM site_menus WHERE menu_key = ?`,
      [menu_key]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0] as unknown as SiteMenuRowData;
    return {
      ...row,
      menu_items: typeof row.menu_items === 'string' ? JSON.parse(row.menu_items) : row.menu_items
    } as SiteMenu;
  }

  /**
   * Create new menu
   * GOVERNANCE: Insert with JSON serialization
   */
  async createMenu(data: CreateMenuInput): Promise<SiteMenu> {
    const result: DbResult<AllRowTypes> = await this.db.query(
      `INSERT INTO site_menus (menu_key, menu_name, menu_location, menu_items, is_active, display_order, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.menu_key,
        data.menu_name,
        data.menu_location,
        JSON.stringify(data.menu_items),
        data.is_active ?? true,
        data.display_order ?? 0,
        data.updated_by ?? null
      ]
    );

    const menu = await this.getMenuById(result.insertId!);
    if (!menu) {
      throw new Error('Failed to retrieve created menu');
    }

    return menu;
  }

  /**
   * Update existing menu
   * GOVERNANCE: Partial update with JSON serialization
   */
  async updateMenu(id: number, updates: Partial<CreateMenuInput>): Promise<SiteMenu> {
    const updateFields: string[] = [];
    const values: (string | number | boolean)[] = [];

    if (updates.menu_name !== undefined) {
      updateFields.push('menu_name = ?');
      values.push(updates.menu_name);
    }
    if (updates.menu_location !== undefined) {
      updateFields.push('menu_location = ?');
      values.push(updates.menu_location);
    }
    if (updates.menu_items !== undefined) {
      updateFields.push('menu_items = ?');
      values.push(JSON.stringify(updates.menu_items));
    }
    if (updates.is_active !== undefined) {
      updateFields.push('is_active = ?');
      values.push(updates.is_active);
    }
    if (updates.display_order !== undefined) {
      updateFields.push('display_order = ?');
      values.push(updates.display_order);
    }
    if (updates.updated_by !== undefined) {
      updateFields.push('updated_by = ?');
      values.push(updates.updated_by);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);

    await this.db.query(
      `UPDATE site_menus SET ${updateFields.join(', ')} WHERE id = ?`,
      values
    );

    const menu = await this.getMenuById(id);
    if (!menu) {
      throw new Error('Failed to retrieve updated menu');
    }

    return menu;
  }

  /**
   * Delete menu
   * GOVERNANCE: Hard delete (menus don't need soft delete)
   */
  async deleteMenu(id: number): Promise<void> {
    await this.db.query(
      `DELETE FROM site_menus WHERE id = ?`,
      [id]
    );
  }

  /**
   * Reorder menu items (drag-and-drop support)
   * GOVERNANCE: Updates menu_items JSON with new order
   *
   * @param menuId - Menu ID to update
   * @param orderedItems - Array of menu items in new order
   */
  async reorderMenuItems(menuId: number, orderedItems: MenuItem[]): Promise<SiteMenu> {
    return await this.updateMenu(menuId, {
      menu_items: orderedItems
    });
  }

  /**
   * Get menus by location (header, footer, sidebar)
   * GOVERNANCE: Filter by menu_location
   */
  async getMenusByLocation(location: 'header' | 'footer' | 'sidebar'): Promise<SiteMenu[]> {
    const result: DbResult<AllRowTypes> = await this.db.query(
      `SELECT * FROM site_menus WHERE menu_location = ? AND is_active = 1 ORDER BY display_order ASC`,
      [location]
    );

    interface MenuRow {
      id: number;
      parent_id: number | null;
      label: string;
      path: string;
      icon: string | null;
      sort_order: number;
      is_active: boolean;
      role_required: string | null;
      menu_key?: string;
      menu_name?: string;
      menu_location?: string;
      display_order?: number;
      is_visible?: boolean;
      menu_items?: string | MenuItem[];
      created_at?: Date;
      updated_at?: Date;
      updated_by?: number | null;
    }
    return (result.rows as unknown as MenuRow[]).map((row: MenuRow) => ({
      ...row,
      menu_key: row.menu_key || '',
      menu_name: row.menu_name || row.label,
      menu_location: row.menu_location || 'main',
      display_order: row.display_order || row.sort_order,
      is_visible: row.is_visible ?? row.is_active,
      menu_items: typeof row.menu_items === 'string' ? JSON.parse(row.menu_items) : row.menu_items || [],
      created_at: row.created_at || new Date(),
      updated_at: row.updated_at || new Date(),
      updated_by: row.updated_by || null
    })) as SiteMenu[];
  }
}

/**
 * Singleton instance accessor
 * GOVERNANCE: Standard service pattern
 */
let menuServiceInstance: MenuService | null = null;

export function getMenuService(): MenuService {
  if (!menuServiceInstance) {
    menuServiceInstance = new MenuService();
  }
  return menuServiceInstance;
}
