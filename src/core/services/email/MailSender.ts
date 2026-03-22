/**
 * MailSender - Multi-Provider Email Service
 *
 * @authority PHASE_2.4_BRAIN_PLAN.md (Supporting Services - Task 2.5)
 * @governance Build Map v2.1 ENHANCED - STANDARD tier
 * @governance Service Architecture v2.0 compliance
 * @tier STANDARD - Multi-provider support with retry logic
 *
 * PURPOSE:
 * - Multi-provider email service (SMTP, AWS SES, Mailgun, SendGrid)
 * - Retry logic with exponential backoff
 * - Email verification and password reset workflows
 * - Environment-based provider selection
 *
 * PHASE 2.4 IMPLEMENTATION:
 * - Full multi-provider support (SMTP, SES, Mailgun, SendGrid)
 * - Automatic retry with exponential backoff
 * - HTML email templates
 * - Environment-based configuration
 *
 * USAGE:
 * ```typescript
 * const mailSender = getMailSender();
 * await mailSender.sendVerificationEmail(email, token);
 * await mailSender.sendPasswordResetEmail(email, token);
 * ```
 */

// GOVERNANCE: Multi-provider email service
// GOVERNANCE: Retry logic with exponential backoff
// GOVERNANCE: Environment-based provider selection

import nodemailer from 'nodemailer';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import formData from 'form-data';
import Mailgun from 'mailgun.js';
import sgMail from '@sendgrid/mail';
import type { MailDataRequired } from '@sendgrid/mail';
import { SMTPTransporter, MailgunMessageData } from '@core/types/email';

/**
 * Email options for sending messages
 */
export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
}

/**
 * Email provider interface
 * GOVERNANCE: All providers must implement this interface
 */
export interface EmailProvider {
  name: string;
  send(options: EmailOptions): Promise<void>;
}

/**
 * Email sending result (backward compatibility)
 */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * MailSender - Multi-provider email service
 * GOVERNANCE: Supports SMTP, AWS SES, Mailgun, SendGrid
 * GOVERNANCE: Automatic retry with exponential backoff
 * GOVERNANCE: Environment-based configuration
 *
 * @tier STANDARD - Multi-provider support with retry logic
 * @complexity 300-500 lines, 4 providers
 */
export class MailSender {
  private provider: EmailProvider;
  private maxRetries: number;
  private baseDelay: number;
  private maxDelay: number;
  private defaultFrom: string;
  private defaultReplyTo: string;
  private baseUrl: string;

  constructor() {
    // Load retry configuration
    this.maxRetries = parseInt(process.env.EMAIL_RETRY_ATTEMPTS || '3');
    this.baseDelay = parseInt(process.env.EMAIL_RETRY_BASE_DELAY || '1000');
    this.maxDelay = parseInt(process.env.EMAIL_RETRY_MAX_DELAY || '5000');
    this.defaultFrom = process.env.EMAIL_FROM || 'noreply@bizconekt.com';
    this.defaultReplyTo = process.env.EMAIL_REPLY_TO || 'support@bizconekt.com';
    this.baseUrl = process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Select provider based on EMAIL_PROVIDER environment variable
    const providerName = process.env.EMAIL_PROVIDER || 'smtp';
    this.provider = this.createProvider(providerName);
  }

  /**
   * Create email provider based on configuration
   * GOVERNANCE: Factory pattern for provider instantiation
   */
  private createProvider(name: string): EmailProvider {
    switch (name.toLowerCase()) {
      case 'smtp':
        return new SMTPProvider();
      case 'ses':
      case 'aws-ses':
        return new SESProvider();
      case 'mailgun':
        return new MailgunProvider();
      case 'sendgrid':
        return new SendGridProvider();
      default:
        throw new Error(`Unsupported email provider: ${name}. Supported providers: smtp, ses, mailgun, sendgrid`);
    }
  }

  /**
   * Send email with retry logic
   * GOVERNANCE: Exponential backoff retry strategy
   *
   * @param options - Email options
   * @throws Error after max retries exceeded
   */
  async send(options: EmailOptions): Promise<void> {
    // Apply defaults
    const emailOptions: EmailOptions = {
      ...options,
      from: options.from || this.defaultFrom,
      replyTo: options.replyTo || this.defaultReplyTo
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        await this.provider.send(emailOptions);

        return; // Success
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        // Don't retry on last attempt
        if (attempt < this.maxRetries - 1) {
          const delay = Math.min(
            this.baseDelay * Math.pow(2, attempt),
            this.maxDelay
          );
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`Failed to send email after ${this.maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Send verification email
   * GOVERNANCE: Standard template for email verification
   * BACKWARD COMPATIBILITY: Returns EmailResult for Phase 2.3 compatibility
   *
   * @param email - Recipient email address
   * @param token - Verification token
   * @returns Email sending result
   */
  async sendVerificationEmail(email: string, token: string): Promise<EmailResult> {
    try {
      const verificationUrl = `${this.baseUrl}/verify-email?token=${token}`;

      await this.send({
        to: email,
        subject: 'Verify Your Email - Bizconekt',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #2563eb;">Welcome to Bizconekt!</h1>
                <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${verificationUrl}"
                     style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    Verify Email Address
                  </a>
                </div>
                <p style="color: #666; font-size: 14px;">
                  Or copy and paste this link into your browser:<br>
                  <a href="${verificationUrl}" style="color: #2563eb;">${verificationUrl}</a>
                </p>
                <p style="color: #666; font-size: 14px;">
                  This link will expire in 24 hours.
                </p>
                <p style="color: #666; font-size: 14px;">
                  If you didn't create an account with Bizconekt, please ignore this email.
                </p>
              </div>
            </body>
          </html>
        `,
        text: `
Welcome to Bizconekt!

Thank you for registering. Please verify your email address by visiting this link:

${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account with Bizconekt, please ignore this email.
        `.trim()
      });

      return {
        success: true,
        messageId: `verification-${Date.now()}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send password reset email
   * GOVERNANCE: Standard template for password reset
   * BACKWARD COMPATIBILITY: Returns EmailResult for Phase 2.3 compatibility
   *
   * @param email - Recipient email address
   * @param token - Password reset token
   * @returns Email sending result
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<EmailResult> {
    try {
      const resetUrl = `${this.baseUrl}/reset-password?token=${token}`;

      await this.send({
        to: email,
        subject: 'Reset Your Password - Bizconekt',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #2563eb;">Password Reset Request</h1>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}"
                     style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    Reset Password
                  </a>
                </div>
                <p style="color: #666; font-size: 14px;">
                  Or copy and paste this link into your browser:<br>
                  <a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a>
                </p>
                <p style="color: #666; font-size: 14px;">
                  This link will expire in 1 hour.
                </p>
                <p style="color: #dc2626; font-size: 14px; font-weight: bold;">
                  If you didn't request a password reset, please ignore this email and your password will remain unchanged.
                </p>
              </div>
            </body>
          </html>
        `,
        text: `
Password Reset Request

We received a request to reset your password. Visit this link to create a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email and your password will remain unchanged.
        `.trim()
      });

