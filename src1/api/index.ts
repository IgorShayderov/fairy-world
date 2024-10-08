import * as authAPI from './auth';

import HttpError from './HttpError';

export interface IApi {
  (url: string, options?: RequestInit): Promise<Response>;
  get: (url: string, options?: RequestInit) => Promise<Response>;
  // post: (url: string, options?: RequestInit) => Promise<Response>;
}

export interface IApiError extends Error {
  status: number;
}

const convertBody = (body: string | object, contentType: string | null) => {
  switch (contentType) {
    case 'application/json':
      return JSON.stringify(body);
    default:
      return body as string;
  }
};

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

  const accessToken = localStorage.getItem('access_token');

  if (accessToken) {
    headers.append('Authorization', accessToken);
  }

  options.headers?.forEach((value, key) => headers.append(key, value));

  const params = {
    ...defaultOptions,
    ...options,
    headers,
  };

  if (options.body != undefined) {
    const contentType = headers.get('Content-Type')?.split(';')?.at(0) ?? null;

    params.body = convertBody(options.body, contentType);
  }

  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  const response = await fetch(url, { ...params });

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

  return makeRequest(url, { ...getOptions });
};

export { api, authAPI };
