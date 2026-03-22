/**
 * ConnectionService - User-to-User Connection Management
 *
 * GOVERNANCE COMPLIANCE:
 * - DatabaseService boundary: ALL database operations via DatabaseService
 * - Import paths: Uses @core/ and @features/ aliases
 * - Error handling: BizError-based custom errors
 * - Build Map v2.1 ENHANCED patterns
 *
 * @authority docs/pages/layouts/home/user/phases/troubleshooting/connect/CONNECT_SYSTEM_BRAIN_PLAN.md
 * @tier STANDARD
 * @generated ComponentBuilder
 * @dna-version 11.4.0
 * @reference src/features/profile/services/ProfileService.ts - Service pattern
 */

import { DatabaseService } from '@core/services/DatabaseService';
import { BizError } from '@core/errors/BizError';
import { DbResult } from '@core/types/db';
import {
  ConnectionRequestInput,
  ConnectionRequest,
  UserConnection,
  ConnectionStats,
  RespondToRequestInput,
  UpdateConnectionInput,
  ConnectionStatus,
  RateLimitStatus,
  ConnectionRequestTracking,
  ConnectionIntentType,
  TrustScore,
  QualityScore,
  ConnectionPrivacySettings,
  FollowRelationship,
  BatchOperationResult,
  DismissedConnection,
  DismissedSource,
  BlockUserInput,
  BlockedUser
} from '../types';
import { bigIntToNumber } from '@core/utils/bigint';
import { NotificationService } from '@core/services/NotificationService';
import { ErrorService } from '@core/services/ErrorService';

// Lazy import to avoid circular dependency with ContactService
// ContactService imports ConnectionService, so we use dynamic import
type ContactServiceType = import('@features/contacts/services/ContactService').ContactService;

// Rate limiting constants
const RATE_LIMITS = {
  perDay: 100,
  perWeek: 200,
  cooldownMinutes: 5
};

// ============================================================================
// Custom Errors
// ============================================================================

export class ConnectionError extends BizError {
  constructor(message: string) {
    super({ code: 'CONNECTION_ERROR', message, userMessage: message });
    this.name = 'ConnectionError';
  }
}

export class ConnectionNotFoundError extends BizError {
  constructor(message = 'Connection not found') {
    super({ code: 'CONNECTION_NOT_FOUND', message, userMessage: message });
    this.name = 'ConnectionNotFoundError';
  }
}

export class ConnectionRequestNotFoundError extends BizError {
  constructor(message = 'Connection request not found') {
    super({ code: 'CONNECTION_REQUEST_NOT_FOUND', message, userMessage: message });
    this.name = 'ConnectionRequestNotFoundError';
  }
}

export class DuplicateConnectionError extends BizError {
  constructor(message = 'Connection already exists') {
    super({ code: 'DUPLICATE_CONNECTION', message, userMessage: message });
    this.name = 'DuplicateConnectionError';
  }
}

export class UnauthorizedConnectionError extends BizError {
  constructor(message = 'Not authorized to perform this action') {
    super({ code: 'UNAUTHORIZED_CONNECTION', message, userMessage: message });
    this.name = 'UnauthorizedConnectionError';
  }
}

// ============================================================================
// ConnectionService Implementation
// ============================================================================

export class ConnectionService {
  private db: DatabaseService;
  private notificationService: NotificationService;
  private _contactService: ContactServiceType | null = null;

  constructor(db: DatabaseService, notificationService?: NotificationService) {
    this.db = db;
    // Default to creating NotificationService if not provided (backward compatible)
    this.notificationService = notificationService || new NotificationService(db);
  }

  /**
   * Lazy getter for ContactService to avoid circular dependency
   * ContactService imports ConnectionService, so we instantiate lazily
   */
  private async getContactService(): Promise<ContactServiceType> {
    if (!this._contactService) {
      const { ContactService } = await import('@features/contacts/services/ContactService');
      this._contactService = new ContactService(this.db);
    }
    return this._contactService;
  }

  // ==========================================================================
  // Connection Requests
  // ==========================================================================

  /**
   * Send a connection request
   * @param input Connection request details
   * @returns Created connection request with sender info
   */
  async sendConnectionRequest(input: ConnectionRequestInput): Promise<ConnectionRequest> {
    const { sender_user_id, receiver_user_id, message, connection_type, intent_type } = input;

    // Validate: Cannot connect with self
    if (sender_user_id === receiver_user_id) {
      throw new ConnectionError('Cannot connect with yourself');
    }

    // Validate intent_type (required for new requests)
    const validIntentTypes = ['networking', 'hiring', 'partnership', 'mentorship', 'client_inquiry', 'personal'];
    if (!intent_type || !validIntentTypes.includes(intent_type)) {
      throw new ConnectionError('Intent type is required and must be valid');
    }

    // Check rate limits
    const rateLimitStatus = await this.checkRateLimits(sender_user_id);
    if (!rateLimitStatus.canSend) {
      throw new ConnectionError(
        rateLimitStatus.nextAvailableAt
          ? `Rate limit exceeded. Try again after ${new Date(rateLimitStatus.nextAvailableAt).toLocaleTimeString()}`
          : 'Rate limit exceeded. Try again later.'
      );
    }

    // Check privacy settings
    const canConnect = await this.canUserConnect(sender_user_id, receiver_user_id);
    if (!canConnect.allowed) {
      throw new ConnectionError(canConnect.reason || 'Cannot send connection request to this user');
    }

    // Check requireMessage setting
    const receiverSettings = await this.getPrivacySettings(receiver_user_id);
    if (receiverSettings.requireMessage && (!message || message.trim().length === 0)) {
      throw new ConnectionError('This user requires a message with connection requests');
    }

    // Check if already connected
    const existingConnection = await this.getConnectionBetween(sender_user_id, receiver_user_id);
    if (existingConnection) {
      throw new DuplicateConnectionError('You are already connected with this user');
    }

    // Check if request already exists
    const existingRequest: DbResult<{ id: number; status: string }> = await this.db.query(
      `SELECT id, status FROM connection_request
       WHERE sender_user_id = ? AND receiver_user_id = ?
       LIMIT 1`,
      [sender_user_id, receiver_user_id]
    );

    if (existingRequest.rows[0]) {
      const status = existingRequest.rows[0].status;
      if (status === 'pending') {
        throw new ConnectionError('Connection request already pending');
      }
      // If declined or expired, delete the old request to allow a fresh one
      // This enables users to re-request connection after a decline
      if (status === 'declined' || status === 'expired') {
        await this.db.query(
          'DELETE FROM connection_request WHERE id = ?',
          [existingRequest.rows[0].id]
        );
      }
    }

    // Create connection request
    const result = await this.db.query(
      `INSERT INTO connection_request
       (sender_user_id, receiver_user_id, message, connection_type, intent_type, status, expires_at)
       VALUES (?, ?, ?, ?, ?, 'pending', DATE_ADD(NOW(), INTERVAL 30 DAY))`,
      [sender_user_id, receiver_user_id, message || null, connection_type || null, intent_type]
    );

    const requestId = result.insertId;

    // Fetch created request with sender profile info
    const requestResult: DbResult<ConnectionRequest> = await this.db.query(
      `SELECT
        cr.id,
        cr.sender_user_id,
        cr.receiver_user_id,
        cr.status,
        cr.message,
        cr.connection_type,
        cr.intent_type,
        cr.reason,
        cr.response_message,
        cr.responded_at,
        cr.expires_at,
        cr.created_at,
        cr.updated_at,
        u.username AS sender_username,
        u.display_name AS sender_display_name,
        u.avatar_url AS sender_avatar_url,
        u.avatar_bg_color AS sender_avatar_bg_color
      FROM connection_request cr
      JOIN users u ON cr.sender_user_id = u.id
      WHERE cr.id = ?`,
      [requestId]
    );

    if (!requestResult.rows[0]) {
      throw new ConnectionRequestNotFoundError('Failed to retrieve created connection request');
    }

    const createdRequest = requestResult.rows[0];

    // Create notification for the receiver
    await this.notificationService.dispatchConnectionRequestNotification(
      receiver_user_id,
      createdRequest.sender_display_name || createdRequest.sender_username || 'Someone',
      message,
      { request_id: createdRequest.id, sender_user_id: sender_user_id }
    );

    // Update rate limit tracking
    await this.updateTrackingAfterRequest(sender_user_id);

    return createdRequest;
  }

