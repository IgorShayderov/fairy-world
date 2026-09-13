import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
  it('accepts a strong password without repeated characters', async () => {
    const dto = Object.assign(new RegisterDto(), { email: 'player@example.com', password: 'FairyWorld2026!Hero' });
    expect(await validate(dto)).toHaveLength(0);
  });
  it('rejects four consecutive repeated characters', async () => {
    const dto = Object.assign(new RegisterDto(), { email: 'player@example.com', password: 'FairyWorld2026!aaaa' });
    expect((await validate(dto)).some((error) => error.constraints?.matches)).toBe(true);
  });
});
