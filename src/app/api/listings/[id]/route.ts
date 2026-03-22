/**
 * GET /api/listings/:id - Fetch listing by ID (public endpoint)
 * PATCH /api/listings/:id - Update listing (auth required)
 * DELETE /api/listings/:id - Delete listing (auth required)
 * P3.2 Implementation with validation patterns per anti-synthetic enforcement
 * Returns 501 NOT_IMPLEMENTED for happy paths, proper validation errors for invalid input
 */

import { NextRequest, NextResponse } from 'next/server';
import { toEnhancedJsonResponse, jsonMethodNotAllowed } from '@/lib/http/json';
import { readJson, requireAuth } from '@/lib/http/request-helpers';
import { createValidationError, createTaxonomyError, ERROR_CODES } from '@/lib/http/error-taxonomy';
import { validateListingUpdate } from '@/lib/listings/validation';
import type { ListingUpdate } from '@/lib/listings/contracts';
import { ListingsService } from '@/lib/listings/service';
import { isValidId } from '@/lib/util/id';

/**
 * GET /api/listings/:id - Fetch single listing (public endpoint)
 * Supports both numeric IDs (from database) and UUIDs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const endpoint = `/api/listings/${params.id}`;

  // Validate ID parameter
  if (!params.id || params.id.trim() === '') {
    return toEnhancedJsonResponse(
      createValidationError(
        'Listing ID is required',
        [{
          field: 'id',
          message: 'ID parameter cannot be empty',
          value: params.id
        }], endpoint)
    );
  }

  // Support numeric IDs (our database uses numeric IDs)
  const numericId = parseInt(params.id, 10);
  const isNumericId = !isNaN(numericId) && numericId > 0;
  const isUuid = isValidId(params.id);

  if (!isNumericId && !isUuid) {
    return toEnhancedJsonResponse(
      createValidationError(
        'Invalid listing ID format',
        [{
          field: 'id',
          message: 'ID must be a positive number or valid UUID',
          value: params.id
        }], endpoint)
    );
  }

  try {
    // For numeric IDs, query database directly
    if (isNumericId) {
      const { getDatabaseService } = await import('@core/services/DatabaseService');
      const db = getDatabaseService();
      const result = await db.query<any>(
        `SELECT l.*, c.name as category_name
         FROM listings l
         LEFT JOIN categories c ON l.category_id = c.id
         WHERE l.id = ?`,
        [numericId]
      );

      if (!result || !result.rows || result.rows.length === 0) {
        return toEnhancedJsonResponse(
          createTaxonomyError(ERROR_CODES.NOT_FOUND, 'Listing not found', undefined, endpoint),
          404
        );
      }

      const listing = result.rows[0];

      return toEnhancedJsonResponse({
        success: true,
        data: {
          listing: listing
        },
        timestamp: new Date().toISOString()
      });
    }

    // For UUID IDs, use ListingsService
    const service = new ListingsService();
    const listing = await service.getById(params.id);

    if (!listing) {
      return toEnhancedJsonResponse(
        createTaxonomyError(ERROR_CODES.NOT_FOUND, 'Listing not found', undefined, endpoint),
        404
      );
    }

    // Convert to API format
    const apiListing = {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      category: listing.category,
      price: undefined, // Not in our model yet
      location: listing.address || undefined,
      contactEmail: listing.email || '',
      userId: listing.ownerId || '',
      status: listing.status.toLowerCase() as 'draft' | 'active' | 'inactive' | 'pending',
      createdAt: listing.createdAt.toISOString(),
      updatedAt: listing.updatedAt.toISOString()
    };

    return toEnhancedJsonResponse({
      success: true,
      data: {
        listing: apiListing
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return toEnhancedJsonResponse(
      createTaxonomyError(ERROR_CODES.INTERNAL_ERROR, 'Failed to fetch listing', undefined, endpoint),
      500
    );
  }
}

/**
 * PATCH /api/listings/:id - Update listing (auth required)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const endpoint = `/api/listings/${params.id}`;
  
  // P3.2: Require authentication for PATCH operations
  const authResult = requireAuth(request);
  if ('error' in authResult) {
    return toEnhancedJsonResponse(authResult.error);
  }
  
  // Validate ID parameter
  if (!params.id || params.id.trim() === '') {
    return toEnhancedJsonResponse(
      createValidationError(
        'Listing ID is required',
        [{
          field: 'id',
          message: 'ID parameter cannot be empty',
          value: params.id
        }], endpoint)
    );
  }
  
  // Enhanced ID format validation
  if (!isValidId(params.id)) {
    return toEnhancedJsonResponse(
      createValidationError(
        'Invalid listing ID format',
        [{
          field: 'id',
          message: 'ID must be a valid UUID',
          value: params.id
        }], endpoint)
    );
  }
  
  // P3.2: Parse JSON with validation
  const jsonResult = await readJson<ListingUpdate>(request);
  if ('error' in jsonResult) {
    return toEnhancedJsonResponse(jsonResult.error);
  }
  
  // P3.2: Validate listing update fields with detailed error taxonomy
  const validationResult = validateListingUpdate(jsonResult.data, endpoint);
  if ('error' in validationResult) {
    return toEnhancedJsonResponse(validationResult.error);
  }
  
  try {
    const service = new ListingsService();
    const validatedData = validationResult.data;
    
    // Convert API format to service format
    const updateData = {
      id: params.id,
      ...(validatedData.title && { title: validatedData.title }),
      ...(validatedData.description && { description: validatedData.description }),
      ...(validatedData.category && { category: validatedData.category }),
      ...(validatedData.contactEmail && { email: validatedData.contactEmail }),
      ...(validatedData.location && { address: validatedData.location })
    };
    
    const listing = await service.update(updateData);
    
    if (!listing) {
      return toEnhancedJsonResponse(
        createTaxonomyError(ERROR_CODES.NOT_FOUND, 'Listing not found', undefined, endpoint),
        404
      );
    }
    
    // Convert to API format
    const apiListing = {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      category: listing.category,
      price: validatedData.price,
      location: listing.address,
      contactEmail: listing.email || '',
      userId: listing.ownerId || '',
      status: listing.status.toLowerCase() as 'draft' | 'active' | 'inactive' | 'pending',
      createdAt: listing.createdAt.toISOString(),
      updatedAt: listing.updatedAt.toISOString()
    };
    
    return toEnhancedJsonResponse({
      success: true,
      data: {
        listing: apiListing
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return toEnhancedJsonResponse(
      createTaxonomyError(ERROR_CODES.INTERNAL_ERROR, 'Failed to update listing', undefined, endpoint),
      500
    );
  }
}

/**
 * DELETE /api/listings/:id - Delete listing (auth required)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const endpoint = `/api/listings/${params.id}`;
  
  // P3.2: Require authentication for DELETE operations
  const authResult = requireAuth(request);
  if ('error' in authResult) {
    return toEnhancedJsonResponse(authResult.error);
  }
  
  // Validate ID parameter
  if (!params.id || params.id.trim() === '') {
    return toEnhancedJsonResponse(
      createValidationError(
        'Listing ID is required',
        [{
          field: 'id',
          message: 'ID parameter cannot be empty',
          value: params.id
        }], endpoint)
    );
  }
  
  // Enhanced ID format validation
  if (!isValidId(params.id)) {
    return toEnhancedJsonResponse(
      createValidationError(
        'Invalid listing ID format',
        [{
          field: 'id',
          message: 'ID must be a valid UUID',
          value: params.id
        }], endpoint)
    );
  }
  
  try {
    const service = new ListingsService();
    const deleted = await service.delete(params.id);
    
    if (!deleted) {
      return toEnhancedJsonResponse(
        createTaxonomyError(ERROR_CODES.NOT_FOUND, 'Listing not found', undefined, endpoint),
        404
      );
    }
    
    return toEnhancedJsonResponse({
      success: true,
      data: {
        success: true,
        message: 'Listing deleted successfully',
        deletedId: params.id
      },
      timestamp: new Date().toISOString()
    }, 204);
    
  } catch (error) {
    return toEnhancedJsonResponse(
      createTaxonomyError(ERROR_CODES.INTERNAL_ERROR, 'Failed to delete listing', undefined, endpoint),
      500
    );
  }
}

/**
 * PUT /api/listings/:id - Full listing update for EditListingModal (Phase 7)
 * @authority Phase 7 Brain Plan
 * @csrf Required via fetchWithCsrf
 */
