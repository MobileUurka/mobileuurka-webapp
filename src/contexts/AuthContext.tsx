/**
 * AuthContext
 *
 * Single source of truth for the current authenticated user.
 * App.tsx sets the value once initializeEncryption() has resolved —
 * so any consumer is guaranteed to read after the encryption key is ready.
 *
 * This eliminates the blind setTimeout polling loops that were scattered
 * across Sidebar, ScreeningForm, and other components.
 */

import { createContext, useContext } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  role?: string;
  [key: string]: any;
}

interface AuthContextValue {
  /** null while initializing OR when not authenticated */
  user: AuthUser | null;
  /** true once initializeEncryption() has resolved (key is in memory) */
  isReady: boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isReady: false,
});

export const useAuth = () => useContext(AuthContext);
