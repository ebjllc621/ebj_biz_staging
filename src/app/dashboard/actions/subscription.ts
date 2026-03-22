/**
 * Server Actions for Subscription Dashboard
 * Next.js 14 Server Actions pattern - separates data fetching from UI
 *
 * @authority Build Map v2.1 - Server Actions for data fetching
 * @remediation Phase R2.0.2 - Server Component architecture
 * @tier STANDARD
 */

'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionService, getListingService, getSubscriptionService } from '@core/services/ServiceRegistry';
import { getDatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';

/**
 * Server Action: Get authenticated user subscription data
 *
 * Uses httpOnly cookies for authentication, no DB access in page components
 *
 * @returns User subscription data with listings and plans
 */
export async function getUserSubscriptionData() {
  // 1. Get session from httpOnly cookie
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');

  if (!sessionCookie) {
    redirect('/login?message=Authentication required');
  }

  // 2. Initialize services with proper dependency injection
  const db = getDatabaseService();
  await db.initialize();

  // FIXED: Use singleton SessionService from ServiceRegistry
  // @governance service-architecture-standards.mdc - MANDATORY singleton pattern
  const sessionService = getSessionService();

  // 3. Validate session
  const validation = await sessionService.validateSession(sessionCookie.value);

  if (!validation.valid || !validation.session) {
    redirect('/login?message=Session expired');
  }

  const userId = validation.session.userId;

  // 4. Get user data
  const userResult = await db.query(
    'SELECT id, email, name, account_type, role FROM users WHERE id = ?',
    [userId]
  );

  if (userResult.rows.length === 0) {
    redirect('/login?message=User not found');
  }

  const user = userResult.rows[0] as Record<string, unknown>;

  // 5. Check account type
  if (user.account_type !== 'listing_member' && user.account_type !== 'admin') {
    redirect('/login?message=Listing membership required');
  }

  // 6. Get user listings
  const listingService = getListingService();

  const userListings = await listingService.getByUserId(Number(userId));

  if (!userListings || userListings.length === 0) {
    return {
      userId,
      user,
      listings: [],
      listing: null,
      subscription: null,
      currentPlan: null,
      availablePlans: [],
      isGrandfathered: false,
      nextBilling: null
    };
  }

  const listing = userListings[0]!; // Safe: length checked above

  // 7. Get subscription data
  const subscriptionService = getSubscriptionService();

  const subscription = await subscriptionService.getSubscription(Number(listing.id));
  const availablePlans = await subscriptionService.getActivePlans();

  let currentPlan = null;
  if (subscription) {
    currentPlan = await subscriptionService.getPlanById(subscription.plan_id);
  }

  return {
    userId,
    user: {
      id: user.id,
      email: user.email,
      name: user.name || null,
      account_type: user.account_type || 'general',
      role: user.role || 'user'
    },
    listings: userListings,
    listing,
    subscription,
    currentPlan,
    availablePlans,
    isGrandfathered: subscription?.is_grandfathered || false,
    nextBilling: subscription?.renews_at || null
  };
}

/**
 * Server Action: Get user subscription add-ons
 *
 * @returns User add-ons data for each listing
 */
export async function getUserSubscriptionAddons() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');

  if (!sessionCookie) {
    redirect('/login?message=Authentication required');
  }

  // Initialize services
  const db = getDatabaseService();
  await db.initialize();

  // FIXED: Use singleton SessionService from ServiceRegistry
  // @governance service-architecture-standards.mdc - MANDATORY singleton pattern
  const sessionService = getSessionService();

  const validation = await sessionService.validateSession(sessionCookie.value);

  if (!validation.valid || !validation.session) {
    redirect('/login?message=Session expired');
  }

  const userId = validation.session.userId;

  // Get user listings
  const listingService = getListingService();
  const subscriptionService = getSubscriptionService();

  const userListings = await listingService.getByUserId(Number(userId));

  if (!userListings || userListings.length === 0) {
    return {
      userId,
      listings: [],
      availableAddons: []
    };
  }

  const listing = userListings[0]!; // Safe: length checked above

  // Get add-ons data
  const activeAddons = await subscriptionService.getSubscriptionAddons(Number(listing.id));
  const availableAddons = await subscriptionService.getAllAddons();

  // Get current subscription to check Premium tier (Scribe SEO is free for Premium)
  const subscription = await subscriptionService.getSubscription(Number(listing.id));
  let currentPlan = null;
  if (subscription) {
    currentPlan = await subscriptionService.getPlanById(subscription.plan_id);
  }

  return {
    userId,
    listing,
    activeAddons,
    availableAddons,
    currentPlan,
    isPremium: currentPlan?.tier === 'premium'
  };
}