  /**
   * Get a specific connection request by ID
   * @param requestId Connection request ID
   * @returns Connection request with sender info
   */
  async getConnectionRequest(requestId: number): Promise<ConnectionRequest | null> {
    const result: DbResult<ConnectionRequest> = await this.db.query(
      `SELECT
        cr.id,
        cr.sender_user_id,
        cr.receiver_user_id,
        cr.status,
        cr.message,
        cr.connection_type,
        cr.intent_type,
        cr.reason,
        cr.response_message,
        cr.responded_at,
        cr.expires_at,
        cr.created_at,
        cr.updated_at,
        u.username AS sender_username,
        u.display_name AS sender_display_name,
        u.avatar_url AS sender_avatar_url,
        u.avatar_bg_color AS sender_avatar_bg_color
      FROM connection_request cr
      JOIN users u ON cr.sender_user_id = u.id
      WHERE cr.id = ?`,
      [requestId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get pending connection requests for a user (received)
   * @param userId User ID
   * @returns Array of pending requests with sender info
   */
  async getPendingRequestsForUser(userId: number): Promise<ConnectionRequest[]> {
    const result: DbResult<ConnectionRequest> = await this.db.query(
      `SELECT
        cr.id,
        cr.sender_user_id,
        cr.receiver_user_id,
        cr.status,
        cr.message,
        cr.connection_type,
        cr.intent_type,
        cr.reason,
        cr.response_message,
        cr.responded_at,
        cr.expires_at,
        cr.created_at,
        cr.updated_at,
        u.username AS sender_username,
        u.display_name AS sender_display_name,
        u.avatar_url AS sender_avatar_url,
        u.avatar_bg_color AS sender_avatar_bg_color
      FROM connection_request cr
      JOIN users u ON cr.sender_user_id = u.id
      WHERE cr.receiver_user_id = ? AND cr.status = 'pending'
      ORDER BY cr.created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Get sent connection requests for a user
   * @param userId User ID
   * @returns Array of sent requests with receiver info
   */
  async getSentRequestsForUser(userId: number): Promise<ConnectionRequest[]> {
    const result: DbResult<ConnectionRequest> = await this.db.query(
      `SELECT
        cr.id,
        cr.sender_user_id,
        cr.receiver_user_id,
        cr.status,
        cr.message,
        cr.connection_type,
        cr.intent_type,
        cr.reason,
        cr.response_message,
        cr.responded_at,
        cr.expires_at,
        cr.created_at,
        cr.updated_at,
        u.username AS sender_username,
        u.display_name AS sender_display_name,
        u.avatar_url AS sender_avatar_url,
        u.avatar_bg_color AS sender_avatar_bg_color
      FROM connection_request cr
      JOIN users u ON cr.receiver_user_id = u.id
      WHERE cr.sender_user_id = ? AND cr.status = 'pending'
      ORDER BY cr.created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Respond to a connection request (accept or decline)
   * @param requestId Connection request ID
   * @param userId User ID responding (must be receiver)
   * @param input Response action and optional message
   * @returns Updated connection request or created connection
   */
  async respondToRequest(
    requestId: number,
    userId: number,
    input: RespondToRequestInput
  ): Promise<ConnectionRequest | UserConnection> {
    const { action, response_message } = input;

    // Fetch request
    const request = await this.getConnectionRequest(requestId);
    if (!request) {
      throw new ConnectionRequestNotFoundError();
    }

    // Verify user is receiver
    if (request.receiver_user_id !== userId) {
      throw new UnauthorizedConnectionError('Only the request receiver can respond');
    }

    // Verify request is pending
    if (request.status !== 'pending') {
      throw new ConnectionError('Connection request already responded to');
    }

    // Get responder (receiver) info for notification
    const responderResult: DbResult<{ username: string; display_name: string | null }> = await this.db.query(
      `SELECT username, display_name FROM users WHERE id = ?`,
      [userId]
    );
    const responder = responderResult.rows[0];
    const responderName = responder?.display_name || responder?.username || 'Someone';

    if (action === 'accept') {
      // Create bidirectional connection
      await this.db.query(
        `INSERT INTO user_connection
         (sender_user_id, receiver_user_id, status, connection_type)
         VALUES (?, ?, 'connected', ?)`,
        [request.sender_user_id, request.receiver_user_id, request.connection_type || 'professional']
      );

      // Update request status
      await this.db.query(
        `UPDATE connection_request
         SET status = 'accepted', response_message = ?, responded_at = NOW()
         WHERE id = ?`,
        [response_message || null, requestId]
      );

      // Notify the original sender that their request was accepted
      await this.notificationService.dispatchConnectionResponseNotification(
        request.sender_user_id,
        responderName,
        true, // accepted
        undefined,
        { request_id: requestId, responder_user_id: userId }
      );

      // Create social activity for connection (visible to both users' networks)
      await this.createSocialActivity(
        userId,
        request.sender_user_id,
        'connection',
        'New connection',
        `${responderName} connected with ${request.sender_display_name || request.sender_username}`,
        'connections',
        { connection_type: request.connection_type || 'professional' }
      );

      // Return the created connection
      const connection = await this.getConnectionBetween(request.sender_user_id, request.receiver_user_id);

      // Sync to contacts: Create contact entries for BOTH users
      // This enables immediate CRM features for the new connection
      if (connection) {
        try {
          const contactService = await this.getContactService();
          // Create contact entry for the receiver (current user) -> sender
          await contactService.syncFromConnection(
            userId,
            connection.id,
            request.sender_user_id
          );

          // Create contact entry for the sender -> receiver (current user)
          await contactService.syncFromConnection(
            request.sender_user_id,
            connection.id,
            userId
          );
        } catch (syncError) {
          // Log but don't fail the connection if sync fails
          ErrorService.capture('Failed to sync connection to contacts:', syncError);
        }
      }

      return connection!;
    } else if (action === 'decline') {
      // Update request status
      await this.db.query(
        `UPDATE connection_request
         SET status = 'declined', response_message = ?, responded_at = NOW()
         WHERE id = ?`,
        [response_message || null, requestId]
      );

      // Update sender's tracking (reputation penalty)
      await this.updateTrackingOnDecline(request.sender_user_id);

      // Notify the original sender that their request was declined
      await this.notificationService.dispatchConnectionResponseNotification(
        request.sender_user_id,
        responderName,
        false, // declined
        response_message,
        { request_id: requestId, responder_user_id: userId }
      );

      // Return updated request
      const updatedRequest = await this.getConnectionRequest(requestId);
      return updatedRequest!;
    } else {
      throw new ConnectionError('Invalid action. Must be "accept" or "decline"');
    }
  }

  /**
   * Cancel a sent connection request
   * @param requestId Connection request ID
   * @param userId User ID (must be sender)
   */
  async cancelConnectionRequest(requestId: number, userId: number): Promise<void> {
    const request = await this.getConnectionRequest(requestId);
    if (!request) {
      throw new ConnectionRequestNotFoundError();
    }

    if (request.sender_user_id !== userId) {
      throw new UnauthorizedConnectionError('Only the request sender can cancel');
    }

    if (request.status !== 'pending') {
      throw new ConnectionError('Can only cancel pending requests');
    }

    await this.db.query(
      'DELETE FROM connection_request WHERE id = ?',
      [requestId]
    );
  }

  // ==========================================================================
  // Connections
  // ==========================================================================

  /**
   * Get all connections for a user
   * @param userId User ID
   * @returns Array of connections with profile info
   */
  async getUserConnections(userId: number): Promise<UserConnection[]> {
    // Query for connections where user is either sender or receiver
    const result: DbResult<any> = await this.db.query(
      `SELECT
        uc.id,
        CASE
          WHEN uc.sender_user_id = ? THEN uc.receiver_user_id
          ELSE uc.sender_user_id
        END AS user_id,
        u.username,
        u.display_name,
        u.avatar_url,
        u.avatar_bg_color,
        uc.connection_type,
        uc.created_at AS connected_since,
        uc.mutual_connections,
        uc.interaction_count,
        uc.last_interaction,
        uc.notes,
        uc.tags
      FROM user_connection uc
      JOIN users u ON (
        CASE
          WHEN uc.sender_user_id = ? THEN uc.receiver_user_id = u.id
          ELSE uc.sender_user_id = u.id
        END
      )
      WHERE (uc.sender_user_id = ? OR uc.receiver_user_id = ?)
        AND uc.status = 'connected'
      ORDER BY uc.created_at DESC`,
      [userId, userId, userId, userId]
    );

    return result.rows as UserConnection[];
  }

  /**
   * Get connection between two users (bidirectional)
   * @param userIdA First user ID
   * @param userIdB Second user ID
   * @returns Connection if exists, null otherwise
   */
  async getConnectionBetween(userIdA: number, userIdB: number): Promise<UserConnection | null> {
    const result: DbResult<any> = await this.db.query(
      `SELECT
        uc.id,
        CASE
          WHEN uc.sender_user_id = ? THEN uc.receiver_user_id
          ELSE uc.sender_user_id
        END AS user_id,
        u.username,
        u.display_name,
        u.avatar_url,
        u.avatar_bg_color,
        uc.connection_type,
        uc.created_at AS connected_since,
        uc.mutual_connections,
        uc.interaction_count,
        uc.last_interaction,
        uc.notes,
        uc.tags
      FROM user_connection uc
      JOIN users u ON (
        CASE
          WHEN uc.sender_user_id = ? THEN uc.receiver_user_id = u.id
          ELSE uc.sender_user_id = u.id
        END
      )
      WHERE ((uc.sender_user_id = ? AND uc.receiver_user_id = ?)
          OR (uc.sender_user_id = ? AND uc.receiver_user_id = ?))
        AND uc.status = 'connected'
      LIMIT 1`,
      [userIdA, userIdA, userIdA, userIdB, userIdB, userIdA]
    );

    return result.rows[0] || null;
  }

  /**
   * Remove a connection
   * @param connectionId Connection ID
   * @param userId User ID (must be part of the connection)
   */
  async removeConnection(connectionId: number, userId: number): Promise<void> {
    // Verify user is part of connection
    const result: DbResult<{ sender_user_id: number; receiver_user_id: number }> = await this.db.query(
      'SELECT sender_user_id, receiver_user_id FROM user_connection WHERE id = ?',
      [connectionId]
    );

    const connection = result.rows[0];
    if (!connection) {
      throw new ConnectionNotFoundError();
    }

    if (connection.sender_user_id !== userId && connection.receiver_user_id !== userId) {
      throw new UnauthorizedConnectionError('Not authorized to remove this connection');
    }

    // Determine the other user in this connection
    const otherUserId = connection.sender_user_id === userId
      ? connection.receiver_user_id
      : connection.sender_user_id;

    await this.db.query(
      'DELETE FROM user_connection WHERE id = ?',
      [connectionId]
    );

    // Handle contact entries: preserve CRM data but mark as disconnected
    // This converts connected contacts to manual contacts
    try {
      const contactService = await this.getContactService();
      await contactService.handleConnectionRemoved(userId, otherUserId);
      await contactService.handleConnectionRemoved(otherUserId, userId);
    } catch (syncError) {
      // Log but don't fail the removal if contact update fails
      ErrorService.capture('Failed to update contacts after connection removal:', syncError);
    }
  }

  /**
   * Update connection (notes, tags, type)
   * @param connectionId Connection ID
   * @param userId User ID (must be part of the connection)
   * @param input Update data
   */
  async updateConnection(
    connectionId: number,
    userId: number,
    input: UpdateConnectionInput
  ): Promise<void> {
    // Verify user is part of connection
    const result: DbResult<{ sender_user_id: number; receiver_user_id: number }> = await this.db.query(
      'SELECT sender_user_id, receiver_user_id FROM user_connection WHERE id = ?',
      [connectionId]
    );

    const connection = result.rows[0];
    if (!connection) {
      throw new ConnectionNotFoundError();
    }

    if (connection.sender_user_id !== userId && connection.receiver_user_id !== userId) {
      throw new UnauthorizedConnectionError('Not authorized to update this connection');
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (input.notes !== undefined) {
      updates.push('notes = ?');
      values.push(input.notes);
    }

    if (input.tags !== undefined) {
      updates.push('tags = ?');
      values.push(JSON.stringify(input.tags));
    }

    if (input.connection_type !== undefined) {
      updates.push('connection_type = ?');
      values.push(input.connection_type);
    }

    if (updates.length === 0) {
      return;
    }

    values.push(connectionId);

    await this.db.query(
      `UPDATE user_connection SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  }

  // ==========================================================================
  // Statistics & Analytics
  // ==========================================================================

  /**
   * Get connection statistics for a user
   * @param userId User ID
   * @returns Connection stats
   */
  async getConnectionStats(userId: number): Promise<ConnectionStats> {
    // GOVERNANCE: mariadb returns BigInt for COUNT(*) - must convert to Number
    const totalResult: DbResult<{ count: bigint | number }> = await this.db.query(
      `SELECT COUNT(*) AS count FROM user_connection
       WHERE (sender_user_id = ? OR receiver_user_id = ?) AND status = 'connected'`,
      [userId, userId]
    );

    const thisMonthResult: DbResult<{ count: bigint | number }> = await this.db.query(
      `SELECT COUNT(*) AS count FROM user_connection
       WHERE (sender_user_id = ? OR receiver_user_id = ?)
         AND status = 'connected'
         AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [userId, userId]
    );

    const pendingSentResult: DbResult<{ count: bigint | number }> = await this.db.query(
      `SELECT COUNT(*) AS count FROM connection_request
       WHERE sender_user_id = ? AND status = 'pending'`,
      [userId]
    );

    const pendingReceivedResult: DbResult<{ count: bigint | number }> = await this.db.query(
      `SELECT COUNT(*) AS count FROM connection_request
       WHERE receiver_user_id = ? AND status = 'pending'`,
      [userId]
    );

    const mutualAvgResult: DbResult<{ avg: number | null }> = await this.db.query(
      `SELECT AVG(mutual_connections) AS avg FROM user_connection
       WHERE (sender_user_id = ? OR receiver_user_id = ?) AND status = 'connected'`,
      [userId, userId]
    );

    return {
      total_connections: bigIntToNumber(totalResult.rows[0]?.count),
      connections_this_month: bigIntToNumber(thisMonthResult.rows[0]?.count),
      pending_sent: bigIntToNumber(pendingSentResult.rows[0]?.count),
      pending_received: bigIntToNumber(pendingReceivedResult.rows[0]?.count),
      mutual_connections_avg: mutualAvgResult.rows[0]?.avg || 0
    };
  }

  /**
   * Get mutual connections between two users
   * @param userIdA First user ID
   * @param userIdB Second user ID
   * @returns Array of mutual connections
   */
  async getMutualConnections(userIdA: number, userIdB: number): Promise<UserConnection[]> {
    // Find users connected to both userIdA and userIdB
    const result: DbResult<any> = await this.db.query(
      `SELECT DISTINCT
        u.id AS user_id,
        u.username,
        u.display_name,
        u.avatar_url,
        u.avatar_bg_color
      FROM users u
      WHERE u.id IN (
        SELECT CASE
          WHEN uc1.sender_user_id = ? THEN uc1.receiver_user_id
          ELSE uc1.sender_user_id
        END
        FROM user_connection uc1
        WHERE (uc1.sender_user_id = ? OR uc1.receiver_user_id = ?)
          AND uc1.status = 'connected'
      )
      AND u.id IN (
        SELECT CASE
          WHEN uc2.sender_user_id = ? THEN uc2.receiver_user_id
          ELSE uc2.sender_user_id
        END
        FROM user_connection uc2
        WHERE (uc2.sender_user_id = ? OR uc2.receiver_user_id = ?)
          AND uc2.status = 'connected'
      )`,
      [userIdA, userIdA, userIdA, userIdB, userIdB, userIdB]
    );

    return result.rows.map((row: any) => ({
      id: 0, // Not applicable for mutual connections
      user_id: row.user_id,
      username: row.username,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      avatar_bg_color: row.avatar_bg_color || null,
      connection_type: null,
      connected_since: new Date(),
      mutual_connections: 0,
      interaction_count: 0,
      last_interaction: null,
      notes: null,
      tags: null
    }));
  }

  /**
   * Get connection status between current user and target user
   * @param currentUserId Current user ID
   * @param targetUserId Target user ID
   * @returns Connection status
   */
  async getConnectionStatus(currentUserId: number, targetUserId: number): Promise<ConnectionStatus> {
    if (currentUserId === targetUserId) {
      return 'none';
    }

    // Check for existing connection
    const connection = await this.getConnectionBetween(currentUserId, targetUserId);
    if (connection) {
      return 'connected';
    }

    // Check for pending requests
    const sentRequest: DbResult<{ id: number }> = await this.db.query(
      `SELECT id FROM connection_request
       WHERE sender_user_id = ? AND receiver_user_id = ? AND status = 'pending'`,
      [currentUserId, targetUserId]
    );

    if (sentRequest.rows[0]) {
      return 'pending_sent';
    }

    const receivedRequest: DbResult<{ id: number }> = await this.db.query(
      `SELECT id FROM connection_request
       WHERE sender_user_id = ? AND receiver_user_id = ? AND status = 'pending'`,
      [targetUserId, currentUserId]
    );

    if (receivedRequest.rows[0]) {
      return 'pending_received';
    }

    return 'none';
  }

  /**
   * Create social activity record for the activity feed
   * @param creatorUserId User who performed the action
   * @param targetUserId User who was the target of the action (optional)
   * @param activityType Type of activity (connection, etc.)
   * @param title Activity title
   * @param description Activity description
   * @param visibility Visibility level (default: connections)
   * @param metadata Optional additional metadata
   */
  private async createSocialActivity(
    creatorUserId: number,
    targetUserId: number | null,
    activityType: string,
    title: string,
    description: string,
    visibility: 'public' | 'connections' | 'private' = 'connections',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO social_activity
         (creator_user_id, target_user_id, activity_type, title, description, visibility, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [creatorUserId, targetUserId, activityType, title, description, visibility, metadata ? JSON.stringify(metadata) : null]
      );
    } catch (error) {
      // Non-blocking: Log but don't fail the main operation
      ErrorService.capture('Failed to create social activity:', error);
    }
  }

  /**
   * Create notification for connection event
   * Uses user_notifications table with correct schema
   * @deprecated Use NotificationService.dispatch() or convenience methods instead
   * @param userId User to notify
   * @param type Notification type (connection_request, etc.)
   * @param title Notification title
   * @param message Optional notification message
   * @param actionUrl Optional URL for notification action
   * @param metadata Optional additional metadata
   */
  private async createNotification(
    userId: number,
    type: string,
    title: string,
    message?: string,
    actionUrl?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO user_notifications
       (user_id, notification_type, title, message, action_url, metadata, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
      [userId, type, title, message || null, actionUrl || null, metadata ? JSON.stringify(metadata) : null]
    );
  }

  // ==========================================================================
  // Rate Limiting (Phase 1)
  // ==========================================================================

  /**
   * Check rate limits for a user before sending a connection request
   */
  async checkRateLimits(userId: number): Promise<RateLimitStatus> {
    const tracking = await this.getOrCreateTrackingRecord(userId);

    // Calculate remaining
    const remainingToday = Math.max(0, RATE_LIMITS.perDay - tracking.requests_today);
    const remainingThisWeek = Math.max(0, RATE_LIMITS.perWeek - tracking.requests_this_week);

    // Check cooldown
    const now = new Date();
    const cooldownActive = tracking.cooldown_until && new Date(tracking.cooldown_until) > now;

    // Determine if can send
    const canSend = remainingToday > 0 && remainingThisWeek > 0 && !cooldownActive;

    // Calculate next available time
    let nextAvailableAt: string | null = null;
    if (!canSend) {
      if (cooldownActive && tracking.cooldown_until) {
        nextAvailableAt = tracking.cooldown_until.toISOString();
      } else if (remainingToday <= 0) {
        // Daily limit - reset at midnight
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        nextAvailableAt = tomorrow.toISOString();
      }
    }

    return {
      canSend,
      remainingToday,
      remainingThisWeek,
      nextAvailableAt,
      reputationScore: tracking.reputation_score,
      limits: RATE_LIMITS
    };
  }

  /**
   * Get or create tracking record for rate limiting
   */
  private async getOrCreateTrackingRecord(userId: number): Promise<ConnectionRequestTracking> {
    // Try to fetch existing
    const result: DbResult<ConnectionRequestTracking> = await this.db.query(
      `SELECT * FROM connection_request_tracking WHERE user_id = ?`,
      [userId]
    );

    if (result.rows[0]) {
      const tracking = result.rows[0];
      const now = new Date();

      // Check if daily reset needed
      const lastDaily = new Date(tracking.last_reset_daily);
      const dailyReset = now.getDate() !== lastDaily.getDate() || now.getMonth() !== lastDaily.getMonth();

      // Check if weekly reset needed
      const lastWeekly = new Date(tracking.last_reset_weekly);
      const daysSinceWeeklyReset = Math.floor((now.getTime() - lastWeekly.getTime()) / (1000 * 60 * 60 * 24));
      const weeklyReset = daysSinceWeeklyReset >= 7;

      // Apply resets if needed
      if (dailyReset || weeklyReset) {
        await this.db.query(
          `UPDATE connection_request_tracking SET
            requests_today = ?,
            requests_this_week = ?,
            last_reset_daily = ?,
            last_reset_weekly = ?
          WHERE user_id = ?`,
          [
            dailyReset ? 0 : tracking.requests_today,
            weeklyReset ? 0 : tracking.requests_this_week,
            dailyReset ? now : tracking.last_reset_daily,
            weeklyReset ? now : tracking.last_reset_weekly,
            userId
          ]
        );

        // Return updated tracking
        return {
          ...tracking,
          requests_today: dailyReset ? 0 : tracking.requests_today,
          requests_this_week: weeklyReset ? 0 : tracking.requests_this_week,
          last_reset_daily: dailyReset ? now : tracking.last_reset_daily,
          last_reset_weekly: weeklyReset ? now : tracking.last_reset_weekly
        };
      }

      return tracking;
    }

    // Create new tracking record
    await this.db.query(
      `INSERT INTO connection_request_tracking
        (user_id, requests_today, requests_this_week, decline_count, reputation_score, last_reset_daily, last_reset_weekly)
       VALUES (?, 0, 0, 0, 100, NOW(), NOW())`,
      [userId]
    );

    // Fetch and return
    const newResult: DbResult<ConnectionRequestTracking> = await this.db.query(
      `SELECT * FROM connection_request_tracking WHERE user_id = ?`,
      [userId]
    );

    return newResult.rows[0]!;
  }

  /**
   * Update tracking after successful connection request
   */
  private async updateTrackingAfterRequest(userId: number): Promise<void> {
    const now = new Date();
    const cooldownUntil = new Date(now.getTime() + RATE_LIMITS.cooldownMinutes * 60 * 1000);

    await this.db.query(
      `UPDATE connection_request_tracking SET
        requests_today = requests_today + 1,
        requests_this_week = requests_this_week + 1,
        last_request_at = NOW(),
        cooldown_until = ?
      WHERE user_id = ?`,
      [cooldownUntil, userId]
    );
  }

  /**
   * Update tracking when a connection request is declined
   */
  async updateTrackingOnDecline(senderId: number): Promise<void> {
    // Fetch current reputation
    const result: DbResult<{ reputation_score: number }> = await this.db.query(
      `SELECT reputation_score FROM connection_request_tracking WHERE user_id = ?`,
      [senderId]
    );

    if (!result.rows[0]) return;

    const currentRep = result.rows[0].reputation_score;
    const newRep = Math.max(0, currentRep - 5); // Decrease by 5, min 0

    // If reputation is low, extend cooldown
    const lowReputation = newRep < 50;
    const extendedCooldown = lowReputation
      ? new Date(Date.now() + RATE_LIMITS.cooldownMinutes * 2 * 60 * 1000)
      : null;

    await this.db.query(
      `UPDATE connection_request_tracking SET
        decline_count = decline_count + 1,
        reputation_score = ?${extendedCooldown ? ', cooldown_until = ?' : ''}
      WHERE user_id = ?`,
      extendedCooldown ? [newRep, extendedCooldown, senderId] : [newRep, senderId]
    );
  }

  // ==========================================================================
  // Privacy Controls (Phase 4)
  // ==========================================================================

  /**
   * Get connection privacy settings for a user
   */
  async getPrivacySettings(userId: number): Promise<ConnectionPrivacySettings> {
    const result: DbResult<{ connection_privacy: string | null }> = await this.db.query(
      `SELECT connection_privacy FROM users WHERE id = ?`,
      [userId]
    );

    if (!result.rows[0]) {
      throw new ConnectionError('User not found');
    }

    // Default settings if null
    const defaults: ConnectionPrivacySettings = {
      whoCanConnect: 'everyone',
      requireMessage: false,
      autoDeclineNoMessage: false,
      showConnectionCount: true,
      allowFollows: true
    };

    if (!result.rows[0].connection_privacy) {
      return defaults;
    }

    // Parse JSON (mariadb may auto-parse)
    const parsed = typeof result.rows[0].connection_privacy === 'string'
      ? JSON.parse(result.rows[0].connection_privacy)
      : result.rows[0].connection_privacy;

    return { ...defaults, ...parsed };
  }

  /**
   * Update connection privacy settings
   */
  async updatePrivacySettings(
    userId: number,
    settings: Partial<ConnectionPrivacySettings>
  ): Promise<ConnectionPrivacySettings> {
    // Get current settings
    const current = await this.getPrivacySettings(userId);

    // Merge with updates
    const updated: ConnectionPrivacySettings = {
      ...current,
      ...settings
    };

    // Save to database
    await this.db.query(
      `UPDATE users SET connection_privacy = ? WHERE id = ?`,
      [JSON.stringify(updated), userId]
    );

    return updated;
  }

  /**
   * Check if sender can connect with receiver based on privacy settings
   */
  async canUserConnect(
    senderId: number,
    receiverId: number
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Get receiver's privacy settings
    const settings = await this.getPrivacySettings(receiverId);

    // Check whoCanConnect setting
    if (settings.whoCanConnect === 'nobody') {
      return { allowed: false, reason: 'This user is not accepting connection requests' };
    }

    if (settings.whoCanConnect === 'connections_of_connections') {
      // Check if sender is a connection of any of receiver's connections
      const mutuals = await this.getMutualConnections(senderId, receiverId);
      if (mutuals.length === 0) {
        return {
          allowed: false,
          reason: 'This user only accepts requests from mutual connections'
        };
      }
    }

    // Default: everyone can connect
    return { allowed: true };
  }

  // ==========================================================================
  // Follow System (Phase 4)
  // ==========================================================================

  /**
   * Follow a user (one-way relationship)
   */
  async followUser(followerId: number, followingId: number): Promise<void> {
    // Can't follow yourself
    if (followerId === followingId) {
      throw new ConnectionError('Cannot follow yourself');
    }

    // Check if target allows follows
    const settings = await this.getPrivacySettings(followingId);
    if (!settings.allowFollows) {
      throw new ConnectionError('This user does not allow follows');
    }

    // Check if already following
    const existing = await this.isFollowing(followerId, followingId);
    if (existing) {
      return; // Already following, no-op
    }

    // Create follow relationship
    await this.db.query(
      `INSERT INTO user_follows (follower_user_id, following_user_id, created_at)
       VALUES (?, ?, NOW())`,
      [followerId, followingId]
    );

    // Create notification for the followed user
    const followerResult: DbResult<{ username: string; display_name: string | null }> =
      await this.db.query(
        `SELECT username, display_name FROM users WHERE id = ?`,
        [followerId]
      );

    const follower = followerResult.rows[0];
    if (follower) {
      await this.notificationService.dispatch({
        type: 'system.announcement', // Follow notifications map to system type for now
        recipientId: followingId,
        title: `${follower.display_name || follower.username} started following you`,
        actionUrl: `/profile/${follower.username}`,
        priority: 'low',
        metadata: { follower_id: followerId },
        triggeredBy: followerId
      });
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(followerId: number, followingId: number): Promise<void> {
    await this.db.query(
      `DELETE FROM user_follows WHERE follower_user_id = ? AND following_user_id = ?`,
      [followerId, followingId]
    );
  }

  /**
   * Get users who follow the given user
   */
  async getFollowers(
    userId: number,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ followers: FollowRelationship[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    // Get total count
    const countResult: DbResult<{ count: bigint | number }> = await this.db.query(
      `SELECT COUNT(*) AS count FROM user_follows WHERE following_user_id = ?`,
      [userId]
    );
    const total = bigIntToNumber(countResult.rows[0]?.count);

    // Get paginated followers with profile info
    const result: DbResult<FollowRelationship> = await this.db.query(
      `SELECT
        uf.id,
        uf.follower_user_id AS follower_id,
        uf.following_user_id AS following_id,
        uf.created_at,
        u.username AS follower_username,
        u.display_name AS follower_display_name,
        u.avatar_url AS follower_avatar_url
      FROM user_follows uf
      JOIN users u ON uf.follower_user_id = u.id
      WHERE uf.following_user_id = ?
      ORDER BY uf.created_at DESC
      LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return { followers: result.rows, total };
  }

  /**
   * Get users the given user is following
   */
  async getFollowing(
    userId: number,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ following: FollowRelationship[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    // Get total count
    const countResult: DbResult<{ count: bigint | number }> = await this.db.query(
      `SELECT COUNT(*) AS count FROM user_follows WHERE follower_user_id = ?`,
      [userId]
    );
    const total = bigIntToNumber(countResult.rows[0]?.count);

    // Get paginated following with profile info
    const result: DbResult<FollowRelationship> = await this.db.query(
      `SELECT
        uf.id,
        uf.follower_user_id AS follower_id,
        uf.following_user_id AS following_id,
        uf.created_at,
        u.username AS following_username,
        u.display_name AS following_display_name,
        u.avatar_url AS following_avatar_url
      FROM user_follows uf
      JOIN users u ON uf.following_user_id = u.id
      WHERE uf.follower_user_id = ?
      ORDER BY uf.created_at DESC
      LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return { following: result.rows, total };
  }

  /**
   * Check if follower is following followingId
   */
  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    const result: DbResult<{ id: number }> = await this.db.query(
      `SELECT id FROM user_follows WHERE follower_user_id = ? AND following_user_id = ? LIMIT 1`,
      [followerId, followingId]
    );
    return result.rows.length > 0;
  }

  // ==========================================================================
  // Trust & Quality Signals (Phase 3)
  // ==========================================================================

  /**
   * Calculate trust score for a user
   * Trust Score Factors & Weights:
   * - Verification Status (40%): is_verified, email_verified_at
   * - Profile Completeness (25%): bio, avatar_url, occupation, city
   * - Reputation Score (20%): connection_request_tracking.reputation_score
   * - Connection Acceptance Rate (15%): Calculated from sent requests
   *
   * Badge Thresholds:
   * - Gold: 75-100
   * - Silver: 50-74
   * - Bronze: 25-49
   * - None: 0-24
   */
  async calculateTrustScore(userId: number): Promise<TrustScore> {
    // 1. Fetch user data (verification, profile fields)
    const userResult: DbResult<{
      is_verified: number;
      email_verified_at: Date | null;
      bio: string | null;
      avatar_url: string | null;
      occupation: string | null;
      city: string | null;
    }> = await this.db.query(
      `SELECT is_verified, email_verified_at, bio, avatar_url, occupation, city
       FROM users
       WHERE id = ?`,
      [userId]
    );

    if (!userResult.rows[0]) {
      throw new ConnectionError('User not found');
    }

    const user = userResult.rows[0];

    // 2. Fetch reputation from tracking table
    const tracking = await this.getOrCreateTrackingRecord(userId);
    const reputationScore = tracking.reputation_score;

    // 3. Calculate acceptance rate from connection_request
    const sentResult: DbResult<{ total: bigint | number }> = await this.db.query(
      `SELECT COUNT(*) AS total FROM connection_request
       WHERE sender_user_id = ? AND status IN ('accepted', 'declined')`,
      [userId]
    );

    const acceptedResult: DbResult<{ accepted: bigint | number }> = await this.db.query(
      `SELECT COUNT(*) AS accepted FROM connection_request
       WHERE sender_user_id = ? AND status = 'accepted'`,
      [userId]
    );

    const totalSent = bigIntToNumber(sentResult.rows[0]?.total);
    const totalAccepted = bigIntToNumber(acceptedResult.rows[0]?.accepted);
    const acceptanceRate = totalSent > 0 ? (totalAccepted / totalSent) * 100 : 50; // Default 50% if no history

    // 4. Apply weights and calculate factor scores

    // Verification Status (40 points max)
    let verificationPoints = 0;
    if (user.is_verified === 1) verificationPoints += 25;
    if (user.email_verified_at) verificationPoints += 15;
    const verificationStatus = Math.min(40, verificationPoints);

    // Profile Completeness (25 points max)
    let profileFields = 0;
    if (user.bio && user.bio.length > 10) profileFields++;
    if (user.avatar_url) profileFields++;
    if (user.occupation) profileFields++;
    if (user.city) profileFields++;
    const profileCompleteness = (profileFields / 4) * 25;

    // Reputation Score (20 points max) - normalize 0-100 to 0-20
    const reputation = (reputationScore / 100) * 20;

    // Connection Acceptance Rate (15 points max) - normalize 0-100% to 0-15
    const acceptanceRateFactor = (acceptanceRate / 100) * 15;

    // 5. Calculate total score
    const totalScore = Math.round(verificationStatus + profileCompleteness + reputation + acceptanceRateFactor);

    // 6. Determine badge tier
    let tier: 'gold' | 'silver' | 'bronze' | 'none';
    if (totalScore >= 75) {
      tier = 'gold';
    } else if (totalScore >= 50) {
      tier = 'silver';
    } else if (totalScore >= 25) {
      tier = 'bronze';
    } else {
      tier = 'none';
    }

    return {
      userId,
      score: totalScore,
      tier,
      factors: {
        verificationStatus: Math.round(verificationStatus),
        profileCompleteness: Math.round(profileCompleteness),
        reputation: Math.round(reputation),
        acceptanceRate: Math.round(acceptanceRateFactor)
      },
      calculatedAt: new Date()
    };
  }

  /**
   * Calculate quality score for a connection request
   * Quality Score Factors & Weights:
   * - Sender Trust Score (40%): calculateTrustScore(sender_id)
   * - Message Quality (30%): message length, personalization
   * - Intent Specificity (20%): intent_type (non-default = higher)
   * - Mutual Connections (10%): getMutualConnections() count
   *
   * Level Thresholds:
   * - High: 70-100
   * - Medium: 40-69
   * - Low: 0-39
   */
  async calculateRequestQuality(requestId: number): Promise<QualityScore> {
    // 1. Fetch request with sender profile
    const requestResult: DbResult<{
      id: number;
      sender_user_id: number;
      receiver_user_id: number;
      message: string | null;
      intent_type: string | null;
    }> = await this.db.query(
      `SELECT id, sender_user_id, receiver_user_id, message, intent_type
       FROM connection_request
       WHERE id = ?`,
      [requestId]
    );

    if (!requestResult.rows[0]) {
      throw new ConnectionRequestNotFoundError('Connection request not found');
    }

    const request = requestResult.rows[0];

    // 2. Calculate sender trust score (40 points max)
    const senderTrust = await this.calculateTrustScore(request.sender_user_id);
    const senderTrustFactor = (senderTrust.score / 100) * 40;

    // 3. Evaluate message quality (30 points max)
    let messageQuality = 0;
    if (request.message) {
      const messageLength = request.message.length;
      // Score based on length and personalization
      if (messageLength > 20) messageQuality += 15; // Has meaningful message
      if (messageLength > 50) messageQuality += 10; // Detailed message
      // Check for personalization (not template-like)
      if (messageLength > 0 && !/^(hi|hello|hey)$/i.test(request.message.trim())) {
        messageQuality += 5; // Personalized
      }
    }
    const messageQualityFactor = Math.min(30, messageQuality);

    // 4. Check intent type (20 points max)
    let intentSpecificity = 10; // Default for 'networking'
    if (request.intent_type && request.intent_type !== 'networking') {
      intentSpecificity = 20; // Non-default intent shows more thought
    }

    // 5. Count mutual connections (10 points max)
    const mutualConnections = await this.getMutualConnections(
      request.sender_user_id,
      request.receiver_user_id
    );
    const mutualCount = mutualConnections.length;
    const mutualConnectionsFactor = Math.min(10, mutualCount * 2); // 2 points per mutual, max 10

    // 6. Apply weights and calculate total
    const totalScore = Math.round(
      senderTrustFactor + messageQualityFactor + intentSpecificity + mutualConnectionsFactor
    );

    // 7. Determine level
    let level: 'high' | 'medium' | 'low';
    if (totalScore >= 70) {
      level = 'high';
    } else if (totalScore >= 40) {
      level = 'medium';
    } else {
      level = 'low';
    }

    return {
      requestId,
      score: totalScore,
      level,
      factors: {
        senderTrust: Math.round(senderTrustFactor),
        messageQuality: Math.round(messageQualityFactor),
        intentSpecificity,
        mutualConnections: mutualConnectionsFactor
      }
    };
  }

  // ==========================================================================
  // Batch Operations (Phase 5)
  // ==========================================================================

  /**
   * Batch respond to multiple connection requests
   * Loops through request IDs and calls respondToRequest for each
   * Returns count of successful/failed operations
   */
  async batchRespondToRequests(
    userId: number,
    requestIds: number[],
    action: 'accept' | 'decline',
    response_message?: string
  ): Promise<BatchOperationResult> {
    const result: BatchOperationResult = {
      total: requestIds.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const requestId of requestIds) {
      try {
        await this.respondToRequest(requestId, userId, { action, response_message });
        result.successful++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          id: requestId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  // ==========================================================================
  // Dismissed Connections (Phase 6)
  // ==========================================================================

  /**
   * Get all dismissed connections for a user
   * Combines PYMK dismissals (from recommendation_feedback) and
   * declined connection requests (from connection_request where user is receiver)
   *
   * @param userId - The user viewing their dismissed list
   * @returns Array of dismissed connections sorted by date (newest first)
   */
  async getDismissedConnections(userId: number): Promise<DismissedConnection[]> {
    const dismissed: DismissedConnection[] = [];

    // 1. Get PYMK dismissals from recommendation_feedback
    // These are users the current user dismissed from PYMK
    // EXCLUDE users who are already in the blacklist (user_blocks)
    const pymkResult: DbResult<{
      id: number;
      recommended_user_id: number;
      action: string;
      not_interested_reason: string | null;
      other_reason: string | null;
      created_at: Date;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      avatar_bg_color: string | null;
    }> = await this.db.query(
      `SELECT
        rf.id,
        rf.recommended_user_id,
        rf.action,
        rf.not_interested_reason,
        rf.other_reason,
        rf.created_at,
        u.username,
        u.display_name,
        u.avatar_url,
        u.avatar_bg_color
      FROM recommendation_feedback rf
      JOIN users u ON rf.recommended_user_id = u.id
      WHERE rf.user_id = ?
        AND rf.action IN ('dismissed', 'not_interested')
        AND NOT EXISTS (
          SELECT 1 FROM user_blocks ub
          WHERE ub.blocker_user_id = rf.user_id
            AND ub.blocked_user_id = rf.recommended_user_id
        )
      ORDER BY rf.created_at DESC`,
      [userId]
    );

    for (const row of pymkResult.rows) {
      dismissed.push({
        id: row.id,
        source: 'pymk_dismissed',
        user_id: row.recommended_user_id,
        username: row.username,
        display_name: row.display_name,
        avatar_url: row.avatar_url,
        avatar_bg_color: row.avatar_bg_color,
        dismiss_reason: row.not_interested_reason as DismissedConnection['dismiss_reason'],
        other_reason: row.other_reason,
        dismissed_at: row.created_at
      });
    }

    // 2. Get declined connection requests where user was the receiver
    // These are requests the current user declined
    // EXCLUDE users who are already in the blacklist (user_blocks)
    const declinedResult: DbResult<{
      id: number;
      sender_user_id: number;
      message: string | null;
      intent_type: string | null;
      responded_at: Date;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      avatar_bg_color: string | null;
    }> = await this.db.query(
      `SELECT
        cr.id,
        cr.sender_user_id,
        cr.message,
        cr.intent_type,
        cr.responded_at,
        u.username,
        u.display_name,
        u.avatar_url,
        u.avatar_bg_color
      FROM connection_request cr
      JOIN users u ON cr.sender_user_id = u.id
      WHERE cr.receiver_user_id = ?
        AND cr.status = 'declined'
        AND NOT EXISTS (
          SELECT 1 FROM user_blocks ub
          WHERE ub.blocker_user_id = cr.receiver_user_id
            AND ub.blocked_user_id = cr.sender_user_id
        )
      ORDER BY cr.responded_at DESC`,
      [userId]
    );

    for (const row of declinedResult.rows) {
      dismissed.push({
        id: row.id,
        source: 'request_declined',
        user_id: row.sender_user_id,
        username: row.username,
        display_name: row.display_name,
        avatar_url: row.avatar_url,
        avatar_bg_color: row.avatar_bg_color,
        request_message: row.message,
        request_intent: row.intent_type,
        dismissed_at: row.responded_at
      });
    }

    // Sort combined list by dismissed_at (newest first)
    dismissed.sort((a, b) => new Date(b.dismissed_at).getTime() - new Date(a.dismissed_at).getTime());

    return dismissed;
  }

  /**
   * Permanently remove a dismissed connection from the list
   * Deletes from recommendation_feedback (for PYMK) or connection_request (for declined)
   *
   * @param userId - The user removing from their dismissed list
   * @param dismissedUserId - The user being removed from the dismissed list
   * @param source - The source of the dismissal
   */
  async permanentlyRemoveDismissed(
    userId: number,
    dismissedUserId: number,
    source: DismissedSource
  ): Promise<void> {
    if (source === 'pymk_dismissed') {
      // Delete from recommendation_feedback
      const result = await this.db.query(
        `DELETE FROM recommendation_feedback
         WHERE user_id = ? AND recommended_user_id = ?`,
        [userId, dismissedUserId]
      );

      if (result.rowCount === 0) {
        throw new ConnectionNotFoundError('Dismissed recommendation not found');
      }
    } else if (source === 'request_declined') {
      // Delete from connection_request
      const result = await this.db.query(
        `DELETE FROM connection_request
         WHERE receiver_user_id = ? AND sender_user_id = ? AND status = 'declined'`,
        [userId, dismissedUserId]
      );

      if (result.rowCount === 0) {
        throw new ConnectionNotFoundError('Declined request not found');
      }
    } else {
      throw new ConnectionError('Invalid source type');
    }
  }

  // ==========================================================================
  // User Blocking / Blacklist (Phase 7)
  // ==========================================================================

  /**
   * Block a user with granular area controls
   *
   * @param blockerId - User performing the block
   * @param input - Block configuration (areas and reason)
   * @returns Created block record
   */
  async blockUser(blockerId: number, input: BlockUserInput): Promise<BlockedUser> {
    const { blocked_user_id, block_messages, block_connections, block_pymk, block_reason } = input;

    // Cannot block yourself
    if (blockerId === blocked_user_id) {
      throw new ConnectionError('Cannot block yourself');
    }

    // Must block at least one area
    if (!block_messages && !block_connections && !block_pymk) {
      throw new ConnectionError('Must select at least one area to block');
    }

    // Check if already blocked
    const existingBlock: DbResult<{ id: number }> = await this.db.query(
      `SELECT id FROM user_blocks WHERE blocker_user_id = ? AND blocked_user_id = ?`,
      [blockerId, blocked_user_id]
    );

    if (existingBlock.rows[0]) {
      // Update existing block
      await this.db.query(
        `UPDATE user_blocks
         SET block_messages = ?, block_connections = ?, block_pymk = ?, block_reason = ?, updated_at = NOW()
         WHERE blocker_user_id = ? AND blocked_user_id = ?`,
        [block_messages ? 1 : 0, block_connections ? 1 : 0, block_pymk ? 1 : 0, block_reason || null, blockerId, blocked_user_id]
      );
    } else {
      // Create new block
      await this.db.query(
        `INSERT INTO user_blocks
         (blocker_user_id, blocked_user_id, block_messages, block_connections, block_pymk, block_reason)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [blockerId, blocked_user_id, block_messages ? 1 : 0, block_connections ? 1 : 0, block_pymk ? 1 : 0, block_reason || null]
      );
    }

    // If blocking connections, remove any existing connection
    if (block_connections) {
      await this.db.query(
        `DELETE FROM user_connection
         WHERE (sender_user_id = ? AND receiver_user_id = ?)
            OR (sender_user_id = ? AND receiver_user_id = ?)`,
        [blockerId, blocked_user_id, blocked_user_id, blockerId]
      );

      // Also cancel any pending requests
      await this.db.query(
        `DELETE FROM connection_request
         WHERE ((sender_user_id = ? AND receiver_user_id = ?)
            OR (sender_user_id = ? AND receiver_user_id = ?))
           AND status = 'pending'`,
        [blockerId, blocked_user_id, blocked_user_id, blockerId]
      );
    }

    // Fetch and return the created/updated block with profile info
    return this.getBlockedUserRecord(blockerId, blocked_user_id);
  }

  /**
   * Unblock a user completely
   *
   * @param blockerId - User performing the unblock
   * @param blockedUserId - User to unblock
   */
  async unblockUser(blockerId: number, blockedUserId: number): Promise<void> {
    const result = await this.db.query(
      `DELETE FROM user_blocks WHERE blocker_user_id = ? AND blocked_user_id = ?`,
      [blockerId, blockedUserId]
    );

    if (result.rowCount === 0) {
      throw new ConnectionNotFoundError('Block record not found');
    }
  }

  /**
   * Get all users blocked by the current user
   *
   * @param userId - User whose blacklist to retrieve
   * @returns Array of blocked users with profile info
   */
  async getBlockedUsers(userId: number): Promise<BlockedUser[]> {
    const result: DbResult<{
      id: number;
      blocked_user_id: number;
      block_messages: number;
      block_connections: number;
      block_pymk: number;
      block_reason: string | null;
      created_at: Date;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      avatar_bg_color: string | null;
    }> = await this.db.query(
      `SELECT
        ub.id,
        ub.blocked_user_id,
        ub.block_messages,
        ub.block_connections,
        ub.block_pymk,
        ub.block_reason,
        ub.created_at,
        u.username,
        u.display_name,
        u.avatar_url,
        u.avatar_bg_color
      FROM user_blocks ub
      JOIN users u ON ub.blocked_user_id = u.id
      WHERE ub.blocker_user_id = ?
      ORDER BY ub.created_at DESC`,
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      blocked_user_id: row.blocked_user_id,
      username: row.username,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      avatar_bg_color: row.avatar_bg_color,
      block_messages: row.block_messages === 1,
      block_connections: row.block_connections === 1,
      block_pymk: row.block_pymk === 1,
      block_reason: row.block_reason,
      blocked_at: row.created_at
    }));
  }

  /**
   * Check if a user is blocked in a specific area
   *
   * @param blockerId - User who may have blocked
   * @param blockedUserId - User who may be blocked
   * @param area - Area to check: 'messages' | 'connections' | 'pymk'
   * @returns true if blocked in that area
   */
  async isUserBlockedInArea(
    blockerId: number,
    blockedUserId: number,
    area: 'messages' | 'connections' | 'pymk'
  ): Promise<boolean> {
    const columnMap = {
      messages: 'block_messages',
      connections: 'block_connections',
      pymk: 'block_pymk'
    };

    const result: DbResult<{ blocked: number }> = await this.db.query(
      `SELECT ${columnMap[area]} AS blocked
       FROM user_blocks
       WHERE blocker_user_id = ? AND blocked_user_id = ?`,
      [blockerId, blockedUserId]
    );

    return result.rows[0]?.blocked === 1;
  }

  /**
   * Check if either user has blocked the other (bidirectional check)
   *
   * @param userIdA - First user
   * @param userIdB - Second user
   * @param area - Area to check
   * @returns Object indicating who blocked whom
   */
  async checkBlockStatus(
    userIdA: number,
    userIdB: number,
    area: 'messages' | 'connections' | 'pymk'
  ): Promise<{ aBlockedB: boolean; bBlockedA: boolean }> {
    const [aBlockedB, bBlockedA] = await Promise.all([
      this.isUserBlockedInArea(userIdA, userIdB, area),
      this.isUserBlockedInArea(userIdB, userIdA, area)
    ]);

    return { aBlockedB, bBlockedA };
  }

  /**
   * Get a single blocked user record with profile info
   * (Internal helper)
   */
  private async getBlockedUserRecord(blockerId: number, blockedUserId: number): Promise<BlockedUser> {
    const result: DbResult<{
      id: number;
      blocked_user_id: number;
      block_messages: number;
      block_connections: number;
      block_pymk: number;
      block_reason: string | null;
      created_at: Date;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      avatar_bg_color: string | null;
    }> = await this.db.query(
      `SELECT
        ub.id,
        ub.blocked_user_id,
        ub.block_messages,
        ub.block_connections,
        ub.block_pymk,
        ub.block_reason,
        ub.created_at,
        u.username,
        u.display_name,
        u.avatar_url,
        u.avatar_bg_color
      FROM user_blocks ub
      JOIN users u ON ub.blocked_user_id = u.id
      WHERE ub.blocker_user_id = ? AND ub.blocked_user_id = ?`,
      [blockerId, blockedUserId]
    );

    if (!result.rows[0]) {
      throw new ConnectionNotFoundError('Block record not found');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      blocked_user_id: row.blocked_user_id,
      username: row.username,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      avatar_bg_color: row.avatar_bg_color,
      block_messages: row.block_messages === 1,
      block_connections: row.block_connections === 1,
      block_pymk: row.block_pymk === 1,
      block_reason: row.block_reason,
      blocked_at: row.created_at
    };
  }
}
