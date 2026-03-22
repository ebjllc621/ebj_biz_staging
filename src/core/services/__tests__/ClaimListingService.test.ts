/**
 * ClaimListingService Unit Tests
 *
 * @phase Claim Listing Phase 1
 * @tier ADVANCED
 * @coverage 20 test cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClaimListingService } from '../ClaimListingService';
import { DatabaseService } from '../DatabaseService';
import { BizError } from '@core/errors/BizError';
import type { DbResult } from '@core/types/db';

// Mock DatabaseService
vi.mock('../DatabaseService', () => ({
  DatabaseService: vi.fn()
}));

// Mock ActivityLoggingService
vi.mock('../ActivityLoggingService', () => ({
  getActivityLoggingService: () => ({
    logActivity: vi.fn().mockResolvedValue(undefined)
  })
}));

describe('ClaimListingService', () => {
  let service: ClaimListingService;
  let mockDb: any;

  beforeEach(() => {
    // Create mock database service
    mockDb = {
      query: vi.fn()
    };

    service = new ClaimListingService(mockDb as unknown as DatabaseService);
  });

  describe('initiateClaim', () => {
    it('creates claim with correct defaults', async () => {
      const listingId = 1;
      const claimantUserId = 100;
      const claimType = 'owner';

      // Mock listing exists and not claimed
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: listingId, claimed: 0, user_id: null }]
        } as DbResult<any>)
        // No active claim
        .mockResolvedValueOnce({
          rows: []
        } as DbResult<any>)
        // Insert claim
        .mockResolvedValueOnce({
          insertId: 1,
          affectedRows: 1
        } as DbResult<any>)
        // Retrieve created claim
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            listing_id: listingId,
            claimant_user_id: claimantUserId,
            claim_type: claimType,
            status: 'initiated',
            verification_score: null,
            admin_reviewer_id: null,
            admin_notes: null,
            admin_decision_at: null,
            rejection_reason: null,
            claimant_description: null,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]
        } as DbResult<any>);

      const claim = await service.initiateClaim({
        listingId,
        claimantUserId,
        claimType
      });

      expect(claim.status).toBe('initiated');
      expect(claim.listingId).toBe(listingId);
      expect(claim.claimantUserId).toBe(claimantUserId);
    });

    it('throws ListingAlreadyClaimedError if listing.claimed=true', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 1, claimed: 1, user_id: 50 }]
      } as DbResult<any>);

      await expect(
        service.initiateClaim({
          listingId: 1,
          claimantUserId: 100,
          claimType: 'owner'
        })
      ).rejects.toThrow('LISTING_ALREADY_CLAIMED');
    });

    it('throws ClaimAlreadyExistsError if active claim exists', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, claimed: 0, user_id: null }]
        } as DbResult<any>)
        .mockResolvedValueOnce({
          rows: [{
            id: 10,
            listing_id: 1,
            status: 'verification_pending'
          }]
        } as DbResult<any>);

      await expect(
        service.initiateClaim({
          listingId: 1,
          claimantUserId: 100,
          claimType: 'owner'
        })
      ).rejects.toThrow('CLAIM_ALREADY_EXISTS');
    });

    it('sets expires_at 30 days from now', async () => {
      const now = new Date();
      const expectedExpiration = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, claimed: 0, user_id: null }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ insertId: 1 })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            listing_id: 1,
            claimant_user_id: 100,
            claim_type: 'owner',
            status: 'initiated',
            verification_score: null,
            admin_reviewer_id: null,
            admin_notes: null,
            admin_decision_at: null,
            rejection_reason: null,
            claimant_description: null,
            expires_at: expectedExpiration.toISOString(),
            created_at: now.toISOString(),
            updated_at: now.toISOString()
          }]
        });

      const claim = await service.initiateClaim({
        listingId: 1,
        claimantUserId: 100,
        claimType: 'owner'
      });

      const daysDiff = Math.round((claim.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBeGreaterThanOrEqual(29);
      expect(daysDiff).toBeLessThanOrEqual(30);
    });
  });

  describe('createVerification', () => {
    it('creates verification with pending status', async () => {
      const claimId = 1;
      const method = 'email';

      mockDb.query
        // Get claim
        .mockResolvedValueOnce({
          rows: [{
            id: claimId,
            listing_id: 1,
            claimant_user_id: 100,
            claim_type: 'owner',
            status: 'initiated',
            verification_score: null,
            admin_reviewer_id: null,
            admin_notes: null,
            admin_decision_at: null,
            rejection_reason: null,
            claimant_description: null,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]
        })
        // Insert verification
        .mockResolvedValueOnce({ insertId: 1 })
        // Update claim status
        .mockResolvedValueOnce({ affectedRows: 1 })
        // Get verification
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            claim_id: claimId,
            method,
            status: 'pending',
            verification_code: null,
            code_expires_at: null,
            attempts: 0,
            max_attempts: 5,
            score: null,
            details: null,
            completed_at: null,
            created_at: new Date().toISOString()
          }]
        });

      const verification = await service.createVerification(claimId, method);

      expect(verification.status).toBe('pending');
      expect(verification.method).toBe(method);
      expect(verification.claimId).toBe(claimId);
    });

    it('updates claim status to verification_pending', async () => {
      const claimId = 1;

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            id: claimId,
            status: 'initiated',
            listing_id: 1,
            claimant_user_id: 100,
            claim_type: 'owner',
            verification_score: null,
            admin_reviewer_id: null,
            admin_notes: null,
            admin_decision_at: null,
            rejection_reason: null,
            claimant_description: null,
            expires_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]
        })
        .mockResolvedValueOnce({ insertId: 1 })
        .mockResolvedValueOnce({ affectedRows: 1 })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            claim_id: claimId,
            method: 'email',
            status: 'pending',
            verification_code: null,
            code_expires_at: null,
            attempts: 0,
            max_attempts: 5,
            score: null,
            details: null,
            completed_at: null,
            created_at: new Date().toISOString()
          }]
        });

      await service.createVerification(claimId, 'email');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'verification_pending'"),
        expect.arrayContaining([claimId])
      );
    });
  });

  describe('verifyCode', () => {
    it('returns verified=true on correct code', async () => {
      const claimId = 1;
      const correctCode = '123456';
      const verificationId = 1;

      mockDb.query
        // Get verification
        .mockResolvedValueOnce({
          rows: [{
            id: verificationId,
            claim_id: claimId,
            method: 'email',
            status: 'sent',
            verification_code: correctCode,
            code_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            attempts: 0,
            max_attempts: 5,
            score: null,
            details: null,
            completed_at: null,
            created_at: new Date().toISOString()
          }]
        })
        // Increment attempts
        .mockResolvedValueOnce({ affectedRows: 1 })
        // Update to completed
        .mockResolvedValueOnce({ affectedRows: 1 })
        // Get all verifications for score calculation
        .mockResolvedValueOnce({
          rows: [{
            id: verificationId,
            claim_id: claimId,
            method: 'email',
            status: 'completed',
            verification_code: correctCode,
            code_expires_at: new Date().toISOString(),
            attempts: 1,
            max_attempts: 5,
            score: '0.80',
            details: null,
            completed_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          }]
        })
        // Update claim verification score
        .mockResolvedValueOnce({ affectedRows: 1 });

      const result = await service.verifyCode(claimId, correctCode);

      expect(result.verified).toBe(true);
      expect(result.score).toBeGreaterThan(0);
    });

    it('increments attempts on wrong code', async () => {
      const claimId = 1;

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            claim_id: claimId,
            method: 'email',
            status: 'sent',
            verification_code: '123456',
            code_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            attempts: 0,
            max_attempts: 5,
            score: null,
            details: null,
            completed_at: null,
            created_at: new Date().toISOString()
          }]
        })
        .mockResolvedValueOnce({ affectedRows: 1 });

      const result = await service.verifyCode(claimId, 'wrongcode');

      expect(result.verified).toBe(false);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('attempts = attempts + 1'),
        expect.any(Array)
      );
    });

    it('throws MaxAttemptsExceededError when limit reached', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          claim_id: 1,
          method: 'email',
          status: 'sent',
          verification_code: '123456',
          code_expires_at: new Date().toISOString(),
          attempts: 5,
          max_attempts: 5,
          score: null,
          details: null,
          completed_at: null,
          created_at: new Date().toISOString()
        }]
      });

      await expect(service.verifyCode(1, '123456')).rejects.toThrow('MAX_ATTEMPTS_EXCEEDED');
    });

    it('throws VerificationExpiredError when code expired', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            claim_id: 1,
            method: 'email',
            status: 'sent',
            verification_code: '123456',
            code_expires_at: new Date(Date.now() - 1000).toISOString(), // Expired
            attempts: 0,
            max_attempts: 5,
            score: null,
            details: null,
            completed_at: null,
            created_at: new Date().toISOString()
          }]
        })
        .mockResolvedValueOnce({ affectedRows: 1 }) // Increment attempts
        .mockResolvedValueOnce({ affectedRows: 1 }); // Update to expired

      await expect(service.verifyCode(1, '123456')).rejects.toThrow('VERIFICATION_EXPIRED');
    });
  });

  describe('submitForReview', () => {
    it('updates claim to under_review', async () => {
      const claimId = 1;

      mockDb.query
        // Get claim
        .mockResolvedValueOnce({
          rows: [{
            id: claimId,
            listing_id: 1,
            claimant_user_id: 100,
            claim_type: 'owner',
            status: 'verification_pending',
            verification_score: null,
            admin_reviewer_id: null,
            admin_notes: null,
            admin_decision_at: null,
            rejection_reason: null,
            claimant_description: 'I own this business',
            expires_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]
        })
        // Get verifications
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            claim_id: claimId,
            method: 'email',
            status: 'completed',
            verification_code: null,
            code_expires_at: null,
            attempts: 1,
            max_attempts: 5,
            score: '0.80',
            details: null,
            completed_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          }]
        })
        // Update claim
        .mockResolvedValueOnce({ affectedRows: 1 })
        // Get updated claim
        .mockResolvedValueOnce({
          rows: [{
            id: claimId,
            listing_id: 1,
            claimant_user_id: 100,
            claim_type: 'owner',
            status: 'under_review',
            verification_score: '0.80',
            admin_reviewer_id: null,
            admin_notes: null,
            admin_decision_at: null,
            rejection_reason: null,
            claimant_description: 'I own this business',
            expires_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]
        });

      const claim = await service.submitForReview(claimId);

      expect(claim.status).toBe('under_review');
    });

    it('calculates verification_score', async () => {
      const claimId = 1;

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            id: claimId,
            status: 'verification_pending',
            claimant_description: 'Test',
            listing_id: 1,
            claimant_user_id: 100,
            claim_type: 'owner',
            verification_score: null,
            admin_reviewer_id: null,
            admin_notes: null,
            admin_decision_at: null,
            rejection_reason: null,
            expires_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            claim_id: claimId,
            method: 'email',
            status: 'completed',
            verification_code: null,
            code_expires_at: null,
            attempts: 1,
            max_attempts: 5,
            score: '0.80',
            details: null,
            completed_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          }]
        })
        .mockResolvedValueOnce({ affectedRows: 1 })
        .mockResolvedValueOnce({
          rows: [{
            id: claimId,
            status: 'under_review',
            verification_score: '0.64',
            listing_id: 1,
            claimant_user_id: 100,
            claim_type: 'owner',
            admin_reviewer_id: null,
            admin_notes: null,
            admin_decision_at: null,
            rejection_reason: null,
            claimant_description: 'Test',
            expires_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]
        });

      const claim = await service.submitForReview(claimId);

      expect(claim.verificationScore).toBeGreaterThan(0);
    });
  });

  describe('adminReviewClaim', () => {
    it('approve: updates claim, listing, and user role', async () => {
      const claimId = 1;
      const adminUserId = 999;

      mockDb.query
        // Get claim
        .mockResolvedValueOnce({
          rows: [{
            id: claimId,
            listing_id: 1,
            claimant_user_id: 100,
            claim_type: 'owner',
            status: 'under_review',
            verification_score: '0.80',
            admin_reviewer_id: null,
            admin_notes: null,
            admin_decision_at: null,
            rejection_reason: null,
            claimant_description: null,
            expires_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]
        })
        // Update claim
        .mockResolvedValueOnce({ affectedRows: 1 })
        // Update listing
        .mockResolvedValueOnce({ affectedRows: 1 })
        // Get user role
        .mockResolvedValueOnce({
          rows: [{ role: 'general' }]
        })
        // Update user role
        .mockResolvedValueOnce({ affectedRows: 1 })
        // Get updated claim
        .mockResolvedValueOnce({
          rows: [{
            id: claimId,
            listing_id: 1,
            claimant_user_id: 100,
            claim_type: 'owner',
            status: 'approved',
            verification_score: '0.80',
            admin_reviewer_id: adminUserId,
            admin_notes: 'Approved',
            admin_decision_at: new Date().toISOString(),
            rejection_reason: null,
            claimant_description: null,
            expires_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]
        });

      const result = await service.adminReviewClaim({
        claimId,
        adminUserId,
        decision: 'approved',
        adminNotes: 'Approved'
      });

      expect(result.claim.status).toBe('approved');
      expect(result.listingUpdated).toBe(true);
      expect(result.userRoleUpdated).toBe(true);
    });

    it('reject: updates claim only', async () => {
      const claimId = 1;
      const adminUserId = 999;

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{
            id: claimId,
            listing_id: 1,
            claimant_user_id: 100,
            claim_type: 'owner',
            status: 'under_review',
            verification_score: '0.80',
            admin_reviewer_id: null,
            admin_notes: null,
            admin_decision_at: null,
            rejection_reason: null,
            claimant_description: null,
            expires_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]
        })
        .mockResolvedValueOnce({ affectedRows: 1 })
        .mockResolvedValueOnce({
          rows: [{
            id: claimId,
            listing_id: 1,
            claimant_user_id: 100,
            claim_type: 'owner',
            status: 'rejected',
            verification_score: '0.80',
            admin_reviewer_id: adminUserId,
            admin_notes: 'Invalid',
            admin_decision_at: new Date().toISOString(),
            rejection_reason: 'Insufficient proof',
            claimant_description: null,
            expires_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]
        });

      const result = await service.adminReviewClaim({
        claimId,
        adminUserId,
        decision: 'rejected',
        adminNotes: 'Invalid',
        rejectionReason: 'Insufficient proof'
      });

      expect(result.claim.status).toBe('rejected');
      expect(result.listingUpdated).toBe(false);
      expect(result.userRoleUpdated).toBe(false);
    });
  });

  describe('getClaimsForAdmin', () => {
    it('returns paginated results with filters', async () => {
      const totalClaims = 15n;

      mockDb.query
        // COUNT query
        .mockResolvedValueOnce({
          rows: [{ total: totalClaims }]
        })
        // SELECT query
        .mockResolvedValueOnce({
          rows: Array(10).fill({
            id: 1,
            listing_id: 1,
            claimant_user_id: 100,
            claim_type: 'owner',
            status: 'under_review',
            verification_score: '0.80',
            admin_reviewer_id: null,
            admin_notes: null,
            admin_decision_at: null,
            rejection_reason: null,
            claimant_description: null,
            expires_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        });

      const result = await service.getClaimsForAdmin({ status: 'under_review' }, 1, 10);

      expect(result.claims.length).toBe(10);
      expect(result.pagination.total).toBe(15);
      expect(result.pagination.totalPages).toBe(2);
    });
  });

  describe('getClaimWithVerifications', () => {
    it('returns combined claim + verifications', async () => {
      const claimId = 1;

      mockDb.query
        // Get claim
        .mockResolvedValueOnce({
          rows: [{
            id: claimId,
            listing_id: 1,
            claimant_user_id: 100,
            claim_type: 'owner',
            status: 'verification_pending',
            verification_score: null,
            admin_reviewer_id: null,
            admin_notes: null,
            admin_decision_at: null,
            rejection_reason: null,
            claimant_description: null,
            expires_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]
        })
        // Get verifications
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              claim_id: claimId,
              method: 'email',
              status: 'completed',
              verification_code: null,
              code_expires_at: null,
              attempts: 1,
              max_attempts: 5,
              score: '0.80',
              details: null,
              completed_at: new Date().toISOString(),
              created_at: new Date().toISOString()
            },
            {
              id: 2,
              claim_id: claimId,
              method: 'phone',
              status: 'pending',
              verification_code: null,
              code_expires_at: null,
              attempts: 0,
              max_attempts: 5,
              score: null,
              details: null,
              completed_at: null,
              created_at: new Date().toISOString()
            }
          ]
        });

      const result = await service.getClaimWithVerifications(claimId);

      expect(result).not.toBeNull();
      expect(result!.claim.id).toBe(claimId);
      expect(result!.verifications.length).toBe(2);
    });
  });

  describe('expireOldClaims', () => {
    it('expires claims past their expiration date', async () => {
      mockDb.query.mockResolvedValueOnce({
        affectedRows: 3
      });

      const count = await service.expireOldClaims();

      expect(count).toBe(3);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'expired'"),
        undefined
      );
    });
  });

  describe('calculateListingCompleteness', () => {
    it('returns correct weighted percentage', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          name: 'Test Business',
          description: 'Description',
          address: '123 Main St',
          phone: '555-0100',
          email: 'test@example.com',
          category_id: 1,
          business_hours: JSON.stringify([{ day: 'Monday', open: '9:00', close: '17:00' }]),
          logo_url: 'logo.jpg',
          cover_image_url: null,
          gallery_images: null,
          social_media: null,
          features: null,
          amenities: null,
          website: null
        }]
      });

      const result = await service.calculateListingCompleteness(1);

      expect(result.percentage).toBeGreaterThan(0);
      expect(result.percentage).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.missingFields)).toBe(true);
    });
  });

  describe('mapRowToClaim', () => {
    it('correctly parses DB row to interface', () => {
      const service = new ClaimListingService(mockDb);
      const row = {
        id: 1,
        listing_id: 10,
        claimant_user_id: 100,
        claim_type: 'owner' as const,
        status: 'initiated' as const,
        verification_score: '0.75',
        admin_reviewer_id: null,
        admin_notes: null,
        admin_decision_at: null,
        rejection_reason: null,
        claimant_description: 'Test',
        expires_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const claim = (service as any).mapRowToClaim(row);

      expect(claim.id).toBe(1);
      expect(claim.listingId).toBe(10);
      expect(claim.claimantUserId).toBe(100);
      expect(claim.verificationScore).toBe(0.75);
      expect(claim.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('generateVerificationCode', () => {
    it('returns 6-digit string', () => {
      const service = new ClaimListingService(mockDb);
      const code = (service as any).generateVerificationCode();

      expect(code).toMatch(/^\d{6}$/);
      expect(code.length).toBe(6);
    });
  });
});
