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
import {
  AuthApiError,
  forgotPasswordRequest,
  loginRequest,
  logoutRequest,
  meRequest,
  refreshRequest,
  registerRequest,
} from "@/lib/api/auth";

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

function setSessionCookies(role: string) {
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  document.cookie = `medvision_token=1; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `medvision_role=${role}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function clearSessionCookies() {
  document.cookie = "medvision_token=; path=/; max-age=0";
  document.cookie = "medvision_role=; path=/; max-age=0";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);

  const isLockedOut = lockoutEndTime !== null && Date.now() < lockoutEndTime;

  const resetLockState = useCallback(() => {
    setFailedAttempts(0);
    setLockoutEndTime(null);
  }, []);

  const syncLockStateFromError = useCallback((error: AuthApiError) => {
    const detail =
      typeof error.detail === "object" && error.detail !== null
        ? (error.detail as {
            remainingAttempts?: number;
            lockedUntil?: string;
          })
        : null;

    if (detail?.remainingAttempts !== undefined) {
      setFailedAttempts(MAX_FAILED_ATTEMPTS - detail.remainingAttempts);
    }

    if (detail?.lockedUntil) {
      setLockoutEndTime(new Date(detail.lockedUntil).getTime());
    }
  }, []);

  // On mount: check for existing session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const currentUser = await meRequest();
        setUser(currentUser);
        setSessionCookies(currentUser.role);
        resetLockState();
      } catch (err) {
        if (err instanceof AuthApiError && err.status === 401) {
          try {
            const refreshed = await refreshRequest();
            setUser(refreshed.user);
            setSessionCookies(refreshed.user.role);
            resetLockState();
          } catch {
            await logoutRequest().catch(() => undefined);
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    checkSession();
  }, [resetLockState]);

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
        const response = await loginRequest({
          email,
          password,
          role,
          totpCode: totp,
        });
        setUser(response.user);
        setSessionCookies(response.user.role);
        resetLockState();
        return { success: true };
      } catch (err) {
        if (err instanceof AuthApiError) {
          syncLockStateFromError(err);
          const errorMsg = err.message;
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }

        const errorMsg = "Unable to sign in right now. Please try again.";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [isLockedOut, resetLockState, syncLockStateFromError]
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await logoutRequest();
    } finally {
      clearSessionCookies();
      setUser(null);
      setIsLoading(false);
      window.location.href = "/login";
    }
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
        await registerRequest({
          fullName: data.fullName,
          email: data.email,
          password: data.password,
          institutionType: data.institutionType,
          trainingLevel: data.trainingLevel,
          radiologyFocus: data.radiologyFocus,
          referralSource: data.referralSource,
        });
        return { success: true };
      } catch (err) {
        const errorMsg =
          err instanceof AuthApiError
            ? err.message
            : "Registration failed. Please try again.";
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
        await forgotPasswordRequest(email);
        return { success: true };
      } catch (err) {
        const errorMsg =
          err instanceof AuthApiError
            ? err.message
            : "Failed to send reset email. Please try again.";
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
