import HttpError from './HttpError';

export interface IApi {
  (url: string, options?: RequestInit): Promise<Response>;
  get: (url: string, options?: RequestInit) => Promise<Response>;
}

export interface IApiError extends Error {
  status: number;
}

const makeRequest = async (url: string, options: RequestInit = {}) => {
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

  return response;
};

const api: IApi = makeRequest;

makeRequest.get = (...params: Parameters<typeof makeRequest>) => {
  const [url, options] = params;
  const getOptions = {
    ...options,
    method: 'GET',
  };

  return makeRequest(url, getOptions);
};

export { api };
