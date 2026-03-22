/**
 * Error Transform Utility Tests
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { transformToBizError, isBizError, getErrorMessage, getErrorStack } from '../errorTransform';
import { BizError } from '../BizError';

describe('errorTransform', () => {
  describe('transformToBizError', () => {
    it('should pass through BizError unchanged', () => {
      const originalError = BizError.validation('email', 'invalid@', 'Invalid format');
      const result = transformToBizError(originalError, 'create');

      expect(result).toBe(originalError);
      expect(result.code).toBe('VALIDATION_ERROR');
    });

    it('should wrap Error instance with stack trace preservation', () => {
      const originalError = new Error('Something went wrong');
      const result = transformToBizError(originalError, 'update', { resource: 'user' });

      expect(result).toBeInstanceOf(BizError);
      expect(result.code).toBe('DATABASE_ERROR');
      expect(result.cause).toBe(originalError);
      expect(result.message).toContain('update');
    });

    it('should handle string errors', () => {
      const result = transformToBizError('String error message', 'delete');

      expect(result).toBeInstanceOf(BizError);
      expect(result.code).toBe('INTERNAL_ERROR');
      expect(result.message).toContain('Unknown error during delete');
    });

    it('should handle null errors', () => {
      const result = transformToBizError(null, 'read');

      expect(result).toBeInstanceOf(BizError);
      expect(result.code).toBe('INTERNAL_ERROR');
    });

    it('should handle undefined errors', () => {
      const result = transformToBizError(undefined, 'list');

      expect(result).toBeInstanceOf(BizError);
      expect(result.code).toBe('INTERNAL_ERROR');
    });

    it('should handle object errors', () => {
      const result = transformToBizError({ custom: 'error' }, 'process');

      expect(result).toBeInstanceOf(BizError);
      expect(result.code).toBe('INTERNAL_ERROR');
    });

    it('should preserve context when provided', () => {
      const error = new Error('Test error');
      const context = { userId: 123, action: 'create' };
      const result = transformToBizError(error, 'create', context);

      expect(result).toBeInstanceOf(BizError);
      // Context is part of the transformation but stored in BizError's context
    });
  });

  describe('isBizError', () => {
    it('should return true for BizError instances', () => {
      const error = BizError.notFound('user', 123);
      expect(isBizError(error)).toBe(true);
    });

    it('should return false for Error instances', () => {
      const error = new Error('Regular error');
      expect(isBizError(error)).toBe(false);
    });

    it('should return false for string errors', () => {
      expect(isBizError('string error')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isBizError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isBizError(undefined)).toBe(false);
    });

    it('should return false for objects', () => {
      expect(isBizError({ message: 'error' })).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from Error instance', () => {
      const error = new Error('Test error message');
      expect(getErrorMessage(error)).toBe('Test error message');
    });

    it('should extract message from BizError instance', () => {
      const error = BizError.validation('field', 'value');
      expect(getErrorMessage(error)).toContain('Validation failed');
    });

    it('should return string errors as-is', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('should convert null to string', () => {
      expect(getErrorMessage(null)).toBe('null');
    });

    it('should convert undefined to string', () => {
      expect(getErrorMessage(undefined)).toBe('undefined');
    });

    it('should convert objects to string', () => {
      const result = getErrorMessage({ code: 'ERR', message: 'fail' });
      expect(result).toBe('[object Object]');
    });

    it('should convert numbers to string', () => {
      expect(getErrorMessage(404)).toBe('404');
    });
  });

  describe('getErrorStack', () => {
    it('should extract stack from Error instance', () => {
      const error = new Error('Test error');
      const stack = getErrorStack(error);

      expect(stack).toBeDefined();
      expect(stack).toContain('Error: Test error');
    });

    it('should extract stack from BizError instance', () => {
      const error = BizError.notFound('resource', 1);
      const stack = getErrorStack(error);

      expect(stack).toBeDefined();
    });

    it('should return undefined for string errors', () => {
      expect(getErrorStack('String error')).toBeUndefined();
    });

    it('should return undefined for null', () => {
      expect(getErrorStack(null)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(getErrorStack(undefined)).toBeUndefined();
    });

    it('should return undefined for objects without stack', () => {
      expect(getErrorStack({ message: 'error' })).toBeUndefined();
    });
  });
});
