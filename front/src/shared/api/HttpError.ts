import type { RequestConfig } from '@shared/types/api';

export class HttpError extends Error {
  status: number;
  config?: RequestConfig;

  constructor(message: string, status: number) {
    super(message);

    this.name = 'HttpError';
    this.status = status;

    Object.setPrototypeOf(this, HttpError.prototype);
  }
}
