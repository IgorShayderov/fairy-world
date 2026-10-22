import { ref } from 'vue';

import type {
  AdminChange,
  AdminInventoryEdit,
  AdminItem,
  AdminPageResult,
  AdminProfileEdit,
  AdminUserCreate,
  AdminUserDetail,
  AdminUserSummary,
} from './adminUsersTypes';
import type { FeedbackDetail, FeedbackPage, FeedbackStatus } from './api';

import type { GemAction, GemPrice } from '@/modules/GemPrices/api';
import { getApiErrorMessage } from '@/shared/api/error-message';

const TOKEN_KEY = 'fw_admin_token';
const BASE = `${import.meta.env.VITE_BACK_URL}/api/v1/admin`;
export const adminToken = ref(sessionStorage.getItem(TOKEN_KEY));
export interface AdminIdentity {
  id: number;
  name: string;
  email: string;
}
export function setAdminToken(token: string | null) {
  adminToken.value = token;
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

// Deliberately not the game's API client: no game token, cookies or refresh/logout interceptors.
async function request<T>(path: string, body?: object, authenticated = true): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${BASE}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(authenticated && adminToken.value ? { Authorization: `Bearer ${adminToken.value}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const payload: unknown = await response.json();
    if (!response.ok) {
      if (response.status === 401 && authenticated) setAdminToken(null);
      throw new Error(getApiErrorMessage(payload) ?? `Request failed (${response.status})`);
    }
    return (payload as { data: T }).data;
  } finally {
    clearTimeout(timeout);
  }
}
export const adminApi = {
  users: (q = '', page = 1) =>
    request<AdminPageResult<AdminUserSummary>>(`/users?q=${encodeURIComponent(q)}&page=${page}`),
  user: (id: number) => request<AdminUserDetail>(`/users/${id}`),
  createUser: (input: AdminUserCreate) => request<AdminUserDetail>('/users', input),
  updateUser: (id: number, input: AdminProfileEdit) => request<AdminUserDetail>(`/users/${id}`, input),
  items: (q = '', page = 1) =>
    request<AdminPageResult<AdminItem>>(`/users/items?q=${encodeURIComponent(q)}&page=${page}`),
  grantItem: (id: number, input: AdminChange & { itemId: number; quantity: number }) =>
    request<AdminUserDetail>(`/users/${id}/inventory/add`, input),
  updateInventory: (id: number, entryId: number, input: AdminInventoryEdit) =>
    request<AdminUserDetail>(`/users/${id}/inventory/${entryId}`, input),
  gemPrices: () => request<GemPrice[]>('/gem-prices'),
  saveGemPrice: (key: GemAction, cost: number) => request<GemPrice[]>('/gem-prices', { key, cost }),
  async login(email: string, password: string) {
    const result = await request<{ token: string; expiresAt: string; admin: AdminIdentity }>(
      '/auth/login',
      { email, password },
      false
    );
    setAdminToken(result.token);
    return result.admin;
  },
  me: () => request<AdminIdentity>('/auth/me'),
  async logout() {
    await request('/auth/logout', {});
    setAdminToken(null);
  },
  list: (page = 1, status?: FeedbackStatus) =>
    request<FeedbackPage>(`/feedback?page=${page}${status ? `&status=${status}` : ''}`),
  get: (id: string) => request<FeedbackDetail>(`/feedback/${encodeURIComponent(id)}`),
  reply: (id: string, requestId: string, message: string) =>
    request(`/feedback/${encodeURIComponent(id)}/replies`, { requestId, message }),
  status: (id: string, status: FeedbackStatus) => request(`/feedback/${encodeURIComponent(id)}/status`, { status }),
};
