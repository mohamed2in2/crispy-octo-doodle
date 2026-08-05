# Code-UP completion roadmap

All work in this roadmap stays on `feat/classic-landing` and PR #19. Each phase must preserve current authorization, payment, enrollment, video, progress, booking, and subscription behavior. A phase is complete only after Prisma generation (when relevant), TypeScript, production build, and tests pass; the repository lint baseline is tracked separately until the lint phase.

## Phase 0 — correctness baseline

- Fix reCAPTCHA initialization ordering.
- Synchronize secure-player callback refs in effects rather than during render.
- Synchronize the position-saver video ID ref in an effect.
- Use explicit browser navigation APIs in booking/payment redirects.
- Apply only mechanically safe lint fixes before feature work.

## Phase 1 — financial persistence

- Reconcile `docs/PAYMENT-CENTER-SPEC.md` with current payment APIs.
- Add additive Prisma models and migration for invoices, payments, payment events, receipts, refunds, and webhook events.
- Preserve provider identifiers, idempotency data, integer-money rules, and immutable event history.
- Replace `INVOICE_FIXTURES` with authorized Prisma queries and truthful empty states.
- Wire invoice, receipt, payment-history, pending-payment, and refund routes to persisted data.

## Phase 2 — subscriptions and codes

- Build a standalone redeem-code flow over the existing server API.
- Build a teacher-subscriptions page showing current, expired, and cancellable states from real data.
- Deep-rewrite payment methods without changing payment execution behavior.

## Phase 3 — student learning workspace

- Results with actionable feedback.
- Study analytics from real progress, quiz, and homework data.
- Manual/AI study planner with truthful provider-unavailable states.
- Wrong-answer review with explanations and source links where available.
- Flashcards with persisted ownership and authorization.
- Text-only teacher/student messages with server-side participant checks.
- Settings and expanded profile pages backed by existing account data or additive schema where required.

## Phase 4 — deep learning UI rewrites

- Course details: lesson-first structure, curriculum, enrollment and pricing truth, and teacher context.
- Lesson viewer: secure player, curriculum navigation, resume/progress, notes, and completion state.
- Library: flat Study Ledger layout using real owned/enrolled content.
- Payment methods: direct, accessible, flat Classic presentation.

## Phase 5 — administration

- Migrate Admin and Super Admin dashboards to the navy/teal Classic system.
- Preserve role checks, destructive-action confirmations, auditability, and operational data density.

## Phase 6 — lint debt

- Fix lint in controlled, reviewable batches by rule and subsystem.
- Do not hide findings with blanket disables or weaken lint configuration.
- Re-run TypeScript, build, and tests after each batch.

## Phase 7 — security audit

- Triage `docs/SECURITY-AUDIT.md` by exploitability and deployment impact.
- Remove or lock down seed/debug surfaces.
- Redact raw errors and PII logs.
- Add CSRF/idempotency protections where state-changing routes need them.
- Address token/session revocation and break-glass administration.
- Record credential-rotation and git-history work as deployment-owner actions; never commit secrets.

## Design constraints

Use `ClassicShell` or `PublicHeader` plus `SiteFooter`, existing Classic primitives, and `codeup-signature.css`. Do not introduce purple/violet, neon cyan, decorative gradients, gradient text, glow, or glassmorphism. Do not add fake data, placeholder metrics, unsafe join/payment links, or UI-only authorization.
