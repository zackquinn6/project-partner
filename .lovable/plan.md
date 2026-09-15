# Kickoff (Steps 1-4) UX Review & Improvements

A review of the Discover flow (Project Match → Personalize → Goals → Your plan) plus the concrete changes I'd make so it reads as one intentional system: **Pick → Discover → Plan → Build**.

## What works today

- Four steps with a persistent step strip, per-step "done" ticks, and saved progress.
- A two-stage journey header (Discover / Plan) that already hints at the bigger arc.
- A sticky action bar so "Continue" is always reachable on mobile.

## Main problems

1. **The bigger journey is hidden.** The header only shows Discover and Plan. The user never sees that picking a project came before and building comes after, so kickoff feels like a form, not a stage in a system.
2. **Two competing progress systems.** The journey pills and the 4-dot step strip sit in separate cards with separate visual languages, plus a "Step 2 of 4" counter, plus prev/next arrows, plus a scroll-the-steps arrow pair on tablet. That's four ways to express one idea.
3. **No sense of payoff.** Each step asks for input but never says what the answers change. "Goals" collects size, date, and budget with no live reflection of the effect.
4. **Escape hatches feel like errors.** "Skip to Planning Studio" is styled as a muted outline button that occupies 30% of the action bar on every step, and on step 1 a red "Not a match" button is the most visually aggressive element on screen.
5. **Green is doing too much.** The primary Continue button is hardcoded green, completion ticks are green, and the "Step Completed" panel is green — none of it comes from the theme, so it reads generic and breaks dark mode.
6. **Steps 1 and 3 are dense.** The overview step stacks many small outline badges; the goals step splits attention across several cards with no clear reading order.
7. **No arrival or completion moment.** Step 1 opens straight into detail, and finishing step 4 jumps to the Planning Studio with no confirmation of what was decided.

## Proposed changes

### A. One progress system
- Replace the journey pills + step strip + counter with a single kickoff header: project name, a 4-segment progress rail with short labels (Match · You · Goals · Plan), and one line of context.
- Show the full arc as faint context above it: **Pick · Discover · Plan · Build**, with Discover active. This is the "intentional system" cue.
- Drop the desktop scroll arrows (four steps always fit) and the "Step X of 4" counter; the rail carries both.

### B. Give each step a promise and a payoff
- Each step gets one short line at the top stating what it decides, e.g. "We'll use this to size the work and warn you about the hard parts."
- Add a compact, persistent "What we know so far" summary that grows as steps complete (fit rating → your level → target date & budget → tools chosen). It makes progressive loading visible.

### C. Calmer action bar
- Continue becomes the theme's primary button (no hardcoded green); completion states use a success token defined in the design system.
- Move "Skip to Planning Studio" and "Not a match" into a single quiet text link / overflow on the left of the bar, same treatment on desktop and mobile.
- On the final step the primary reads "Start planning" with the count of selected tools beneath it.

### D. Reduce density
- Step 1: lead with a single verdict card (good fit / stretch / not recommended) and the three drivers behind it; collapse the rest of the detail into expandable sections.
- Step 3: one card, vertical order — size, then target date, then budget — with an inline note on how the date shifts with size.
- Step 4: keep the recommended-set card, but preview what each selected tool adds to the plan.

### E. Handoff moment
- After step 4, a brief confirmation panel: the decisions made, the tools chosen, and a single button into the Planning Studio.

## Visual design spec

All of the below uses the app's existing token system (primary is the orange `14 100% 58%`, Inter body, Manrope headings, 0.75rem radius). No new hardcoded colors; anything new becomes a semantic token in `index.css` + `tailwind.config.ts`.

### Journey context strip (top of every kickoff step)
- One quiet, centered line: **Pick → Discover → Plan → Build**, with `·` separators.
- Style: `text-[11px] tracking-wide uppercase text-muted-foreground/70`; the active stage ("Discover") gets `text-primary font-semibold`; past stages get a small inline check; future stages stay muted. No pills, no borders — it's context, not navigation.
- Replaces the current bordered Discover/Plan pills (`PlanningJourneyHeader`).

