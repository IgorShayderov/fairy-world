# Repository review — 2026-11-01

Scope: targeted source review of authentication, HTTP/WebSocket requests, page loading, polling, and cleanup; unit/type/lint/build checks; isolated Chrome regression tests; npm production dependency audits. This is not a penetration test, exhaustive endpoint authorization audit, or production load test. No player data was removed or database schema changed.

## Fixed

### Authentication and request security

- Game API guards previously accepted refresh JWTs as access tokens. Both guards now enforce token purpose, a positive integer subject, and HS256. Legacy access tokens without a purpose are rejected.
- Removed the known `access-secret` fallback. Startup now requires `JWT_SECRET`.
- Refresh tokens now have a random identifier and a SHA-256 digest of the complete token. Raw JWTs were previously bcrypt-hashed, which truncates input at 72 bytes. Legacy refresh hashes deliberately require a new login.
- Refresh rotation uses a conditional database update so one refresh token cannot be consumed twice. Logout validates the refresh JWT and revokes only that exact session, using the indexed user ID; clearing the cookie alone previously left the session valid.
- Refresh duration remains milliseconds in `REFRESH_COOKIE_LIFETIME`; its missing-value default is now seven days. Access lifetime remains seconds, default 900. Configured values are preserved and validated.
- Login, registration, and password-reset endpoints now have bounded per-IP, per-process attempt limits: 20, 10, and 5 forgot-password requests respectively per 15 minutes; reset submissions allow 20. Responses include `Retry-After`. Unknown-user logins also perform a password comparison.
- Removed the unused WebSocket `send_message` handler that trusted a caller-supplied author and broadcast unpersisted messages. Socket connections now require a valid game access token. Sending messages remains through the authenticated HTTP endpoint. Chat text is limited to 2,000 characters.
- Production 500 responses no longer expose internal exception messages. Removed password-reset token prefixes and email addresses from controller logs.
- HTTP refreshes are shared within a tab and serialized across tabs where Web Locks are available. Late 401 responses reuse an already-refreshed access token. A retried endpoint failure or temporary refresh outage no longer logs the player out. Caller cancellation and custom `Headers` are preserved.
- A late `/me` response cannot repopulate a reset user store. Socket reconnects obtain the latest token and session changes disconnect/reconnect the client as appropriate.
- Project npm configuration now uses HTTPS. The inherited HTTP npm registry rejected the initial audit with HTTP 426; audits succeeded with HTTPS. No global npm configuration or dependency versions were changed.

### Page/request performance

The battle renderer and Three.js were eagerly bundled with the map route. Both encounter components now load the renderer only when displayed.

| Production chunk | Before | After |
| --- | ---: | ---: |
| Game page, minified | 749.73 KB | 108.19 KB |
| Game page, gzip | 198.65 KB | 31.74 KB |
| Deferred battlefield, minified | included above | 642.45 KB |

This reduces the game-page chunk by about 86%; it does not reduce total application size by 86%. Shared chunks are additional. First combat still downloads the renderer, and its >500 KB build warning remains. Chrome verifies no renderer request before tactical combat and successful canvas creation afterward. No production LCP/FPS claim is made.

Chat history now fetches the latest 200 messages in a stable database order and presents them chronologically, instead of returning the entire channel. Older messages remain in the database subject to the existing retention job; history pagination is a separate enhancement.

### Cleanup

Removed the empty router guard/commented-out implementation, obsolete refresh queue type/logic, unused unsafe socket handler/lifecycle logs, and tracked generated `front/test-results/.last-run.json`. Test reports are now ignored. Deleted tracked content remains recoverable from Git. Regression fixtures, asset attribution, models, migration history, and ignored local build caches were deliberately retained.

## Remaining priorities

