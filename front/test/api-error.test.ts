import { describe, expect, it } from 'vitest';

import { getApiErrorMessage } from '../src/shared/api/error-message';

describe('API error messages', () => {
  it('extracts a nested Nest validation message instead of rendering object Object', () => {
    expect(
      getApiErrorMessage({
        statusCode: 400,
        message: { message: ['You have no Health and cannot attack'], error: 'Bad Request', statusCode: 400 },
      })
    ).toBe('You have no Health and cannot attack');
  });
});
