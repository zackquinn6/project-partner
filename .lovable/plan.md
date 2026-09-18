# Risk Radar summary cards refinement

## Goal
Refine the three compact dashboard areas shown in Risk Radar — **Current project progress**, **Project goals**, and **Current risk summary** — into one cohesive, modern metrics strip.

The overall footprint, three-column proportions, goal content, and dashboard behavior will remain the same. This is a focused visual hierarchy, typography, color, and fit improvement rather than a structural redesign.

## Current UI findings

- The strip uses the intended compact proportions, but most labels are only 10–12px, making key information feel secondary and difficult to scan.
- The four goal tiles each use a different full-surface tint. Together they create a rainbow effect that competes with the actual risk severity colors.
- The goal values do not read as the primary metrics because labels, icons, values, and quality options are all similarly small.
- The quality tile attempts to fit all three quality levels and strike out two of them. This is visually noisy and squeezes the selected goal.
- “Risk Status” is followed only by a colored dot. The meaning depends on color recognition or opening a tooltip.
- The risk summary leaves excess space above its numbers, while its counts are too small for the strongest roll-up metric on the row.
- Uppercase labels with expanded letter spacing add visual noise at this scale and reduce readability.
- Some surfaces and borders are too similar in contrast, so the three dashboard areas do not have a crisp visual hierarchy.

## Proposed visual direction

Use a **quiet workshop-instrument-panel** treatment: warm neutral surfaces, precise typography, restrained status color, compact spacing, and highly legible numbers. Color will communicate meaning only where it helps — icons, status markers, progress, and severity counts — rather than tinting every large surface.

### Shared dashboard treatment

- Keep the current single-row desktop grid and approximately the same proportions:
  - Progress: 15%
  - Goals: 66%
  - Risk summary: 19%
- Keep the current overall dashboard height; improve fit by reorganizing content inside each area rather than making the row taller.
- Use one shared card treatment across all three areas:
  - `bg-card`
  - quiet `border-border`
  - minimal or no shadow inside this dense dashboard region
  - consistent 6–8px corner radius
  - 10–12px internal padding depending on available width
- Use Manrope/display type for section titles and prominent metrics; retain Inter/sans for supporting labels.
- Remove expanded letter spacing. Use weight, size, and color for hierarchy instead.
- Align all three section titles to the left and on the same baseline.
- Use semantic theme tokens only, retaining correct contrast in both light and dark modes.

## 1. Current project progress

### Layout

- Preserve the existing title, helper sentence, progress bar, percentage, and optional progress selector.
- Keep the helper sentence directly below the title, but tighten its width and line height so it reads as supporting context rather than competing body copy.
- Place the progress bar and percentage on a stable bottom row with the percentage given a fixed-width, right-aligned metric area.
- If the progress selector is shown, keep it compact and visually subordinate to the progress metric.

### Typography and sizing

- Section title: 12px Manrope, semibold, sentence case, 16px line height.
- Helper text: 11–12px Inter, regular, `text-muted-foreground`, 15–16px line height.
- Percentage: 18px Manrope, bold, tabular numerals.
- Progress bar: 7–8px high, with a quiet neutral track and primary/coral fill.

### Color

- Use the standard neutral card surface; do not tint the whole card.
- Keep the Toolio primary coral for progress fill only, making the 2% state visible without overpowering the row.
- Increase track contrast slightly so very early progress remains visible.

## 2. Project goals

### Tile structure

Keep four equal-width tiles in the same row: Safety, Schedule, Budget, Quality. Each tile will use the same internal structure:

```text
[icon]  Goal label
        Primary metric

● Status description
```

- Use a neutral card surface for all four goal tiles.
- Replace the four full colored backgrounds with a slim semantic accent and a softly tinted icon container.
- Keep equal tile heights and fixed internal rows so dates, currency, and status text cannot shift the layout.
- Use compact truncation or controlled wrapping for unusually long dates and values, never font sizes below the legibility floor.

### Typography and sizing

- Goal label: 11px Inter, medium, sentence case.
- Primary metric: 14–15px Manrope, semibold, 18px line height, tabular numerals for dates and currency.
- Status description: 11px Inter, semibold for the status term.
- Icon container: 22–24px square; icon: 13–14px.

### Color strategy

