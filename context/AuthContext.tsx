"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import type { AuthUser, UserRole } from "@/types/auth";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string,
    role: UserRole,
    totp?: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (data: {
    fullName: string;
    email: string;
    password: string;
    institutionType: string;
    trainingLevel: string;
    radiologyFocus: string[];
    referralSource?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  requestPasswordReset: (
    email: string
  ) => Promise<{ success: boolean; error?: string }>;
  error: string | null;
  clearError: () => void;
  failedAttempts: number;
  isLockedOut: boolean;
  lockoutEndTime: number | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);

  const isLockedOut = lockoutEndTime !== null && Date.now() < lockoutEndTime;

  // On mount: check for existing session
  useEffect(() => {
    const checkSession = async () => {
      // TODO: call /api/auth/me to validate token and hydrate user
      await new Promise((r) => setTimeout(r, 500));
      setIsLoading(false);
    };
    checkSession();
  }, []);

  // Clear lockout when time expires
  useEffect(() => {
    if (!lockoutEndTime) return;

    const timeout = setTimeout(() => {
      setLockoutEndTime(null);
      setFailedAttempts(0);
    }, lockoutEndTime - Date.now());

    return () => clearTimeout(timeout);
  }, [lockoutEndTime]);

  const login = useCallback(
    async (
      email: string,
      password: string,
      role: UserRole,
      totp?: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (isLockedOut) {
        return { success: false, error: "Account temporarily locked" };
      }

      setIsLoading(true);
      setError(null);

      try {
        // TODO: POST /api/auth/login
        await new Promise((r) => setTimeout(r, 1500));

        // For demo purposes, accept any valid email/password combination
        // In production, this would validate against a backend API
        if (email && password && password.length >= 6) {
          const mockUser: AuthUser = {
            id: "usr_" + Math.random().toString(36).substr(2, 9),
            email,
            fullName: email.split("@")[0].replace(/[._-]/g, " ").toUpperCase(),
            role,
            avatarInitials: email
              .split("@")[0]
              .split("")
              .slice(0, 2)
              .join("")
              .toUpperCase(),
            trainingLevel: role === "student" ? "PGY-2 Resident" : undefined,
            radiologyFocus: role === "student" ? ["Chest", "Neuro"] : undefined,
            createdAt: new Date().toISOString(),
          };
          setUser(mockUser);
          setFailedAttempts(0);
          return { success: true };
        }

        // Failed attempt
        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);

        if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
          setLockoutEndTime(Date.now() + LOCKOUT_DURATION_MS);
          return {
            success: false,
            error: "Too many failed attempts. Account locked for 15 minutes.",
          };
        }

        const errorMsg = "Invalid email or password";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } catch (err) {
        const errorMsg = "An error occurred. Please try again.";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [failedAttempts, isLockedOut]
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    // TODO: POST /api/auth/logout
    await new Promise((r) => setTimeout(r, 500));
    setUser(null);
    setIsLoading(false);
  }, []);

  const register = useCallback(
    async (data: {
      fullName: string;
      email: string;
      password: string;
      institutionType: string;
      trainingLevel: string;
      radiologyFocus: string[];
      referralSource?: string;
    }): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        // TODO: POST /api/auth/register
        await new Promise((r) => setTimeout(r, 2000));

        // Simulate successful registration
        return { success: true };
      } catch (err) {
        const errorMsg = "Registration failed. Please try again.";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const requestPasswordReset = useCallback(
    async (email: string): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        // TODO: POST /api/auth/forgot-password
        await new Promise((r) => setTimeout(r, 1500));

        // Simulate - always succeed for demo
        return { success: true };
      } catch (err) {
        const errorMsg = "Failed to send reset email. Please try again.";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        register,
        requestPasswordReset,
        error,
        clearError,
        failedAttempts,
        isLockedOut,
        lockoutEndTime,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