1. **Dependency remediation before public deployment.** `npm audit --omit=dev --registry=https://registry.npmjs.org` reported backend: 55 affected package entries (2 critical, 14 high, 39 moderate); frontend: 7 (4 high, 1 moderate, 2 low). Counts include transitive/metavulnerabilities and do not establish runtime exploitability. Critical backend entries are `handlebars` and `proxy-addr`; also prioritize the HTTP/WebSocket stack (`body-parser`, `engine.io`, `multer`) and mailer chain. Examples: [Handlebars advisory](https://github.com/advisories/GHSA-8r5x-fm3f-whwj), [proxy-addr advisory](https://github.com/advisories/GHSA-jqcg-44mw-7w3h), [Engine.IO advisory](https://github.com/advisories/GHSA-2gc4-cqfq-p2gv). Frontend includes Vue server-renderer and Vite findings; this app builds as an SPA, so SSR/dev-server findings need deployment-specific triage. Do not expose Vite publicly. No blanket `npm audit fix --force` was run: some proposed fixes change major versions or downgrade the mailer. Update in tested groups and re-audit.
2. **Password-reset lifecycle.** `back/src/passwords/passwords.service.ts` still stores raw reset tokens and consumes them using a read followed by a separate update. Store only token digests, atomically consume a valid unexpired token, and revoke admin sessions when a password changes. Existing access JWTs remain usable until expiry; immediate revocation requires a session/version check.
3. **Distributed abuse protection.** New game limits and existing admin limits are process-local and reset on restart. Put shared limits on login/reset/chat/refresh and connection attempts at a trusted reverse proxy or shared store. Configure only the actual trusted proxy hops; otherwise all clients behind a proxy may share one rate bucket. Chat sockets authenticate at connection time, not continuously against session revocation.
4. **Clan leaderboard database amplification.** `ClansService.getLeaderboard()` loads every clan and serially starts an activity-sync transaction for each before returning 50 rows. This scales with total clans, takes advisory locks, and writes during GET requests. Move activity accounting into gameplay transactions or a bounded scheduled aggregation before caching the leaderboard. Simply removing synchronization would silently lose current freshness semantics, so this was not changed here.
5. **Polling and indexes.** Party dungeon state polls every two seconds in `FantasyMap.vue`; add in-flight deduplication/visibility handling or server events with reconnect recovery. Notification summaries already use a shared Vue Query key, 30-second interval, and user-scoped enablement; auction expiry is a separate bounded cron, not repeated by every summary request. Chat queries would benefit from a `(channelId, createdAt, id)` index; retention can use a separate `createdAt` index. Validate indexes with realistic data and query plans before rollout.
6. **Deployment hardening.** Enforce HTTPS, a strong JWT secret, correct `FRONT_URL`/CORS, CSP and other security headers at the app/proxy, and restrict production Swagger if not intended to be public. Game tokens are still in localStorage and therefore readable by injected JavaScript. Moving to a different session storage model needs CSRF/session design, not a cosmetic storage change.

## Rollout and verification

Deploy frontend and backend together. Existing players must sign in again because legacy tokens/hashes are rejected. No migration is needed. With no JWT secret the backend intentionally fails startup. Do not change the existing refresh-lifetime unit from milliseconds to seconds.

**Local configuration action required:** neither the inspected `back/.env` nor this execution shell defines `JWT_SECRET`. The old public fallback was therefore unsafe. Set a cryptographically random JWT secret through the backend's environment configuration before restarting it (see the root README environment setup). Private environment files were not modified. Builds and mocked auth tests pass, but an authenticated end-to-end run against the real backend was not performed.

Validation commands:

Results: 638 backend tests passed (11 existing tests skipped), 238 frontend tests passed, and all 4 selected headless Chrome regressions passed. Backend/frontend type checks, frontend lint, targeted backend lint, and both production builds passed. The deferred battlefield still produces the expected large-chunk warning.

```sh
cd back
npm test -- --runInBand
npx tsc --noEmit
npm run build
npx eslint src/auth src/chat src/passwords/passwords.controller.ts src/common/filters

cd ../front
npm test
npx vue-tsc --noEmit
npm run lint
npm run build
# With the isolated test/dungeon-preview.vite.config.ts server on port 5193:
PLAYWRIGHT_CHANNEL=chrome npx playwright test tests/battle-lazy-load.spec.ts tests/battle-status-layout.spec.ts --workers=1
```

The production bundle comparison is measured locally; real-user page timing, database throughput, account flows against a production database, and deployment configuration were not benchmarked or changed.
