# Achievements window UI refinement

## Goal
Transform the existing achievements window into a modern performance-badge dashboard inspired by Garmin’s clarity and density, using the selected **industrial performance tactical** direction.

This is a presentation-only refinement. Existing achievement definitions, filters, progress calculations, XP, levels, unlock behavior, and recent-unlock data remain unchanged.

## Current UI findings

- The level summary reads as a promotional banner rather than a performance instrument because of its soft gradient, glow, and oversized orange tile.
- The dialog repeats “Achievements” in both its top bar and summary panel, weakening hierarchy.
- The total completed count is small and visually detached from level progress.
- Filter pills are visually soft and consume more height than needed for a dense dashboard.
- Locked cards are low contrast throughout, making names, descriptions, icons, and progress equally subdued.
- Achievement names, category labels, descriptions, counts, and percentages lack a consistent vertical grid across cards.
- The Peak marker appears beside the title, which makes long names wrap prematurely.
- Progress bars are too subtle to scan quickly, especially across a two-column list.
- The current pale presentation does not communicate the selected rugged, technical “shop performance” character.

## Selected visual direction

Use a compact **industrial performance tactical** surface: dark graphite, crisp dividers, signal orange for active progress, pale high-contrast text, and precise typography.

### Locked visual system

- Main graphite: `#171A1D`, implemented as a dedicated semantic token.
- Raised graphite: `#2A2F34`, implemented as a dedicated semantic token.
- Signal orange: `#F45B22`, mapped through the achievements accent token.
- Primary text: `#F2F4F5`, mapped through the achievements foreground token.
- Supporting text and dividers use derived semantic tokens with verified contrast.
- Sora for every title, achievement name, level, XP figure, count, and percentage.
- Manrope for descriptions, categories, filters, and supporting labels.
- No gradients, glows, blurred decoration, blue/cyan/lime accents, or invented colors.
- No oversized pill shapes, nested cards, or decorative shadows.
- Corner radii stay crisp at 6–8px.

These values will be added as scoped semantic tokens rather than hardcoded inside the component, preserving the app’s broader theme system.

## Window frame

- Keep the existing full-screen mobile and large desktop dialog behavior.
- Convert the desktop dialog into one graphite instrument panel with a thin border and restrained 8px radius.
- Remove the visible duplicate title from the dialog bar; retain the accessible dialog title.
- Place the close control in a compact top-right utility strip with a clear focus state and minimum touch target.
- Keep the achievement content’s current maximum reading width and scroll behavior.

## 1. Performance summary

### Structure

```text
[LEVEL RING]  ACHIEVEMENTS / level progress     0 / 27
              176 XP · 224 XP to Level 3        completed

              ━━━━━━━━━ level progress ━━━━━━━
```

- Replace the orange level tile with a compact circular level gauge.
- The gauge uses a neutral track and orange progress arc based on the existing level-progress value.
- Center **LVL** over the current level number; both remain readable without relying on color.
- Use **Achievements** as the main title, not the prototype’s invented “Performance Achievements.”
- Show current XP and XP remaining on one stable supporting line.
- Give the unlocked total a fixed right-hand metric column with “Completed” beneath it.
- Keep one horizontal level-progress bar under the summary row for precise progress reading; do not add new metrics.

### Type and sizing

- Main title: Sora, 22–24px, 700 weight.
- Level number: Sora, 28px, 700 weight.
- XP figure: Sora, 13–14px, 700 weight, signal orange.
- Remaining XP: Manrope, 13px, medium, supporting foreground.
- Completed count: Sora, 28–32px, 700 weight, tabular numerals.
- Metric labels: Manrope, 10–11px, 600 weight, uppercase, normal letter spacing.

### Color and fit

- Flat main graphite surface with a raised graphite metric area only where separation is needed.
- Orange is limited to the gauge, current XP, and progress fill.
- The completed count uses pale foreground, not low-opacity decorative text.
- At narrow widths, the completed metric moves below the level details without shrinking text.

## 2. Category controls

- Place filters on a dedicated dark utility row separated by hairline borders.
- Keep all seven existing filters and horizontal scrolling on narrow screens.
- Change the controls from large soft pills to compact 6px-radius segmented buttons.
- Active filter: signal-orange surface, high-contrast foreground, and clear selected state.
- Inactive filters: transparent/raised graphite surface with supporting text and a visible border.
- Use Manrope at 11–12px semibold; avoid wide tracking.
- Preserve keyboard navigation, focus rings, and minimum 40–44px touch targets on mobile.

