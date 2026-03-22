/**
 * MailSender Test Suite
 *
 * @authority PHASE_2.4_BRAIN_PLAN.md (Supporting Services - Task 2.5)
 * @governance Build Map v2.1 ENHANCED - Test coverage 70%+
 * @test_target src/core/services/email/MailSender.ts
 *
 * TEST OBJECTIVES:
 * - Verify multi-provider email sending
 * - Verify retry logic with exponential backoff
 * - Verify email templates (verification, password reset)
 * - Verify environment-based configuration
 * - Verify error handling and fallback behavior
 *
 * COVERAGE TARGET: 70%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MailSender, getMailSender, EmailOptions } from '../MailSender';
import nodemailer from 'nodemailer';

// Mock dependencies
vi.mock('nodemailer');
vi.mock('@aws-sdk/client-ses');
vi.mock('mailgun.js');
vi.mock('@sendgrid/mail');

describe('MailSender', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Set up test environment
    process.env.EMAIL_PROVIDER = 'smtp';
    process.env.EMAIL_FROM = 'test@example.com';
    process.env.EMAIL_REPLY_TO = 'reply@example.com';
    process.env.EMAIL_RETRY_ATTEMPTS = '3';
    process.env.EMAIL_RETRY_BASE_DELAY = '100';
    process.env.EMAIL_RETRY_MAX_DELAY = '1000';
    process.env.APP_ORIGIN = 'http://localhost:3000';
    process.env.SMTP_HOST = 'localhost';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'false';

    // Mock nodemailer transporter
    const mockTransporter = {
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' })
    };

    (nodemailer.createTransport as unknown) = vi.fn().mockReturnValue(mockTransporter);

    // Clear singleton instance
    (getMailSender as unknown).mailSenderInstance = null;
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with SMTP provider by default', () => {
      const mailSender = new MailSender();
      expect(nodemailer.createTransport).toHaveBeenCalled();
    });

    it('should load configuration from environment variables', () => {
      process.env.EMAIL_FROM = 'custom@example.com';
      process.env.EMAIL_RETRY_ATTEMPTS = '5';

      const mailSender = new MailSender();
      // Verify through send method behavior
      expect(mailSender).toBeDefined();
    });

    it('should throw error for unsupported provider', () => {
      process.env.EMAIL_PROVIDER = 'invalid-provider';

      expect(() => new MailSender()).toThrow('Unsupported email provider');
    });

    it('should throw error when SMTP_HOST is missing', () => {
      delete process.env.SMTP_HOST;

      expect(() => new MailSender()).toThrow('SMTP_HOST is required');
    });
  });

  describe('send', () => {
    it('should send email successfully on first attempt', async () => {
      const mailSender = new MailSender();
      const mockTransporter = (nodemailer.createTransport as unknown).mock.results[0].value;

      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
        text: 'Test content'
      };

      await mailSender.send(options);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
        text: 'Test content',
        replyTo: 'reply@example.com'
      });
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    });

    it('should handle array of recipients', async () => {
      const mailSender = new MailSender();
      const mockTransporter = (nodemailer.createTransport as unknown).mock.results[0].value;

      const options: EmailOptions = {
        to: ['recipient1@example.com', 'recipient2@example.com'],
        subject: 'Test Email',
        html: '<p>Test content</p>'
      };

      await mailSender.send(options);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'recipient1@example.com, recipient2@example.com'
        })
      );
    });

    it('should retry on failure with exponential backoff', async () => {
      const mailSender = new MailSender();
      const mockTransporter = (nodemailer.createTransport as unknown).mock.results[0].value;

      // Fail twice, then succeed
      mockTransporter.sendMail
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ messageId: 'success' });

      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>'
      };

      await mailSender.send(options);

      // Should have been called 3 times (2 failures + 1 success)
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries exceeded', async () => {
      const mailSender = new MailSender();
      const mockTransporter = (nodemailer.createTransport as unknown).mock.results[0].value;

      // Always fail
      mockTransporter.sendMail.mockRejectedValue(new Error('Network error'));

      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>'
      };

      await expect(mailSender.send(options)).rejects.toThrow(
        'Failed to send email after 3 attempts'
      );

      // Should have attempted 3 times
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(3);
    });

    it('should apply exponential backoff delays', async () => {
      const mailSender = new MailSender();
      const mockTransporter = (nodemailer.createTransport as unknown).mock.results[0].value;

      // Fail twice, then succeed
      mockTransporter.sendMail
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ messageId: 'success' });

      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>'
      };

      const startTime = Date.now();
      await mailSender.send(options);
      const endTime = Date.now();

      // With base delay 100ms and 2 retries: 100ms + 200ms = 300ms minimum
      // Allow some tolerance for test execution time
      expect(endTime - startTime).toBeGreaterThanOrEqual(250);
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email with correct template', async () => {
      const mailSender = new MailSender();
      const mockTransporter = (nodemailer.createTransport as unknown).mock.results[0].value;

      const result = await mailSender.sendVerificationEmail('user@example.com', 'test-token-123');

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Verify Your Email - Bizconekt',
          html: expect.stringContaining('Welcome to Bizconekt'),
          text: expect.stringContaining('verify your email address')
        })
      );
    });

    it('should include verification URL with token', async () => {
      const mailSender = new MailSender();
      const mockTransporter = (nodemailer.createTransport as unknown).mock.results[0].value;

      await mailSender.sendVerificationEmail('user@example.com', 'abc123');

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('http://localhost:3000/verify-email?token=abc123');
      expect(callArgs.text).toContain('http://localhost:3000/verify-email?token=abc123');
    });

    it('should return error result on send failure', async () => {
      const mailSender = new MailSender();
      const mockTransporter = (nodemailer.createTransport as unknown).mock.results[0].value;

      // Always fail
      mockTransporter.sendMail.mockRejectedValue(new Error('Send failed'));

      const result = await mailSender.sendVerificationEmail('user@example.com', 'token');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to send email');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email with correct template', async () => {
      const mailSender = new MailSender();
      const mockTransporter = (nodemailer.createTransport as unknown).mock.results[0].value;

      const result = await mailSender.sendPasswordResetEmail('user@example.com', 'reset-token-456');

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Reset Your Password - Bizconekt',
          html: expect.stringContaining('Password Reset Request'),
          text: expect.stringContaining('reset your password')
        })
      );
    });

    it('should include reset URL with token', async () => {
      const mailSender = new MailSender();
      const mockTransporter = (nodemailer.createTransport as unknown).mock.results[0].value;

      await mailSender.sendPasswordResetEmail('user@example.com', 'xyz789');

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('http://localhost:3000/reset-password?token=xyz789');
      expect(callArgs.text).toContain('http://localhost:3000/reset-password?token=xyz789');
    });

    it('should include warning about ignoring email', async () => {
      const mailSender = new MailSender();
      const mockTransporter = (nodemailer.createTransport as unknown).mock.results[0].value;

      await mailSender.sendPasswordResetEmail('user@example.com', 'token');

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain("didn't request");
      expect(callArgs.text).toContain("didn't request");
    });

    it('should return error result on send failure', async () => {
      const mailSender = new MailSender();
      const mockTransporter = (nodemailer.createTransport as unknown).mock.results[0].value;

      // Always fail
      mockTransporter.sendMail.mockRejectedValue(new Error('Send failed'));

      const result = await mailSender.sendPasswordResetEmail('user@example.com', 'token');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to send email');
    });
  });

  describe('sendEmail (generic)', () => {
    it('should send generic email with HTML body', async () => {
      const mailSender = new MailSender();
      const mockTransporter = (nodemailer.createTransport as unknown).mock.results[0].value;

      const result = await mailSender.sendEmail(
        'user@example.com',
        'Test Subject',
        '<p>HTML content</p>'
      );

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Test Subject',
          html: '<p>HTML content</p>',
          text: 'HTML content' // Should strip HTML tags
        })
      );
    });

    it('should strip HTML tags for text version', async () => {
      const mailSender = new MailSender();
      const mockTransporter = (nodemailer.createTransport as unknown).mock.results[0].value;

      await mailSender.sendEmail(
        'user@example.com',
        'Test',
        '<p>Hello <strong>World</strong></p>'
      );

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.text).toBe('Hello World');
    });

    it('should return error result on send failure', async () => {
      const mailSender = new MailSender();
      const mockTransporter = (nodemailer.createTransport as unknown).mock.results[0].value;

      // Always fail
      mockTransporter.sendMail.mockRejectedValue(new Error('Send failed'));

      const result = await mailSender.sendEmail('user@example.com', 'Test', 'Body');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to send email');
    });
  });

  describe('getMailSender (singleton)', () => {
    it('should return singleton instance', () => {
      const instance1 = getMailSender();
      const instance2 = getMailSender();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance only once', () => {
      // Clear singleton first
      (getMailSender as unknown).mailSenderInstance = null;
      vi.clearAllMocks();

      const instance1 = getMailSender();
      const instance2 = getMailSender();
      const instance3 = getMailSender();

      // Should have created transport only once
      expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });
  });

  describe('provider configuration', () => {
    it('should use custom from and replyTo addresses', async () => {
      process.env.EMAIL_FROM = 'custom@example.com';
      process.env.EMAIL_REPLY_TO = 'custom-reply@example.com';

      const mailSender = new MailSender();
      const mockTransporter = (nodemailer.createTransport as unknown).mock.results[0].value;

      await mailSender.send({
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'custom@example.com',
          replyTo: 'custom-reply@example.com'
        })
      );
    });

    it('should use default values when env vars not set', async () => {
      delete process.env.EMAIL_FROM;
      delete process.env.EMAIL_REPLY_TO;
      delete process.env.EMAIL_RETRY_ATTEMPTS;

      const mailSender = new MailSender();
      const mockTransporter = (nodemailer.createTransport as unknown).mock.results[0].value;

      await mailSender.send({
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@bizconekt.com',
          replyTo: 'support@bizconekt.com'
        })
      );
    });
  });

  describe('error handling', () => {
    it('should include original error message in final error', async () => {
      const mailSender = new MailSender();
      const mockTransporter = (nodemailer.createTransport as unknown).mock.results[0].value;

      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP connection failed'));

      const options: EmailOptions = {
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      };

      await expect(mailSender.send(options)).rejects.toThrow('SMTP connection failed');
    });

    it('should log retry attempts', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const mailSender = new MailSender();
      const mockTransporter = (nodemailer.createTransport as unknown).mock.results[0].value;

      mockTransporter.sendMail
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockResolvedValueOnce({ messageId: 'success' });

      await mailSender.send({
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Email send attempt 1 failed'),
        'Error 1'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Retrying in')
      );

      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });
});
