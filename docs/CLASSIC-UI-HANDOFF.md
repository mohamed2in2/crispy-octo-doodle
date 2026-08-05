# Code-UP Classic UI — canonical handoff

**Status:** Active design source for all work based on `feat/classic-landing`.

> The older root `DESIGN.md` describes a retired ink/sky/indigo direction. Do not use its indigo glow, gradients, glass surfaces, or animation language in the Classic UI. For migrated student pages, the implementation in `src/styles/classic-*.css` and this handoff are authoritative.

## North star

Code-UP should feel like a trustworthy Egyptian learning center translated into software: direct, solid, calm, Arabic-first, and easy to use on a phone. It must not look like a generated AI dashboard, a cyberpunk product, or a copy of another Arabic education platform.

A student should understand, in a few seconds:

1. Where they are.
2. What they can do now.
3. Whether content or payment access is available.
4. What will happen after the primary action.

## Existing visual language to preserve

- **Canvas:** near-black `--c-bg` with the existing subtle dot lattice and faint top tint.
- **Chrome:** deep navy sidebar, dark surface top bar, teal active edge and controls.
- **Brand:** deep-sea teal from `--c-blue*`; not azure, neon cyan, purple, violet, or ChatGPT green.
- **Surfaces:** flat fills, visible hairline borders, tonal hierarchy, minimal shadows.
- **Geometry:** 8–14px radii for controls and cards. Pills only for compact status, filters, balances, and the assistant action.
- **Type:** Cairo inherited from the application. Bold Arabic headings; readable body copy; western digits for money where the current classic layer uses them.
- **RTL:** logical CSS properties and natural Arabic reading order. Directional icons must follow inline direction.
- **Mobile:** signed-in sidebar becomes a persistent bottom navigation bar. Essential actions remain visible and targets are at least 44px.
- **Motion:** short feedback only. Respect reduced motion. Do not choreograph page entrances.

## Palette rules

Use the tokens in `src/styles/classic-tokens.css`; do not add page-local brand hex values when a token exists.

Banned in the Classic layer:

- Purple or violet.
- Neon cyan on black.
- `#10a37f`-family chatbot green.
- Decorative multicolor gradients, gradient text, glow effects, and glassmorphism.

Semantic colors keep one meaning:

- Teal: primary action, active navigation, links, focus, selected filter.
- Grass green: success, completed, positive money, safe go action.
- Amber: caution, upcoming or late state.
- Red: destructive action, validation error, failed state only.

Do not use color alone; pair it with a label or icon.

## Page composition

### Public pages

Use `PublicHeader`, a bounded content column, and `SiteFooter`. Do not add a second navbar. Preserve the landing-page rhythm and visual family:

- one clear filled primary action;
- secondary actions as quiet links or bordered controls;
- teacher and course cards with real data;
- scroll-snap rails when catalogue counts are sparse;
- truthful empty states instead of fake counts, fake prices, or placeholder cards.

### Signed-in pages

Use `ClassicShell`. Do not recreate its sidebar, top bar, wallet chip, notifications, theme control, segmented tabs, footer, or floating assistant inside a page.

Inside the shell:

- page title lives in the top bar;
- use `Card`, `Band`, `Badge`, `Section`, `Empty`, `Steps`, `Tile`, and `LinkButton` before creating variants;
- use one obvious primary action per section;
- show the next step before high-consequence actions such as payment, submission, exam generation, or joining a live session;
- avoid generic KPI-card dashboards on student-facing routes.

## My additions for M5–M13

These details should make the product feel intentional rather than merely reskinned:

### Courses and lessons

- Catalogue filters should use the existing solid teal filter panel or compact chips, with selected state obvious without relying on color alone.
- Course cards need thumbnail or neutral fallback, title, teacher, subject/stage, lecture count, and a truthful price/access state.
- Course detail should lead with title, teacher, access state, and one primary action; curriculum follows below.
- Lesson viewer prioritizes the lesson itself. Curriculum navigation is secondary and collapses cleanly on mobile.
- Progress should be textual and numeric; never a decorative ring with no actionable meaning.

### Account home

- Lead with the student's next useful action: continue a lesson, submit due homework, or join a scheduled session.
- Keep balance and notifications in shell chrome; do not duplicate them as large hero metrics.
- Empty account states must offer the route that fills them.

### Financial Center

- Preserve money and authorization behavior exactly.
- Use tabular western digits and explicit signs/status labels.
- Before payment, state amount, destination, and what happens next.
- Transactions and invoices can use compact lists/tables, but wide tables must scroll inside their own region on mobile.
- Do not use promotional styling for balances or warnings.

### Question Bank, exams, homework, and results

- Filters first, then one large commit action such as “generate exam.”
- During an exam or homework attempt, reduce chrome competition and keep progress, save state, and submit state visible.
- Submission must have an explicit confirmation step and a clear success receipt.
- Results emphasize score, correct/incorrect breakdown, and the next study action—not confetti or decorative charts.

### Community

- One teacher community has a recognizable teacher identity at the top.
- Text-first posts and replies. Reading order, author, timestamp, reply relationship, and moderation state must remain clear in RTL.
- Composer is simple; no empty formatting toolbar.

### Live Center

- Separate `live now`, `upcoming`, and `ended` with text labels and semantic badges.
- Join button exists only when joining can succeed.
- Show start time and teacher prominently; avoid fake urgency or countdown animation.

### AI Center

- The AI Center uses the same teal Classic UI. It does not receive a purple/cyan “AI mode.”
- Conversation is content-first: readable bubbles/panels, sources or context when available, and clear disabled/unavailable states.
- Never invent provider availability. If configuration is missing, explain it quietly and preserve the rest of the page.

## Component and accessibility checklist

Before considering a route complete:

- Uses existing Classic shell/header/footer correctly; no duplicate chrome.
- No banned colors, gradients, glow, or glass effects.
- One unmistakable primary action per task or section.
- Real loading, empty, unavailable, error, success, and disabled states.
- Visible keyboard focus and semantic labels.
- Normal text contrast meets WCAG AA.
- Touch targets are at least 44×44px.
- No page-level horizontal overflow at approximately 390px.
- Arabic RTL order is correct; money and technical tokens use explicit `dir` where needed.
- Authorization and payment controls are gated by the existing business rules, not by appearance alone.
- Reduced-motion behavior remains understandable.

## Handoff summary for the next agent

Continue from `feat/classic-landing`. Treat these as the design source of truth, in order:

1. `docs/CLASSIC-UI-HANDOFF.md`
2. `src/styles/classic-tokens.css`
3. `src/styles/classic-shell.css`
4. `src/styles/classic-components.css`
5. `src/styles/classic-landing.css`
6. Existing Classic React components under `src/components/classic/`

Implement functionality using existing schema, APIs, authentication, and business rules. Extend the Classic primitives only when a repeated requirement cannot be expressed with the current set. Keep new route-specific CSS additive and token-based. Do not restart the visual direction.