### Kickoff header card (replaces journey pills + step strip card)
- A single slim card containing, in order:
  1. Project name (Manrope, `text-lg font-semibold`), one line, truncated.
  2. A 4-segment **progress rail**: four equal rounded bars (`h-1.5`, `rounded-full`), gap 2. Filled segment = `bg-primary`; current = `bg-primary/60` with a soft pulse on first render; upcoming = `bg-muted`. Below each segment its label in `text-[10px]`: Match · You · Goals · Plan (current label `text-primary`, done labels show a 10px check).
  3. One context line (`text-xs text-muted-foreground`): the step's promise, e.g. Goals — "Size it, date it, budget it. We'll shape the plan around this."
- Removes: the numbered dots, "Step X of 4" counter, prev/next icon buttons, and the tablet scroll arrows. Back/forward = tapping a completed segment; Continue = the bottom bar.
- Mobile: same card, labels stay (they're short); no collapse behavior needed.

### "What we know so far" summary
- A horizontally-scrolling chip row pinned under the header on steps 2-4.
- Chips: `rounded-full border bg-card px-2.5 py-1 text-[11px]`, icon + value (e.g. "Level: Comfortable", "Target: Jun 30", "Budget: $3k", "6 tools"). Values pull from state already in memory; empty steps show nothing.
- New chip animates in with a 150ms fade+rise (CSS transition, no library).

### Step content styling
- Each step opens with a Manrope headline (`text-xl`) + one-sentence promise line; content sits below in at most two cards per step.
- Step 1 verdict card: tinted surface by verdict — good fit = success tint, stretch = amber tint, not recommended = destructive tint — with a large verdict word (Manrope, `text-2xl`) and 3 short reason lines. Detail sections below in accordions.
- Step 3: single card, stacked sections with `Separator` between Size / Date / Budget; a `text-xs` note under the date updates with size ("At this size, plan on ~6 weekends").
- Step 4: recommended banner keeps its primary-tint surface but gains a one-line "Adds to your plan: Scope, Risk…" preview; tool cards keep the checkbox grid, selected state = `border-primary bg-primary/5` plus a 3px primary left accent bar instead of only the checkbox.

### Action bar (sticky bottom)
- Primary button: `bg-primary text-primary-foreground`, `h-12 sm:h-14`, full-width flex, Manrope `text-sm font-semibold`. Label is step-specific: "This fits — continue", "Looks right — continue", "Set — continue", "Start planning".
- Secondary/escape: one quiet `text-sm text-muted-foreground underline-offset-4 hover:underline` text link left of the button ("Not a match? Back to catalog" / "Skip ahead"). Same on mobile and desktop — kills the "More" dropdown.
- Completed state: the bar collapses to a slim `h-9` strip with a check + "Step complete — tap to edit" that re-enables the step, instead of the green panel.
- Final step: primary button with a subline inside the button (`text-[10px] opacity-80`): "6 planning tools selected".

### New tokens to add
- `--success` (green, theme-matched for light/dark) and `--success-foreground` for completion checks and the verdict card's good-fit state.
- `--warning-soft` for the "stretch" verdict.
- Replace all hardcoded `bg-green-600`, `bg-green-50`, `border-red-300`, `text-red-700`, `text-green-800` with these tokens (fixes dark mode).

### Completion handoff (after step 4)
- Short overlay panel, centered card (`max-w-md`): check icon in a success-tinted circle, "You're set to plan", 3-4 line recap (fit, level, target date/budget, tools), one primary button "Open Planning Studio". Subtle 200ms scale/fade entrance.

## Technical notes

- Changes are presentation-only in `src/components/KickoffWorkflow.tsx`, `src/components/PlanningJourneyHeader.tsx`, and the four files in `src/components/KickoffSteps/`. No changes to save logic, step completion persistence, or the planning-tools selection model.
- The new 4-stage arc header extends `PlanningJourneyHeader` with stages for pick and build rendered as inactive context.
- Green/red utility classes (`bg-green-600`, `border-red-300`, `text-green-800`, etc.) get replaced with semantic tokens added to `index.css` and `tailwind.config.ts` (success / destructive-subtle), fixing dark mode.
- The "What we know so far" summary reads existing state already in `KickoffWorkflow` (profile level, customization decisions, selected tools) — no new queries.

## Suggested order

1. Header + progress consolidation (A)
2. Token cleanup and action bar (C)
3. Per-step promise lines and running summary (B)
4. Density passes on steps 1, 3, 4 (D)
5. Completion handoff (E)
