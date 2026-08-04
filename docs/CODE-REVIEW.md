# Code review — `crispy-octo-doodle`

**Date:** 2026-08-04
**Reviewer note:** static reading only. **No code was executed, built, or type-checked**, and no finding was reproduced against a running instance. Treat every claim as "this is what the source says" rather than "this is confirmed broken".

## What was actually read

Being precise about this, because the tree is large and a review that implies full coverage when it had partial coverage is worse than no review.

**Read in full:** `README.md`, `package.json`, `.gitignore`, `src/lib/auth.ts`, `src/lib/admin-auth.ts`, `src/lib/phone.ts`, `src/app/api/codes/route.ts`, `src/app/api/feedback/route.ts`, `src/app/api/seed/route.ts`, `src/app/api/test-session/route.ts`, `src/app/api/test-create-exam/route.ts`, `src/components/ai/CourseFeedbackForm.tsx`.

**Listed but not read:** the other 47 files in `src/lib/`, the other 23 route groups under `src/app/api/`, `prisma/schema.prisma`, `scripts/`, `agents/`, and the entire component and page tree.

**Not read at all:** every client component except the feedback form, all styling, `.agents/`, `.claude/`, `.impeccable/`.

So this covers roughly the authentication core and a sample of the API surface. It is not a full review of `src/`, and the absence of a finding about a file means nobody looked at it.

There is also an existing `CODE-UP-EXECUTIVE-REVIEW.md` (23 KB) in the repo root that I did not read, so this may duplicate or contradict it.

---

## 1. The documented project and the actual project have diverged

`README.md` describes a focused Egyptian EdTech platform: Next.js, Prisma/SQLite, JWT auth, Bunny CDN video, an AI study assistant, three roles.

What's actually in the tree is considerably larger. `src/lib/` alone holds 53 modules, including `payments.ts`, `payment-methods.ts` (17 KB), `twilio.ts`, `whatsapp.ts`, `recaptcha.ts`, `iq-system.ts`, `leaderboard-refresh.ts`, `quota-manager.ts`, `overload-protection.ts`, `distributed-lock.ts`, `bulk-deletion.ts`, `referral.ts`, `sha7nawy.ts`, `vdocipher.ts`, `youtube.ts`, `plan-grading.ts`. `package.json` confirms it: `twilio`, `@aws-sdk/client-sns`, `firebase`, `@anthropic-ai/sdk`, `node-cron`, `pg`.

So there is payment processing, SMS/WhatsApp delivery, referral and commission logic, distributed locking and quota management. **A new contributor reading the README would have no idea payments exist.** Given payments and phone verification are the highest-risk parts of the system, that gap matters more than typical documentation drift.

There are also **five roles** in the code (`student`, `teacher`, `staff`, `admin`, `superadmin` — plus an `isOwner` flag), against three in the README.

**Recommended:** rewrite the README's architecture section from the actual tree. Cheapest high-value change in this list.

## 2. Dependency risk

### 2.1 Prisma major-version split — likely to break at runtime

```json
"@prisma/client":         "^6.19.3",
"prisma":                 "^6.19.3",
"@prisma/adapter-libsql": "^7.8.0",
"@prisma/adapter-pg":     "^7.8.0"
```

The adapters are a **full major version ahead** of the client. Prisma's driver-adapter interface changed between 6 and 7; adapters are not contracted to work across a major boundary. This may be silently working, may be working only on the SQLite path, or may fail on the Postgres path specifically. Either way it is not a supported combination.

**Recommended:** pin all four to the same major. Verify against whichever database production actually uses — note both a libsql and a pg adapter are installed, so that may not be obvious.

### 2.2 Two auth systems installed

`next-auth@5.0.0-beta.31` is a dependency, but authentication is hand-rolled in `src/lib/auth.ts` with `jose`. Either NextAuth is unused (remove it — it is a beta on the critical path of your dependency tree) or it is partially wired in, which is worse: two systems that both believe they own the session.

Also present: `ts-morph` (an AST manipulation library) as a **production** dependency, which alongside the deleted `fix-ast.js` suggests a codemod tool that was never moved to devDependencies.

### 2.3 Bleeding-edge stack

Next 16, React 19.2.4, Tailwind 4. Defensible for a solo project, but combined with zero tests it means a framework upgrade has no safety net.

## 3. The API layer

### 3.1 Every handler re-implements the same preamble

25 route groups, each opening with `try {`, `getSession()`, a 401 check, role checks, and closing with a `catch` that logs and returns a generic 500.

The cost isn't verbosity, it's drift. `/api/test-session` had no auth check at all, and nothing structural made that stand out — it looked like every other route. When the guard is copy-pasted 25 times, a missing guard is invisible.

(Addressed for one route in the `refactor/api-shared-helpers` PR.)

### 3.2 Handlers mix concerns

`src/app/api/codes/route.ts` is 11.5 KB in a single `POST`. It handles three unrelated redemption flows — course access codes, plan access codes, teacher promo codes — with the type determined by falling through three sequential database lookups.

Credit where due: this route is **better** than its size suggests. It uses `prisma.$transaction`, guards against races with `updateMany({ where: { studentId: null, isActive: true } })` and checks `count === 0`, and returns a generic 500 rather than leaking `error.message`. Someone thought about concurrency here.

But it should be three functions behind one thin router, and the fall-through means a course-code lookup happens on every promo-code attempt.

### 3.3 Rate limiting is applied inconsistently — worth checking