## 3. Achievement cards

### Shared card grid

- Preserve the existing two-column desktop and single-column mobile layout.
- Use raised graphite cards against the main graphite canvas with a thin neutral border.
- Fix each card’s internal layout into three stable rows so adjacent cards align:
  1. Icon, title, category/status
  2. Description
  3. Progress reading and bar
- Use 16–18px internal spacing and a 14–16px gap between cards.
- Remove generic shadows; use a slight border-color change on hover/focus.

### Icon and title block

- Use a 44–48px square icon well with 6px radius.
- Locked icon: visible muted foreground, not near-invisible opacity.
- In-progress icon: signal orange on a restrained orange-tinted token surface.
- Unlocked icon: signal orange plus the existing check state and visible “Unlocked” text where space permits.
- Achievement name: Sora, 15–16px, 650–700 weight, pale foreground, 20px line height.
- Category: Manrope, 11px, medium, supporting foreground.
- Move the Peak marker to the card’s top-right metadata position so it does not interrupt the title.
- Render category and Peak markers as compact squared tags with text; status never relies on color alone.

### Description

- Manrope, 12–13px, regular, 18px line height.
- Increase contrast from the current muted gray while keeping it subordinate to the title.
- Reserve consistent description height for two lines; clamp longer copy cleanly.

### Progress readout

- Present the count as `0 / 3 completed` rather than a bare fraction.
- Count and percentage use Sora with tabular numerals at 11–12px semibold.
- Place count left and percentage right on a fixed baseline.
- Increase progress track height to 4–5px with a clearly visible graphite track.
- Use signal orange for measurable progress and a neutral track at zero.
- Unlocked achievements show a complete orange bar and unlock date without changing the underlying data.
- Keep continuous bars rather than the prototype’s arbitrary four segments, because targets vary across achievements.

## 4. Achievement states

- **Locked, no progress:** pale title, muted icon and description, explicit `0 / target completed`, neutral progress track.
- **In progress:** orange icon treatment and progress fill; percentage and count remain readable text.
- **Unlocked:** orange border accent, check icon plus “Unlocked,” completed bar, and existing date.
- **Peak:** slim orange-accented border and visible Peak tag; do not use glow.
- **Recent unlocks:** preserve the existing section when data exists, but restyle it as a compact horizontal “Recently unlocked” rail using the same card language.

## 5. Motion and interaction

- Use restrained 160–220ms transitions for filter selection, border emphasis, progress fill, and icon state.
- Cards may lift by at most 1px on pointer hover; no glow or dramatic scale.
- Respect `prefers-reduced-motion` by removing translation and using immediate/short color changes.
- Keep the window scroll position stable while changing filters.

## Responsive behavior

- Desktop: two achievement columns, full summary row, completed metric aligned right.
- Tablet: two columns where cards retain a usable minimum width; otherwise switch to one column.
- Mobile: one column, summary wraps deliberately, filters scroll horizontally, and all controls meet touch sizing.
- Long names such as “Quarter-Century Shop” must wrap without colliding with Peak or category tags.
- No dynamic viewport-based type scaling; all type remains within defined responsive steps.

## Technical implementation

- Refine `AchievementsSection` and `AchievementsFullDialog` only.
- Add scoped achievement-surface tokens in the global theme and expose them through the Tailwind theme configuration.
- Add Sora to the existing document font loading and map it to an achievements-specific display family; use the project’s existing Manrope family for labels and body copy.
- Reuse the existing Button, Badge, Progress, icon map, filters, calculations, and loading state.
- Replace decorative gradient/glow styles with the selected flat semantic surfaces.
- Keep every existing data path and achievement criterion untouched.

## Verification

- Compare the result at the screenshot’s wide layout and at mobile width.
- Verify all seven filters, empty/zero progress, partial progress, unlocked state, Peak state, and recent unlocks.
- Check long names and descriptions for clipping or collisions.
- Confirm the close control, filter focus states, screen-reader labels, and color-independent status text.
- Confirm graphite/orange contrast and typography in the rendered window.
- Run the project type check and relevant frontend validation.

## Explicitly out of scope

- No new efficiency, streak, sync, trend, social, history, completion-estimate, or premium-status metrics from the prototype.
- No changes to XP formulas, levels, unlock criteria, achievement catalog, persistence, notifications, or data fetching.
- No redesign of surrounding profile or project screens.
