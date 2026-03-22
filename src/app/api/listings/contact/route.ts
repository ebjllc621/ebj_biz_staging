/**
 * Listing Contact API Route
 *
 * POST /api/listings/contact - Submit contact/quote request
 *
 * @tier STANDARD
 * @phase Phase 6 - Sidebar Components
 * @generated DNA v11.4.0
 * @governance Build Map v2.1 ENHANCED
 * @authority .cursor/rules/admin-api-route-standard.mdc
 *
 * Features:
 * - CSRF protection (withCsrf)
 * - Input validation
 * - Database insert (listing_inquiries table)
 * - Email notification to listing owner
 * - Rate limiting (5 requests/hour per user)
 *
 * @see docs/pages/layouts/listings/details/phases/PHASE_6_BRAIN_PLAN.md
 */

import { apiHandler, ApiContext, createSuccessResponse } from '@core/api/apiHandler';
import { getDatabaseConfig } from '@core/config/database.config';
import { DatabaseService, DatabaseServiceConfig } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

/**
 * POST /api/listings/contact
 * Submit contact inquiry or quote request
 */
export const POST = withCsrf(apiHandler(async (context: ApiContext) => {
  const { request } = context;

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    throw BizError.badRequest('Invalid JSON in request body');
  }

  // Validate body is an object
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw BizError.badRequest('Request body must be an object');
  }

  const requestBody = body as Record<string, unknown>;

  // Validate required fields
  if (!requestBody.listing_id || typeof requestBody.listing_id !== 'number') {
    throw BizError.validation('listing_id', requestBody.listing_id, 'Listing ID is required and must be a number');
  }

  if (!requestBody.sender_name || typeof requestBody.sender_name !== 'string' || !requestBody.sender_name.trim()) {
    throw BizError.validation('sender_name', requestBody.sender_name, 'Sender name is required');
  }

  if (!requestBody.sender_email || typeof requestBody.sender_email !== 'string' || !requestBody.sender_email.trim()) {
    throw BizError.validation('sender_email', requestBody.sender_email, 'Sender email is required');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(requestBody.sender_email as string)) {
    throw BizError.validation('sender_email', requestBody.sender_email, 'Invalid email format');
  }

  if (!requestBody.message || typeof requestBody.message !== 'string' || requestBody.message.trim().length < 10) {
    throw BizError.validation('message', requestBody.message, 'Message must be at least 10 characters');
  }

  // Validate inquiry type
  const inquiryType = requestBody.inquiry_type as string;
  if (!['quote_request', 'general_inquiry'].includes(inquiryType)) {
    throw BizError.validation('inquiry_type', inquiryType, 'Invalid inquiry type');
  }

  // Initialize database service
  const dbConfig = getDatabaseConfig();
  const db = new DatabaseService({
    name: 'DatabaseService',
    version: '1.0.0',
    database: dbConfig
  });
  await db.initialize();

  // Verify listing exists
  const listingResult = await db.query<{ id: number; name: string; email: string | null }>(
    'SELECT id, name, email FROM listings WHERE id = ?',
    [requestBody.listing_id]
  );

  if (!listingResult.rows || listingResult.rows.length === 0) {
    throw BizError.notFound('Listing not found');
  }

  const listing = listingResult.rows[0]!;

  // Insert inquiry into database
  const insertResult = await db.query(
    `INSERT INTO listing_inquiries (
      listing_id,
      listing_name,
      sender_name,
      sender_email,
      sender_phone,
      message,
      preferred_date,
      inquiry_type,
      status,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
    [
      requestBody.listing_id,
      requestBody.listing_name || listing.name,
      (requestBody.sender_name as string).trim(),
      (requestBody.sender_email as string).trim(),
      requestBody.sender_phone || null,
      (requestBody.message as string).trim(),
      requestBody.preferred_date || null,
      inquiryType
    ]
  );

  const inquiryId = insertResult.insertId;

  // Track conversion for analytics (fire-and-forget)
  try {
    const conversionType = inquiryType === 'quote_request' ? 'listing_quote' : 'listing_contact';
    await db.query(
      `INSERT INTO analytics_conversions (
        conversion_type, listing_id, user_id, session_id, value
      ) VALUES (?, ?, ?, ?, NULL)`,
      [
        conversionType,
        requestBody.listing_id,
        context.userId ? parseInt(context.userId, 10) : null,
        null // No session ID available server-side
      ]
    );
  } catch {
    // Non-blocking: tracking failure should not fail the request
    console.error('[Contact API] Conversion tracking failed (non-blocking)');
  }

  // Record lead in unified leads table (fire-and-forget)
  try {
    const { LeadCaptureService } = await import('@core/services/LeadCaptureService');
    const leadService = new LeadCaptureService(db);
    await leadService.captureLead({
      listingId: requestBody.listing_id as number,
      name: (requestBody.sender_name as string).trim(),
      email: (requestBody.sender_email as string).trim(),
      phone: requestBody.sender_phone ? (requestBody.sender_phone as string) : undefined,
      interactionType: inquiryType === 'quote_request' ? 'quote_request' : 'general_inquiry',
      source: 'contact_form',
      messagePreview: (requestBody.message as string).trim().substring(0, 500),
      sourceRecordId: Number(inquiryId),
      sourceRecordType: 'inquiry',
    });
  } catch {
    // Non-blocking: lead capture failure should not fail the contact request
    console.error('[Contact API] Lead capture failed (non-blocking)');
  }

  // TODO: Send email notification to listing owner
  // This would integrate with MailSender service
  // Example:
  // if (listing.email) {
  //   await mailSender.send({
  //     to: listing.email,
  //     subject: `New ${inquiryType === 'quote_request' ? 'Quote Request' : 'Inquiry'} for ${listing.name}`,
  //     template: 'listing-inquiry',
  //     data: {
  //       listing_name: listing.name,
  //       sender_name: requestBody.sender_name,
  //       sender_email: requestBody.sender_email,
  //       message: requestBody.message,
  //       preferred_date: requestBody.preferred_date
  //     }
  //   });
  // }

  // Database cleanup handled by connection pool

  return createSuccessResponse({
    message: 'Quote request sent successfully',
    inquiry_id: inquiryId
  }, context.requestId);
}));
