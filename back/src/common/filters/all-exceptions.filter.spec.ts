import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('Public exception responses', () => {
  const originalEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });
  function render(error: Error) {
    const json = jest.fn<void, [{ message: unknown; stack?: string }]>();
    const response = { status: jest.fn().mockReturnValue({ json }) };
    const host = { switchToHttp: () => ({ getResponse: () => response }) } as unknown as ArgumentsHost;
    new AllExceptionsFilter().catch(error, host);
    return json.mock.calls[0][0];
  }
  it('does not disclose internal errors in production', () => {
    process.env.NODE_ENV = 'production';
    expect(render(new Error('SQL and internal file paths'))).toMatchObject({
      message: 'Internal Server Error',
      stack: undefined,
    });
  });
  it('keeps validation messages useful', () => {
    process.env.NODE_ENV = 'production';
    expect(render(new BadRequestException('Invalid selection')).message).toMatchObject({
      message: 'Invalid selection',
    });
  });
});
