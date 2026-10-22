# Player feedback and admin inbox

Players use the header **Feedback** button to send an experience report, bug report, or suggestion, optionally rated 1–5. Messages contain 10–5,000 characters. A player can submit five messages per rolling 24 hours; request UUIDs make retries idempotent. **My feedback** shows only that player's submissions and admin replies. Text is displayed as plain text, never HTML.

## Admin access

Open `/admin` and sign in with the email/password of an existing user whose database `User.role` is `ADMIN`. A game login, even for an admin user, does **not** grant access to this panel. There is no public admin registration, role-update endpoint, default password, or automatic promotion in this feature.

To provision an administrator, an operator should verify the intended account and assign its `User.role` to `ADMIN` through trusted database administration. Do not run the development seed or share seed credentials to provision production administrators. No existing account's role or password is changed by the migration.

Admin sessions use independent cryptographically random bearer tokens (`adm_…`), not game JWTs or refresh cookies. Only SHA-256 token hashes are stored in `AdminSession`. Tokens expire after eight hours; every admin request checks both expiry and the user's current ADMIN role. Logout revokes the server session. Expired sessions are cleaned daily at 03:00 UTC. The browser stores its admin token separately in **sessionStorage**, scoped to the tab; admin requests omit cookies and never use game token refresh. Admin sign-in/sign-out does not change the game session.

Admin login is limited to 10 attempts per IP and per email per 15 minutes per server process. For multiple replicas, enforce an additional shared rate limit at the reverse proxy. Use HTTPS in production. The admin panel supports paginated filtering, reading submissions, replying, and closing/reopening feedback. Replies record the administrator and timestamp; players can read them in My feedback. Threads are capped at 100 replies.

## Deployment and verification

Apply the additive `20261018000000_feedback_admin` migration before deploying this backend:

```sh
npx prisma migrate deploy
npx prisma generate
npx jest src/feedback --runInBand
FEEDBACK_DB_TEST=1 npx jest src/feedback/feedback.database.spec.ts --runInBand
```

The opt-in integration test creates temporary, uniquely named users and feedback, then cleans up only those fixtures. It verifies real HTTP guards, ownership isolation, game/admin token rejection in both directions, idempotent replies, role revocation and logout. Frontend tests cover independent token storage and desktop/mobile feedback/admin workflows.
