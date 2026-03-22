/**
 * Subscription Upgrade API Route
 * POST /api/subscriptions/[id]/upgrade - Upgrade/downgrade subscription
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
import {
  SubscriptionNotFoundError,
  PlanNotFoundError,
  InvalidUpgradePathError
} from '@core/services/SubscriptionService';
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
 * POST /api/subscriptions/[id]/upgrade
 * Upgrade or downgrade a subscription
 *
 * Body:
 * - newPlanId: number - Target plan ID
 * - type: 'upgrade' | 'downgrade' - Type of change (optional, inferred)
 *
 * Response:
 * - 200: Updated subscription with upgrade path details
 * - 400: Invalid plan or upgrade path
 * - 404: Subscription or plan not found
 * - 500: Internal server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const listingId = parseInt(params.id, 10);
    if (isNaN(listingId)) {
      return NextResponse.json(
        createErrorResponse('INVALID_ID', 'Invalid listing ID format'),
        { status: 400 }
      );
    }

    const body = await request.json();
    const { newPlanId, type } = body;

    if (!newPlanId) {
      return NextResponse.json(
        createErrorResponse('MISSING_PLAN_ID', 'New plan ID is required'),
        { status: 400 }
      );
    }

    // Initialize services
    const subscriptionService = getSubscriptionService();

    // Get current subscription
    const currentSubscription = await subscriptionService.getSubscription(listingId);
    if (!currentSubscription) {
      return NextResponse.json(
        createErrorResponse('SUBSCRIPTION_NOT_FOUND', 'No active subscription found for this listing'),
        { status: 404 }
      );
    }

    // Get current and target plans
    const currentPlan = await subscriptionService.getPlanById(currentSubscription.plan_id);
    const targetPlan = await subscriptionService.getPlanById(newPlanId);

    if (!currentPlan || !targetPlan) {
      return NextResponse.json(
        createErrorResponse('PLAN_NOT_FOUND', 'Plan not found'),
        { status: 404 }
      );
    }

    // Get upgrade path details
    const upgradePath = await subscriptionService.getUpgradePath(
      currentPlan.tier,
      targetPlan.tier
    );

    // Perform upgrade or downgrade
    let updatedSubscription;
    if (upgradePath.is_upgrade || type === 'upgrade') {
      updatedSubscription = await subscriptionService.upgradeSubscription(
        listingId,
        newPlanId
      );
    } else if (upgradePath.is_downgrade || type === 'downgrade') {
      updatedSubscription = await subscriptionService.downgradeSubscription(
        listingId,
        newPlanId
      );
    } else {
      return NextResponse.json(
        createErrorResponse('INVALID_UPGRADE_PATH', 'Cannot change to the same tier'),
        { status: 400 }
      );
    }

    // Get updated tier limits
    const newTierLimits = await subscriptionService.getTierLimits(listingId);

    return NextResponse.json({
      success: true,
      data: {
        subscription: updatedSubscription,
        tierLimits: newTierLimits,
        upgradePath,
        message: upgradePath.is_upgrade
          ? 'Subscription upgraded successfully (effective immediately)'
          : 'Subscription downgrade scheduled (effective at next renewal)'
      }
    });
  } catch (error) {
    if (error instanceof SubscriptionNotFoundError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.userMessage
          }
        },
        { status: 404 }
      );
    }

    if (error instanceof PlanNotFoundError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.userMessage
          }
        },
        { status: 404 }
      );
    }

    if (error instanceof InvalidUpgradePathError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.userMessage
          }
        },
        { status: 400 }
      );
    }

    if (error instanceof BizError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.userMessage || error.message
          }
        },
        { status: getHttpStatus(error.code) }
      );
    }

    return NextResponse.json(
      createErrorResponse('INTERNAL_SERVER_ERROR', 'An unexpected error occurred'),
      { status: 500 }
    );
  }
}
