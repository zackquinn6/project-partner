# Industrial retheme: dark default, light toggle

Adopt the locked industrial direction (graphite + signal orange, Sora/Manrope) as the app-wide design system. Dark graphite is the default experience; light mode remains available in Settings → Appearance. No feature logic changes.

## Confirmed current state

- Tokens live in `src/index.css` (`:root` light warm-sand/coral, `.dark` warm-charcoal) and are mapped in `tailwind.config.ts`. Components already use semantic utilities, so a token swap recolors the app.
- `src/contexts/ThemeContext.tsx` persists `theme_mode` + `color_scheme` on `user_profiles` and applies `.dark` / `data-color-scheme` on `<html>`. `user_profiles.theme_mode` currently defaults to **'light'** (verified in DB); signed-out visitors always get light.
- Six accent schemes exist (`default/blue/green/purple/orange/red`) and only reassign accent tokens — keep this mechanism.
- Fonts: Inter (body) + Manrope (display) via Google Fonts in `index.html`. Sora is not loaded.
- 32 files contain hardcoded light-theme utilities (`bg-white`, `text-white`, `bg-green-*`…). Top offenders: SchedulerWizard (24), Home (9), MobileOptimizedHome (5), ProjectCatalog (4).

## Design system

**Dark (default) — graphite instrument panel:**

```text
background      210 12% 10%   (#171A1D graphite)
card            210 10% 13%   raised surface
popover         210 10% 15%
secondary/muted 210  9% 16-17% (#2A2F34 family)
border          210  8% 22%
input           210  9% 18%
foreground      200 12% 96%   (#F2F4F5 pale)
muted-foreground 205 8% 62%
primary         16 90% 55%    (#F45B22 signal orange), ring + sidebar-primary match
```

**Light counterpart (toggle target):** same DNA on neutral paper — background `210 12% 97%`, card white, foreground `210 12% 12%` (graphite text), border `210 10% 88%`, primary darkened to `16 90% 46%` for contrast on white.

Status tokens (`--success`, `--warning-soft`, `--info`, destructive, six `--category-*` hues) get lifted-lightness dark variants for contrast on graphite; taxonomy hues stay hue-identical in both modes.

**Usage rules:** signal orange only for primary actions, focus rings, and alerts — never decoration; status never relies on color alone; 6–8px radii unchanged (`--radius` stays 0.75rem).

**Typography:** Sora becomes the display font (headings, metrics, numbers); Manrope becomes body/labels/controls. Inter is dropped. `tailwind.config.ts`: `sans: ['Manrope', …]`, `display: ['Sora', …]`; `index.html` loads Sora + Manrope weights 400–800. Existing `font-display` usages pick up Sora automatically; Inter usages (`font-sans` / body default) pick up Manrope.

## Implementation steps

1. **`src/index.css` token overhaul** — replace `:root` and `.dark` blocks with the graphite system above; redefine `--gradient-*` (remove warm-sand; dark gets near-flat graphite gradients, light gets neutral paper), `--shadow-*` (dark: soft black elevation), and keep spacing/touch tokens untouched. Update the six `data-color-scheme` accent blocks (dark variants lifted for legibility); the `default` scheme becomes signal orange.
2. **Fonts** — `index.html` Google Fonts link: Sora + Manrope, drop Inter; update `tailwind.config.ts` `fontFamily`.
3. **Theme defaults** —
   - Migration: `ALTER TABLE public.user_profiles ALTER COLUMN theme_mode SET DEFAULT 'dark';` plus a one-time backfill `UPDATE user_profiles SET theme_mode='dark'` so the launch look reaches existing users (anyone can flip back to light in Settings → Appearance). Re-run the Supabase linter afterward.
   - `ThemeContext.tsx`: signed-out visitors default to dark (apply `.dark` when `themeMode === null`) instead of falling through to the light `:root`.
4. **Appearance settings** — `AppearanceSettingsDialog.tsx`: relabel the `default` scheme "Signal Orange"; keep the light/dark toggle and other accents as-is.
5. **Hardcoded color sweep** — in the 32 flagged files, replace `bg-white`/`bg-black`/`text-white`/`bg-green-*`/`bg-gray-*`/`text-gray-*` with semantic tokens (`bg-card`, `bg-primary`, `text-primary-foreground`, `bg-success`…) so every surface themes correctly in both modes. Prioritize user-facing primary surfaces (Home, MobileOptimizedHome, Navigation, ProjectCatalog, SchedulerWizard, RiskFocusLauncher); certificate/print-facing styles keep explicit colors where print requires them.
6. **Typography pass on chrome** — Navigation, headers, and primary metrics switch to `font-display` (Sora) where they were ad-hoc styled; no layout or sizing changes.

## Out of scope

- Achievements window redesign (separate locked effort), risk-radar card rework, kickoff five-fix list, all business logic, data, and routing.

## Verification

- `npx tsgo --noEmit -p tsconfig.app.json` — zero errors.
- Playwright screenshots of Home + one workflow window in both modes; check no white-on-white or dark-on-dark surfaces, orange reserved for actions.
- Contrast spot-check: #F2F4F5 on #171A1D and on #2A2F34 (must clear WCAG AA); primary-on-card in both modes.
- Supabase linter after the migration; confirm new profiles and backfilled profiles resolve to dark.
