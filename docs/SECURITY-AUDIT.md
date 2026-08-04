# Security audit — authentication and API surface

**Date:** 2026-08-04
**Scope reviewed:** `src/lib/auth.ts`, `src/lib/admin-auth.ts`, `src/app/api/seed`, `src/app/api/test-session`, `src/app/api/test-create-exam`, `.gitignore`, repository history.
**Method:** static reading of source. **Nothing was executed and no finding below was confirmed against a running instance** — each one needs to be reproduced before it is treated as proven.

Severity uses the usual four bands. "Fixed here" means addressed in this PR; everything else is a recommendation.

---

## CRITICAL

### C-1. `/api/test-session` was unauthenticated and ungated — *fixed here*

`src/app/api/test-session/route.ts` had no session check and, unlike the other debug routes, **no `NODE_ENV` guard**. It was live in production for anyone who guessed the path. It returned:

- the **length of `JWT_SECRET`** — narrows an offline brute-force against the HS256 signing key
- `NODE_ENV`
- whether the caller presented an `auth_token` cookie, and that cookie's length
- the decoded payload of a token it signed server-side with `role: "superadmin"`

The route did not return the signed token string itself, so this is disclosure rather than direct privilege escalation — but a debug oracle for the signing key on a public endpoint is not defensible at any severity below critical.

**Fix applied:** route deleted.

### C-2. `dev.db` was committed with real password hashes

A 495 KB SQLite database was tracked at the repo root in a **public** repository, containing `User` rows with bcrypt hashes. It was listed in `.gitignore`, but the rule had no effect because the file was tracked before the rule was added.

**Fix applied:** deleted from the tree in the repo-cleanup PR, and `.gitignore` widened to `*.db` / `*.sqlite`.

**Still outstanding — this is not closed:**
1. The blob is still reachable from history. Removing it requires `git filter-repo --path dev.db --invert-paths` and a force-push; that cannot be done through the GitHub API.
2. Every credential in that snapshot must be treated as compromised. bcrypt slows offline cracking, it does not prevent it. Force a reset on any account whose password predates this.

---

## HIGH

### H-1. `Secure` cookie flag failed open in production — *fixed here*

Both `setAuthCookie` and `setPhoneVerificationCookie` computed:

```ts
const isSecure = process.env.NODE_ENV === "production" && process.env.SECURE_COOKIES === "true";
```

An unset, misspelled, or differently-cased `SECURE_COOKIES` silently produced a **non-Secure session cookie in production**, letting `auth_token` travel over plaintext HTTP where it can be captured.

The dangerous state was the *default*; safety depended on remembering an extra variable.

**Fix applied:** `shouldUseSecureCookies()` — on in production unless someone explicitly sets `SECURE_COOKIES="false"`. Insecure now requires a deliberate act, not an omission.

### H-2. Break-glass superadmin bypasses the database entirely

In `getJwtSession()`:

```ts
if (payload.id === "superadmin") {
  return { … role: payload.role, isOwner: true, profileCompleted: true … };
}
```

Any valid JWT whose `id` is the literal string `superadmin` yields a fully-trusted owner session with **no row lookup, no `isActive` check, no `isDeleted` check**. Consequences:

- The session **cannot be revoked.** Deactivating accounts does nothing; the only remedy is rotating `JWT_SECRET`, which logs out every user.
- The token stays valid for the whole `jwt_expiry_days` window (up to 365).
- Actions attribute to a non-existent user id, so `logAdminAction` rows cannot be joined back to a real account.

**Recommended:** give the break-glass account a real, flagged DB row so the normal `isActive` / `isDeleted` path applies; add a `jti` denylist or a `tokenVersion` column on `User` bumped on logout/lockout; cap break-glass token lifetime to minutes rather than days.

### H-3. Phone verification bypass is checked before the code is

In `verifyPhoneVerificationCookie`, `isPhoneVerificationBypassed()` returns `true` *before* `challenge.codeHash` is compared. If that helper can ever be true in production — it reads an env var — phone verification is fully defeated: any code value passes.

