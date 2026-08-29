# NestJS + Vue Auth Workflow

## Purpose:
Guides implementation of authentication features (login, register, logout) in projects using **NestJS backend** with **Vue (Quasar) frontend** and **Prisma ORM**.

## Trigger Conditions:
Use when implementing user authentication flows, especially when:

- Adding new models to Prisma schema (e.g., `User`, `Gender`, `Token`)
- Writing DTOs with validation (`class-validator`, Swagger annotations)
- Creating NestJS controllers/services for auth endpoints (`/auth/register`, `/auth/login`)
- Building Vue pages for registration/login using Quasar components
- Setting up JWT-based session handling and cookie management
- Integrating translations (i18n) into forms and error messages
- Writing unit/integration tests for auth functionality

## Steps:

1. **Update Prisma Schema**
   - Define `User` model with required fields (`email`, `password`, `name`) and optional ones (`country`, `city`, etc.)
   - Add enums where needed (e.g., `Gender`)
   - Generate migration manually if CLI fails: place `.sql` under `migrations/<timestamp>/`

2. **Regenerate Prisma Client**
   - Run `npx prisma generate`
   - If it fails due to generator issue, ensure `provider = "prisma-client-js"`
   - Set `DATABASE_URL` environment variable (even dummy URL works for generation)

3. **Create DTOs with Validation**
   - Use `class-validator` decorators (`@IsEmail`, `@MinLength`, etc.)
   - Add Swagger metadata via `@ApiProperty`
   - Separate DTOs per operation (e.g., `RegisterDto`, `LoginDto`)

4. **Implement AuthService**
   - Hash passwords using `bcrypt`
   - Sign JWTs using `@nestjs/jwt`
   - Handle duplicate email conflicts with `ConflictException`

5. **Wire Up AuthController**
   - Expose `/register`, `/login`, `/logout` endpoints
   - Apply Swagger decorators (`@ApiTags`, `@ApiBody`, `@ApiOkResponse`)
   - Use guards (`AuthGuard`) for protected routes

6. **Update Frontend Routes**
   - Register new route (e.g., `/register`) in `routes.ts`
   - Link to backend API path (e.g., `/api/v1/auth/register`)

7. **Build Vue Page Component**
   - Use Quasar UI components (`QInput`, `QBtn`, `QSelect`)
   - Bind to reactive form object
   - Validate inputs client-side with rule functions
   - Call API through shared `api` helper

8. **Add i18n Keys**
   - Extend `locales/en/modules/index.ts` and `locales/ru/modules/index.ts`
   - Include field labels, button texts, validation errors, optional section headers

9. **Write Tests**
   - Unit test service logic with mocked dependencies
   - Test conflict cases (e.g., duplicated email)
   - Optionally write e2e specs for full flow

## Pitfalls:

- ❌ **Prisma Generator Issue**: Using `"provider": "prisma-client"` instead of `"prisma-client-js"` causes `prisma generate` to fail silently. Always verify generator config.
- ❌ **Missing DATABASE_URL**: Without `.env` or env var, even generation might fail. Create placeholder `.env`.
- ❌ **Container Permissions**: Never use `sudo` inside containers. Prefer editing files directly or using tools like `@patch`.
- ❌ **Hardcoded Labels**: Avoid hardcoding text in templates — use `$t()` or i18n wrappers consistently.
- ❌ **DTO Mismatch**: Ensure frontend payload structure matches backend DTO exactly to avoid silent failures.

## References:

- [`references/prisma-schema-example.md`](./references/prisma-schema-example.md) — Example Prisma schema snippets for extending `User`
- [`templates/register.dto.ts`](./templates/register.dto.ts) — Starter `RegisterDto` with validation
- [`scripts/regenerate-prisma.sh`](./scripts/regenerate-prisma.sh) — Helper script to safely regenerate Prisma client
