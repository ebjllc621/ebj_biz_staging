// MFA Type Definitions for AUTH-P3A-TOTP
// Governance: No 'any' types; server-only secrets; strict typing

export interface UserMfa {
  id: number;
  user_id: number;
  method: 'totp';
  secret_enc: Buffer; // Encrypted TOTP secret (server-only)
  recovery_salt: Buffer; // Salt for recovery codes
  enabled_at: Date | null;
  last_used_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserMfaRecoveryCode {
  id: number;
  user_mfa_id: number;
  code_hash: Buffer; // Hashed recovery code
  used_at: Date | null;
  created_at: Date;
}

// Client-safe types (no secrets exposed)
export interface MfaSetupResponse {
  secret: string; // Base32 encoded secret (only during setup)
  qr_code: string; // Data URL for QR code
  recovery_codes: string[]; // Only during initial setup
  backup_url: string; // Manual entry URL
}

export interface MfaStatus {
  enabled: boolean;
  method: 'totp' | null;
  recovery_codes_remaining: number;
  last_used_at: Date | null;
}

export interface MfaVerifyRequest {
  code: string; // 6-digit TOTP code or recovery code
  type: 'totp' | 'recovery';
}

export interface MfaVerifyResponse {
  success: boolean;
  message: string;
  recovery_codes_remaining?: number;
}

// Step-up authentication types
export interface StepUpChallenge {
  challenge_id: string;
  required_level: 'mfa' | 'password';
  expires_at: Date;
  redirect_url?: string;
}

export interface StepUpResponse {
  success: boolean;
  session_token?: string; // httpOnly cookie token
  redirect_url?: string;
}

// Admin/high-value account types
export interface MfaRequirement {
  user_id: number;
  required: boolean;
  reason: 'admin_role' | 'high_value_account' | 'security_policy';
  grace_period_ends?: Date;
}

export interface MfaAuditLog {
  id: number;
  user_id: number;
  event_type: 'setup' | 'verify_success' | 'verify_failure' | 'recovery_used' | 'disabled';
  method: 'totp' | 'recovery';
  ip_address: string;
  user_agent: string;
  success: boolean;
  created_at: Date;
}

// Step-up authentication result type
export interface StepUpResult {
  required: boolean;
  level: 'password' | 'mfa' | null;
  challenge_id?: string;
  expires_at?: Date;
  time_remaining?: number; // minutes
}