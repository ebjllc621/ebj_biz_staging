/**
 * EmailService - Production Email Delivery Service
 *
 * @description Centralized email delivery with retry logic and multiple provider support
 * @architecture Service Architecture v2.0 compliant
 * @singleton Accessed via AuthServiceRegistry.emailService
 *
 * @see docs/auth/newday2ndRemediation/03-email-service-integration.md
 */

import {
  EmailMessage,
  EmailResult,
  EmailServiceConfig,
  EmailServiceHealth
} from './types';

export class EmailService {
  private config: EmailServiceConfig;
  private health: EmailServiceHealth;
  private initialized: boolean = false;

  constructor(config: EmailServiceConfig) {
    this.config = config;
    this.health = {
      status: 'healthy',
      provider: config.provider,
      failureCount: 0
    };
  }

  async initialize(): Promise<void> {
    // Validate configuration
    if (!this.config.from) {
      throw new Error('EmailService: from address is required');
    }

    if (this.config.provider === 'smtp' && !this.config.smtp) {
      throw new Error('EmailService: SMTP configuration required for smtp provider');
    }

    this.initialized = true;
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(
    to: string,
    verificationLink: string,
    userName?: string
  ): Promise<EmailResult> {
    const subject = 'Verify your email address';
    const text = this.buildVerificationText(verificationLink, userName);
    const html = this.buildVerificationHtml(verificationLink, userName);

    return this.send({ to, subject, text, html });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    to: string,
    resetLink: string,
    userName?: string
  ): Promise<EmailResult> {
    const subject = 'Reset your password';
    const text = this.buildPasswordResetText(resetLink, userName);
    const html = this.buildPasswordResetHtml(resetLink, userName);

    return this.send({ to, subject, text, html });
  }

  /**
   * Send generic email with retry logic
   */
  async send(message: EmailMessage): Promise<EmailResult> {
    if (!this.initialized) {
      throw new Error('EmailService not initialized');
    }

    const { maxAttempts, baseDelayMs, maxDelayMs } = this.config.retryConfig;
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.sendWithProvider(message);

        if (result.success) {
          this.health.lastSendSuccess = new Date();
          this.health.failureCount = 0;
          this.health.status = 'healthy';
          return result;
        }

        lastError = result.error;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
      }

      // Exponential backoff
      if (attempt < maxAttempts) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
        await this.sleep(delay);
      }
    }

    // All retries failed
    this.health.lastSendAttempt = new Date();
    this.health.failureCount++;
    this.health.status = this.health.failureCount >= 3 ? 'unhealthy' : 'degraded';

    return {
      success: false,
      error: `Failed after ${maxAttempts} attempts: ${lastError}`
    };
  }

  /**
   * Provider-specific send implementation
   */
  private async sendWithProvider(message: EmailMessage): Promise<EmailResult> {
    switch (this.config.provider) {
      case 'console':
        return this.sendConsole(message);
      case 'smtp':
        return this.sendSmtp(message);
      case 'sendgrid':
        return this.sendSendGrid(message);
      case 'ses':
        return this.sendSes(message);
      case 'mailgun':
        return this.sendMailgun(message);
      default:
        throw new Error(`Unknown email provider: ${this.config.provider}`);
    }
  }

  /**
   * Console provider (development only)
   */
  private async sendConsole(message: EmailMessage): Promise<EmailResult> {
    // eslint-disable-next-line no-console -- Intentional development-only console provider
    
    // eslint-disable-next-line no-console -- Intentional development-only console provider
    
    // eslint-disable-next-line no-console -- Intentional development-only console provider
    // eslint-disable-next-line no-console -- Intentional development-only console provider
    // eslint-disable-next-line no-console -- Intentional development-only console provider
    // eslint-disable-next-line no-console -- Intentional development-only console provider
    // eslint-disable-next-line no-console -- Intentional development-only console provider
    return {
      success: true,
      messageId: `console-${Date.now()}-${Math.random().toString(36).substring(7)}`
    };
  }

  /**
   * SMTP provider implementation
   */
  private async sendSmtp(message: EmailMessage): Promise<EmailResult> {
    if (!this.config.smtp) {
      throw new Error('SMTP configuration not provided');
    }

    // Dynamic import to avoid loading nodemailer in development
    const nodemailer = await import('nodemailer');

    const transporter = nodemailer.createTransport({
      host: this.config.smtp.host,
      port: this.config.smtp.port,
      secure: this.config.smtp.secure,
      auth: {
        user: this.config.smtp.auth.user,
        pass: this.config.smtp.auth.pass
      }
    });

    const info = await transporter.sendMail({
      from: this.config.from,
      replyTo: this.config.replyTo,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html
    });

    return {
      success: true,
      messageId: info.messageId
    };
  }

  /**
   * SendGrid provider implementation
   */
  private async sendSendGrid(message: EmailMessage): Promise<EmailResult> {
    if (!this.config.sendgrid?.apiKey) {
      throw new Error('SendGrid API key not provided');
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.sendgrid.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: message.to }] }],
        from: { email: this.config.from },
        reply_to: this.config.replyTo ? { email: this.config.replyTo } : undefined,
        subject: message.subject,
        content: [
          { type: 'text/plain', value: message.text },
          ...(message.html ? [{ type: 'text/html', value: message.html }] : [])
        ]
      })
    });

    if (response.ok) {
      return {
        success: true,
        messageId: response.headers.get('x-message-id') || undefined
      };
    }

    const errorText = await response.text();
    return {
      success: false,
      error: `SendGrid error: ${response.status} - ${errorText}`
    };
  }

  /**
   * AWS SES provider implementation
   */
  private async sendSes(message: EmailMessage): Promise<EmailResult> {
    if (!this.config.ses) {
      throw new Error('SES configuration not provided');
    }

    // Dynamic import AWS SDK
    const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses');

    const client = new SESClient({
      region: this.config.ses.region,
      credentials: {
        accessKeyId: this.config.ses.accessKeyId,
        secretAccessKey: this.config.ses.secretAccessKey
      }
    });

    const command = new SendEmailCommand({
      Source: this.config.from,
      ReplyToAddresses: this.config.replyTo ? [this.config.replyTo] : undefined,
      Destination: {
        ToAddresses: [message.to]
      },
      Message: {
        Subject: { Data: message.subject },
        Body: {
          Text: { Data: message.text },
          Html: message.html ? { Data: message.html } : undefined
        }
      }
    });

    const response = await client.send(command);

    return {
      success: true,
      messageId: response.MessageId
    };
  }

  /**
   * Mailgun provider implementation
   * Uses Mailgun REST API v3
   */
  private async sendMailgun(message: EmailMessage): Promise<EmailResult> {
    if (!this.config.mailgun?.apiKey || !this.config.mailgun?.domain) {
      throw new Error('Mailgun API key and domain are required');
    }

    const baseUrl = this.config.mailgun.baseUrl || 'https://api.mailgun.net';
    const domain = this.config.mailgun.domain;
    const url = `${baseUrl}/v3/${domain}/messages`;

    // Build form data for Mailgun API
    const formData = new URLSearchParams();
    formData.append('from', this.config.from);
    formData.append('to', message.to);
    formData.append('subject', message.subject);
    formData.append('text', message.text);
    if (message.html) {
      formData.append('html', message.html);
    }
    if (this.config.replyTo) {
      formData.append('h:Reply-To', this.config.replyTo);
    }

    // Basic auth with api:apiKey
    const authHeader = 'Basic ' + Buffer.from(`api:${this.config.mailgun.apiKey}`).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    if (response.ok) {
      const data = await response.json() as { id?: string; message?: string };
      return {
        success: true,
        messageId: data.id || undefined
      };
    }

    const errorText = await response.text();
    return {
      success: false,
      error: `Mailgun error: ${response.status} - ${errorText}`
    };
  }

  /**
   * Email templates
   */
  private buildVerificationText(link: string, userName?: string): string {
    const greeting = userName ? `Hi ${userName},` : 'Hi,';
    return `${greeting}

Please verify your email address by clicking the link below:

${link}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.

Thanks,
The Bizconekt Team`;
  }

  private buildVerificationHtml(link: string, userName?: string): string {
    const greeting = userName ? `Hi ${userName},` : 'Hi,';
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 6px; }
    .footer { margin-top: 40px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <p>${greeting}</p>
    <p>Please verify your email address by clicking the button below:</p>
    <p style="margin: 30px 0;">
      <a href="${link}" class="button">Verify Email Address</a>
    </p>
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #666;">${link}</p>
    <p>This link will expire in 24 hours.</p>
    <p>If you didn't create an account, you can safely ignore this email.</p>
    <div class="footer">
      <p>Thanks,<br>The Bizconekt Team</p>
    </div>
  </div>
</body>
</html>`;
  }

  private buildPasswordResetText(link: string, userName?: string): string {
    const greeting = userName ? `Hi ${userName},` : 'Hi,';
    return `${greeting}

We received a request to reset your password. Click the link below to choose a new password:

${link}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.

Thanks,
The Bizconekt Team`;
  }

  private buildPasswordResetHtml(link: string, userName?: string): string {
    const greeting = userName ? `Hi ${userName},` : 'Hi,';
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 6px; }
    .footer { margin-top: 40px; font-size: 12px; color: #666; }
    .warning { color: #e53e3e; }
  </style>
</head>
<body>
  <div class="container">
    <p>${greeting}</p>
    <p>We received a request to reset your password. Click the button below to choose a new password:</p>
    <p style="margin: 30px 0;">
      <a href="${link}" class="button">Reset Password</a>
    </p>
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #666;">${link}</p>
    <p class="warning">This link will expire in 1 hour.</p>
    <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
    <div class="footer">
      <p>Thanks,<br>The Bizconekt Team</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Redact email for logging (PII protection)
   */
  private redactEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***@***';

    const redactedLocal = local.length > 2
      ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
      : '*'.repeat(local.length);

    return `${redactedLocal}@${domain}`;
  }

  /**
   * Get service health status
   */
  getHealthStatus(): EmailServiceHealth {
    return { ...this.health };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}