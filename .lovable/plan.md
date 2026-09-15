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