In `codes/route.ts`, `AccessCodeGuard.verifyRateLimit` is called once up front, and `AccessCodeGuard.logAttempt` records the outcome. But `logAttempt` is only called on the **course access code** path. The plan-access-code path and the teacher-promo path have no `logAttempt` calls at all.

If `verifyRateLimit` counts recorded attempts (its name and the `logAttempt(success: false)` pairing suggest it does), then **failed guesses against plan codes and promo codes are never counted, so the lockout never triggers for them.** Course codes are protected; the other two look brute-forceable.

I could not confirm this — `src/services/security/AccessCodeGuard.ts` was not read. **This is the single item on this list I would verify first**, because if it holds, paid plan codes can be guessed at unlimited rate.

### 3.4 Unvalidated input reaching Prisma

`feedback/route.ts` was representative: `courseId`, `type`, `content` and `rating` went from `req.json()` into `prisma.studentFeedback.create()` behind a truthiness check. No type checks, no length bound on `content`, no range check on `rating`, and `type` is a plain `TEXT` column so any string was storable.

Given the same shape appears in `codes/route.ts` (`String(code)` with no length cap), this is likely systemic. `String(x)` on an object yields `"[object Object]"` and on an array yields a comma-joined string — both reach the database as plausible-looking values.

### 3.5 Debug routes shipped in the tree

`/api/test-session`, `/api/test-create-exam`, `/api/seed` are all real, routable endpoints. Two are gated by `NODE_ENV` alone; one had no gate. Details in `docs/SECURITY-AUDIT.md`.

## 4. No tests, and testability is the reason

Before the `test/vitest-suite` PR there was no test framework, no `test` script, and no test files — for a platform handling payments, access codes and student grades.

The structural cause is that logic lives inside route handlers that call `cookies()` from `next/headers` and touch Prisma directly, so testing a rule means booting Next and a database. The pure, high-consequence logic that *is* easily testable — `phone.ts`, `plan-grading.ts`, `iq-system.ts`, the validators — is where to start, and extracting business rules out of handlers is what makes the rest reachable.

`scripts/run-verification-tests.ts` behind `test:verification` suggests a hand-rolled harness already exists. Worth deciding whether it is superseded.

## 5. Documentation sprawl

Fourteen markdown/text files in the repo root, several overlapping in purpose:

`README.md`, `ARCHITECTURE.md` (39.5 KB), `CODE-UP-EXECUTIVE-REVIEW.md` (23.9 KB), `DESIGN.md`, `IMPLEMENTATION_SUMMARY.md`, `GETTING_STARTED.md`, `mistakes.md`, `ISSUES_FIXED.md`, `WHAT_WAS_WRONG.md`, `PRODUCT.md`, `DEPLOYMENT_READY.md`, `DNS_TEST_RESULTS.md`, `DEPLOYMENT_STATUS.txt`.

`mistakes.md`, `ISSUES_FIXED.md` and `WHAT_WAS_WRONG.md` are three files for one job. `DEPLOYMENT_READY.md` and `DEPLOYMENT_STATUS.txt` are point-in-time snapshots that are now permanently wrong. When docs contradict each other, readers learn to trust none of them.

**Recommended:** keep `README.md`, `ARCHITECTURE.md`, `GETTING_STARTED.md`, `PRODUCT.md`, `DESIGN.md`. Move the rest into `docs/history/` or delete — git already remembers what was broken.

## 6. Smaller items

- **PII in logs.** `normalizeEgyptPhone` unconditionally `console.log`s every phone number passed to it, twice (raw string plus per-character codes), on a signup/verification hot path. Clearly leftover debugging — there's a `try/catch` around the log itself.
- **Silent audit-log failures.** `logAdminAction` swallows its own errors, so a privileged action can succeed with no record.
- **`normalizeEgyptPhone` over-accepts.** Any 12-digit number starting with `2` is treated as Egyptian, and a final fallback extracts `01[0-9]{9}` from anywhere in the string, so malformed input silently resolves to a valid-looking number.
- **Project name.** `package.json` still says `"name": "thefake"`.
- **`console.error` as the logging strategy.** Fine at this scale, but with no correlation ids a user-reported error can't be tied to a log line. (The `withRoute` wrapper in the refactor PR adds request ids.)

---

## Suggested order

Ordered by consequence-per-effort, not by section:

| # | Action | Why first |
|---|---|---|
| 1 | Purge `dev.db` from git history; rotate affected credentials | Live password hashes in a public repo |
| 2 | Verify whether plan/promo code brute force is rate-limited (3.3) | Cheap to check; paid-content bypass if not |
| 3 | Fix the Prisma 6/7 adapter split (2.1) | Unsupported combination on the data layer |
| 4 | Delete the `console.log` in `phone.ts` (6) | One line, removes a PII leak |
| 5 | Rewrite README to match reality (1) | Unblocks everything else, including review help |
| 6 | Roll out `withRoute` + validation across remaining routes (3.1, 3.4) | Makes missing guards visible |
| 7 | Decide on `next-auth` — wire it up or remove it (2.2) | Two session owners is worse than one |
| 8 | Extract business rules from handlers so they're testable (4) | Precondition for meaningful coverage |
| 9 | Consolidate root docs (5) | Low risk, low urgency |

## What I would review next

In priority order, none of it examined yet: `src/services/security/AccessCodeGuard.ts` (for item 3.3), `src/app/api/payments/*` (webhook signature verification, amount tampering, replay), `src/app/api/cron/*` (whether cron endpoints are publicly triggerable), `src/lib/authorization.ts` and `src/lib/rbac.ts` (whether role checks are consistent across all 25 route groups), and `prisma/schema.prisma` (cascade rules and soft-delete integrity).
