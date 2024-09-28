import * as userAPI from './user';

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

  const headers = new Headers();
  const defaultOptions: RequestInit = {
    method: 'GET',
    signal: controller.signal,
    headers,
  };

  headers.append('Accept', 'application/json');
  headers.append('Content-Type', 'application/json;charset=UFC-8');

  const accessToken = localStorage.getItem('access');

  if (accessToken) {
    headers.append('Authorization', accessToken);
  }

  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  const response = await fetch(url, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
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

export { api, userAPI };
