/**
 * AuthContext - Authentication State Context Provider
 *
 * @description Provides global authentication state through React Context
 * @component Client Component (uses hooks, manages state)
 * @architecture Build Map v2.1 ENHANCED - React Context pattern
 * @see .cursor/rules/react18-nextjs14-governance.mdc for context standards
 *
 * GOVERNANCE RULES:
 * - MUST be marked 'use client'
 * - MUST use createContext + Provider pattern
 * - MUST throw error if used outside Provider
 * - MUST provide stable context value (prevent re-renders)
 *
 * USAGE:
 * 1. Wrap app with <AuthProvider> in ClientLayout
 * 2. Use useAuth() hook in any child component
 * 3. Auth state automatically syncs across all components
 */
'use client';

import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useAuth as useAuthImplementation, UseAuthReturn } from '@/core/hooks/useAuth';

/**
 * AuthContext - React Context for authentication state
 *
 * Holds authentication state and methods accessible throughout component tree.
 * Initialized with undefined to force usage within Provider.
 */
const AuthContext = createContext<UseAuthReturn | undefined>(undefined);

/**
 * AuthProvider - Context Provider Component
 *
 * Creates single source of truth for authentication state.
 * MUST wrap component tree at layout level to ensure SSR compatibility.
 *
 * @param children - Component tree to provide auth context to
 * @returns Provider wrapping children with auth state
 *
 * @example
 * ```tsx
 * <AuthProvider>
 *   <SiteHeader />
 *   <PageContent />
 * </AuthProvider>
 * ```
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // Get auth implementation (contains all hooks and state)
  const auth = useAuthImplementation();

  // Memoize context value to prevent unnecessary re-renders
  // Only changes when auth state actually changes
  const contextValue = useMemo(() => auth, [auth]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth - Access Authentication Context
 *
 * Hook to access authentication state and methods from any component.
 * MUST be used within AuthProvider or will throw error.
 *
 * @returns Authentication state and methods
 * @throws Error if used outside AuthProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, login, logout } = useAuth();
 *   // ... use auth state
 * }
 * ```
 */
export function useAuth(): UseAuthReturn {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error(
      'useAuth must be used within an AuthProvider. ' +
      'Ensure <AuthProvider> wraps your component tree in ClientLayout.tsx'
    );
  }

  return context;
}

// Re-export types for convenience
export type { UseAuthReturn } from '@/core/hooks/useAuth';
