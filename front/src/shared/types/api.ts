import type { InterceptorManager } from '@shared/api/InterceptorManager';

interface ApiResponse<T> {
  data: T;
  meta: object;
}

export type PromiseChainNode = {
  fulfilled?: (config: RequestConfig) => Promise<unknown>;
  rejected?: (error: unknown) => unknown;
};

export interface RequestConfig {
  url: string;
  options: RequestInit;
}

export interface IApi {
  <T>(url: string, options?: RequestInit): Promise<ApiResponse<T>>;
  get: <T>(url: string, options?: RequestInit) => Promise<ApiResponse<T>>;
  post: <T>(url: string, params?: object, options?: RequestInit) => Promise<ApiResponse<T>>;
  interceptors: {
    request: InterceptorManager<RequestConfig>;
    response: InterceptorManager<unknown>;
  };
}

export interface FailedRequest {
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}