**Recommended:** hard-fail the bypass when `NODE_ENV === "production"`, ideally by throwing at startup rather than at call time.

### H-4. No CSRF defence on mutating routes

`auth_token` uses `sameSite: "lax"`, which blocks cross-site *`GET`-triggered* requests but permits top-level form navigations, and offers nothing against same-site subdomain attacks. No CSRF token or origin check was found on the mutating handlers under `src/app/api/`.

**Recommended:** verify `Origin`/`Sec-Fetch-Site` in middleware for every non-`GET` request under `/api/`, or adopt double-submit tokens. Consider `sameSite: "strict"` for the admin surface.

---

## MEDIUM

### M-1. Debug routes gated only by `NODE_ENV`

`/api/seed` and `/api/test-create-exam` are guarded solely by `process.env.NODE_ENV !== "development"`. That is one misconfigured build from being live, and `/api/seed` **creates a teacher plus 10 students with the hardcoded password `"123456"`**. If it ever ran against production data, those are ten valid credentialed accounts.

**Recommended:** move seeding to a CLI script under `scripts/` that is never routable, or require an admin session *and* a separate secret. Do not rely on `NODE_ENV` alone for anything that writes users.

### M-2. Raw error messages returned to clients

The pattern `catch (error: any) { return NextResponse.json({ error: error.message }) }` appears in the debug routes and likely more widely. Prisma errors leak table names, column names and constraint details.

**Recommended:** a shared error helper that logs the real error server-side and returns a generic message plus a correlation id. This is the natural companion to the API-refactor work.

### M-3. Action-password comparison leaks length

`timingSafeCompare` in `admin-auth.ts` returns `false` early when lengths differ. The constant-time comparison is therefore only constant-time *among equal-length inputs* — an attacker can still recover the length of `SUPERADMIN_ACTION_PASSWORD`, `ADMIN_ACTION_PASSWORD`, `SUPERADMIN_MASTER_PASSWORD`, `BULK_DELETE_PASSWORD` and `WALLET_PASSWORD`.

More structurally: five long-lived plaintext secrets in env, shared between everyone who can read the deploy config, with no rotation story and no per-user attribution.

**Recommended:** hash both sides to a fixed width before comparing (`sha256(input)` vs `sha256(secret)`), then `timingSafeEqual`. Longer term, replace shared action passwords with per-admin TOTP re-authentication.

### M-4. Audit-log writes fail silently

`logAdminAction` swallows its own database errors. A failing write leaves **no trace that a privileged action occurred**, and the action still succeeds. An attacker who can induce log-write failures gets untracked access.

**Recommended:** for high-severity actions, treat a failed audit write as a failed action; at minimum emit to an out-of-band sink (stderr/APM) so gaps are visible.

---

## Not yet reviewed

These carry real risk and were **not** examined. Absence from the list above means unexamined, not clean:

- `src/app/api/cron/*` — whether cron endpoints require a shared secret, or are publicly triggerable
- `src/app/api/payments/*` — webhook signature verification, amount tampering, replay
- `src/app/api/codes/*` — rate limiting and brute-force resistance on access-code redemption
- `src/lib/authorization.ts`, `src/lib/rbac.ts` — whether role checks are applied consistently across all 25 route groups
- `.env.example` (3.7 KB) — should be checked for values that are real rather than placeholder
- `prisma/schema.prisma` — cascade rules, uniqueness, soft-delete integrity
- The entire client surface under `src/app/` and `src/components/`

## Suggested order of work

1. Rewrite history to drop `dev.db` and the binaries; rotate every affected credential. **(C-2 — blocked on a local force-push)**
2. Merge this PR. **(C-1, H-1)**
3. Add token revocation and remove the DB-less superadmin path. **(H-2)**
4. Origin checks on all mutating `/api/` routes. **(H-4)**
5. Centralised error handling. **(M-2)**
6. Audit the unreviewed areas above, starting with payments and cron.
