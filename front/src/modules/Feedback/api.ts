import { api } from '@shared/api';

export const feedbackBase = `${import.meta.env.VITE_BACK_URL}/api/v1`;
export type FeedbackStatus = 'OPEN' | 'REPLIED' | 'CLOSED';
export type FeedbackCategory = 'EXPERIENCE' | 'BUG' | 'IDEA';
export interface FeedbackEntry {
  id: string;
  category: FeedbackCategory;
  rating: number | null;
  message: string;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
  user?: { name: string };
  _count: { replies: number };
}
export interface FeedbackDetail extends FeedbackEntry {
  replies: Array<{ id: string; message: string; createdAt: string; admin: { name: string } }>;
}
export interface FeedbackPage {
  entries: FeedbackEntry[];
  total: number;
  page: number;
  pageSize: number;
}
export const feedbackApi = {
  async submit(input: { requestId: string; category: FeedbackCategory; rating?: number; message: string }) {
    return (await api.post<{ id: string }>(`${feedbackBase}/feedback`, input)).data;
  },
  async list(page = 1) {
    return (await api.get<FeedbackPage>(`${feedbackBase}/feedback?page=${page}`)).data;
  },
  async get(id: string) {
    return (await api.get<FeedbackDetail>(`${feedbackBase}/feedback/${encodeURIComponent(id)}`)).data;
  },
};
