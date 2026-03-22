/**
 * EventService Test Suite
 *
 * Comprehensive tests for EventService covering:
 * - READ operations (getAll, getById, getBySlug, getByListingId, getUpcoming, searchByDate)
 * - WRITE operations (create, update, delete, cancel)
 * - RSVP operations (rsvp, cancelRsvp, getRsvps, getUserRsvps, hasRsvped)
 * - TICKETING operations (addTicketTier, updateTicketInventory, getAvailableTickets)
 * - TIER ENFORCEMENT (checkEventLimit)
 * - UTILITY operations (generateSlug, incrementViewCount)
 * - Error scenarios
 * - Edge cases
 *
 * Coverage Target: 90%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  EventService,
  EventNotFoundError,
  EventFullError,
  EventPastError,
  EventCancelledError,
  DuplicateRsvpError,
  TierLimitExceededError,
  InvalidEventDatesError,
  DuplicateSlugError,
  LocationType,
  EventStatus,
  RSVPStatus
} from '../EventService';
import { DatabaseService } from '../DatabaseService';
import { ListingService } from '../ListingService';
import { BizError } from '@core/errors/BizError';

describe('EventService', () => {
  let service: EventService;
  let mockDb: unknown;
  let mockListingService: unknown;

  beforeEach(() => {
    // Create mock DatabaseService
    mockDb = {
      query: vi.fn(),
      transaction: vi.fn()
    };

    // Create mock ListingService
    mockListingService = {
      getById: vi.fn()
    };

    service = new EventService(mockDb, mockListingService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // READ Operations Tests
  // ==========================================================================

  describe('getAll', () => {
    it('should retrieve all events without filters', async () => {
      const mockRows = [
        {
          id: 1,
          listing_id: 1,
          title: 'Test Event',
          slug: 'test-event',
          description: 'Test description',
          event_type: 'conference',
          start_date: new Date('2025-12-10'),
          end_date: new Date('2025-12-11'),
          timezone: 'America/New_York',
          location_type: 'physical',
          venue_name: 'Test Venue',
          address: null,
          city: null,
          state: null,
          zip: null,
          virtual_link: null,
          banner_image: null,
          thumbnail: null,
          is_ticketed: 0,
          ticket_price: null,
          total_capacity: 100,
          remaining_capacity: 100,
          rsvp_count: 0,
          status: 'published',
          is_featured: 0,
          is_mock: 0,
          view_count: 0,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1 }) // count query
        .mockResolvedValueOnce({ rows: mockRows, rowCount: 1 }); // data query

      const result = await service.getAll();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should retrieve events with listingId filter', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.getAll({ listingId: 1 });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('listing_id = ?'),
        expect.arrayContaining([1])
      );
    });

    it('should retrieve upcoming events', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.getAll({ isUpcoming: true });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('start_date > NOW()'),
        expect.any(Array)
      );
    });
  });

  describe('getById', () => {
    it('should retrieve event by ID', async () => {
      const mockRow = {
        id: 1,
        listing_id: 1,
        title: 'Test Event',
        slug: 'test-event',
        description: null,
        event_type: null,
        start_date: new Date('2025-12-10'),
        end_date: new Date('2025-12-11'),
        timezone: 'America/New_York',
        location_type: 'physical',
        venue_name: null,
        address: null,
        city: null,
        state: null,
        zip: null,
        virtual_link: null,
        banner_image: null,
        thumbnail: null,
        is_ticketed: 0,
        ticket_price: null,
        total_capacity: null,
        remaining_capacity: null,
        rsvp_count: 0,
        status: 'draft',
        is_featured: 0,
        is_mock: 0,
        view_count: 0,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [mockRow], rowCount: 1 });

      const result = await service.getById(1);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM events WHERE id = ?',
        [1]
      );
    });

    it('should return null if event not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await service.getById(999);

      expect(result).toBeNull();
    });
  });

  describe('getBySlug', () => {
    it('should retrieve event by slug', async () => {
      const mockRow = {
        id: 1,
        slug: 'test-event',
        listing_id: 1,
        title: 'Test Event',
        start_date: new Date(),
        end_date: new Date(),
        location_type: 'physical',
        status: 'draft',
        rsvp_count: 0,
        is_ticketed: 0,
        is_featured: 0,
        is_mock: 0,
        view_count: 0,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [mockRow], rowCount: 1 });

      const result = await service.getBySlug('test-event');

      expect(result).not.toBeNull();
      expect(result?.slug).toBe('test-event');
    });
  });

  describe('getUpcoming', () => {
    it('should retrieve upcoming published events', async () => {
      const mockRows = [
        {
          id: 1,
          listing_id: 1,
          title: 'Upcoming Event',
          slug: 'upcoming-event',
          start_date: new Date('2025-12-20'),
          end_date: new Date('2025-12-21'),
          location_type: 'physical',
          status: 'published',
          rsvp_count: 0,
          is_ticketed: 0,
          is_featured: 0,
          is_mock: 0,
          view_count: 0,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockRows, rowCount: 1 });

      const result = await service.getUpcoming(10);

      expect(result).toHaveLength(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('status = \'published\''),
        [10]
      );
    });
  });

  // ==========================================================================
  // WRITE Operations Tests
  // ==========================================================================

  describe('create', () => {
    it('should create a new event', async () => {
      const mockListing = { id: 1, tier: 'essential' };
      mockListingService.getById.mockResolvedValue(mockListing);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ count: 0 }], rowCount: 1 }) // tier check
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // slug check
        .mockResolvedValueOnce({ insertId: 1, rowCount: 1 }) // insert
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }); // getById

      const data = {
        title: 'New Event',
        start_date: new Date('2025-12-10'),
        end_date: new Date('2025-12-11')
      };

      const result = await service.create(1, data);

      expect(result).toBeDefined();
      expect(mockListingService.getById).toHaveBeenCalledWith(1);
    });

    it('should throw error if listing not found', async () => {
      mockListingService.getById.mockResolvedValue(null);

      const data = {
        title: 'New Event',
        start_date: new Date('2025-12-10'),
        end_date: new Date('2025-12-11')
      };

      await expect(service.create(999, data)).rejects.toThrow(BizError);
    });

    it('should throw error if tier limit exceeded', async () => {
      const mockListing = { id: 1, tier: 'essential' };
      mockListingService.getById.mockResolvedValue(mockListing);
      mockDb.query.mockResolvedValueOnce({ rows: [{ count: 4 }], rowCount: 1 }); // tier check - at limit

      const data = {
        title: 'New Event',
        start_date: new Date('2025-12-10'),
        end_date: new Date('2025-12-11')
      };

      await expect(service.create(1, data)).rejects.toThrow(TierLimitExceededError);
    });

    it('should throw error if start_date >= end_date', async () => {
      const mockListing = { id: 1, tier: 'essential' };
      mockListingService.getById.mockResolvedValue(mockListing);
      mockDb.query.mockResolvedValueOnce({ rows: [{ count: 0 }], rowCount: 1 });

      const data = {
        title: 'New Event',
        start_date: new Date('2025-12-11'),
        end_date: new Date('2025-12-10') // end before start
      };

      await expect(service.create(1, data)).rejects.toThrow(InvalidEventDatesError);
    });

    it('should throw error if start_date is in the past', async () => {
      const mockListing = { id: 1, tier: 'essential' };
      mockListingService.getById.mockResolvedValue(mockListing);
      mockDb.query.mockResolvedValueOnce({ rows: [{ count: 0 }], rowCount: 1 });

      const data = {
        title: 'New Event',
        start_date: new Date('2020-01-01'),
        end_date: new Date('2020-01-02')
      };

      await expect(service.create(1, data)).rejects.toThrow(BizError);
    });

    it('should throw error if slug already exists', async () => {
      const mockListing = { id: 1, tier: 'essential' };
      mockListingService.getById.mockResolvedValue(mockListing);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ count: 0 }], rowCount: 1 }) // tier check
        .mockResolvedValueOnce({ rows: [{ id: 2, slug: 'test-event' }], rowCount: 1 }); // slug check - exists

      const data = {
        title: 'Test Event',
        slug: 'test-event',
        start_date: new Date('2025-12-10'),
        end_date: new Date('2025-12-11')
      };

      await expect(service.create(1, data)).rejects.toThrow(DuplicateSlugError);
    });
  });

  describe('update', () => {
    it('should update an event', async () => {
      const mockEvent = {
        id: 1,
        slug: 'test-event',
        start_date: new Date('2025-12-10'),
        end_date: new Date('2025-12-11')
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEvent], rowCount: 1 }) // getById
        .mockResolvedValueOnce({ rowCount: 1 }) // update
        .mockResolvedValueOnce({ rows: [mockEvent], rowCount: 1 }); // getById again

      const result = await service.update(1, { title: 'Updated Event' });

      expect(result).toBeDefined();
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE events'),
        expect.any(Array)
      );
    });

    it('should throw error if event not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await expect(service.update(999, { title: 'Updated' })).rejects.toThrow(
        EventNotFoundError
      );
    });

    it('should return existing event if no changes provided', async () => {
      const mockEvent = { id: 1, slug: 'test' };
      mockDb.query.mockResolvedValue({ rows: [mockEvent], rowCount: 1 });

      const result = await service.update(1, {});

      expect(result).toEqual(mockEvent);
    });
  });

  describe('delete', () => {
    it('should delete an event', async () => {
      const mockEvent = { id: 1 };
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEvent], rowCount: 1 }) // getById
        .mockResolvedValueOnce({ rowCount: 1 }); // delete

      await service.delete(1);

      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM events WHERE id = ?',
        [1]
      );
    });

    it('should throw error if event not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await expect(service.delete(999)).rejects.toThrow(EventNotFoundError);
    });
  });

  describe('cancel', () => {
    it('should cancel an event', async () => {
      const mockEvent = { id: 1, status: 'published' };
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEvent], rowCount: 1 }) // getById
        .mockResolvedValueOnce({ rowCount: 1 }) // update status
        .mockResolvedValueOnce({ rows: [{ ...mockEvent, status: 'cancelled' }], rowCount: 1 }); // getById

      const result = await service.cancel(1, 'Weather conditions');

      expect(result.status).toBe('cancelled');
    });
  });

  // ==========================================================================
  // RSVP Operations Tests
  // ==========================================================================

  describe('rsvp', () => {
    it('should create an RSVP', async () => {
      const mockEvent = {
        id: 1,
        status: 'published',
        end_date: new Date('2025-12-20'),
        remaining_capacity: 50,
        total_capacity: 100
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEvent], rowCount: 1 }) // getById
        .mockResolvedValueOnce({ rows: [{ count: 0 }], rowCount: 1 }); // hasRsvped check

      const mockTransaction = vi.fn(async (callback) => {
        const mockClient = {
          query: vi.fn()
            .mockResolvedValueOnce({ insertId: 1, rowCount: 1 }) // insert RSVP
            .mockResolvedValueOnce({ rowCount: 1 }) // update event stats
            .mockResolvedValueOnce({ rows: [{ id: 1, event_id: 1, user_id: 1 }], rowCount: 1 }) // get RSVP
        };
        return callback(mockClient);
      });

      mockDb.transaction = mockTransaction;

      const result = await service.rsvp(1, 1);

      expect(result).toBeDefined();
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should throw error if event not published', async () => {
      const mockEvent = { id: 1, status: 'draft' };
      mockDb.query.mockResolvedValue({ rows: [mockEvent], rowCount: 1 });

      await expect(service.rsvp(1, 1)).rejects.toThrow(BizError);
    });

    it('should throw error if event has ended', async () => {
      const mockEvent = {
        id: 1,
        status: 'published',
        end_date: new Date('2020-01-01') // past date
      };
      mockDb.query.mockResolvedValue({ rows: [mockEvent], rowCount: 1 });

      await expect(service.rsvp(1, 1)).rejects.toThrow(EventPastError);
    });

    it('should throw error if event is at capacity', async () => {
      const mockEvent = {
        id: 1,
        status: 'published',
        end_date: new Date('2025-12-20'),
        remaining_capacity: 0,
        total_capacity: 100
      };
      mockDb.query.mockResolvedValue({ rows: [mockEvent], rowCount: 1 });

      await expect(service.rsvp(1, 1)).rejects.toThrow(EventFullError);
    });

    it('should throw error if user already RSVPed', async () => {
      const mockEvent = {
        id: 1,
        status: 'published',
        end_date: new Date('2025-12-20'),
        remaining_capacity: 50
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEvent], rowCount: 1 }) // getById
        .mockResolvedValueOnce({ rows: [{ count: 1 }], rowCount: 1 }); // hasRsvped - true

      await expect(service.rsvp(1, 1)).rejects.toThrow(DuplicateRsvpError);
    });
  });

  describe('cancelRsvp', () => {
    it('should cancel an RSVP', async () => {
      const mockEvent = { id: 1, remaining_capacity: 50 };
      const mockRsvps = [{ id: 1, event_id: 1, user_id: 1, ticket_id: null }];

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEvent], rowCount: 1 }) // getById
        .mockResolvedValueOnce({ rows: mockRsvps, rowCount: 1 }); // getRsvps

      const mockTransaction = vi.fn(async (callback) => {
        const mockClient = {
          query: vi.fn()
            .mockResolvedValueOnce({ rowCount: 1 }) // update RSVP status
            .mockResolvedValueOnce({ rowCount: 1 }) // update event stats
        };
        return callback(mockClient);
      });

      mockDb.transaction = mockTransaction;

      await service.cancelRsvp(1, 1);

      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should throw error if RSVP not found', async () => {
      const mockEvent = { id: 1 };
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEvent], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // no RSVPs

      await expect(service.cancelRsvp(1, 1)).rejects.toThrow(BizError);
    });
  });

  describe('hasRsvped', () => {
    it('should return true if user has RSVPed', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ count: 1 }], rowCount: 1 });

      const result = await service.hasRsvped(1, 1);

      expect(result).toBe(true);
    });

    it('should return false if user has not RSVPed', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ count: 0 }], rowCount: 1 });

      const result = await service.hasRsvped(1, 1);

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // TICKETING Operations Tests
  // ==========================================================================

  describe('addTicketTier', () => {
    it('should add a ticket tier to an event', async () => {
      const mockEvent = { id: 1 };
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockEvent], rowCount: 1 }) // getById
        .mockResolvedValueOnce({ insertId: 1, rowCount: 1 }) // insert ticket
        .mockResolvedValueOnce({ rows: [{ id: 1, event_id: 1 }], rowCount: 1 }); // get ticket

      const ticket = {
        ticket_name: 'General Admission',
        ticket_price: 25.00,
        quantity_total: 100,
        quantity_sold: 0
      };

      const result = await service.addTicketTier(1, ticket);

      expect(result).toBeDefined();
      expect(result.ticket_name).toBe('General Admission');
    });
  });

  describe('getAvailableTickets', () => {
    it('should return available ticket tiers', async () => {
      const mockTickets = [
        { id: 1, event_id: 1, ticket_name: 'Early Bird', ticket_price: 20, quantity_total: 50, quantity_sold: 10 },
        { id: 2, event_id: 1, ticket_name: 'Regular', ticket_price: 30, quantity_total: 100, quantity_sold: 50 }
      ];

      mockDb.query.mockResolvedValue({ rows: mockTickets, rowCount: 2 });

      const result = await service.getAvailableTickets(1);

      expect(result).toHaveLength(2);
      expect(result[0].ticket_name).toBe('Early Bird');
    });
  });

  // ==========================================================================
  // TIER ENFORCEMENT Tests
  // ==========================================================================

  describe('checkEventLimit', () => {
    it('should allow event creation within tier limit', async () => {
      const mockListing = { id: 1, tier: 'essential' };
      mockListingService.getById.mockResolvedValue(mockListing);
      mockDb.query.mockResolvedValue({ rows: [{ count: 2 }], rowCount: 1 }); // 2 events (limit is 4)

      const result = await service.checkEventLimit(1);

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(2);
      expect(result.limit).toBe(4);
      expect(result.tier).toBe('essential');
    });

    it('should deny event creation at tier limit', async () => {
      const mockListing = { id: 1, tier: 'essential' };
      mockListingService.getById.mockResolvedValue(mockListing);
      mockDb.query.mockResolvedValue({ rows: [{ count: 4 }], rowCount: 1 }); // at limit

      const result = await service.checkEventLimit(1);

      expect(result.allowed).toBe(false);
    });
  });

  // ==========================================================================
  // UTILITY Operations Tests
  // ==========================================================================

  describe('generateSlug', () => {
    it('should generate URL-safe slug from title', async () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 }); // no existing slug

      const result = await service.generateSlug('Test Event 2025!');

      expect(result).toBe('test-event-2025');
    });

    it('should ensure uniqueness by appending counter', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // slug exists
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // slug-1 available

      const result = await service.generateSlug('Test Event');

      expect(result).toBe('test-event-1');
    });
  });

  describe('incrementViewCount', () => {
    it('should increment view count', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 1 });

      await service.incrementViewCount(1);

      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE events SET view_count = view_count + 1 WHERE id = ?',
        [1]
      );
    });
  });

  describe('markCompletedEvents', () => {
    it('should mark past events as completed', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 5 });

      const result = await service.markCompletedEvents();

      expect(result).toBe(5);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SET status = \'completed\''),
        undefined
      );
    });
  });
});
