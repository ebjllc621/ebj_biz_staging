import { z } from "zod";

/**
 * AUTH SCHEMAS — Parameter Naming Authority: camelCase for API.
 * No DB concerns here. Export types for handlers to consume.
 */

export const EmailString = z.string().email();

// Username validation pattern - letters, numbers, underscores only
export const UsernameString = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be 30 characters or less')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

// Register
export const RegisterSchema = z.object({
  name: z.string().min(2).max(50),
  email: EmailString,
  username: UsernameString,
  password: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128),
  /** Optional referral code from platform invite link (e.g., BIZ-XXXXXXXX) */
  referralCode: z.string().optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

// Login
export const LoginSchema = z.object({
  email: EmailString,
  password: z.string().min(8).max(128)
});
export type LoginInput = z.infer<typeof LoginSchema>;

// Logout — requires CSRF double-submit token in header; payload empty
export const LogoutHeadersSchema = z.object({
  "x-csrf-token": z.string().min(16)
});
export type LogoutHeaders = z.infer<typeof LogoutHeadersSchema>;

// Session response (minimal contract per plan)
export const SessionResponseSchema = z.object({
  userId: z.number().int().positive(),
  role: z.enum(["user", "admin"]),
  isVerified: z.boolean(),
  serverTime: z.string() // ISO timestamp
});
export type SessionResponse = z.infer<typeof SessionResponseSchema>;

// Shared error message policy: do not reveal existence of account
export const UniformAuthErrorMessage = {
  LOGIN_FAILURE: "Invalid email or password.",
  RATE_LIMITED: "Too many requests. Please try again later.",
  GENERIC: "Request could not be processed.",
} as const;

// Utility refine for constant-time compare placeholders (handlers apply real logic)
export const NonEmptyString = z.string().min(1);