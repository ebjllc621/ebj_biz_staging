/**
 * Email templates for authentication actions
 * GOVERNANCE: Anti-synthetic - templates accept email addresses as parameters
 * GOVERNANCE: Templates include link href text for accessibility
 */

export function verifyEmailTemplate(to: string, link: URL) {
  const subject = 'Verify your email';
  const text = `Hi,\n\nPlease verify your email by visiting: ${link.toString()}\n\nIf you did not request this, you can ignore this email.`;
  const html = `<p>Hi,</p><p>Please verify your email by clicking <a href="${link.toString()}">this link</a>.</p><p>If you did not request this, you can ignore this email.</p>`;
  return { to, subject, text, html };
}

export function passwordResetTemplate(to: string, link: URL) {
  const subject = 'Reset your password';
  const text = `Hi,\n\nReset your password using: ${link.toString()}\n\nIf you did not request this, you can ignore this email.`;
  const html = `<p>Hi,</p><p>Reset your password using <a href="${link.toString()}">this link</a>.</p><p>If you did not request this, you can ignore this email.</p>`;
  return { to, subject, text, html };
}