import { apiHandler, ApiContext, createSuccessResponse as apiCreateSuccessResponse, createErrorResponse as apiCreateErrorResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { getUserFromRequest, isListingMember } from '@core/utils/session-helpers';
import { BizError } from '@core/errors/BizError';
import { withCsrf } from '@/lib/security/withCsrf';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withCsrf(apiHandler(async (context: ApiContext) => {
    const listingId = parseInt(params.id, 10);

  if (isNaN(listingId)) {
    return apiCreateErrorResponse(
      BizError.badRequest('Invalid listing ID'),
      context.requestId
    );
  }

  // Authentication required
  const user = await getUserFromRequest(request);
  if (!user) {
    return apiCreateErrorResponse(
      BizError.unauthorized('Authentication required'),
      context.requestId
    );
  }

  // Must be listing member or admin
  if (!isListingMember(user)) {
    return apiCreateErrorResponse(
      BizError.forbidden('update listings', 'listings'),
      context.requestId
    );
  }

  const body = await request.json();
  const db = getDatabaseService();

  try {
    // Verify ownership or admin status
    const ownershipResult = await db.query<any>(
      `SELECT user_id FROM listings WHERE id = ?`,
      [listingId]
    );

    if (!ownershipResult || !ownershipResult.rows || ownershipResult.rows.length === 0) {
      return apiCreateErrorResponse(
        BizError.notFound('Listing', listingId.toString()),
        context.requestId
      );
    }

    const ownerId = ownershipResult.rows[0].user_id;
    const isOwner = ownerId === user.id;
    const isAdmin = user.account_type === 'admin';

    if (!isOwner && !isAdmin) {
      return apiCreateErrorResponse(
        BizError.forbidden('update this listing', 'listing'),
        context.requestId
      );
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];

    if (body.name !== undefined) { updates.push('name = ?'); values.push(body.name); }
    if (body.slug !== undefined) { updates.push('slug = ?'); values.push(body.slug); }
    if (body.type !== undefined) { updates.push('type = ?'); values.push(body.type); }
    if (body.year_established !== undefined) { updates.push('year_established = ?'); values.push(body.year_established); }
    if (body.slogan !== undefined) { updates.push('slogan = ?'); values.push(body.slogan); }
    if (body.keywords !== undefined) { updates.push('keywords = ?'); values.push(Array.isArray(body.keywords) ? JSON.stringify(body.keywords) : body.keywords); }
    if (body.description !== undefined) { updates.push('description = ?'); values.push(body.description); }
    if (body.tier !== undefined) { updates.push('tier = ?'); values.push(body.tier); }
    if (body.add_ons !== undefined) { updates.push('add_ons = ?'); values.push(body.add_ons); }
    if (body.mock !== undefined) { updates.push('mock = ?'); values.push(body.mock ? 1 : 0); }
    if (body.business_hours !== undefined) { updates.push('business_hours = ?'); values.push(typeof body.business_hours === 'string' ? body.business_hours : JSON.stringify(body.business_hours)); }
    if (body.hours_status !== undefined) { updates.push('hours_status = ?'); values.push(body.hours_status); }
    if (body.timezone !== undefined) { updates.push('timezone = ?'); values.push(body.timezone); }
    if (body.address !== undefined) { updates.push('address = ?'); values.push(body.address); }
    if (body.city !== undefined) { updates.push('city = ?'); values.push(body.city); }
    if (body.state !== undefined) { updates.push('state = ?'); values.push(body.state); }
    if (body.zip_code !== undefined) { updates.push('zip_code = ?'); values.push(body.zip_code); }
    if (body.country !== undefined) { updates.push('country = ?'); values.push(body.country); }
    if (body.latitude !== undefined) { updates.push('latitude = ?'); values.push(body.latitude); }
    if (body.longitude !== undefined) { updates.push('longitude = ?'); values.push(body.longitude); }
    if (body.phone !== undefined) { updates.push('phone = ?'); values.push(body.phone); }
    if (body.email !== undefined) { updates.push('email = ?'); values.push(body.email); }
    if (body.website !== undefined) { updates.push('website = ?'); values.push(body.website); }
    if (body.social_media !== undefined) { updates.push('social_media = ?'); values.push(body.social_media); }
    if (body.logo_url !== undefined) { updates.push('logo_url = ?'); values.push(body.logo_url); }
    if (body.cover_image_url !== undefined) { updates.push('cover_image_url = ?'); values.push(body.cover_image_url); }
    if (body.video_url !== undefined) { updates.push('video_url = ?'); values.push(body.video_url); }
    if (body.audio_url !== undefined) { updates.push('audio_url = ?'); values.push(body.audio_url); }
    if (body.meta_title !== undefined) { updates.push('meta_title = ?'); values.push(body.meta_title); }
    if (body.meta_description !== undefined) { updates.push('meta_description = ?'); values.push(body.meta_description); }
    if (body.meta_keywords !== undefined) { updates.push('meta_keywords = ?'); values.push(body.meta_keywords); }
    if (body.contact_name !== undefined) { updates.push('contact_name = ?'); values.push(body.contact_name); }
    if (body.contact_email !== undefined) { updates.push('contact_email = ?'); values.push(body.contact_email); }
    if (body.contact_phone !== undefined) { updates.push('contact_phone = ?'); values.push(body.contact_phone); }
    if (body.gallery_images !== undefined) { updates.push('gallery_images = ?'); values.push(JSON.stringify(body.gallery_images)); }
    if (body.gallery_layout !== undefined) { updates.push('gallery_layout = ?'); values.push(body.gallery_layout); }
    if (body.video_gallery !== undefined) { updates.push('video_gallery = ?'); values.push(JSON.stringify(body.video_gallery)); }
    if (body.video_gallery_layout !== undefined) { updates.push('video_gallery_layout = ?'); values.push(body.video_gallery_layout); }
    if (body.combine_video_gallery !== undefined) { updates.push('combine_video_gallery = ?'); values.push(body.combine_video_gallery ? 1 : 0); }
    if (body.active_categories !== undefined) { updates.push('active_categories = ?'); values.push(JSON.stringify(body.active_categories)); }
    if (body.bank_categories !== undefined) { updates.push('bank_categories = ?'); values.push(JSON.stringify(body.bank_categories)); }

    if (updates.length === 0) {
      return apiCreateErrorResponse(
        BizError.badRequest('No fields to update'),
        context.requestId
      );
    }

    // Execute update
    values.push(listingId);
    await db.query(
      `UPDATE listings SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    // Handle categories if provided
    if (body.category_ids && Array.isArray(body.category_ids)) {
      // Update primary category (first one)
      if (body.category_ids.length > 0) {
        await db.query(
          `UPDATE listings SET category_id = ? WHERE id = ?`,
          [body.category_ids[0], listingId]
        );
      }
    }

    return apiCreateSuccessResponse(
      {
        listing: { id: listingId },
        message: 'Listing updated successfully',
      },
      context.requestId
    );
  } catch (error) {
    return apiCreateErrorResponse(
      error instanceof BizError
        ? error
        : BizError.internalServerError('ListingUpdate', error instanceof Error ? error : undefined),
      context.requestId
    );
  }
  }))(request);
}

// P3.0c: Explicit method guards - GET, PATCH, DELETE, and PUT allowed for individual listings
const ALLOWED_METHODS = ['GET', 'PATCH', 'DELETE', 'PUT'];

export async function POST() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}