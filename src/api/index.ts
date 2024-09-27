import * as userAPI from './user';

const api = (url, options: Request = {}) => {
  const DEFAULT_TIMEOUT = 4000;
  const controller = new AbortController();

  const defaultOptions: Request = {
    method: 'GET',
    signal: controller.signal,
    headers: new Headers({
      Accept: 'application/json',
      'Content-Type': 'application/json;charset=UFC-8',
    }),
  };
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  return fetch(url, {
    // TODO сделать вложенный мерж или вручную append каждый хедер
    ...defaultOptions,
    ...options,
  });
};

export { api, userAPI };
