import * as userAPI from './user';

const api = (options: Request = {}) => {
  const DEFAULT_TIMEOUT = 4000;
  const controller = new AbortController();

  const defaultOptions: Request = {
    method: 'GET',
    signal: controller.signal,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json;charset=UFC-8',
    },
  };
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  return fetch({
    ...defaultOptions,
    ...options,
  });
};

export { api, userAPI };
