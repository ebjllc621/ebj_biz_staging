/**
 * QuoteService Unit Tests
 *
 * Tests core functionality of QuoteService including:
 * - Quote CRUD operations (5 methods)
 * - Quote request workflow (4 methods)
 * - Quote response/bid workflow (5 methods)
 * - Dashboard summary (1 method)
 * - Messaging (2 methods)
 * - Admin queries (1 method)
 * - Error classes (3 classes)
 *
 * @phase Phase 3 Tech Debt Remediation
 * @coverage Target: 70%+
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuoteService, QuoteNotFoundError, UnauthorizedQuoteAccessError, QuoteError } from '../QuoteService';
import { DatabaseService } from '@core/services/DatabaseService';

// Mock NotificationService (QuoteService creates one internally)
vi.mock('@core/services/NotificationService', () => ({
  NotificationService: vi.fn().mockImplementation(() => ({
    sendNotification: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockResolvedValue(undefined)
  }))
}));

// ============================================================================
// Mock Data
// ============================================================================

const mockQuoteRow = {
  id: 1,
  requester_user_id: 1,
  requester_name: 'Test User',
  requester_email: 'test@example.com',
  requester_phone: null,
  title: 'Test Quote',
  description: 'Test description',
  service_category: 'plumbing',
  timeline: 'flexible',
  budget_min: 100,
  budget_max: 500,
  preferred_start_date: null,
  location_address: null,
  location_city: 'Portland',
  location_state: 'OR',
  location_zip: '97201',
  status: 'open',
  visibility: 'public',
  expires_at: null,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
  request_count: 0n,
  response_count: 0n
};

const mockQuoteRequestRow = {
  id: 1,
  quote_id: 1,
  target_type: 'listing',
  target_listing_id: 10,
  target_group_id: null,
  target_user_id: null,
  invited_at: new Date('2026-01-01'),
  viewed_at: null,
  status: 'pending',
  target_name: 'Test Listing',
  target_avatar_url: null
};

const mockQuoteResponseRow = {
  id: 1,
  quote_id: 1,
  quote_request_id: 1,
  responder_user_id: 2,
  responder_listing_id: 10,
  bid_amount: 250,
  bid_description: 'I can do this job',
  estimated_duration: '2 weeks',
  valid_until: null,
  attachments: null,
  status: 'pending',
  created_at: new Date('2026-01-02'),
  updated_at: new Date('2026-01-02'),
  responder_name: 'Vendor User',
  responder_avatar_url: null,
  listing_name: 'Test Listing'
};

const mockMessageRow = {
  id: 1,
  quote_id: 1,
  quote_response_id: null,
  sender_user_id: 1,
  content: 'Hello',
  created_at: new Date('2026-01-03'),
  sender_name: 'Test User',
  sender_avatar_url: null
};

// ============================================================================
// Tests
// ============================================================================

describe('QuoteService', () => {
  let service: QuoteService;
  let mockDb: DatabaseService;
  let queryMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    queryMock = vi.fn();
    mockDb = { query: queryMock } as unknown as DatabaseService;
    service = new QuoteService(mockDb);
  });

  // ==========================================================================
  // Error Classes
  // ==========================================================================

  describe('QuoteError', () => {
    it('should create error with correct code and name', () => {
      const error = new QuoteError('Something failed');
      expect(error.name).toBe('QuoteError');
      expect(error.message).toBe('Something failed');
    });
  });

  describe('QuoteNotFoundError', () => {
    it('should have default message', () => {
      const error = new QuoteNotFoundError();
      expect(error.name).toBe('QuoteNotFoundError');
      expect(error.message).toBe('Quote not found');
    });

    it('should accept custom message', () => {
      const error = new QuoteNotFoundError('Custom not found');
      expect(error.message).toBe('Custom not found');
    });
  });

  describe('UnauthorizedQuoteAccessError', () => {
    it('should have default message', () => {
      const error = new UnauthorizedQuoteAccessError();
      expect(error.name).toBe('UnauthorizedQuoteAccessError');
      expect(error.message).toBe('Not authorized to access this quote');
    });

    it('should accept custom message', () => {
      const error = new UnauthorizedQuoteAccessError('Custom unauthorized');
      expect(error.message).toBe('Custom unauthorized');
    });
  });

  // ==========================================================================
  // 1. createQuote
  // ==========================================================================

  describe('createQuote', () => {
    it('should create a quote and return mapped result', async () => {
      queryMock
        .mockResolvedValueOnce({ rows: [{ name: 'Test User', email: 'test@example.com' }] }) // user lookup
        .mockResolvedValueOnce({ insertId: 1 }) // INSERT
        .mockResolvedValueOnce({ rows: [{ ...mockQuoteRow, id: 1 }] }); // getQuote SELECT

      const result = await service.createQuote(1, {
        title: 'Test Quote',
        description: 'Test description'
      });

      expect(result.id).toBe(1);
      expect(result.title).toBe('Test Quote');
      expect(queryMock).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 2. getQuote
  // ==========================================================================

  describe('getQuote', () => {
    it('should return quote when found', async () => {
      queryMock.mockResolvedValueOnce({ rows: [mockQuoteRow] });

      const result = await service.getQuote(1, 1);

      expect(result.id).toBe(1);
      expect(result.title).toBe('Test Quote');
      expect(result.requesterName).toBe('Test User');
    });

    it('should throw QuoteNotFoundError when not found', async () => {
      queryMock.mockResolvedValueOnce({ rows: [] });

      await expect(service.getQuote(999, 1)).rejects.toThrow(QuoteNotFoundError);
    });
  });

  // ==========================================================================
  // 3. getUserQuotes
  // ==========================================================================

  describe('getUserQuotes', () => {
    it('should return paginated list', async () => {
      queryMock
        .mockResolvedValueOnce({ rows: [{ total: 1n }] }) // COUNT
        .mockResolvedValueOnce({ rows: [mockQuoteRow] }); // data

      const result = await service.getUserQuotes(1);

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.title).toBe('Test Quote');
    });

    it('should apply status filter', async () => {
      queryMock
        .mockResolvedValueOnce({ rows: [{ total: 0n }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.getUserQuotes(1, { status: 'completed' as never });

      expect(result.total).toBe(0);
      expect(result.items).toHaveLength(0);
      // Verify the query includes status filter
      expect(queryMock.mock.calls[0]![1]).toContain('completed');
    });
  });

  // ==========================================================================
  // 3b. getQuotesAdmin
  // ==========================================================================

  describe('getQuotesAdmin', () => {
    it('should return all quotes without user filter', async () => {
      queryMock
        .mockResolvedValueOnce({ rows: [{ total: 5n }] })
        .mockResolvedValueOnce({ rows: [mockQuoteRow] });

      const result = await service.getQuotesAdmin();

      expect(result.total).toBe(5);
      expect(result.items).toHaveLength(1);
      // Verify no userId in query params (first query params should be empty or just filters)
      const countParams = queryMock.mock.calls[0]![1] as unknown[];
      expect(countParams).toHaveLength(0);
    });

    it('should apply status filter for admin', async () => {
      queryMock
        .mockResolvedValueOnce({ rows: [{ total: 2n }] })
        .mockResolvedValueOnce({ rows: [] });

      await service.getQuotesAdmin({ status: 'open' as never });

      expect(queryMock.mock.calls[0]![1]).toContain('open');
    });
  });

  // ==========================================================================
  // 4. updateQuote
  // ==========================================================================

  describe('updateQuote', () => {
    it('should update quote fields', async () => {
      queryMock
        .mockResolvedValueOnce({ rows: [{ id: 1, requester_user_id: 1 }] }) // ownership check
        .mockResolvedValueOnce({}) // UPDATE
        .mockResolvedValueOnce({ rows: [{ ...mockQuoteRow, title: 'Updated Title' }] }); // getQuote

      const result = await service.updateQuote(1, 1, { title: 'Updated Title' });

      expect(result.title).toBe('Updated Title');
    });

    it('should throw QuoteNotFoundError for non-existent quote', async () => {
      queryMock.mockResolvedValueOnce({ rows: [] });

      await expect(service.updateQuote(999, 1, { title: 'x' })).rejects.toThrow(QuoteNotFoundError);
    });

    it('should throw UnauthorizedQuoteAccessError for wrong user', async () => {
      queryMock.mockResolvedValueOnce({ rows: [{ id: 1, requester_user_id: 2 }] });

      await expect(service.updateQuote(1, 999, { title: 'x' })).rejects.toThrow(UnauthorizedQuoteAccessError);
    });
  });

  // ==========================================================================
  // 5. deleteQuote
  // ==========================================================================

  describe('deleteQuote', () => {
    it('should soft-delete a quote', async () => {
      queryMock
        .mockResolvedValueOnce({ rows: [{ id: 1, requester_user_id: 1 }] })
        .mockResolvedValueOnce({}); // UPDATE

      await service.deleteQuote(1, 1);

      expect(queryMock).toHaveBeenCalledTimes(2);
      expect(queryMock.mock.calls[1]![0]).toContain('cancelled');
    });

    it('should throw QuoteNotFoundError', async () => {
      queryMock.mockResolvedValueOnce({ rows: [] });

      await expect(service.deleteQuote(999, 1)).rejects.toThrow(QuoteNotFoundError);
    });

    it('should throw UnauthorizedQuoteAccessError', async () => {
      queryMock.mockResolvedValueOnce({ rows: [{ id: 1, requester_user_id: 2 }] });

      await expect(service.deleteQuote(1, 999)).rejects.toThrow(UnauthorizedQuoteAccessError);
    });
  });

  // ==========================================================================
  // 6. sendQuoteRequest
  // ==========================================================================

  describe('sendQuoteRequest', () => {
    it('should create a quote request', async () => {
      queryMock
        .mockResolvedValueOnce({ rows: [{ id: 1, requester_user_id: 1 }] }) // ownership check
        .mockResolvedValueOnce({ insertId: 1 }) // INSERT
        .mockResolvedValueOnce({}) // UPDATE draft -> open
        .mockResolvedValueOnce({ rows: [mockQuoteRequestRow] }); // SELECT

      const result = await service.sendQuoteRequest(1, {
        quoteId: 1,
        targetType: 'listing',
        targetListingId: 10
      });

      expect(result.id).toBe(1);
      expect(result.targetType).toBe('listing');
    });

    it('should throw QuoteNotFoundError when quote missing', async () => {
      queryMock.mockResolvedValueOnce({ rows: [] });

      await expect(service.sendQuoteRequest(1, {
        quoteId: 999,
        targetType: 'listing',
        targetListingId: 10
      })).rejects.toThrow(QuoteNotFoundError);
    });
  });

  // ==========================================================================
  // 7. getQuoteRequests
  // ==========================================================================

  describe('getQuoteRequests', () => {
    it('should return requests for a quote', async () => {
      queryMock
        .mockResolvedValueOnce({ rows: [mockQuoteRow] }) // getQuote access check
        .mockResolvedValueOnce({ rows: [mockQuoteRequestRow] }); // SELECT requests

      const result = await service.getQuoteRequests(1, 1);

      expect(result).toHaveLength(1);
      expect(result[0]!.targetType).toBe('listing');
    });
  });

  // ==========================================================================
  // 8. markRequestViewed
  // ==========================================================================

  describe('markRequestViewed', () => {
    it('should mark request as viewed', async () => {
      queryMock
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // access check
        .mockResolvedValueOnce({}); // UPDATE

      await service.markRequestViewed(1, 1);

      expect(queryMock).toHaveBeenCalledTimes(2);
      expect(queryMock.mock.calls[1]![0]).toContain('viewed_at');
    });

    it('should throw UnauthorizedQuoteAccessError when not authorized', async () => {
      queryMock.mockResolvedValueOnce({ rows: [] });

      await expect(service.markRequestViewed(1, 999)).rejects.toThrow(UnauthorizedQuoteAccessError);
    });
  });

  // ==========================================================================
  // 9. declineRequest
  // ==========================================================================

  describe('declineRequest', () => {
    it('should decline a request', async () => {
      queryMock
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // access check
        .mockResolvedValueOnce({}); // UPDATE

      await service.declineRequest(1, 1);

      expect(queryMock.mock.calls[1]![0]).toContain('declined');
    });

    it('should throw UnauthorizedQuoteAccessError when not authorized', async () => {
      queryMock.mockResolvedValueOnce({ rows: [] });

      await expect(service.declineRequest(1, 999)).rejects.toThrow(UnauthorizedQuoteAccessError);
    });
  });

  // ==========================================================================
  // 10. createQuoteResponse
  // ==========================================================================

  describe('createQuoteResponse', () => {
    it('should create a bid/response', async () => {
      queryMock
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'open' }] }) // quote exists check
        .mockResolvedValueOnce({ insertId: 1 }) // INSERT response
        .mockResolvedValueOnce({}) // UPDATE request status (if linked)
        .mockResolvedValueOnce({ rows: [mockQuoteResponseRow] }); // SELECT response

      const result = await service.createQuoteResponse(2, {
        quoteId: 1,
        quoteRequestId: 1,
        bidAmount: 250,
        bidDescription: 'I can do this job'
      });

      expect(result.id).toBe(1);
      expect(result.bidAmount).toBe(250);
    });

    it('should throw QuoteNotFoundError when quote missing', async () => {
      queryMock.mockResolvedValueOnce({ rows: [] });

      await expect(service.createQuoteResponse(2, {
        quoteId: 999,
        bidDescription: 'bid'
      })).rejects.toThrow(QuoteNotFoundError);
    });

    it('should throw QuoteError when quote is cancelled', async () => {
      queryMock.mockResolvedValueOnce({ rows: [{ id: 1, status: 'cancelled' }] });

      await expect(service.createQuoteResponse(2, {
        quoteId: 1,
        bidDescription: 'bid'
      })).rejects.toThrow(QuoteError);
    });
  });

  // ==========================================================================
  // 11. getQuoteResponses
  // ==========================================================================

  describe('getQuoteResponses', () => {
    it('should return paginated responses', async () => {
      queryMock
        .mockResolvedValueOnce({ rows: [mockQuoteRow] }) // getQuote access check
        .mockResolvedValueOnce({ rows: [{ total: 1n }] }) // COUNT
        .mockResolvedValueOnce({ rows: [mockQuoteResponseRow] }); // data

      const result = await service.getQuoteResponses(1, 1);

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.bidAmount).toBe(250);
    });
  });

  // ==========================================================================
  // 12. getReceivedQuoteRequests
  // ==========================================================================

  describe('getReceivedQuoteRequests', () => {
    it('should return received requests for user listings', async () => {
      queryMock
        .mockResolvedValueOnce({ rows: [{ total: 1n }] }) // COUNT
        .mockResolvedValueOnce({ rows: [mockQuoteRequestRow] }); // data

      const result = await service.getReceivedQuoteRequests(2);

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
    });
  });

  // ==========================================================================
  // 13. updateQuoteResponse
  // ==========================================================================

  describe('updateQuoteResponse', () => {
    it('should update response fields', async () => {
      queryMock
        .mockResolvedValueOnce({ rows: [{ id: 1, responder_user_id: 2 }] }) // ownership
        .mockResolvedValueOnce({}) // UPDATE
        .mockResolvedValueOnce({ rows: [{ ...mockQuoteResponseRow, bid_amount: 300 }] }); // SELECT

      const result = await service.updateQuoteResponse(1, 2, { bidAmount: 300 });

      expect(result.bidAmount).toBe(300);
    });

    it('should throw error for unauthorized update', async () => {
      queryMock.mockResolvedValueOnce({ rows: [{ id: 1, responder_user_id: 2 }] });

      await expect(service.updateQuoteResponse(1, 999, { bidAmount: 300 }))
        .rejects.toThrow(UnauthorizedQuoteAccessError);
    });
  });

  // ==========================================================================
  // 14. acceptResponse
  // ==========================================================================

  describe('acceptResponse', () => {
    it('should accept a response', async () => {
      queryMock
        .mockResolvedValueOnce({ rows: [{ id: 1, quote_id: 1 }] }) // response exists
        .mockResolvedValueOnce({ rows: [{ id: 1, requester_user_id: 1 }] }) // quote ownership
        .mockResolvedValueOnce({}) // UPDATE response
        .mockResolvedValueOnce({}); // UPDATE quote

      await service.acceptResponse(1, 1);

      expect(queryMock).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 15. rejectResponse
  // ==========================================================================

  describe('rejectResponse', () => {
    it('should reject a response', async () => {
      queryMock
        .mockResolvedValueOnce({ rows: [{ id: 1, quote_id: 1 }] }) // response exists
        .mockResolvedValueOnce({ rows: [{ id: 1, requester_user_id: 1 }] }) // quote ownership
        .mockResolvedValueOnce({}); // UPDATE response

      await service.rejectResponse(1, 1);

      expect(queryMock).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 16. getQuoteDashboardSummary
  // ==========================================================================

  describe('getQuoteDashboardSummary', () => {
    it('should return dashboard summary stats', async () => {
      // 3 aggregate queries: sent, received, responses
      queryMock
        .mockResolvedValueOnce({ rows: [{ total: 10n, open: 5n, in_progress: 3n, completed: 2n }] })
        .mockResolvedValueOnce({ rows: [{ total: 8n, pending: 4n, responded: 4n }] })
        .mockResolvedValueOnce({ rows: [{ total: 6n, pending: 3n, accepted: 2n }] });

      const result = await service.getQuoteDashboardSummary(1);

      expect(result).toBeDefined();
      expect(result.sentQuotes.total).toBe(10);
      expect(result.sentQuotes.open).toBe(5);
      expect(result.receivedRequests.total).toBe(8);
      expect(result.myResponses.total).toBe(6);
    });
  });

  // ==========================================================================
  // 17. sendQuoteMessage
  // ==========================================================================

  describe('sendQuoteMessage', () => {
    it('should create a message', async () => {
      queryMock
        .mockResolvedValueOnce({ rows: [mockQuoteRow] }) // access check (getQuote)
        .mockResolvedValueOnce({ insertId: 1 }) // INSERT message
        .mockResolvedValueOnce({ rows: [mockMessageRow] }); // SELECT message

      const result = await service.sendQuoteMessage(1, 1, 'Hello');

      expect(result.id).toBe(1);
      expect(result.content).toBe('Hello');
    });
  });

  // ==========================================================================
  // 18. getQuoteMessages
  // ==========================================================================

  describe('getQuoteMessages', () => {
    it('should return messages for a quote', async () => {
      queryMock
        .mockResolvedValueOnce({ rows: [mockQuoteRow] }) // access check
        .mockResolvedValueOnce({ rows: [mockMessageRow] }); // SELECT messages

      const result = await service.getQuoteMessages(1, 1);

      expect(result).toHaveLength(1);
      expect(result[0]!.content).toBe('Hello');
    });
  });
});
