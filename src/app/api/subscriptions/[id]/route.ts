/**
 * Subscription Details API Route
 * GET /api/subscriptions/[id] - Get subscription by ID or listing ID
 * PATCH /api/subscriptions/[id] - Update subscription (cancel, renew, etc.)
 *
 * GOVERNANCE:
 * - Build Map v2.1 ENHANCED patterns
 * - DatabaseService boundary enforcement
 * - apiHandler wrapper (TODO: when available)
 * - Proper error handling with BizError
 *
 * @authority CLAUDE.md - API Standards
 * @phase Phase 4 - Task 4.6: SubscriptionService API Routes
 */

import { createSuccessResponse, createErrorResponse } from '@core/types/api-responses';


import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService, SubscriptionNotFoundError } from '@core/services/SubscriptionService';
import { getSubscriptionService } from '@core/services/ServiceRegistry';
import { BizError } from '@core/errors/BizError';

// Helper function to map BizError codes to HTTP status codes
function getHttpStatus(code: string): number {
  const statusMap: Record<string, number> = {
    'BAD_REQUEST': 400,
    'UNAUTHORIZED': 401,
    'FORBIDDEN': 403,
    'NOT_FOUND': 404,
    'VALIDATION_ERROR': 400,
    'ACCESS_DENIED': 403,
    'SERVICE_UNAVAILABLE': 503,
    'INTERNAL_SERVER_ERROR': 500,
    'INTERNAL_ERROR': 500,
    'DATABASE_ERROR': 500
  };
  return statusMap[code] || 500;
}

/**
 * GET /api/subscriptions/[id]
 * Retrieve subscription by ID or by listing ID
 *
 * Query Parameters:
 * - type: 'subscription' | 'listing' - ID type (default: 'subscription')
 *
 * Response:
 * - 200: Subscription object
 * - 404: Subscription not found
 * - 500: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        createErrorResponse('INVALID_ID', 'Invalid ID format'),
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'subscription';

    // Initialize services
    const subscriptionService = getSubscriptionService();

    // Get subscription
    let subscription;
    if (type === 'listing') {
      subscription = await subscriptionService.getSubscription(id);
    } else {
      subscription = await subscriptionService.getSubscriptionById(id);
    }

    if (!subscription) {
      return NextResponse.json(
        createErrorResponse('SUBSCRIPTION_NOT_FOUND', 'Subscription not found'),
        { status: 404 }
      );
    }

    // Get tier limits
    const tierLimits = await subscriptionService.getTierLimits(subscription.listing_id);

    return NextResponse.json({
      success: true,
      data: {
        subscription,
        tierLimits
      }
    });
  } catch (error) {
    if (error instanceof SubscriptionNotFoundError) {
      return NextResponse.json(
        createErrorResponse(error.code, error.userMessage || error.message),
        { status: 404 }
      );
    }

    if (error instanceof BizError) {
      return NextResponse.json(
        createErrorResponse(error.code, error.userMessage || error.message),
        { status: getHttpStatus(error.code) }
      );
    }

    return NextResponse.json(
      createErrorResponse('INTERNAL_SERVER_ERROR', 'An unexpected error occurred'),
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/subscriptions/[id]
 * Update subscription (cancel, renew, apply overrides)
 *
 * Body:
 * - action: 'cancel' | 'renew' | 'apply_overrides' | 'mark_grandfathered'
 * - overrides?: Partial<TierLimits> - For apply_overrides action
 *
 * Response:
 * - 200: Updated subscription
 * - 400: Invalid action or body
 * - 404: Subscription not found
 * - 500: Internal server error
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        createErrorResponse('INVALID_ID', 'Invalid ID format'),
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, overrides } = body;

    if (!action) {
      return NextResponse.json(
        createErrorResponse('MISSING_ACTION', 'Action is required'),
        { status: 400 }
      );
    }

    // Initialize services
    const subscriptionService = getSubscriptionService();

    // Perform action
    let result;
    switch (action) {
      case 'cancel':
        // Get subscription first to return its listing_id
        const subToCancel = await subscriptionService.getSubscriptionById(id);
        if (!subToCancel) {
          return NextResponse.json(
            createErrorResponse('SUBSCRIPTION_NOT_FOUND', 'Subscription not found'),
            { status: 404 }
          );
        }
        await subscriptionService.cancelSubscription(subToCancel.listing_id);
        result = { action: 'cancelled', subscriptionId: id };
        break;

      case 'renew':
        const renewed = await subscriptionService.renewSubscription(id);
        result = { action: 'renewed', subscription: renewed };
        break;

      case 'apply_overrides':
        if (!overrides) {
          return NextResponse.json(
            createErrorResponse('MISSING_OVERRIDES', 'Overrides are required for this action'),
            { status: 400 }
          );
        }
        await subscriptionService.applyOverrides(id, overrides);
        result = { action: 'overrides_applied', subscriptionId: id, overrides };
        break;

      case 'mark_grandfathered':
        await subscriptionService.markAsGrandfathered(id);
        result = { action: 'marked_grandfathered', subscriptionId: id };
        break;

      default:
        return NextResponse.json(
          createErrorResponse('INVALID_ACTION', 'Invalid action. Must be: cancel, renew, apply_overrides, or mark_grandfathered'),
          { status: 400 }
        );
    }

    return NextResponse.json(createSuccessResponse(result));
  } catch (error) {
    if (error instanceof SubscriptionNotFoundError) {
      return NextResponse.json(
        createErrorResponse(error.code, error.userMessage || error.message),
        { status: 404 }
      );
    }

    if (error instanceof BizError) {
      return NextResponse.json(
        createErrorResponse(error.code, error.userMessage || error.message),
        { status: getHttpStatus(error.code) }
      );
    }

    return NextResponse.json(
      createErrorResponse('INTERNAL_SERVER_ERROR', 'An unexpected error occurred'),
      { status: 500 }
    );
  }
}