      return {
        success: true,
        messageId: `reset-${Date.now()}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send generic email (for backward compatibility)
   * BACKWARD COMPATIBILITY: Maintained for Phase 2.3 compatibility
   *
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param body - Email body (HTML or text)
   * @returns Email sending result
   */
  async sendEmail(to: string, subject: string, body: string): Promise<EmailResult> {
    try {
      await this.send({
        to,
        subject,
        html: body,
        text: body.replace(/<[^>]*>/g, '') // Strip HTML for text version
      });

      return {
        success: true,
        messageId: `generic-${Date.now()}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Helper: Sleep for specified milliseconds
   * GOVERNANCE: Used for retry delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * SMTP Provider
 * GOVERNANCE: Development and self-hosted environments
 */
class SMTPProvider implements EmailProvider {
  name = 'smtp';
  private transporter: SMTPTransporter;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host) {
      throw new Error('SMTP_HOST is required for SMTP provider');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined
    });

    
  }

  async send(options: EmailOptions): Promise<void> {
    await this.transporter.sendMail({
      from: options.from,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo
    });
  }
}

/**
 * AWS SES Provider
 * GOVERNANCE: Production environment (cost-effective, high volume)
 */
class SESProvider implements EmailProvider {
  name = 'ses';
  private client: SESClient;

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required for SES provider');
    }

    this.client = new SESClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });
  }

  async send(options: EmailOptions): Promise<void> {
    const command = new SendEmailCommand({
      Source: options.from,
      Destination: {
        ToAddresses: Array.isArray(options.to) ? options.to : [options.to]
      },
      Message: {
        Subject: { Data: options.subject },
        Body: {
          Html: options.html ? { Data: options.html } : undefined,
          Text: options.text ? { Data: options.text } : undefined
        }
      },
      ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined
    });

    await this.client.send(command);
  }
}

/**
 * Mailgun Provider
 * GOVERNANCE: Production environment (reliable, good deliverability)
 */
class MailgunProvider implements EmailProvider {
  name = 'mailgun';
  private client: ReturnType<Mailgun['client']>;
  private domain: string;

  constructor() {
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;
    const baseUrl = process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net';

    if (!apiKey || !domain) {
      throw new Error('MAILGUN_API_KEY and MAILGUN_DOMAIN are required for Mailgun provider');
    }

    const mailgun = new Mailgun(formData);
    this.client = mailgun.client({ username: 'api', key: apiKey, url: baseUrl });
    this.domain = domain;
  }

  async send(options: EmailOptions): Promise<void> {
    // Mailgun requires at least one content type (text, html, message, or template)
    // Ensure we have content before sending
    if (!options.text && !options.html) {
      throw new Error('Email must have either text or html content');
    }

    // Build message data - the content guard above ensures MailgunMessageContent constraint is met
    const messageData = {
      from: options.from,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      text: options.text,
      html: options.html,
      'h:Reply-To': options.replyTo
    } satisfies Omit<MailgunMessageData, 'text' | 'html'> & { text?: string; html?: string };

    // Type assertion is safe here - we've validated content exists above
    await this.client.messages.create(this.domain, messageData as MailgunMessageData);
  }
}

/**
 * SendGrid Provider
 * GOVERNANCE: Production environment (enterprise, advanced features)
 */
class SendGridProvider implements EmailProvider {
  name = 'sendgrid';

  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;

    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY is required for SendGrid provider');
    }

    sgMail.setApiKey(apiKey);
  }

  async send(options: EmailOptions): Promise<void> {
    const message: MailDataRequired = {
      from: options.from!,
      to: options.to,
      subject: options.subject,
      replyTo: options.replyTo,
      text: options.text || '',
      html: options.html || ''
    };

    await sgMail.send(message);
  }
}

/**
 * Singleton instance for application-wide use
 * GOVERNANCE: Singleton pattern for service reuse
 */
let mailSenderInstance: MailSender | null = null;

/**
 * Get MailSender singleton instance
 *
 * @returns Shared MailSender instance
 */
export function getMailSender(): MailSender {
  if (!mailSenderInstance) {
    mailSenderInstance = new MailSender();
  }
  return mailSenderInstance;
}

/**
 * Default export for convenience
 */
export default MailSender;
