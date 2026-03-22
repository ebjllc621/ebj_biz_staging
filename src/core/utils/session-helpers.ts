/**
 * Session Helper Utilities
 *
 * Provides utilities for extracting and validating session data in API routes
 * for Phase 5.4 user-facing features.
 *
 * PHASE 3 UPDATE: Added cache-first pattern for session validation
 *
 * @authority PHASE_5.4_BRAIN_PLAN.md
 * @authority DATABASE_SCALING_MASTER_INDEX_BRAIN_PLAN.md Phase 3
 * @governance Build Map v2.1 ENHANCED compliance
 */

import { NextRequest } from 'next/server';
import { getSessionService } from '@core/services/ServiceRegistry';
import { getCacheManager } from '@core/cache';
import type { CachedSessionData, CachedUserData } from '@core/cache';
import { ErrorService } from '@core/services/ErrorService';

export interface SessionUser {
  id: number;
  email: string;
  name: string | null;
  account_type: 'visitor' | 'general' | 'listing_member' | 'admin';
  role: string;
  isVerified: boolean;
}

/**
 * Extract user session from Next.js request
 *
 * PHASE 3: Cache-first pattern
 * 1. Check session cache
 * 2. If cached, check user cache
 * 3. If not cached, validate via database and populate caches
 *
 * @param request - Next.js request object
 * @returns User data if valid session exists, null otherwise
 */
export async function getUserFromRequest(request: NextRequest): Promise<SessionUser | null> {
  try {
    // Get session cookie
    const sessionCookie = request.cookies.get('bk_session');
    if (!sessionCookie) {
      return null;
    }

    const sessionToken = sessionCookie.value;
    if (!sessionToken) {
      return null;
    }

    const cacheManager = getCacheManager();
    const sessionCache = cacheManager.getSessionCache();
    const userCache = cacheManager.getUserCache();

    // PHASE 3: Check session cache first
    const cachedSession = sessionCache.get(sessionToken);

    if (cachedSession) {
      // Session found in cache - check if expired
      if (cachedSession.expiresAt > new Date()) {
        // Check user cache
        const cachedUser = userCache.get(cachedSession.userId);

        if (cachedUser) {
          // Full cache hit - no database queries needed
          return {
            id: cachedUser.id,
            email: cachedUser.email,
            name: cachedUser.name,
            account_type: cachedUser.account_type,
            role: cachedUser.role,
            isVerified: cachedUser.isVerified
          };
        }

        // Session cached but user not - fetch user from DB
        const sessionService = getSessionService();
        const result = await sessionService.query(
          'SELECT id, email, display_name, username, role, is_verified FROM users WHERE id = ?',
          [cachedSession.userId]
        );

        if (result.rows.length === 0) {
          // User not found - invalidate session cache
          sessionCache.invalidate(sessionToken);
          return null;
        }

        const userRow = result.rows[0] as {
          id: number;
          email: string;
          display_name?: string | null;
          username?: string | null;
          role?: string;
          is_verified?: boolean;
        };

        // Cache user data
        const userData: CachedUserData = {
          id: userRow.id,
          email: userRow.email,
          name: (userRow.display_name || userRow.username || null) as string | null,
          account_type: (userRow.role || 'general') as 'visitor' | 'general' | 'listing_member' | 'admin',
          role: userRow.role || 'general',
          isVerified: Boolean(userRow.is_verified),
          cachedAt: new Date()
        };

        userCache.set(userRow.id, userData);

        return {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          account_type: userData.account_type,
          role: userData.role,
          isVerified: userData.isVerified
        };
      } else {
        // Session expired in cache - invalidate
        sessionCache.invalidate(sessionToken);
      }
    }

    // Cache miss or expired - validate via database
    const sessionService = getSessionService();
    const validation = await sessionService.validateSession(sessionToken);

    if (!validation.valid || !validation.session) {
      return null;
    }

    // Get user data from session
    const userId = validation.session.userId;

    // Query user table for complete user data
    const result = await sessionService.query(
      'SELECT id, email, display_name, username, role, is_verified FROM users WHERE id = ?',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const userRow = result.rows[0] as {
      id: number;
      email: string;
      display_name?: string | null;
      username?: string | null;
      role?: string;
      is_verified?: boolean;
    };

    // PHASE 3: Cache validated session
    const sessionData: CachedSessionData = {
      sessionId: validation.session.id,
      userId: String(userId),
      expiresAt: validation.session.expiresAt,
      validatedAt: new Date()
    };
    sessionCache.set(sessionToken, sessionData);

    // PHASE 3: Cache user data
    const userData: CachedUserData = {
      id: userRow.id,
      email: userRow.email,
      name: (userRow.display_name || userRow.username || null) as string | null,
      account_type: (userRow.role || 'general') as 'visitor' | 'general' | 'listing_member' | 'admin',
      role: userRow.role || 'general',
      isVerified: Boolean(userRow.is_verified),
      cachedAt: new Date()
    };
    userCache.set(userRow.id, userData);

    return {
      id: userRow.id,
      email: userRow.email,
      name: userData.name,
      account_type: userData.account_type,
      role: userRow.role || 'general',
      isVerified: Boolean(userRow.is_verified)
    };
  } catch (error) {
    ErrorService.capture('[session-helpers] Error in getUserFromRequest:', error);
    return null;
  }
}

/**
 * Check if user has listing_member or admin access
 */
export function isListingMember(user: SessionUser | null): boolean {
  if (!user) return false;
  return user.account_type === 'listing_member' || user.account_type === 'admin';
}

/**
 * Check if user can submit reviews (general, listing_member, or admin - NOT visitor)
 */
export function canSubmitReview(user: SessionUser | null): boolean {
  if (!user) return false;
  return user.account_type !== 'visitor';
}

/**
 * Invalidate session from cache (for logout)
 * GOVERNANCE: MUST be called on logout
 *
 * @param sessionToken - Session token to invalidate
 */
export function invalidateSessionCache(sessionToken: string): void {
  const cacheManager = getCacheManager();
  cacheManager.getSessionCache().invalidate(sessionToken);
}

/**
 * Invalidate all cached data for a user (for password change)
 * GOVERNANCE: MUST be called on password change
 *
 * @param userId - User ID to invalidate
 */
export function invalidateUserCache(userId: string | number): void {
  const cacheManager = getCacheManager();
  cacheManager.invalidateUser(userId);
}
