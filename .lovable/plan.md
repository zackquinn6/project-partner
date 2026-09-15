# Kickoff Implementation Review

Your implementation of the kickoff plan, reviewed file by file. Overall: faithful to the spec, and a few small gaps worth cleaning up.

## What's done well

- **Journey arc (A):** `PlanningJourneyHeader` now renders Pick · Discover · Plan · Build with a check on past stages, primary on the active stage, and quiet `·` separators — exactly the "intentional system" cue. Discover/Plan remain return targets when handlers exist.
- **Single progress system (A):** The header card carries project name, the 4-segment rail (filled `bg-primary`, current `bg-primary/60` with pulse, upcoming `bg-muted`, checks on done labels), and the step promise line. The old dots, "Step X of 4" counter, prev/next arrows, and scroll arrows are gone. Tapping reached segments navigates, gated by the frontier rule with a toast.
- **Promise + payoff (B):** Every step has a promise line, and the "What we know so far" chip row (Fit / Level / Target / Budget / tools) appears from step 2 on with a fade-rise entrance. Chips pull from existing state — no new queries.
- **Calmer action bar (C):** Theme-primary Continue with step-specific labels ("This fits — continue" … "Start planning"), the final-step tool-count subline, quiet text escape links ("Not a match? Back to catalog" / "Skip ahead"), and the slim completed-state strip (`bg-success/10`, "Step complete — tap to edit").
- **Density (D):** Step 1 leads with a tier-tinted verdict card (Good fit / Stretch / Not recommended) using `success` / `warning-soft` / `destructive-soft` tokens, with detail collapsed into an accordion. Step 4 keeps the recommended banner and adds the "Adds to your plan" preview plus the `border-l-[3px] border-l-primary` selected accent.
- **Handoff (E):** The step-4 overlay matches spec — success circle, "You're set to plan", recap (fit, level, target, budget, tools), "Open Planning Studio", plus a "Keep editing" escape. It also gates the final persistence, which is a nice touch.
- **Tokens:** `--success`, `--warning-soft`, `--destructive-soft` (plus foregrounds) added to `index.css` (light + dark) and `tailwind.config.ts`.

## Gaps and issues found

1. **Hardcoded colors remain in the step-1 level sliders** — `ProjectOverviewStep.tsx` lines 413-417: the three-segment track is `bg-green-500` / `bg-blue-500` / `bg-black` with `text-white` labels. `bg-black` will disappear on dark backgrounds and none of these are tokens. This is the one place the "no hardcoded colors" rule was missed.
2. **`ProjectCustomizationStep.tsx` is dead code** — nothing imports it, and it still contains all the old `bg-green-600` / `bg-green-50` / `text-green-800` classes the token cleanup was meant to remove. Should be deleted.
3. **Step 3 misses the size-to-date note** — the spec called for an inline note under the target date that updates with size ("At this size, plan on ~6 weekends"). It's not there; the date only shows a relative label ("In ~42 days"). The Separator-divided Size / Date / Budget stack also sits below extra Project name + Home sections, so the step is denser than the spec's "one card, size → date → budget."
4. **Promise line is duplicated on steps 2-4** — the header card shows the promise, and the step's own `CardDescription` repeats the same sentence (e.g. Goals: "Size it, date it, budget it…"). Pick one home for it; the header is the better spot since it's always visible.
5. **Minor: duplicated match-input fetch** — `KickoffWorkflow` fetches project skill/effort/challenges and computes `matchExplanation` for the chips/handoff, while `ProjectOverviewStep` computes the same internally. Works, but passing the tier/reasons down as props would remove a second copy of the logic.

## Proposed fix list (small)

1. Re-token the step-1 slider track (e.g. `bg-success` / `bg-warning-soft` / `bg-muted-foreground` or a neutral stepped ramp) and swap `text-white` for `text-primary-foreground`-style tokens.
2. Delete `src/components/KickoffSteps/ProjectCustomizationStep.tsx`.
3. Add the size-aware note under the step-3 target date; consider folding name/home into one compact row to reduce density.
4. Remove the repeated promise sentence from step `CardDescription`s (or drop it from the header).
5. Optional: lift `computeProjectMatchExplanation` to the shell and pass results into step 1.

## Technical notes

- Presentation-only changes in `src/components/KickoffSteps/ProjectOverviewStep.tsx`, `ProjectProfileStep.tsx`, and the deletion of one unused file. No save logic, persistence, or tool-selection changes.
- Reuse existing tokens only; no new CSS variables needed.
