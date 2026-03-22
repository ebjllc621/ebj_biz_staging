/**
 * Cloudinary Webhook API Route
 *
 * Handles webhook notifications from Cloudinary for event logging and monitoring.
 *
 * ARCHITECTURE NOTE:
 * User-generated content uploads directly to Cloudinary and stays there.
 * We do NOT mirror Cloudinary content to local storage.
 *
 * Site assets are stored locally and backed up TO Cloudinary (opposite direction).
 *
 * This webhook is primarily for:
 * - Logging and monitoring upload/delete events
 * - Future: Cleanup orphaned backup references
 * - Future: Notification of transformation completion
 *
 * @authority Universal Media Manager compliance
 * @see .cursor/rules/universal-media-manager.mdc
 * @see .cursor/rules/admin-manager-api-standard.mdc
 */


import { apiHandler, ApiContext, ApiResponse } from '@/core/api/apiHandler';
import { BizError } from '@/core/errors/BizError';
import { createHash, timingSafeEqual } from 'crypto';

interface CloudinaryWebhookPayload {
  notification_type: string;
  timestamp: number;
  request_id: string;
  asset_id: string;
  public_id: string;
  version: number;
  version_id: string;
  width?: number;
  height?: number;
  format: string;
  resource_type: string;
  created_at: string;
  uploaded_at: string;
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  folder?: string;
  original_filename?: string;
  api_key: string;
}

interface WebhookResponse {
  processed: boolean;
  action: string;
  message: string;
  details?: unknown;
}

/**
 * Cloudinary webhook handler
 */
async function webhookHandler(context: ApiContext): Promise<ApiResponse<WebhookResponse>> {
  try {
    const { request } = context;

    // Verify webhook signature for security
    const signature = request.headers.get('x-cld-signature');
    const timestamp = request.headers.get('x-cld-timestamp');

    if (!signature || !timestamp) {
      throw new BizError({
        code: 'UNAUTHORIZED',
        message: 'Missing webhook signature or timestamp',
        context: { hasSignature: !!signature, hasTimestamp: !!timestamp },
      });
    }

    // Get request body
    const body = await request.text();
    const payload: CloudinaryWebhookPayload = JSON.parse(body);

    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature, timestamp)) {
      throw new BizError({
        code: 'UNAUTHORIZED',
        message: 'Invalid webhook signature',
        context: { requestId: payload.request_id },
      });
    }

    // Process different notification types
    switch (payload.notification_type) {
      case 'upload':
      case 'update':
        return await handleUploadEvent(payload);
      case 'delete':
        return await handleDeleteEvent(payload);
      default:
        // Log but don't error for unknown notification types
        return {
          success: true,
          data: {
            processed: false,
            action: 'ignored',
            message: `Unknown notification type: ${payload.notification_type}`,
          },
        };
    }
  } catch (error) {
    // Re-throw BizErrors as-is
    if (error instanceof BizError) {
      throw error;
    }

    // Wrap other errors
    throw new BizError({
      code: 'WEBHOOK_ERROR',
      message: 'Failed to process webhook',
      cause: error instanceof Error ? error : undefined,
      context: {
        originalError: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

/**
 * Handle upload/update events from Cloudinary
 *
 * IMPORTANT: We do NOT mirror Cloudinary content to local storage.
 * User-generated content stays on Cloudinary (the system of record).
 * This handler is for logging/monitoring purposes only.
 */
async function handleUploadEvent(payload: CloudinaryWebhookPayload): Promise<ApiResponse<WebhookResponse>> {
  // Log the upload event for monitoring
  console.log('[CLOUDINARY_WEBHOOK] Upload event received:', {
    publicId: payload.public_id,
    folder: payload.folder,
    format: payload.format,
    bytes: payload.bytes,
    requestId: payload.request_id,
  });

  // No local mirroring - Cloudinary is the system of record for user content
  return {
    success: true,
    data: {
      processed: true,
      action: 'logged',
      message: 'Upload event logged. No local mirror required - Cloudinary is system of record.',
      details: {
        publicId: payload.public_id,
        folder: payload.folder,
        bytes: payload.bytes,
      },
    },
  };
}

/**
 * Handle delete events from Cloudinary
 */
async function handleDeleteEvent(payload: CloudinaryWebhookPayload): Promise<ApiResponse<WebhookResponse>> {
  // Log the delete event for monitoring
  console.log('[CLOUDINARY_WEBHOOK] Delete event received:', {
    publicId: payload.public_id,
    requestId: payload.request_id,
  });

  return {
    success: true,
    data: {
      processed: true,
      action: 'logged',
      message: 'Delete event logged.',
      details: { publicId: payload.public_id },
    },
  };
}

/**
 * Verify webhook signature for security
 */
function verifyWebhookSignature(body: string, signature: string, timestamp: string): boolean {
  try {
    const webhookSecret = process.env.CLOUDINARY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return true; // Allow in development mode without secret
    }

    // Create expected signature
    const expectedSignature = createHash('sha1')
      .update(body + timestamp + webhookSecret)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    return signature.length === expectedSignature.length &&
           timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
  } catch (error) {
    return false;
  }
}

// Export Next.js route handler
export const POST = apiHandler(webhookHandler, {
  allowedMethods: ['POST'],
  timeout: 30000, // 30 second timeout
  requireAuth: false, // Webhooks don't use session auth, they use signature verification
});
