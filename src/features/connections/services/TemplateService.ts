/**
 * TemplateService - Connection Request Template Management
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ and @features/ aliases
 * - Error handling: BizError-based custom errors
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority docs/pages/layouts/home/user/phases/troubleshooting/connect/fixes/connectP2/phases/PHASE_5_ADVANCED_FEATURES_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/features/contacts/services/ContactService.ts - CRUD pattern
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import { ConnectionTemplate, ConnectionIntentType } from '../types';
import { bigIntToNumber } from '@core/utils/bigint';
import { ErrorService } from '@core/services/ErrorService';

// ============================================================================
// Custom Errors
// ============================================================================

export class TemplateError extends BizError {
  constructor(message: string) {
    super({ code: 'TEMPLATE_ERROR', message, userMessage: message });
    this.name = 'TemplateError';
  }
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreateTemplateInput {
  name: string;
  message: string;
  connection_type: 'business' | 'professional' | 'personal';
  intent_type: ConnectionIntentType;
  is_default?: boolean;
}

export interface UpdateTemplateInput {
  name?: string;
  message?: string;
  connection_type?: 'business' | 'professional' | 'personal';
  intent_type?: ConnectionIntentType;
  is_default?: boolean;
}

// ============================================================================
// TemplateService Implementation
// ============================================================================

export class TemplateService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  /**
   * Get all templates for a user
   * Ordered by: default first, then by usage count
   */
  async getTemplates(userId: number): Promise<ConnectionTemplate[]> {
    const result: DbResult<ConnectionTemplate> = await this.db.query(
      `SELECT
        id, user_id, name, message, connection_type, intent_type,
        is_default, usage_count, created_at, updated_at
      FROM connection_request_templates
      WHERE user_id = ?
      ORDER BY is_default DESC, usage_count DESC, created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Get a single template by ID with ownership check
   */
  async getTemplateById(templateId: number, userId: number): Promise<ConnectionTemplate | null> {
    const result: DbResult<ConnectionTemplate> = await this.db.query(
      `SELECT
        id, user_id, name, message, connection_type, intent_type,
        is_default, usage_count, created_at, updated_at
      FROM connection_request_templates
      WHERE id = ? AND user_id = ?`,
      [templateId, userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Create a new template
   * Validates: no duplicate names, handles default setting
   */
  async createTemplate(userId: number, input: CreateTemplateInput): Promise<ConnectionTemplate> {
    // Validate required fields
    if (!input.name?.trim()) {
      throw new TemplateError('Template name is required');
    }

    if (!input.message?.trim()) {
      throw new TemplateError('Template message is required');
    }

    // Check for duplicate template name
    const existingResult: DbResult<{ id: number }> = await this.db.query(
      `SELECT id FROM connection_request_templates WHERE user_id = ? AND name = ?`,
      [userId, input.name.trim()]
    );

    if (existingResult.rows[0]) {
      throw new TemplateError('A template with this name already exists');
    }

    // If setting as default, unset other defaults first
    if (input.is_default) {
      await this.db.query(
        `UPDATE connection_request_templates SET is_default = FALSE WHERE user_id = ?`,
        [userId]
      );
    }

    // Create template
    const insertResult = await this.db.query(
      `INSERT INTO connection_request_templates
        (user_id, name, message, connection_type, intent_type, is_default, usage_count)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [
        userId,
        input.name.trim(),
        input.message.trim(),
        input.connection_type,
        input.intent_type,
        input.is_default || false
      ]
    );

    const templateId = (insertResult as any).insertId;
    const created = await this.getTemplateById(templateId, userId);

    if (!created) {
      throw new TemplateError('Failed to retrieve created template');
    }

    return created;
  }

  /**
   * Update an existing template
   * Validates ownership before updating
   */
  async updateTemplate(
    templateId: number,
    userId: number,
    input: UpdateTemplateInput
  ): Promise<ConnectionTemplate> {
    // Verify ownership
    const existing = await this.getTemplateById(templateId, userId);
    if (!existing) {
      throw new TemplateError('Template not found');
    }

    // Check for duplicate name if changing name
    if (input.name && input.name !== existing.name) {
      const duplicateResult: DbResult<{ id: number }> = await this.db.query(
        `SELECT id FROM connection_request_templates
         WHERE user_id = ? AND name = ? AND id != ?`,
        [userId, input.name.trim(), templateId]
      );

      if (duplicateResult.rows[0]) {
        throw new TemplateError('A template with this name already exists');
      }
    }

    // If setting as default, unset other defaults first
    if (input.is_default) {
      await this.db.query(
        `UPDATE connection_request_templates SET is_default = FALSE WHERE user_id = ? AND id != ?`,
        [userId, templateId]
      );
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      params.push(input.name.trim());
    }

    if (input.message !== undefined) {
      updates.push('message = ?');
      params.push(input.message.trim());
    }

    if (input.connection_type !== undefined) {
      updates.push('connection_type = ?');
      params.push(input.connection_type);
    }

    if (input.intent_type !== undefined) {
      updates.push('intent_type = ?');
      params.push(input.intent_type);
    }

    if (input.is_default !== undefined) {
      updates.push('is_default = ?');
      params.push(input.is_default);
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(templateId, userId);

    await this.db.query(
      `UPDATE connection_request_templates
       SET ${updates.join(', ')}
       WHERE id = ? AND user_id = ?`,
      params
    );

    const updated = await this.getTemplateById(templateId, userId);
    if (!updated) {
      throw new TemplateError('Failed to retrieve updated template');
    }

    return updated;
  }

  /**
   * Delete a template
   * Validates ownership before deletion
   */
  async deleteTemplate(templateId: number, userId: number): Promise<void> {
    // Verify ownership
    const existing = await this.getTemplateById(templateId, userId);
    if (!existing) {
      throw new TemplateError('Template not found');
    }

    await this.db.query(
      'DELETE FROM connection_request_templates WHERE id = ? AND user_id = ?',
      [templateId, userId]
    );
  }

  /**
   * Increment usage count for a template
   * Fire-and-forget operation, non-blocking
   */
  async incrementUsageCount(templateId: number, userId: number): Promise<void> {
    try {
      await this.db.query(
        `UPDATE connection_request_templates
         SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [templateId, userId]
      );
    } catch (error) {
      // Non-blocking: Log but don't throw
      ErrorService.capture('Failed to increment template usage count:', error);
    }
  }

  /**
   * Set a template as the default (unsets all others)
   */
  async setDefaultTemplate(templateId: number, userId: number): Promise<void> {
    // Verify ownership
    const existing = await this.getTemplateById(templateId, userId);
    if (!existing) {
      throw new TemplateError('Template not found');
    }

    // Unset all defaults for this user
    await this.db.query(
      `UPDATE connection_request_templates SET is_default = FALSE WHERE user_id = ?`,
      [userId]
    );

    // Set this template as default
    await this.db.query(
      `UPDATE connection_request_templates
       SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [templateId, userId]
    );
  }
}
