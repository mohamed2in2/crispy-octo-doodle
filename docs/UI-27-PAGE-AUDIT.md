# Code-UP — 27-page UI audit

**Branch:** `feat/classic-landing`  
**Design direction:** Code-UP Study Ledger — navy/teal, square registration marks, visible rules, compact geometry, Arabic-first copy.

This list is the canonical student-facing UI scope. “Native” means the page is composed with Classic components. “Bridge” means business logic is preserved while the signature layer removes copied/retired styling. “Deep follow-up” means the page is safe and visually aligned, but its internal JSX should eventually be rewritten semantically.

| # | Route | Current UI | Audit result |
|---:|---|---|---|
| 1 | `/` | Native Classic | Header, catalogue rhythm, truthful data, signature wordmark |
| 2 | `/courses` | Native Classic | Public header, filters, real cards, signature scope |
| 3 | `/courses/[id]` | Classic bridge | Access/payment logic preserved; no copied gradients |
| 4 | `/courses/[id]/learn` | Classic bridge | Learning logic preserved; deep semantic follow-up |
| 5 | `/courses/[id]/watch/[videoId]` | Classic bridge | Secure player preserved; reduced decorative chrome |
| 6 | `/[teacherSlug]` | Signature bridge | Booking logic preserved; teacher hero is a deep follow-up |
| 7 | `/account` | Signature bridge | Scoped under signed-in Code-UP identity |
| 8 | `/account/home` | Native Classic | ClassicShell and real wallet/notification data |
| 9 | `/account/notifications` | Signature bridge | Legacy shell styling neutralized; deep follow-up |
| 10 | `/account/financial` | Classic financial bridge | Money behavior unchanged |
| 11 | `/account/financial/wallet` | Classic financial bridge | Tabular money and financial navigation preserved |
| 12 | `/account/financial/methods` | Classic financial bridge | Provider behavior preserved |
| 13 | `/account/financial/invoices` | Classic financial bridge | Mobile table containment preserved |
| 14 | `/account/financial/invoices/[id]` | Classic financial bridge | Invoice detail/authorization unchanged |
| 15 | `/account/financial/receipts` | Classic financial bridge | Receipt truthfulness preserved |
| 16 | `/account/financial/refunds` | Classic financial bridge | Refund state semantics preserved |
| 17 | `/library` | Signature bridge | Purple/gradient/glow dashboard styling removed; deep semantic follow-up |
| 18 | `/payment` | Signature bridge | Existing payment behavior retained; deep semantic follow-up |
| 19 | `/payment-methods` | Signature bridge | Fee calculator retained; promotional gradient/glow removed |
| 20 | `/quizzes` | Native Classic | Enrolled-course question bank |
| 21 | `/quizzes/[id]` | Classic/signature bridge | Secure attempt behavior retained; confirmation UX follow-up |
| 22 | `/homeworks` | Native Classic | Enrolled-course homework hub |
| 23 | `/homeworks/[id]` | Classic/signature bridge | Existing submission/review behavior retained |
| 24 | `/community` | Native Classic | Subscriber-only student-to-teacher Q&A |
| 25 | `/live` | Native Classic | Subscriber-gated sessions and validated live joins |
| 26 | `/ai-study` | Classic AI bridge | Provider behavior retained; purple/glow removed |
| 27 | `/plans` | Signature bridge | Plan catalogue aligned; plan detail/learn are deep follow-ups |

## What makes it ours

- A small skewed registration mark sits beside `Code-UP` in both public and signed-in chrome.
- The brand line is **ذاكر · طبّق · اتقدم**, not a generic “learn anywhere” claim.
- Section headings use a square worksheet marker instead of copied tab underlines.
- Important cards use a top-corner registration rule, echoing Egyptian exercise books.
- Decorative gradients, purple/fuchsia/indigo, blur glass, and glow shadows are removed inside audited scopes.
- Existing server authorization, payment, enrollment, exam, homework, and secure-player logic is not replaced by visual mock data.

## Remaining semantic work

Priority order for future commits:

1. Rewrite `/library` around “next study action” instead of KPI-dashboard cards.
2. Rewrite `/payment-methods` into a calm amount → method → confirmation flow.
3. Rewrite teacher profile, course learning room, quiz attempt, and homework detail with native Classic primitives.
4. Rewrite plan detail/learn pages and notifications.
5. Add browser-level mobile/keyboard regression tests when a browser runner is available.
