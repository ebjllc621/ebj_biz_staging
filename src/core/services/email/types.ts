/**
 * Email Service Type Definitions
 *
 * @architecture Service Architecture v2.0
 * @see docs/auth/newday2ndRemediation/03-email-service-integration.md
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailServiceConfig {
  provider: 'console' | 'smtp' | 'sendgrid' | 'ses' | 'mailgun';
  from: string;
  replyTo?: string;
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  sendgrid?: {
    apiKey: string;
  };
  ses?: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  mailgun?: {
    apiKey: string;
    domain: string;
    baseUrl?: string; // defaults to https://api.mailgun.net
  };
  retryConfig: {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
  };
}

export interface EmailTemplateData {
  verificationLink?: string;
  resetLink?: string;
  userName?: string;
  expiresIn?: string;
}

export interface EmailServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  provider: string;
  lastSendAttempt?: Date;
  lastSendSuccess?: Date;
  failureCount: number;
}