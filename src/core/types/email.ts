/**
 * Email Service Types
 * @phase R6.4 - TypeScript Compliance
 */

import type { Transporter } from 'nodemailer';
// Re-export Mailgun's built-in type for type-safe message creation
export type { MailgunMessageData } from 'mailgun.js/definitions';

export type SMTPTransporter = Transporter;
