/**
 * ListingTemplateService - Listing Template Management Service
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via getDatabaseService()
 * - Import paths: Uses @core/ aliases
 * - Singleton factory pattern
 * - bigIntToNumber() on all COUNT(*) results
 * - safeJsonParse() on JSON columns (template_fields, example_content)
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority CLAUDE.md - DatabaseService boundary enforcement
 * @authority Phase 4C Brain Plan - ListingTemplateService
 * @phase Phase 4C - Task 4.14: ListingTemplateService
 */

import { getDatabaseService, DatabaseService } from '@core/services/DatabaseService';
import { bigIntToNumber, safeJsonParse } from '@core/utils/bigint';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface ListingTemplate {
  id: number;
  name: string;
  industry: string;
  description: string | null;
  default_type: string | null;
  default_tier: string | null;
  template_fields: Record<string, unknown> | null;
  example_content: Record<string, unknown> | null;
  icon: string | null;
  is_system: boolean;
  business_id: number | null;
  created_by_user_id: number | null;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateListingTemplateInput {
  name: string;
  industry?: string;
  description?: string | null;
  default_type?: string | null;
  default_tier?: string | null;
  template_fields?: Record<string, unknown> | null;
  example_content?: Record<string, unknown> | null;
  icon?: string | null;
  is_system?: boolean;
  business_id?: number | null;
  created_by_user_id?: number | null;
  is_active?: boolean;
}

export interface UpdateListingTemplateInput {
  name?: string;
  industry?: string;
  description?: string | null;
  default_type?: string | null;
  default_tier?: string | null;
  template_fields?: Record<string, unknown> | null;
  example_content?: Record<string, unknown> | null;
  icon?: string | null;
  is_system?: boolean;
  is_active?: boolean;
}

export interface GetAllFilters {
  industry?: string;
  is_system?: boolean;
  is_active?: boolean;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface PaginatedTemplates {
  items: ListingTemplate[];
  total: number;
}

// ============================================================================
// Row type from DB
// ============================================================================

interface TemplateRow {
  id: number | bigint;
  name: string;
  industry: string;
  description: string | null;
  default_type: string | null;
  default_tier: string | null;
  template_fields: string | Record<string, unknown> | null;
  example_content: string | Record<string, unknown> | null;
  icon: string | null;
  is_system: number | boolean;
  business_id: number | bigint | null;
  created_by_user_id: number | bigint | null;
  usage_count: number | bigint;
  is_active: number | boolean;
  created_at: string;
  updated_at: string;
}

interface CountRow {
  total: number | bigint;
}

interface InsertResult {
  insertId: number | bigint;
}

// ============================================================================
// Row mapper
// ============================================================================

function mapRow(row: TemplateRow): ListingTemplate {
  return {
    id: bigIntToNumber(row.id),
    name: row.name,
    industry: row.industry,
    description: row.description ?? null,
    default_type: row.default_type ?? null,
    default_tier: row.default_tier ?? null,
    template_fields: safeJsonParse<Record<string, unknown>>(
      row.template_fields as string | Record<string, unknown> | null | undefined,
      {}
    ) || null,
    example_content: safeJsonParse<Record<string, unknown>>(
      row.example_content as string | Record<string, unknown> | null | undefined,
      {}
    ) || null,
    icon: row.icon ?? null,
    is_system: Boolean(row.is_system),
    business_id: row.business_id != null ? bigIntToNumber(row.business_id) : null,
    created_by_user_id: row.created_by_user_id != null ? bigIntToNumber(row.created_by_user_id) : null,
    usage_count: bigIntToNumber(row.usage_count ?? 0),
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ============================================================================
// Service Class
// ============================================================================

class ListingTemplateService {
  private db: DatabaseService;

  constructor() {
    this.db = getDatabaseService();
  }

  /**
   * Get all active system templates ordered by usage_count DESC
   * Used by public template selector
   */
  async getSystemTemplates(): Promise<ListingTemplate[]> {
    const result = await this.db.query<TemplateRow>(
      `SELECT * FROM listing_templates
       WHERE is_system = 1 AND is_active = 1
       ORDER BY usage_count DESC`
    );
    return result.rows.map(mapRow);
  }

  /**
   * Get templates belonging to a specific business
   */
  async getBusinessTemplates(businessId: number): Promise<ListingTemplate[]> {
    const result = await this.db.query<TemplateRow>(
      `SELECT * FROM listing_templates
       WHERE business_id = ? AND is_active = 1
       ORDER BY usage_count DESC`,
      [businessId]
    );
    return result.rows.map(mapRow);
  }

  /**
   * Get a single template by ID
   */
  async getById(id: number): Promise<ListingTemplate | null> {
    const result = await this.db.query<TemplateRow>(
      `SELECT * FROM listing_templates WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!result.rows || result.rows.length === 0) return null;
    const row = result.rows[0];
    if (!row) return null;
    return mapRow(row);
  }

  /**
   * Create a new template
   */
  async create(data: CreateListingTemplateInput): Promise<ListingTemplate> {
    const templateFields = data.template_fields ? JSON.stringify(data.template_fields) : null;
    const exampleContent = data.example_content ? JSON.stringify(data.example_content) : null;

    const result = await this.db.query<InsertResult>(
      `INSERT INTO listing_templates
        (name, industry, description, default_type, default_tier, template_fields, example_content, icon, is_system, business_id, created_by_user_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        data.industry ?? 'custom',
        data.description ?? null,
        data.default_type ?? null,
        data.default_tier ?? null,
        templateFields,
        exampleContent,
        data.icon ?? null,
        data.is_system ? 1 : 0,
        data.business_id ?? null,
        data.created_by_user_id ?? null,
        data.is_active !== false ? 1 : 0,
      ]
    );

    const insertId = bigIntToNumber(result.insertId ?? 0);
    const created = await this.getById(insertId);
    if (!created) throw new Error('Failed to retrieve created template');
    return created;
  }

  /**
   * Update an existing template
   */
  async update(id: number, data: UpdateListingTemplateInput): Promise<ListingTemplate> {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { setClauses.push('name = ?'); values.push(data.name); }
    if (data.industry !== undefined) { setClauses.push('industry = ?'); values.push(data.industry); }
    if (data.description !== undefined) { setClauses.push('description = ?'); values.push(data.description); }
    if (data.default_type !== undefined) { setClauses.push('default_type = ?'); values.push(data.default_type); }
    if (data.default_tier !== undefined) { setClauses.push('default_tier = ?'); values.push(data.default_tier); }
    if (data.template_fields !== undefined) {
      setClauses.push('template_fields = ?');
      values.push(data.template_fields ? JSON.stringify(data.template_fields) : null);
    }
    if (data.example_content !== undefined) {
      setClauses.push('example_content = ?');
      values.push(data.example_content ? JSON.stringify(data.example_content) : null);
    }
    if (data.icon !== undefined) { setClauses.push('icon = ?'); values.push(data.icon); }
    if (data.is_system !== undefined) { setClauses.push('is_system = ?'); values.push(data.is_system ? 1 : 0); }
    if (data.is_active !== undefined) { setClauses.push('is_active = ?'); values.push(data.is_active ? 1 : 0); }

    if (setClauses.length === 0) {
      const existing = await this.getById(id);
      if (!existing) throw new Error(`Template ${id} not found`);
      return existing;
    }

    values.push(id);
    await this.db.query(
      `UPDATE listing_templates SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await this.getById(id);
    if (!updated) throw new Error(`Template ${id} not found after update`);
    return updated;
  }

  /**
   * Delete a template
   */
  async delete(id: number): Promise<void> {
    await this.db.query(
      `DELETE FROM listing_templates WHERE id = ?`,
      [id]
    );
  }

  /**
   * Increment usage count when a template is selected
   * Fire-and-forget safe — no return value needed
   */
  async incrementUsageCount(id: number): Promise<void> {
    await this.db.query(
      `UPDATE listing_templates SET usage_count = usage_count + 1 WHERE id = ?`,
      [id]
    );
  }

  /**
   * Get all templates with optional filters and pagination
   * Used by admin listing-templates page
   */
  async getAll(filters?: GetAllFilters, pagination?: PaginationOptions): Promise<PaginatedTemplates> {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (filters?.industry) {
      conditions.push('industry = ?');
      values.push(filters.industry);
    }
    if (filters?.is_system !== undefined) {
      conditions.push('is_system = ?');
      values.push(filters.is_system ? 1 : 0);
    }
    if (filters?.is_active !== undefined) {
      conditions.push('is_active = ?');
      values.push(filters.is_active ? 1 : 0);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countResult = await this.db.query<CountRow>(
      `SELECT COUNT(*) as total FROM listing_templates ${whereClause}`,
      values
    );
    const total = bigIntToNumber(countResult.rows[0]?.total ?? 0);

    // Paginated results
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const paginationValues = [...values, pageSize, offset];
    const rowsResult = await this.db.query<TemplateRow>(
      `SELECT * FROM listing_templates ${whereClause} ORDER BY usage_count DESC, id DESC LIMIT ? OFFSET ?`,
      paginationValues
    );

    return {
      items: rowsResult.rows.map(mapRow),
      total,
    };
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let instance: ListingTemplateService | null = null;

export function getListingTemplateService(): ListingTemplateService {
  if (!instance) {
    instance = new ListingTemplateService();
  }
  return instance;
}
