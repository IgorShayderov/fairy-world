import type { IApi, PromiseChainNode, RequestConfig } from '@shared/types/api';

import { notifySessionChanged } from '@/modules/Auth/utils/session-events';
import routes from '@/routes';
import { refresh } from '@modules/Auth/api';

import { getApiErrorMessage } from './error-message';
import { HttpError } from './HttpError';
import { InterceptorManager } from './InterceptorManager';

const dispatchRequest = async (config: RequestConfig) => {
  const DEFAULT_TIMEOUT = 4000;
  const controller = new AbortController();
  const callerSignal = config.options.signal;
  const abort = () => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) abort();
  else callerSignal?.addEventListener('abort', abort, { once: true });
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  const finalOptions: RequestInit = {
    ...config.options,
    signal: controller.signal,
  };

  try {
    const response = await fetch(config.url, finalOptions);

    if (!response.ok) {
      let message = `Response status: ${response.status}`;
      try {
        const payload = (await response.json()) as unknown;
        message = getApiErrorMessage(payload) ?? message;
      } catch {
        // Some endpoints return an empty or non-JSON error body.
      }
      const error = new HttpError(message, response.status);
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
    callerSignal?.removeEventListener('abort', abort);
  }
};

const makeRequest = <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const headers = new Headers({ Accept: 'application/json', 'Content-Type': 'application/json;charset=UTF-8' });
  new Headers(options.headers).forEach((value, key) => headers.set(key, value));
  const config: RequestConfig = {
    url,
    options: {
      method: 'GET',
      credentials: 'include',
      ...options,
      headers,
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

api.put = <T>(url: string, params?: object, options?: RequestInit) => {
  return makeRequest<T>(url, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(params ?? {}),
  });
};

api.delete = <T>(url: string, options?: RequestInit) => {
  return makeRequest<T>(url, { ...options, method: 'DELETE' });
};

api.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('access_token');

  if (accessToken) {
    const headers = new Headers(config.options.headers);
    headers.set('Authorization', `Bearer ${accessToken}`);
    config.options.headers = headers;
  }

  return config;
});

let refreshPromise: Promise<unknown> | null = null;

const refreshSession = (tokenAtFailure: string | null) => {
  const rotate = () => {
    const token = localStorage.getItem('access_token');
    if (token && token !== tokenAtFailure) return Promise.resolve();
    return refresh();
  };
  // Serialize cookie rotation across tabs as well as requests in this tab.
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request('fairy-world:refresh', rotate);
  }
  return rotate();
};

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const err = error instanceof Error ? error : new Error(String(error));
    const httpError = err as Error & { config?: RequestConfig & { _retry?: boolean } };
    const config = httpError.config;
    const options = (config?.options || {}) as RequestInit & { _retry?: boolean };

    const EXCLUDED_ROUTES = [
      routes.api.auth.refreshPath(),
      routes.api.auth.logoutPath(),
      routes.api.auth.signInPath(),
      routes.api.auth.signUpPath(),
    ];
    const isExcluded = config?.url ? EXCLUDED_ROUTES.some((route) => config.url.includes(route)) : false;

    if (error instanceof HttpError && error.status === 401 && config && !options._retry && !isExcluded) {
      const currentToken = localStorage.getItem('access_token');
      const sentToken = new Headers(options.headers).get('Authorization');
      // A slower response may arrive after another request already refreshed.
      if (currentToken && sentToken !== `Bearer ${currentToken}`) {
        return makeRequest(config.url, { ...options, _retry: true } as RequestInit);
      }
      if (!refreshPromise) {
        refreshPromise = refreshSession(currentToken).catch((refreshError: unknown) => {
          // Network/server failures are not proof that the session is invalid.
          if (refreshError instanceof HttpError && refreshError.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('access_token_expires_at');
            notifySessionChanged();
            if (window.location.pathname !== routes.loginPath()) window.location.href = routes.loginPath();
          }
          throw refreshError;
        }).finally(() => { refreshPromise = null; });
      }
      await refreshPromise;
      // A failed retry is an endpoint error, not a failed refresh/logout.
      return makeRequest(config.url, { ...options, _retry: true } as RequestInit);
    }

    return Promise.reject(err);
  }
);

export { api };
