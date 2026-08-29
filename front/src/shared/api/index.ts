import { refresh } from '@modules/Auth/api';

import type { IApi, PromiseChainNode, RequestConfig, FailedRequest } from '@shared/types/api';

import routes from '@/routes';

import { HttpError } from './HttpError';
import { InterceptorManager } from './InterceptorManager';

const dispatchRequest = async (config: RequestConfig) => {
  const DEFAULT_TIMEOUT = 4000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  const finalOptions: RequestInit = {
    ...config.options,
    signal: controller.signal,
  };

  try {
    const response = await fetch(config.url, finalOptions);

    if (!response.ok) {
      const error = new HttpError(`Response status: ${response.status}`, response.status);
      error.config = config;
      throw error;
    }

    if (response.status === 204 || response.status === 205) {
      return null;
    }

    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    if (contentType && contentType.includes('text/')) {
      return await response.text();
    }

    return await response.blob();
  } finally {
    clearTimeout(timeoutId);
  }
};

const makeRequest = <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const config: RequestConfig = {
    url,
    options: {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json;charset=UTF-8',
        ...(options.headers ?? {}),
      },
      ...options,
    },
  };

  const chain: Array<PromiseChainNode> = [{ fulfilled: dispatchRequest, rejected: () => {} }];

  api.interceptors.request.forEach((interceptor) => {
    chain.unshift(interceptor as PromiseChainNode);
  });

  api.interceptors.response.forEach((interceptor) => {
    chain.push(interceptor as PromiseChainNode);
  });

  let promise = Promise.resolve(config);

  while (chain.length) {
    const { fulfilled, rejected } = chain.shift() as PromiseChainNode;
    promise = promise.then(fulfilled, rejected) as Promise<RequestConfig>;
  }

  return promise as Promise<T>;
};

const api = makeRequest as unknown as IApi;

api.interceptors = {
  request: new InterceptorManager<RequestConfig>(),
  response: new InterceptorManager<unknown>(),
};

api.get = <T>(url: string, options?: RequestInit) => {
  return makeRequest<T>(url, { ...options, method: 'GET' });
};

api.post = <T>(url: string, params?: object, options?: RequestInit) => {
  return makeRequest<T>(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(params ?? {}),
  });
};

api.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('access_token');

  if (accessToken) {
    config.options.headers = {
      ...config.options.headers,
      Authorization: `Bearer ${accessToken}`,
    };
  }

  return config;
});

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: Error | null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve();
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const err = error instanceof Error ? error : new Error(String(error));
    const httpError = err as Error & { config?: RequestConfig & { _retry?: boolean } };
    const config = httpError.config;
    const options = (config?.options || {}) as RequestInit & { _retry?: boolean };

    const EXCLUDED_ROUTES = [routes.api.auth.refreshPath(), routes.api.auth.logoutPath(), routes.api.auth.signInPath()];
    const isExcluded = config?.url ? EXCLUDED_ROUTES.some((route) => config.url.includes(route)) : false;

    if (error instanceof HttpError && error.status === 401 && config && !options._retry && !isExcluded) {
      // Если рефреш УЖЕ идет, ставим текущий запрос в очередь ожидания
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            // ВАЖНО: передаем options с флагом, чтобы запросы из очереди тоже не зациклились
            return makeRequest(config.url, { ...options, _retry: true });
          })
          .catch((queueError: unknown) => {
            // Оборачиваем ошибку очереди для линтера (Строка ~171)
            const queueErrInstance = queueError instanceof Error ? queueError : new Error(String(queueError));
            return Promise.reject(queueErrInstance);
          });
      }

      // Это первый упавший запрос. Помечаем его, чтобы не уйти в бесконечный цикл
      options._retry = true;
      isRefreshing = true;

      try {
        // ТУТ ВЫЗЫВАЕШЬ СВОЙ АПИ РЕФРЕША
        await refresh();
        processQueue(null);

        // Повторяем наш изначальный запрос
        return await makeRequest(config.url, config.options);
      } catch (refreshError: unknown) {
        // Если рефреш не удался (например, рефреш-токен тоже протух)
        const refreshErrInstance = refreshError instanceof Error ? refreshError : new Error(String(refreshError));

        processQueue(refreshErrInstance);

        localStorage.removeItem('access_token');
        if (window.location.pathname !== routes.loginPath()) {
          window.location.href = routes.loginPath();
        }

        return Promise.reject(refreshErrInstance);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export { api };
