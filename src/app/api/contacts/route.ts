/**
 * Contacts API Route
 * GET /api/contacts - Get current user's contacts
 * POST /api/contacts - Create manual contact (Phase C)
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY for all API routes
 * - DatabaseService boundary: Service layer handles all DB operations
 * - Authentication: Required
 * - Response format: createSuccessResponse with explicit keys
 *
 * @authority docs/pages/layouts/home/user/user_dash/contacts/phases/PHASE_C_MANUAL_CONTACTS_BRAIN_PLAN.md
 * @tier SIMPLE
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/app/api/users/connections/route.ts - API handler pattern
 */

import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { BizError } from '@core/errors/BizError';
import { ContactService } from '@features/contacts/services/ContactService';
import { getDatabaseService } from '@core/services/DatabaseService';

/**
 * GET /api/contacts
 * Get all contacts for the authenticated user
 *
 * Query Parameters (Phase B):
 * - category (optional): Filter by category
 * - tags (optional): Comma-separated tags to filter by
 * - starred (optional): 'true' to show only starred
 * - archived (optional): 'true' to include archived
 *
 * @authenticated Required
 */
export const GET = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new ContactService(db);

  const userId = parseInt(context.userId!, 10);

  // Parse query parameters (Phase B filters)
  const url = new URL(context.request.url);
  const category = url.searchParams.get('category') as any;
  const tagsParam = url.searchParams.get('tags');
  const starredParam = url.searchParams.get('starred');
  const archivedParam = url.searchParams.get('archived');

  const filters = {
    category: category || undefined,
    tags: tagsParam ? tagsParam.split(',').map(t => t.trim()) : undefined,
    isStarred: starredParam === 'true' ? true : undefined,
    isArchived: archivedParam === 'true' ? true : false // Default to excluding archived
  };

  // Get contacts with filters
  const contacts = await service.getContacts(userId, filters);

  return createSuccessResponse({
    contacts,
    total: contacts.length,
    page: 1,
    per_page: contacts.length
  }, context.requestId);
}, {
  requireAuth: true
});

/**
 * POST /api/contacts
 * Create a new manual contact (Phase C)
 *
 * Body:
 * - name (required): Contact name
 * - email (optional): Contact email
 * - phone (optional): Contact phone
 * - company (optional): Contact company
 * - source (required): 'listing_inquiry' | 'event' | 'referral' | 'manual'
 * - source_details (optional): Additional source info
 * - notes, tags, category, priority, follow_up_date, follow_up_note (optional CRM fields)
 *
 * @authenticated Required
 */
export const POST = apiHandler(async (context: ApiContext) => {
  const db = getDatabaseService();
  const service = new ContactService(db);
  const userId = parseInt(context.userId!, 10);

  const body = await context.request.json();

  // Validate required fields
  if (!body.name?.trim()) {
    return createErrorResponse(
      new BizError({ code: 'MISSING_NAME', message: 'Contact name is required' }),
      context.requestId
    );
  }

  if (!body.source || body.source === 'connection') {
    return createErrorResponse(
      new BizError({ code: 'INVALID_SOURCE', message: 'Valid source is required (listing_inquiry, event, referral, or manual)' }),
      context.requestId
    );
  }

  try {
    const contact = await service.createManualContact(userId, {
      name: body.name,
      email: body.email,
      phone: body.phone,
      company: body.company,
      source: body.source,
      source_details: body.source_details,
      notes: body.notes,
      tags: body.tags,
      category: body.category,
      priority: body.priority,
      follow_up_date: body.follow_up_date,
      follow_up_note: body.follow_up_note
    });

    return createSuccessResponse({ contact }, context.requestId);
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      return createErrorResponse(
        new BizError({ code: 'CONTACT_EXISTS', message: error.message }),
        context.requestId
      );
    }
    throw error;
  }
}, {
  requireAuth: true
});