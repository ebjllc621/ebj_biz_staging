/**
 * useAuth Hook - Client-Side Authentication State
 *
 * @authority mandatory-verification-protocol.mdc - httpOnly cookies
 * @pattern React 18 hooks with Next.js 14 App Router
 * @governance NO localStorage for auth tokens - cookies only
 * @dependencies Phase 2 AuthServiceRegistry (via API routes), Phase 3 standardized endpoints
 * @compliance master_build_v_4_4_0.md (apiHandler responses)
 *
 * PURPOSE:
 * - Manage client-side auth state
 * - Fetch current user from session via /api/auth/me
 * - Handle login/logout/register flows
 * - Provide loading states for UI
 * - Parse standardized apiHandler responses
 *
 * USAGE:
 * ```tsx
 * const { user, loading, login, logout, register } = useAuth();
 * ```
 *
 * GOVERNANCE:
 * - All API calls return apiHandler standardized format: { ok: boolean, data?: T, code?: string, message?: string }
 * - ALSO supports legacy format: { success: boolean, data?: T }
 * - CSRF tokens required for all mutations
 * - httpOnly cookies for session management
 * - NO localStorage usage
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithCsrf } from '@core/utils/csrf';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * User object returned from authentication endpoints
 */
export interface User {
  id: string;
  email: string;
  name: string | null;
  username?: string;
  role: string;
  account_type?: 'visitor' | 'general' | 'listing_member' | 'admin';
  isVerified?: boolean;
  /** Avatar image URL (uploaded profile picture) */
  avatarUrl?: string | null;
  /** Avatar background color for default avatars (hex color code) */
  avatarBgColor?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Login credentials for authentication
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration data for new user signup
 */
export interface RegisterData {
  email: string;
  username: string;
  password: string;
  name: string;
  confirmPassword: string;
  /** Optional referral code from platform invite link */
  referralCode?: string;
}

/**
 * Authentication state managed by the hook
 */
export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

/**
 * Authentication action result
 */
export interface AuthResult {
  success: boolean;
  error?: string;
}

/**
 * Authentication actions provided by the hook
 */
export interface AuthActions {
  /** Log in with email/password credentials */
  login: (_credentials: LoginCredentials) => Promise<AuthResult>;
  /** Log out and clear session */
  logout: () => Promise<void>;
  /** Register a new user account */
  register: (_data: RegisterData) => Promise<AuthResult>;
  /** Refresh user data from server */
  refreshUser: () => Promise<void>;
  /** Clear current error state */
  clearError: () => void;
}

/**
 * Combined return type for useAuth hook
 */
export type UseAuthReturn = AuthState & AuthActions;

// ============================================================================
// API RESPONSE TYPE HELPERS
// ============================================================================

/**
 * API response envelope (apiHandler standardized format)
 * Supports both { ok: true } and legacy { success: true } formats
 */
interface ApiResponse<T = unknown> {
  ok?: boolean;
  success?: boolean;
  data?: T;
  code?: string;
  message?: string;
  error?: {
    message?: string;
  };
}

/**
 * Check if API response indicates success
 * Handles both modern (ok) and legacy (success) formats
 */
function isSuccessResponse(response: ApiResponse): boolean {
  return response.ok === true || response.success === true;
}

/**
 * Extract error message from API response
 */
function extractErrorMessage(response: ApiResponse, defaultMessage: string): string {
  return response.message || response.error?.message || defaultMessage;
}

// ============================================================================
// CSRF TOKEN MANAGEMENT
// ============================================================================

/**
 * Fetch CSRF token from the server
 *
 * @governance CSRF protection required for all state-changing operations
 * @returns CSRF token string or null if failed
 */
async function fetchCsrfToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/csrf', {
      method: 'GET',
      credentials: 'include', // Include cookies in request
    });

    if (!response.ok) {
      // eslint-disable-next-line no-console -- Client-side error logging for authentication
      return null;
    }

    const data: ApiResponse<{ csrfToken: string }> = await response.json();

    if (isSuccessResponse(data) && data.data?.csrfToken) {
      return data.data.csrfToken;
    }

    // eslint-disable-next-line no-console -- Client-side error logging for authentication
    return null;
  } catch (err) {
    // eslint-disable-next-line no-console -- Client-side error logging for authentication
    return null;
  }
}

