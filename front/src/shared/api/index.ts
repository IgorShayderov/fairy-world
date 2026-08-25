import HttpError from './HttpError';

export interface ApiResponse<T> {
  data: T;
  meta: object;
}

export interface IApi {
  <T>(url: string, options?: RequestInit): Promise<ApiResponse<T>>;
  get: <T>(url: string, options?: RequestInit) => Promise<ApiResponse<T>>;
  post: <T>(url: string, params?: object, options?: RequestInit) => Promise<ApiResponse<T>>;
}

export interface IApiError extends Error {
  status: number;
}

const makeRequest = async <T>(url: string, options: RequestInit = {}) => {
  const DEFAULT_TIMEOUT = 4000;
  const controller = new AbortController();

  const defaultOptions: RequestInit = {
    method: 'GET',
    signal: controller.signal,
  };
  const defaultHeaders: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json;charset=UTF-8',
  };

  const accessToken = localStorage.getItem('access_token');

  if (accessToken) {
    defaultHeaders['Authorization'] = `Bearer ${accessToken}`;
  }

  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  const response = await fetch(url, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = `Reponse status: ${response.status}`;

    throw new HttpError(message, response.status);
  }

  clearTimeout(timeoutId);

  // Если сервер вернул успешный статус без тела ответа
  if (response.status === 204 || response.status === 205) {
    return null as unknown as T;
  }

  const contentType = response.headers.get('content-type');

  if (contentType && contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  if (contentType && contentType.includes('text/')) {
    return (await response.text()) as unknown as T;
  }

  return (await response.blob()) as unknown as T;
};

const api: IApi = makeRequest;

makeRequest.get = <T>(url: string, options?: RequestInit) => {
  const getOptions = {
    ...options,
    method: 'GET',
  };

  return makeRequest<T>(url, getOptions);
};

makeRequest.post = <T>(url: string, params?: object, options?: RequestInit) => {
  const getOptions: RequestInit = {
    ...options,
    method: 'POST',
    body: JSON.stringify(params ?? {}),
  };

  return makeRequest<T>(url, getOptions);
};

export { api };
