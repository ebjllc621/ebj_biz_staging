// MFA Service for AUTH-P3A-TOTP
// Governance: DatabaseService only; no direct mariadb/mysql2; server-only secrets

import { DatabaseService } from '../DatabaseService';
import { BizError } from '../../errors/BizError';
import {
  UserMfa,
  MfaSetupResponse,
  MfaStatus,
  MfaVerifyRequest,
  MfaVerifyResponse
} from '../../types/auth/mfa';
// Note: UserMfaRecoveryCode type removed - not currently used in this service
import { createHash, randomBytes, createCipheriv, createDecipheriv, timingSafeEqual, scrypt } from 'crypto';
import { promisify } from 'util';
import { bigIntToNumber } from '@core/utils/bigint';

export interface MfaServiceConfig {
  database: DatabaseService;
  authSecret: string;
}

export class MfaService {
  private readonly database: DatabaseService;
  private readonly authSecret: string;
  private initialized: boolean = false;

  constructor(config: MfaServiceConfig) {
    this.database = config.database;
    this.authSecret = config.authSecret;
  }

  /**
   * Initialize MfaService
   *
   * Validates dependencies and optionally checks database tables exist.
   * Required by AuthServiceRegistry initialization sequence.
   *
   * @throws Error if database is not available or authSecret is invalid
   */
  async initialize(): Promise<void> {
    // Prevent double initialization
    if (this.initialized) {
      return;
    }

    // Verify database is available
    if (!this.database) {
      throw new Error('[MfaService] DatabaseService is required but not provided');
    }

    // Verify authSecret is set and has minimum length
    if (!this.authSecret || this.authSecret.length < 32) {
      throw new Error('[MfaService] AUTH_SECRET must be at least 32 characters');
    }

    // Verify database connection is working
    try {
      await this.database.query('SELECT 1 as health_check');
    } catch (error) {
      throw new Error(`[MfaService] Database connection failed: ${(error as Error).message}`);
    }

    // Optionally verify MFA tables exist (warn but don't fail)
    try {
      await this.database.query('SELECT 1 FROM user_mfa LIMIT 1');
      await this.database.query('SELECT 1 FROM user_mfa_recovery_codes LIMIT 1');
    } catch {
      // Silently continue if MFA tables don't exist - will be created on first use
    }

    this.initialized = true;
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Health check for MfaService
   * Used by AuthServiceRegistry.getHealthStatus()
   */
  healthCheck(): { healthy: boolean; message?: string } {
    if (!this.initialized) {
      return { healthy: false, message: 'MfaService not initialized' };
    }

    if (!this.database) {
      return { healthy: false, message: 'DatabaseService not available' };
    }

    return { healthy: true };
  }

  // Setup TOTP for user
  async setupTotp(userId: number, userEmail: string): Promise<MfaSetupResponse> {
    // Generate TOTP secret
    const secret = this.generateTotpSecret();
    const encryptedSecret = await this.encryptSecret(secret);

    // Generate recovery codes
    const recoveryCodes = this.generateRecoveryCodes();
    const recoveryCodesHash = this.hashRecoveryCodes(recoveryCodes);

    // Store in database
    await this.database.query(
      'INSERT INTO user_mfa (user_id, method, secret_enc, recovery_salt, enabled_at) VALUES (?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE secret_enc = VALUES(secret_enc), recovery_salt = VALUES(recovery_salt), enabled_at = NOW()',
      [userId, 'totp', encryptedSecret, recoveryCodesHash]
    );

    // Store recovery codes
    const mfaResult = await this.database.query(
      'SELECT id FROM user_mfa WHERE user_id = ? AND method = ?',
      [userId, 'totp']
    );

    if (mfaResult.rows.length === 0) {
      throw BizError.internalServerError('Failed to create MFA record');
    }

    const mfaId = (mfaResult.rows[0] as any).id;

    // Clear existing recovery codes and insert new ones
    await this.database.query('DELETE FROM user_mfa_recovery_codes WHERE user_mfa_id = ?', [mfaId]);

    for (const code of recoveryCodes) {
      const codeHash = this.hashRecoveryCode(code);
      await this.database.query(
        'INSERT INTO user_mfa_recovery_codes (user_mfa_id, code_hash) VALUES (?, ?)',
        [mfaId, codeHash]
      );
    }

    return {
      secret,
      qr_code: this.generateQrCodeUrl(userEmail, secret),
      recovery_codes: recoveryCodes,
      backup_url: this.generateBackupUrl(userEmail, secret)
    };
  }

  // Verify TOTP code
  async verifyTotp(userId: number, request: MfaVerifyRequest): Promise<MfaVerifyResponse> {
    const mfaRecord = await this.getMfaRecord(userId);
    if (!mfaRecord) {
      throw BizError.badRequest('MFA not set up');
    }

    if (request.type === 'totp') {
      return this.verifyTotpCode(mfaRecord, request.code);
    } else if (request.type === 'recovery') {
      return this.verifyRecoveryCode(mfaRecord, request.code);
    }

    throw BizError.badRequest('Invalid verification type');
  }

  // Get MFA status
  async getMfaStatus(userId: number): Promise<MfaStatus> {
    const mfaRecord = await this.getMfaRecord(userId);

    if (!mfaRecord) {
      return {
        enabled: false,
        method: null,
        recovery_codes_remaining: 0,
        last_used_at: null
      };
    }

    const recoveryCodesResult = await this.database.query(
      'SELECT COUNT(*) as count FROM user_mfa_recovery_codes WHERE user_mfa_id = ? AND used_at IS NULL',
      [mfaRecord.id]
    );

    const countRow = recoveryCodesResult.rows[0] as { count: number } | undefined;

    return {
      enabled: !!mfaRecord.enabled_at,
      method: mfaRecord.method,
      recovery_codes_remaining: countRow?.count || 0,
      last_used_at: mfaRecord.last_used_at
    };
  }

  // Disable MFA
  async disableMfa(userId: number): Promise<void> {
    await this.database.query(
      'DELETE FROM user_mfa WHERE user_id = ?',
      [userId]
    );
  }

  // Private helper methods
  private async getMfaRecord(userId: number): Promise<UserMfa | null> {
    const result = await this.database.query<UserMfa>(
      'SELECT * FROM user_mfa WHERE user_id = ? AND method = ?',
      [userId, 'totp']
    );

    return result.rows[0] || null;
  }

  private async verifyTotpCode(mfaRecord: UserMfa, code: string): Promise<MfaVerifyResponse> {
    const secret = await this.decryptSecret(mfaRecord.secret_enc);
    const isValid = this.validateTotpCode(secret, code);

    if (isValid) {
      // Update last used
      await this.database.query(
        'UPDATE user_mfa SET last_used_at = NOW() WHERE id = ?',
        [mfaRecord.id]
      );

      return {
        success: true,
        message: 'TOTP verification successful'
      };
    }

    return {
      success: false,
      message: 'Invalid TOTP code'
    };
  }

  private async verifyRecoveryCode(mfaRecord: UserMfa, code: string): Promise<MfaVerifyResponse> {
    const codeHash = this.hashRecoveryCode(code);

    const result = await this.database.query(
      'SELECT id FROM user_mfa_recovery_codes WHERE user_mfa_id = ? AND code_hash = ? AND used_at IS NULL',
      [mfaRecord.id, codeHash]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        message: 'Invalid recovery code'
      };
    }

    // Mark code as used
    await this.database.query(
      'UPDATE user_mfa_recovery_codes SET used_at = NOW() WHERE id = ?',
      [(result.rows[0] as any).id]
    );

    // Update last used
    await this.database.query(
      'UPDATE user_mfa SET last_used_at = NOW() WHERE id = ?',
      [mfaRecord.id]
    );

    // Count remaining codes
    const remainingResult = await this.database.query(
      'SELECT COUNT(*) as count FROM user_mfa_recovery_codes WHERE user_mfa_id = ? AND used_at IS NULL',
      [mfaRecord.id]
    );

    const remainingRow = remainingResult.rows[0] as { count: number } | undefined;

    return {
      success: true,
      message: 'Recovery code verification successful',
      recovery_codes_remaining: remainingRow?.count || 0
    };
  }

