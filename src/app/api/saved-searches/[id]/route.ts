/**
 * P3.8c REST API - Individual Saved Search
 * DELETE /api/saved-searches/[id] - Delete saved search by ID for current client
 * Anonymous by client cookie following Build Map v2.1 ENHANCED patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import { ensureClientIdOnApi } from '@/lib/ids/client';
import { removeSaved } from '@/lib/saved/sqlite';
import { toEnhancedJsonResponse, jsonMethodNotAllowed, createErrorResponse } from '@/lib/http/json';

/**
 * DELETE /api/saved-searches/[id] - Remove saved search by ID
 * Only removes if owned by current client (ensures ownership via clientId)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const endpoint = `/api/saved-searches/${params.id}`;
  
  try {
    // Establish client identity with cookie management
    const outHeaders = new Headers();
    const clientId = ensureClientIdOnApi(request, outHeaders);
    
    // Add basic security headers
    outHeaders.set('Content-Type', 'application/json');
    outHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    outHeaders.set('X-Content-Type-Options', 'nosniff');
    
    // Add request ID if available
    const requestId = request.headers.get('x-request-id');
    if (requestId) {
      outHeaders.set('x-request-id', requestId);
    }
    
    // Attempt to remove the saved search (ownership verified by clientId)
    const removed = removeSaved(clientId, params.id);
    
    if (removed) {
      const response = {
        ok: true,
        data: { removed: true },
        timestamp: new Date().toISOString()
      };
      
      return new NextResponse(JSON.stringify(response), {
        status: 200,
        headers: outHeaders
      });
    } else {
      const errorResponse = {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'No such saved search'
        },
        timestamp: new Date().toISOString()
      };
      
      return new NextResponse(JSON.stringify(errorResponse), {
        status: 404,
        headers: outHeaders
      });
    }
    
  } catch (error) {
    return toEnhancedJsonResponse(
      createErrorResponse(
        'Failed to delete saved search',
        'INTERNAL_ERROR',
        500
      ),
      500
    );
  }
}

// Method guards - only DELETE allowed for individual resources
const ALLOWED_METHODS = ['DELETE'];

export async function GET() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function POST() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PUT() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}

export async function PATCH() {
  return jsonMethodNotAllowed(ALLOWED_METHODS);
}