Use restrained domain accents for the goal identity, while reserving red/amber/green for risk status:

- Safety: success-toned icon/accent
- Schedule: info-toned icon/accent
- Budget: warning-toned icon/accent
- Quality: category-3-toned icon/accent
- Tile surfaces remain neutral in every case.

This separates **what the goal is** from **how risky it currently is**.

### Quality fitting

- Show the selected quality target as the primary metric, such as **Great**.
- Remove the struck-through unselected options from the compact dashboard tile; those choices belong in editing controls, not the summary state.
- Preserve the selected quality value and its underlying behavior.

### Visible risk-status descriptions

Replace the dot-only footer with a status marker plus plain-language text:

- High / `H`: red marker + **Act now**
- Medium / `M`: amber marker + **Safeguard**
- Low / `L`: green marker + **Covered**
- No scored risks: neutral outlined marker + **Not assessed**

The row will be announced accessibly as, for example, “Safety risk status: Act now.” Existing tooltips can remain for detailed counts and explanations, but the core status will no longer require hovering or color interpretation.

The text should come from the existing action-priority labels when available so dashboard language stays aligned with the rest of Risk Radar. A safe display fallback will cover loading or unavailable label data without inventing a risk score.

## 3. Current risk summary

### Layout

- Left-align the section title to match the other two cards.
- Replace the loose inline group with three equal metric cells: High, Medium, Low.
- Vertically center the cells in the available card height and use subtle dividers between them.
- Keep the same three counts and severity labels; no new metric or calculation is introduced.

### Typography and sizing

- Count: 20px Manrope, bold, tabular numerals, 22px line height.
- Severity label: 11px Inter, medium, sentence case.
- Put the count first visually, with the label immediately below or beside it depending on the final fit at the existing width.

### Color

- Keep the overall card neutral.
- Use semantic color only on the count and a small severity marker:
  - High: `destructive-soft`
  - Medium: `warning-soft`
  - Low: `success`
- Keep labels in the normal foreground or muted foreground instead of coloring the whole metric area.
- Ensure the amber “Medium” state meets contrast requirements in both themes; use the darker semantic foreground treatment where needed rather than changing it to orange arbitrarily.

## Responsive behavior

- Preserve the current desktop one-row dashboard at the screenshot width.
- At medium widths, retain the same three dashboard areas but allow goal values to wrap within their fixed tiles.
- At narrow widths, stack the three main areas as the existing grid already does; keep the four goal tiles in two columns before collapsing further.
- Maintain stable heights and minimum widths so text does not overlap, truncate important metrics, or force horizontal scrolling.
- Use tabular numerals for percentages, money, and risk counts to prevent visual shifting as values change.

## Accessibility and interaction

- Status is communicated by text plus color, never color alone.
- Preserve the existing clickable risk-status control and dashboard-opening behavior.
- Expand the status control’s usable target without visually enlarging the marker.
- Keep keyboard focus rings visible and token-based.
- Preserve existing tooltips as secondary detail, including risk counts and score context.
- Respect light and dark themes with semantic tokens; no hardcoded color values or raw color utility classes.

## Technical implementation

- Refine `RiskFocusDashboard` and the shared goal-status presentation in `RiskManagementWindow.tsx`.
- Centralize the visible status label resolution so all four goal tiles use the same wording and loading fallback.
- Reuse the existing action-priority table, component rollups, semantic status tokens, and click handlers; do not change scoring, counts, permissions, persistence, or project data.
- Keep styles local to the existing dashboard composition unless a genuinely reusable status helper is warranted.

## Verification

- Compare the updated dashboard against the supplied screenshot at the same wide aspect ratio.
- Confirm long project dates, four-digit budgets, every quality target, zero values, and multi-digit risk counts fit cleanly.
- Verify High, Medium, Low, and unscored statuses each show the correct visible description and color.
- Check light and dark themes.
- Check desktop and narrow layouts for clipping, overlap, wrapping, and stable card heights.
- Confirm each risk status still opens the correct component dashboard and tooltips remain readable.
- Run the project’s type check and relevant UI verification after implementation.

## Out of scope

- No changes to the surrounding Risk Radar header, motivational banner, project-name banner, risk table, scoring model, or data.
- No increase to the general dashboard footprint.
- No new charts, totals, cards, or metrics.
