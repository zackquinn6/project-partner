# UI & Mobile Responsiveness Plan

**Scope:** Project workflow screens, Project Dashboard, Project & Task Manager  
**Date:** 2026-09-09  
**Status:** Implemented

---

## Shipped checklist

- [x] Suppress app bottom nav during workflow & kickoff (`Index`)
- [x] Unify mobile breakpoint hooks (`use-mobile` / `useResponsive`)
- [x] Single `ProjectPlanningWizard` mount in `UserView` (dialog vs fullscreen via `layout`)
- [x] Remove fixed `MobileDIYDropdown` overlay; DIY tools folded into mobile Project tools
- [x] `MobileWorkflowView`: plain scroll `div` + `pb-4`, touch targets, tool parity (Critical / Re-Plan / Notes / Progress / Experts / est. finish), clickable project title
- [x] Project Dashboard two-row mobile toolbar / listing via `MobileProjectListing`
- [x] Task Manager mobile density improvements (`HomeTasksTable` / `HomeTaskList`)
- [x] Full-screen dialog / Progress views mobile sizing
- [x] Kickoff secondary CTAs collapsed into mobile “More” menu
- [x] `EditWorkflowView` / `EditableUserView`: Steps sheet under `lg`, table overflow, structure padding
- [x] Desktop workflow step action bar wraps (`flex-wrap` / column on narrow)
- [x] Wave 3 cleanup: unused `ProjectManagementWindow` deleted; dead `PostAuthLanding` import removed; `ProjectListing` mobile cards removed; `MobileProjectCard.onDelete` removed; Code & Compliance wired on mobile home; unused `Navigation.isMobile` removed

---

## Current architecture (brief)

| Surface | Desktop | Mobile (`< 768px`) |
|---------|---------|-------------------|
| App shell | `Navigation` + page content | `Index` view switcher + `MobileBottomNav` (hidden in workflow/kickoff) |
| Project Dashboard | `ProjectListing` (table) | `MobileProjectListing` + `MobileProjectCard` |
| Project & Task Manager | `HomeTaskList` dialog | `HomeTaskList` embedded + `HomeTasksTable` |
| Workflow runner | `UserView` + `WorkflowSidebar` | `MobileWorkflowView` |
| Shared tokens | `src/utils/responsive.ts` (`responsiveDialogClasses`, `responsiveTouchTargets`, etc.) | Adopted on mobile workflow chrome |

Breakpoint remains **768px** via shared `MOBILE_BREAKPOINT` / `useIsMobile`.

Existing window standard: `docs/WINDOW_STANDARDIZATION.md` + `responsiveDialogClasses.standardWindow`.

---

## Goals (met)

1. One clear chrome layer per screen on mobile (no stacked nav bars during workflow).
2. Touch targets ≥ 44px on mobile workflow chrome; shared responsive tokens where applied.
3. Feature parity for core workflow actions between desktop sidebar and mobile tools.
4. Dense tables scroll safely / use mobile cards where planned.
5. Full-screen windows follow the standard window pattern on mobile (`100dvh`, full bleed) where updated.

---

## Out of scope (this review)

- Landing/marketing pages
- Auth screens
- Deep visual redesign / new design system
- Changing product rules (membership gates, which tools exist) — only how they surface on mobile

---

## Success criteria

- [x] No stacked bottom nav + workflow footer on phones
- [x] No desktop flash on first paint for mobile shell
- [x] Project Dashboard and Task Manager toolbars usable one-handed (≥44px primary controls)
- [x] Task/subtask forms usable at 320px without horizontal page scroll
- [x] Mobile workflow exposes Notes, Critical, overview, and Progress
- [x] Full-screen windows use `100dvh` / standard window pattern without min-height clipping
- [x] Dead unused management/landing components removed or clearly owned
