// ─── API Client ─────────────────────────────────────────────
// Centralised fetch wrapper with token management and refresh logic.

const API_BASE = '/api';

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('handy_access_token');
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('handy_refresh_token');
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('handy_access_token', accessToken);
  localStorage.setItem('handy_refresh_token', refreshToken);
  // Set cookie for Next.js middleware to read
  document.cookie = `handy_auth=1; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
}

export function clearTokens() {
  localStorage.removeItem('handy_access_token');
  localStorage.removeItem('handy_refresh_token');
  document.cookie = 'handy_auth=; path=/; max-age=0';
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearTokens();
      return false;
    }

    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

export async function api<T = unknown>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> {
  const { skipAuth, headers: customHeaders, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((customHeaders as Record<string, string>) || {}),
  };

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let res = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  // If 401 and we have a refresh token, try refreshing
  if (res.status === 401 && !skipAuth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newToken = getAccessToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
      }
      res = await fetch(`${API_BASE}${endpoint}`, {
        ...fetchOptions,
        headers,
      });
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(res.status, errorData.message || 'Request failed', errorData);
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Auth API ────────────────────────────────────────────────

export const authApi = {
  requestOtp: (phone: string) =>
    api<{ message: string; expiresAt: string; code?: string }>(
      '/auth/request-otp',
      {
        method: 'POST',
        body: JSON.stringify({ phone }),
        skipAuth: true,
      },
    ),

  verifyOtp: (phone: string, code: string) =>
    api<{
      accessToken: string;
      refreshToken: string;
      isNewUser: boolean;
      user: UserProfile;
    }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
      skipAuth: true,
    }),

  getMe: () => api<UserProfile>('/auth/me'),

  logout: (refreshToken: string) =>
    api('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
};

export interface UserProfile {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: string;
  ratingAverage?: number;
  ratingCount?: number;
  createdAt?: string;
  providerProfile?: {
    bio: string | null;
    serviceTypes: string[];
    totalJobs: number;
    isVerified: boolean;
    isAvailable: boolean;
  } | null;
}

