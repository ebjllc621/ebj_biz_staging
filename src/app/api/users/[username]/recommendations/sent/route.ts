/**
 * User Sent Recommendations API Route
 * GET /api/users/[username]/recommendations/sent - Get recommendations sent by a user
 *
 * GOVERNANCE COMPLIANCE:
 * - apiHandler wrapper: MANDATORY
 * - DatabaseService boundary: ALL database operations via service layer
 * - Import paths: Uses @core/ and @features/ aliases
 * - Build Map v2.1 ENHANCED patterns
 *
 * @tier SIMPLE
 * @generated DNA v11.4.0
 * @dna-version 11.4.0
 */

import { NextRequest } from 'next/server';
import { apiHandler, ApiContext, createSuccessResponse, createErrorResponse } from '@core/api/apiHandler';
import { getDatabaseService } from '@core/services/DatabaseService';
import { SharingService } from '@features/contacts/services/SharingService';
import { BizError } from '@core/errors/BizError';
import type { RowDataPacket } from '@core/types/mariadb-compat';
import type { Sharing, EntityPreview } from '@features/contacts/types/sharing';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface SentRecommendationWithPreview extends Sharing {
  entity_preview: EntityPreview | null;
  recipient?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

// =============================================================================
// HELPER: Get user ID from username
// =============================================================================

async function getUserIdByUsername(username: string): Promise<number> {
  const db = getDatabaseService();
  const userResult = await db.query<RowDataPacket>(
    'SELECT id FROM users WHERE username = ? AND is_active = 1',
    [username]
  );

  if (!userResult.rows?.length || !userResult.rows[0]) {
    throw new BizError({ code: 'USER_NOT_FOUND', message: 'User not found' });
  }

  return userResult.rows[0].id;
}

// =============================================================================
// GET /api/users/[username]/recommendations/sent
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  return apiHandler(async (context: ApiContext) => {
    const db = getDatabaseService();
    const sharingService = new SharingService(db);
    const { username } = await params;

    // Get user ID from username
    const userId = await getUserIdByUsername(username);

    // Parse query params
    const url = new URL(context.request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    // Fetch sent recommendations (excluding platform_invite)
    const recommendations = await sharingService.getAllByUserId(userId, {
      entity_type: undefined // Get all recommendation types
    });

    // Filter out platform invites and sort by created_at desc
    const filteredRecommendations = recommendations
      .filter(r => r.entity_type !== 'platform_invite')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = filteredRecommendations.length;
    const paginatedRecommendations = filteredRecommendations.slice(offset, offset + limit);

    // Enrich with entity previews and recipient info
    const enrichedRecommendations: SentRecommendationWithPreview[] = await Promise.all(
      paginatedRecommendations.map(async (rec) => {
        let entityPreview: EntityPreview | null = null;
        let recipient: { username: string; display_name: string | null; avatar_url: string | null } | undefined;

        // Get entity preview
        if (rec.entity_type && rec.entity_id) {
          try {
            entityPreview = await sharingService.getEntityPreview(
              rec.entity_type,
              rec.entity_id
            );
          } catch {
            // Entity may have been deleted
          }
        }

        // Get recipient info
        if (rec.recipient_user_id) {
          const recipientResult = await db.query<RowDataPacket>(
            'SELECT username, display_name, avatar_url FROM users WHERE id = ?',
            [rec.recipient_user_id]
          );
          if (recipientResult.rows?.length && recipientResult.rows[0]) {
            const r = recipientResult.rows[0];
            recipient = {
              username: r.username,
              display_name: r.display_name,
              avatar_url: r.avatar_url
            };
          }
        }

        return {
          ...rec,
          entity_preview: entityPreview,
          recipient
        };
      })
    );

    return createSuccessResponse({
      recommendations: enrichedRecommendations,
      total,
      limit,
      offset,
      has_more: offset + limit < total
    }, context.requestId);
  }, {
    requireAuth: false, // Public endpoint - anyone can view profile recommendations
    allowedMethods: ['GET']
  })(request);
}