// ============================================================================
// useAuth HOOK IMPLEMENTATION
// ============================================================================

// ============================================================================
// LIGHTHOUSE DEV BYPASS
// ============================================================================

/**
 * Mock admin user for Lighthouse performance testing in development
 * Allows testing authenticated pages without login ceremony
 */
const LIGHTHOUSE_MOCK_ADMIN: User = {
  id: 'lighthouse-dev-user',
  email: 'lighthouse@dev.local',
  name: 'Lighthouse Dev',
  username: 'lighthouse_dev',
  role: 'admin',
  account_type: 'admin',
  isVerified: true,
};

/**
 * Check if we should bypass auth for Lighthouse testing
 * Only works in development mode with specific triggers
 */
function shouldBypassAuth(): boolean {
  if (typeof window === 'undefined') return false;
  if (process.env.NODE_ENV !== 'development') return false;

  // Check for Lighthouse user agent
  const isLighthouse = navigator.userAgent.includes('Chrome-Lighthouse');

  // Check for bypass query param (?lighthouse_bypass=true)
  const hasQueryBypass = new URLSearchParams(window.location.search).get('lighthouse_bypass') === 'true';

  return isLighthouse || hasQueryBypass;
}

/**
 * useAuth Hook - Single source of truth for client-side authentication
 *
 * @returns Authentication state and actions
 *
 * @example
 * ```tsx
 * function LoginPage() {
 *   const { user, loading, error, login } = useAuth();
 *
 *   if (loading) return <Spinner />;
 *   if (user) return <Redirect to="/dashboard" />;
 *
 *   const handleSubmit = async (e: FormEvent) => {
 *     e.preventDefault();
 *     const result = await login({ email, password });
 *     if (!result.success) {
 *       // Error already set in hook state
 *     }
 *   };
 *
 *   return <LoginForm onSubmit={handleSubmit} error={error} />;
 * }
 * ```
 */
