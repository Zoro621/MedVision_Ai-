import type { AuthResponse, AuthUser, UserRole } from "@/types/auth";
import { apiUrl } from "@/lib/api/base";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export class AuthApiError extends Error {
  status: number;
  detail?: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(apiUrl(path), {
    ...options,
    headers,
    credentials: "include",
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const detail = payload?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : detail?.message || payload?.message || "Request failed";
    throw new AuthApiError(message, response.status, detail);
  }

  return payload as T;
}

export function loginRequest(input: {
  email: string;
  password: string;
  role: UserRole;
  totpCode?: string;
}) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: input,
  });
}

export function registerRequest(input: {
  fullName: string;
  email: string;
  password: string;
  institutionType: string;
  trainingLevel: string;
  radiologyFocus: string[];
  referralSource?: string;
}) {
  return request<{ message: string }>("/auth/register", {
    method: "POST",
    body: input,
  });
}

export function meRequest() {
  return request<AuthUser>("/auth/me", {
    method: "GET",
  });
}

export function refreshRequest() {
  return request<AuthResponse>("/auth/refresh", {
    method: "POST",
  });
}

export function logoutRequest() {
  return request<{ message: string }>("/auth/logout", {
    method: "POST",
  });
}

export function forgotPasswordRequest(email: string) {
  return request<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}