  private generateTotpSecret(): string {
    const secret = randomBytes(20);
    return this.base32Encode(secret);
  }

  private generateRecoveryCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(this.generateRecoveryCode());
    }
    return codes;
  }

  /**
   * Generate cryptographically secure recovery code
   *
   * Uses crypto.randomBytes() for true randomness.
   * Format: XXXX-XXXX (8 alphanumeric characters with dash)
   *
   * @security CRITICAL - Must use crypto.randomBytes, NOT Math.random()
   */
  private generateRecoveryCode(): string {
    // Generate 5 random bytes (40 bits of entropy)
    const bytes = randomBytes(5);

    // Convert to base32-like encoding (A-Z, 2-7)
    // This provides ~40 bits of entropy in 8 characters
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let code = '';

    // Extract 5-bit chunks from the random bytes
    // Use BigInt for proper 40-bit integer handling
    const bits = BigInt(bytes[0] || 0) << 32n |
                 BigInt(bytes[1] || 0) << 24n |
                 BigInt(bytes[2] || 0) << 16n |
                 BigInt(bytes[3] || 0) << 8n |
                 BigInt(bytes[4] || 0);

    for (let i = 0; i < 8; i++) {
      // Extract 5 bits at a time
      const index = Number((bits >> BigInt(35 - i * 5)) & 0x1fn);
      code += chars[index];
    }

    // Format as XXXX-XXXX for readability
    return `${code.substring(0, 4)}-${code.substring(4, 8)}`;
  }

  private async encryptSecret(secret: string): Promise<Buffer> {
    const scryptAsync = promisify(scrypt);
    const iv = randomBytes(16);
    const key = await scryptAsync(this.authSecret, 'salt', 32) as Buffer;
    const cipher = createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Prepend IV to encrypted data
    return Buffer.concat([iv, Buffer.from(encrypted, 'hex')]);
  }

  private async decryptSecret(encryptedBuffer: Buffer): Promise<string> {
    const scryptAsync = promisify(scrypt);
    const iv = encryptedBuffer.slice(0, 16);
    const encrypted = encryptedBuffer.slice(16);
    const key = await scryptAsync(this.authSecret, 'salt', 32) as Buffer;

    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private hashRecoveryCodes(codes: string[]): Buffer {
    return createHash('sha256')
      .update(codes.join('|'))
      .digest();
  }

  private hashRecoveryCode(code: string): Buffer {
    return createHash('sha256')
      .update(code)
      .update(this.authSecret)
      .digest();
  }

  private validateTotpCode(secret: string, code: string): boolean {
    const timeStep = 30;
    const currentTime = Math.floor(Date.now() / 1000);

    // Check current time window and ±1 window for clock drift
    for (let i = -1; i <= 1; i++) {
      const timeCounter = Math.floor((currentTime + i * timeStep) / timeStep);
      const expectedCode = this.generateTotpCode(secret, timeCounter);

      if (timingSafeEqual(Buffer.from(code), Buffer.from(expectedCode))) {
        return true;
      }
    }

    return false;
  }

  private generateTotpCode(secret: string, counter: number): string {
    const secretBytes = this.base32Decode(secret);
    const counterBytes = Buffer.alloc(8);
    counterBytes.writeBigUInt64BE(BigInt(counter));

    const hmac = createHash('sha1');
    hmac.update(secretBytes);
    hmac.update(counterBytes);
    const hash = hmac.digest();

    const offset = (hash[hash.length - 1] || 0) & 0x0f;
    const truncated = hash.readUInt32BE(offset) & 0x7fffffff;
    const code = (truncated % 1000000).toString().padStart(6, '0');

    return code;
  }

  private generateQrCodeUrl(userEmail: string, secret: string): string {
    const serviceName = 'BizConekt';
    const otpauthUrl = `otpauth://totp/${serviceName}:${userEmail}?secret=${secret}&issuer=${serviceName}`;
    return `data:image/svg+xml;base64,${Buffer.from(this.generateQrSvg(otpauthUrl)).toString('base64')}`;
  }

  private generateBackupUrl(userEmail: string, secret: string): string {
    const serviceName = 'BizConekt';
    return `otpauth://totp/${serviceName}:${userEmail}?secret=${secret}&issuer=${serviceName}`;
  }

  private generateQrSvg(data: string): string {
    // Simple QR code placeholder - in production would use a proper QR library
    return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="white"/><text x="100" y="100" text-anchor="middle" font-size="12" fill="black">QR Code: ${data.substring(0, 20)}...</text></svg>`;
  }

  private base32Encode(buffer: Buffer): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    let bits = 0;
    let value = 0;

    for (const byte of buffer) {
      value = (value << 8) | byte;
      bits += 8;

      while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 31];
    }

    return result;
  }

  private base32Decode(encoded: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const result: number[] = [];
    let bits = 0;
    let value = 0;

    for (const char of encoded.toUpperCase()) {
      const index = alphabet.indexOf(char);
      if (index === -1) continue;

      value = (value << 5) | index;
      bits += 5;

      if (bits >= 8) {
        result.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return Buffer.from(result);
  }
}