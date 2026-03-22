/**
 * PasswordServiceImpl Test Suite
 *
 * GOVERNANCE: Testing standards - 70% minimum coverage
 * Phase 1 Implementation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PasswordServiceImpl, getPasswordService } from '../PasswordServiceImpl';

describe('PasswordServiceImpl', () => {
  let passwordService: PasswordServiceImpl;

  beforeAll(() => {
    // Set required environment variables for testing
    process.env.AUTH_BCRYPT_COST = '4'; // Lower cost for faster tests
    process.env.AUTH_PASSWORD_PEPPER = 'test-pepper-secret-12345';

    passwordService = new PasswordServiceImpl();
  });

  afterAll(() => {
    // Clean up environment variables
    delete process.env.AUTH_BCRYPT_COST;
    delete process.env.AUTH_PASSWORD_PEPPER;
  });

  describe('constructor', () => {
    it('should create instance with valid environment variables', () => {
      expect(passwordService).toBeDefined();
      expect(passwordService.getBcryptCost()).toBe(4);
    });

    it('should throw error if AUTH_PASSWORD_PEPPER is missing', () => {
      delete process.env.AUTH_PASSWORD_PEPPER;
      delete process.env.PASSWORD_PEPPER;

      expect(() => new PasswordServiceImpl()).toThrow('AUTH_PASSWORD_PEPPER or PASSWORD_PEPPER environment variable is required');

      // Restore for other tests
      process.env.AUTH_PASSWORD_PEPPER = 'test-pepper-secret-12345';
    });

    it('should throw error if bcrypt cost is invalid', () => {
      const originalCost = process.env.AUTH_BCRYPT_COST;
      process.env.AUTH_BCRYPT_COST = '50'; // Invalid cost (> 31)

      expect(() => new PasswordServiceImpl()).toThrow('Invalid AUTH_BCRYPT_COST');

      // Restore for other tests
      process.env.AUTH_BCRYPT_COST = originalCost;
    });
  });

  describe('hash', () => {
    it('should hash passwords correctly', async () => {
      const password = 'TestPassword123!';
      const hash = await passwordService.hash(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
      expect(hash).toMatch(/^\$2[aby]\$/); // bcrypt hash format
    });

    it('should produce different hashes for same password (salt)', async () => {
      const password = 'TestPassword123!';
      const hash1 = await passwordService.hash(password);
      const hash2 = await passwordService.hash(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should throw error for empty password', async () => {
      await expect(passwordService.hash('')).rejects.toThrow('Password must be a non-empty string');
    });

    it('should throw error for non-string password', async () => {
      await expect(passwordService.hash(null as unknown)).rejects.toThrow('Password must be a non-empty string');
      await expect(passwordService.hash(undefined as unknown)).rejects.toThrow('Password must be a non-empty string');
      await expect(passwordService.hash(123 as unknown)).rejects.toThrow('Password must be a non-empty string');
    });
  });

  describe('verify', () => {
    it('should verify correct passwords', async () => {
      const password = 'TestPassword123!';
      const hash = await passwordService.hash(password);

      const isValid = await passwordService.verify(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect passwords', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword456!';
      const hash = await passwordService.hash(password);

      const isValid = await passwordService.verify(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it('should return false for empty password', async () => {
      const hash = await passwordService.hash('TestPassword123!');
      const isValid = await passwordService.verify('', hash);
      expect(isValid).toBe(false);
    });

    it('should return false for empty hash', async () => {
      const isValid = await passwordService.verify('TestPassword123!', '');
      expect(isValid).toBe(false);
    });

    it('should return false for invalid hash format', async () => {
      const isValid = await passwordService.verify('TestPassword123!', 'invalid-hash');
      expect(isValid).toBe(false);
    });

    it('should return false for non-string inputs', async () => {
      const hash = await passwordService.hash('TestPassword123!');

      expect(await passwordService.verify(null as unknown, hash)).toBe(false);
      expect(await passwordService.verify(undefined as unknown, hash)).toBe(false);
      expect(await passwordService.verify('TestPassword123!', null as unknown)).toBe(false);
      expect(await passwordService.verify('TestPassword123!', undefined as unknown)).toBe(false);
    });
  });

  describe('validateStrength', () => {
    it('should accept valid strong passwords', () => {
      const result = passwordService.validateStrength('TestPassword123!');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject passwords shorter than 12 characters', () => {
      const result = passwordService.validateStrength('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters');
    });

    it('should reject passwords longer than 128 characters', () => {
      const longPassword = 'A'.repeat(129) + '1!';
      const result = passwordService.validateStrength(longPassword);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at most 128 characters');
    });

    it('should reject passwords without uppercase letters', () => {
      const result = passwordService.validateStrength('testpassword123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject passwords without lowercase letters', () => {
      const result = passwordService.validateStrength('TESTPASSWORD123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject passwords without numbers', () => {
      const result = passwordService.validateStrength('TestPassword!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject passwords without special characters', () => {
      const result = passwordService.validateStrength('TestPassword123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should return multiple errors for weak passwords', () => {
      const result = passwordService.validateStrength('weak');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should reject empty or null passwords', () => {
      const result1 = passwordService.validateStrength('');
      expect(result1.valid).toBe(false);
      expect(result1.errors).toContain('Password is required');

      const result2 = passwordService.validateStrength(null as unknown);
      expect(result2.valid).toBe(false);
      expect(result2.errors).toContain('Password is required');
    });
  });

  describe('getBcryptCost', () => {
    it('should return configured bcrypt cost', () => {
      const cost = passwordService.getBcryptCost();
      expect(cost).toBe(4);
    });
  });

  describe('needsRehash', () => {
    it('should return true if hash cost is lower than current cost', async () => {
      // Create hash with cost 4
      process.env.AUTH_BCRYPT_COST = '4';
      const service1 = new PasswordServiceImpl();
      const hash = await service1.hash('TestPassword123!');

      // Check with cost 10
      process.env.AUTH_BCRYPT_COST = '10';
      const service2 = new PasswordServiceImpl();
      const needs = service2.needsRehash(hash);

      expect(needs).toBe(true);

      // Restore for other tests
      process.env.AUTH_BCRYPT_COST = '4';
    });

    it('should return false if hash cost matches current cost', async () => {
      const hash = await passwordService.hash('TestPassword123!');
      const needs = passwordService.needsRehash(hash);
      expect(needs).toBe(false);
    });

    it('should return true for invalid hash format', () => {
      const needs = passwordService.needsRehash('invalid-hash');
      expect(needs).toBe(true);
    });

    it('should return true for empty hash', () => {
      const needs = passwordService.needsRehash('');
      expect(needs).toBe(true);
    });
  });

  describe('getPasswordService singleton', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = getPasswordService();
      const instance2 = getPasswordService();

      expect(instance1).toBe(instance2);
    });

    it('should return functional instance', async () => {
      const service = getPasswordService();
      const hash = await service.hash('TestPassword123!');
      const valid = await service.verify('TestPassword123!', hash);

      expect(valid).toBe(true);
    });
  });

  describe('pepper functionality', () => {
    it('should apply pepper consistently', async () => {
      const password = 'TestPassword123!';
      const hash = await passwordService.hash(password);

      // Verification should work with same pepper
      const valid = await passwordService.verify(password, hash);
      expect(valid).toBe(true);
    });

    it('should fail verification with different pepper', async () => {
      const password = 'TestPassword123!';

      // Hash with one pepper
      process.env.AUTH_PASSWORD_PEPPER = 'pepper1';
      const service1 = new PasswordServiceImpl();
      const hash = await service1.hash(password);

      // Verify with different pepper
      process.env.AUTH_PASSWORD_PEPPER = 'pepper2';
      const service2 = new PasswordServiceImpl();
      const valid = await service2.verify(password, hash);

      expect(valid).toBe(false);

      // Restore for other tests
      process.env.AUTH_PASSWORD_PEPPER = 'test-pepper-secret-12345';
    });
  });
});
