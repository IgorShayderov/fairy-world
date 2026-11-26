import type { InterceptorManager } from '@shared/api/InterceptorManager';

interface ApiResponse<T> {
  data: T;
  meta: object;
}

export type PromiseChainNode = {
  fulfilled?: (config: RequestConfig) => Promise<unknown>;
  rejected?: (error: unknown) => unknown;
};

export type ApiRequestOptions = RequestInit & { timeoutMs?: number };

export interface RequestConfig {
  url: string;
  options: ApiRequestOptions;
}

export interface IApi {
  <T>(url: string, options?: ApiRequestOptions): Promise<ApiResponse<T>>;
  get: <T>(url: string, options?: ApiRequestOptions) => Promise<ApiResponse<T>>;
  post: <T>(url: string, params?: object, options?: ApiRequestOptions) => Promise<ApiResponse<T>>;
  put: <T>(url: string, params?: object, options?: ApiRequestOptions) => Promise<ApiResponse<T>>;
  delete: <T>(url: string, options?: ApiRequestOptions) => Promise<ApiResponse<T>>;
  interceptors: {
    request: InterceptorManager<RequestConfig>;
    response: InterceptorManager<unknown>;
  };
}