export function useAuth(): UseAuthReturn {
  const router = useRouter();

  // Check for Lighthouse dev bypass FIRST
  const bypassAuth = shouldBypassAuth();

  // Authentication state - use mock user if bypassing
  const [user, setUser] = useState<User | null>(bypassAuth ? LIGHTHOUSE_MOCK_ADMIN : null);
  const [loading, setLoading] = useState<boolean>(bypassAuth ? false : true);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // FETCH CURRENT USER
  // ============================================================================

  /**
   * Fetch current user from session
   * Called on mount and after login/register
   *
   * @governance Uses Phase 3 standardized /api/auth/me endpoint
   */
  const fetchCurrentUser = useCallback(async () => {
    try {
      setLoading(true);

      // GOVERNANCE: credentials: 'include' for httpOnly cookies
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: ApiResponse<{ user: User }> = await response.json();

        // Parse apiHandler standardized response
        if (isSuccessResponse(data) && data.data?.user) {
          setUser(data.data.user);
          setError(null);
        } else {
          setUser(null);
        }
      } else if (response.status === 401 || response.status === 403) {
        // Not logged in - this is normal, not an error
        setUser(null);
        setError(null);
      } else {
        // Actual server error
        setUser(null);
        setError('Failed to fetch user session');
      }
    } catch (err) {
      // eslint-disable-next-line no-console -- Client-side error logging for authentication
      setUser(null);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // INITIAL USER FETCH
  // ============================================================================

  /**
   * Fetch user on mount
   */
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // ============================================================================
  // LOGIN
  // ============================================================================

  /**
   * Login function
   *
   * @governance CSRF protection mandatory
   * @governance httpOnly cookies set by server
   */
  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthResult> => {
    try {
      setLoading(true);
      setError(null);

      // Validate input
      if (!credentials.email || !credentials.password) {
        const errorMessage = 'Email and password are required';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      // Step 1: Get CSRF token
      const csrfToken = await fetchCsrfToken();

      if (!csrfToken) {
        const errorMessage = 'Failed to get security token';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      // Step 2: Attempt login with CSRF protection
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include', // GOVERNANCE: httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken, // GOVERNANCE: CSRF protection
        },
        body: JSON.stringify(credentials),
      });

      const data: ApiResponse<{ user: User }> = await response.json();

      // Parse apiHandler standardized response
      if (response.ok && isSuccessResponse(data)) {
        // Login successful - fetch user data to ensure state is current
        await fetchCurrentUser();
        return { success: true };
      } else {
        // Login failed
        const errorMessage = extractErrorMessage(data, 'Login failed');
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error during login';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [fetchCurrentUser]);

  // ============================================================================
  // REGISTER
  // ============================================================================

  /**
   * Register function
   *
   * @governance CSRF protection mandatory
   * @governance Password validation on client side for UX
   */
  const register = useCallback(async (data: RegisterData): Promise<AuthResult> => {
    try {
      setLoading(true);
      setError(null);

      // Client-side validation for better UX
      if (!data.email || !data.password || !data.name || !data.username) {
        const errorMessage = 'All fields are required';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      // Username validation
      if (data.username.length < 3) {
        const errorMessage = 'Username must be at least 3 characters';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
        const errorMessage = 'Username can only contain letters, numbers, and underscores';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      if (data.password !== data.confirmPassword) {
        const errorMessage = 'Passwords do not match';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      // Basic password strength validation (server does full validation)
      if (data.password.length < 8) {
        const errorMessage = 'Password must be at least 8 characters';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      // Step 1: Get CSRF token
      const csrfToken = await fetchCsrfToken();

      if (!csrfToken) {
        const errorMessage = 'Failed to get security token';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      // Step 2: Attempt registration
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          email: data.email,
          username: data.username,
          password: data.password,
          name: data.name,
          confirmPassword: data.confirmPassword || data.password, // Include confirmPassword
        }),
      });

      const responseData: ApiResponse<{ user: User }> = await response.json();

      // Parse apiHandler standardized response
      if (response.ok && isSuccessResponse(responseData)) {
        // Registration successful - fetch user data
        await fetchCurrentUser();
        return { success: true };
      } else {
        // Registration failed
        const errorMessage = extractErrorMessage(responseData, 'Registration failed');
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error during registration';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [fetchCurrentUser]);

  // ============================================================================
  // LOGOUT
  // ============================================================================

  /**
   * Logout function
   *
   * @governance Clears httpOnly cookies on server
   * @governance Redirects to home after logout
   */
  const logout = useCallback(async () => {
    try {
      setLoading(true);

      // Get CSRF token for logout (state-changing operation)
      const csrfToken = await fetchCsrfToken();

      if (csrfToken) {
        // Attempt logout on server
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
        });
      }

      // Clear user state regardless of API result
      // (Even if server call fails, clear local state for security)
      setUser(null);
      setError(null);

      // Redirect to home
      router.push('/');
    } catch (err) {
      // eslint-disable-next-line no-console -- Client-side error logging for authentication
      // Still clear user state even on error
      setUser(null);
      setError(null);
      // Still redirect
      router.push('/');
    } finally {
      setLoading(false);
    }
  }, [router]);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Refresh user data (for external use)
   */
  const refreshUser = useCallback(async () => {
    await fetchCurrentUser();
  }, [fetchCurrentUser]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // State
    user,
    loading,
    error,
    // Actions
    login,
    logout,
    register,
    refreshUser,
    clearError,
  };
}

// Default export for convenience
export default useAuth;
