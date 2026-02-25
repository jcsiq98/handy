// ─── API Client ─────────────────────────────────────────────
// Centralised fetch wrapper with token management and refresh logic.

const API_BASE =
  typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api`
    : '/api';

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

// ─── Service Categories ──────────────────────────────────────

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

export const servicesApi = {
  getCategories: () =>
    api<ServiceCategory[]>('/services/categories', { skipAuth: true }),
};

// ─── Providers ───────────────────────────────────────────────

export interface ProviderSummary {
  id: string;
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  serviceTypes: string[];
  ratingAverage: number;
  ratingCount: number;
  totalJobs: number;
  isVerified: boolean;
  isAvailable: boolean;
  locationLat: number | null;
  locationLng: number | null;
  distance?: number;
}

export interface ProviderListResponse {
  data: ProviderSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface Review {
  id: string;
  score: number;
  comment: string | null;
  customerName: string;
  customerAvatar: string | null;
  createdAt: string;
}

export interface ProviderDetail extends ProviderSummary {
  serviceNames: Record<string, string>;
  memberSince: string;
  reviews: Review[];
}

export interface ReviewsResponse {
  data: Review[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const providersApi = {
  list: (params?: {
    category?: string;
    lat?: number;
    lng?: number;
    sort?: 'rating' | 'distance' | 'jobs';
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.lat !== undefined) searchParams.set('lat', String(params.lat));
    if (params?.lng !== undefined) searchParams.set('lng', String(params.lng));
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
    if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));
    const qs = searchParams.toString();
    return api<ProviderListResponse>(`/providers${qs ? `?${qs}` : ''}`, { skipAuth: true });
  },

  getDetail: (id: string) =>
    api<ProviderDetail>(`/providers/${id}`, { skipAuth: true }),

  getReviews: (id: string, page = 1, limit = 10) =>
    api<ReviewsResponse>(`/providers/${id}/reviews?page=${page}&limit=${limit}`, {
      skipAuth: true,
    }),
};

// ─── Bookings ────────────────────────────────────────────────

export type BookingStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PROVIDER_ARRIVING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'RATED'
  | 'CANCELLED'
  | 'REJECTED';

export interface BookingSummary {
  id: string;
  status: BookingStatus;
  description: string;
  address: string | null;
  locationLat: number | null;
  locationLng: number | null;
  scheduledAt: string | null;
  price: number | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
    slug: string;
    icon: string;
  } | null;
  provider: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    userId: string;
    ratingAverage?: number;
    ratingCount?: number;
    phone?: string;
  } | null;
  customer: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    ratingAverage?: number;
    ratingCount?: number;
    phone?: string;
  } | null;
}

export interface BookingListResponse {
  data: BookingSummary[];
  total: number;
  limit: number;
  offset: number;
}

export const bookingsApi = {
  create: (data: {
    providerId: string;
    categoryId: string;
    description: string;
    address?: string;
    lat?: number;
    lng?: number;
    scheduledAt?: string;
  }) =>
    api<BookingSummary>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: (params?: {
    status?: 'active' | 'completed' | 'cancelled';
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
    if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));
    const qs = searchParams.toString();
    return api<BookingListResponse>(`/bookings${qs ? `?${qs}` : ''}`);
  },

  getById: (id: string) => api<BookingSummary>(`/bookings/${id}`),

  cancel: (id: string, reason?: string) =>
    api<BookingSummary>(`/bookings/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
};

// ─── Messages / Chat ─────────────────────────────────────────

export type SenderType = 'CUSTOMER' | 'PROVIDER' | 'SYSTEM';
export type MessageChannel = 'APP' | 'WHATSAPP';

export interface ChatMessage {
  id: string;
  bookingId: string;
  senderId: string;
  senderType: SenderType;
  senderName: string | null;
  senderAvatar: string | null;
  content: string;
  channel: MessageChannel;
  readAt: string | null;
  createdAt: string;
}

export interface MessagesResponse {
  data: ChatMessage[];
  hasMore: boolean;
}

export const messagesApi = {
  send: (bookingId: string, content: string) =>
    api<ChatMessage>(`/bookings/${bookingId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  getHistory: (bookingId: string, params?: { limit?: number; before?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
    if (params?.before) searchParams.set('before', params.before);
    const qs = searchParams.toString();
    return api<MessagesResponse>(
      `/bookings/${bookingId}/messages${qs ? `?${qs}` : ''}`,
    );
  },

  getUnreadCount: () =>
    api<{ count: number }>('/messages/unread'),

  getBookingUnreadCount: (bookingId: string) =>
    api<{ count: number }>(`/bookings/${bookingId}/messages/unread`),
};

// ─── Ratings ──────────────────────────────────────────────────

export interface RatingResponse {
  id: string;
  bookingId: string;
  score: number;
  comment: string | null;
  fromUser: { id: string; name: string };
  toUser: { id: string; name: string };
  createdAt: string;
}

export interface MyRatingResponse {
  rated: boolean;
  rating: {
    id: string;
    score: number;
    comment: string | null;
    createdAt: string;
  } | null;
}

export const ratingsApi = {
  rate: (bookingId: string, data: { score: number; comment?: string }) =>
    api<RatingResponse>(`/bookings/${bookingId}/rate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMyRating: (bookingId: string) =>
    api<MyRatingResponse>(`/bookings/${bookingId}/my-rating`),
};

