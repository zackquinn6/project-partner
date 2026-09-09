# UI & Mobile Responsiveness Plan

**Scope:** Project workflow screens, Project Dashboard, Project & Task Manager  
**Date:** 2026-09-09  
**Status:** Plan only — no UI code changes in this commit

---

## Current architecture (brief)

| Surface | Desktop | Mobile (`< 768px`) |
|---------|---------|-------------------|
| App shell | `Navigation` + page content | `Index` view switcher + `MobileBottomNav` |
| Project Dashboard | `ProjectListing` (table) | `MobileProjectListing` + `MobileProjectCard` |
| Project & Task Manager | `HomeTaskList` dialog | `HomeTaskList` embedded + `HomeTasksTable` |
| Workflow runner | `UserView` + `WorkflowSidebar` | `MobileWorkflowView` (+ still shows bottom nav) |
| Shared tokens | `src/utils/responsive.ts` (`responsiveDialogClasses`, `responsiveTouchTargets`, etc.) | Underused — many screens hand-roll sizes |

Breakpoint is consistently **768px**, but two hooks disagree on initial state:
- `useResponsive` / `isMobileViewport` — sync from `window`
- `use-mobile.tsx` (`useIsMobile`) — starts `false` until `useEffect` → brief desktop flash on phones

Existing window standard: `docs/WINDOW_STANDARDIZATION.md` + `responsiveDialogClasses.standardWindow`.

---

## Goals

1. One clear chrome layer per screen on mobile (no stacked nav bars).
2. Touch targets ≥ 44px on mobile; use shared responsive tokens.
3. Feature parity for core workflow actions between desktop sidebar and mobile tools.
4. Dense tables become cards/lists or scroll safely on narrow viewports.
5. All full-screen windows follow the standard window pattern on mobile (`100dvh`, full bleed).

---

## Wave 1 — High impact (do first)

### 1.1 Suppress app bottom nav during workflow & kickoff
**Where:** `src/pages/Index.tsx` (`mobileView === 'workflow'` and kickoff paths)  
**Problem:** `MobileBottomNav` (~64px) stacks under `MobileWorkflowView` sticky header + Prev/Next bar and competes with kickoff CTAs. Viewport for step content collapses.  
**Plan:**
- Hide `MobileBottomNav` while in workflow / kickoff.
- Keep a single back path inside the workflow header.
- Re-show bottom nav when returning to home / dashboard / tasks.

### 1.2 Unify mobile breakpoint hooks
**Where:** `src/hooks/use-mobile.tsx`, `src/hooks/useResponsive.ts`, callers in `Index.tsx`  
**Problem:** Initial `false` from `useIsMobile` causes desktop layout flash on mobile.  
**Plan:**
- Single source of truth (`MOBILE_BREAKPOINT` + one hook).
- Initialize from `matchMedia` / `window.innerWidth` (or defer chrome until known).
- Point `Index`, shadcn sidebar, and feature screens at the same hook.

### 1.3 Deduplicate `ProjectPlanningWizard` on mobile
**Where:** `UserView.tsx` (~3347 and ~4328)  
**Problem:** Wizard mounts twice when open on mobile → double overlay / conflicting `onOpenChange`.  
**Plan:** One mount only; desktop fullscreen branch vs mobile dialog branch must be mutually exclusive.

### 1.4 Mobile workflow chrome cleanup
**Where:** `MobileWorkflowView.tsx`, `MobileDIYDropdown.tsx`  
**Problem:** DIY dropdown is `fixed top-4 left-4` over the Back control; `pb-20` pads for overlay chrome that is often in-flow; scroll-to-top targets `ScrollArea` root instead of viewport.  
**Plan:**
- Fold DIY / Re-Plan / Critical into header “Project tools” (or top-right), not overlapping Back.
- Fix step scroll ref to the ScrollArea viewport (or plain `overflow-y-auto`).
- Trim bottom padding to match real overlay needs only.
- Apply `responsiveTouchTargets` to header icons, Complete, and tool chips.

### 1.5 Project Dashboard mobile toolbar
**Where:** `WorkspaceSubViewHeader.tsx`, `MobileProjectListing.tsx`  
**Problem:** Dashboard uses single-row toolbar (`mobileTwoRowHomeControls` false): title + homes + select + tiny Back (`h-7`, `text-[9px]`).  
**Plan:**
- Enable two-row home controls for Project Dashboard (same pattern as Task Manager).
- Shorten back label (“Workshop”); icon buttons `min-h-11 min-w-11` on mobile.
- Keep desktop header unchanged.

### 1.6 Project & Task Manager mobile density
**Where:** `HomeTasksTable.tsx`, `HomeTaskList.tsx`  
**Problem:** Mobile still uses a dense table; filter controls `h-7` / `text-[10px]`; sticky header ~68px; subtask editor grid `grid-cols-[32px_auto_100px_120px_32px]` overflows ~320–375px; swipe actions hide Edit/Link/Budget.  
**Plan:**
- Mobile task rows → card/list layout with always-visible overflow menu for actions.
- Raise filter/action controls to ≥44px; shrink sticky header to ~44px.
- Subtask editor: stack name full-width; hours + DIY on a second row below `sm`.

### 1.7 Maintenance / FullScreen dialogs on small phones
**Where:** `MaintenancePlanWorkflow.tsx`, `FullScreenDialog.tsx`, `ProgressViewsWindow.tsx`  
**Problem:** `min-h-[560px]` / `h-[90vh]` fight short viewports; close sometimes `hidden md:inline-flex`; Progress Gantt uses fixed `w-48` label columns.  
**Plan:**
- Mobile: `h-[100dvh]`, drop hard min-heights, always-visible close, full-bleed (`standardWindow`).
- Gantt: stack label above bar under `md`, or `min-w-0` + truncate without fixed 12rem column.

---

## Wave 2 — Feature parity & layout polish

### 2.1 Mobile ↔ desktop workflow tool parity
**Where:** `MobileWorkflowView.tsx` vs `WorkflowSidebar.tsx` / desktop `UserView`  
**Gap today (mobile missing or DIY-only):** Notes, Critical Points, Re-Plan (partial), Progress views, Est. finish, Project overview (`ProjectWorkflowOverviewPage`), Partner tools, progress-reporting settings.  
**Plan:**
- Map sidebar tools into mobile “Project tools” / step sheet with the same handlers.
- Project title tap → overview (responsive typography; full-width cover on small screens).
- Keep instruction level / theme in existing “View options”.

### 2.2 Kickoff vertical budget
**Where:** `KickoffWorkflow.tsx`  
**Problem:** Stacked full-width “Not a match” / “Skip” / Continue (`h-12`) burn space before step content; app bottom nav still present (fixed in 1.1).  
**Plan:** One primary CTA visible; secondary actions in a menu/sheet; keep stepper compact.

### 2.3 Editor / admin workflow on narrow viewports
**Where:** `EditWorkflowView.tsx`, `EditableUserView.tsx`  
**Problem:** `lg:grid-cols-4` stacks full step tree above content; compact tools/materials tables lack `overflow-x-auto`; completion overlay not mobile-tuned.  
**Plan:**
- `<lg`: step nav in a sheet/drawer (mirror `MobileWorkflowView`).
- Wrap tables in `overflow-x-auto` or card rows under `md`.
- Align structure-mode padding with steps (`px-3 sm:px-6`).

### 2.4 Desktop workflow step action bar wrap
**Where:** `UserView.tsx` step footer (~Prev/Next + Photo + Note + Complete + Something Wrong + Ask AI)  
**Problem:** Non-wrapping flex row cramped at ~768–1024 with sidebar open.  
**Plan:** `flex-wrap gap-2` / column on small widths; icon-only labels where space is tight.

### 2.5 Progress views & nested task dialogs
**Where:** `ProgressViewsWindow.tsx`, nested dialogs in `HomeTaskList.tsx`, `HomeManager.tsx`  
**Plan:**
- Progress: full-screen sheet on `<md`; reduce Kanban `min-h-[400px]` on mobile; process-map keep horizontal scroll + hint.
- Nested Team/Assign/HomeManager: one `standardWindow` / `100dvh` + safe-area pattern; larger close control.

---

## Wave 3 — Cleanup & consistency

### 3.1 Dead / unused UI paths
| Item | Action |
|------|--------|
| `ProjectManagementWindow.tsx` | Confirm unused → delete or quarantine; do not leave non-responsive dead UI |
| `PostAuthLanding.tsx` | Unused import in `Index` → remove or wire; stop duplicating home |
| `ProjectListing` `md:hidden` cards | Dead (mobile uses `MobileProjectListing`) → remove or share `MobileProjectCard` |
| `UserView` unused `MobileProjectListing` import | Remove |
| `MobileProjectCard.onDelete` | Wire or remove |
| `MobileOptimizedHome` “Code & Compliance” no-op | Dispatch same open event as desktop `Home` |
| `Navigation.isMobile` | Desktop-only mount — drop unused branch / logging-only use |

### 3.2 Adopt shared responsive tokens
**Where:** Prefer `src/utils/responsive.ts` across the three focus areas  
**Plan:** Replace one-off `h-7` / `text-[9px]` / ad-hoc dialog sizes with `responsiveTouchTargets`, `responsiveSpacing`, `responsiveDialogClasses`, `responsiveText`. Align close buttons with window standardization (prefer readable “Close”, ≥44px hit area on mobile even if visual size stays compact).

### 3.3 Project Dashboard desktop table (optional)
**Where:** `ProjectListing.tsx`  
**Plan:** At tablet widths (~768–900), hide secondary date columns until `lg`, or wrap table in `overflow-x-auto`. Align any missing filters (home / search / sort) with mobile listing if product wants parity.

### 3.4 Admin `UnifiedProjectManagement` (secondary to user flows)
**Where:** `UnifiedProjectManagement.tsx`  
**Plan:** Collapse header actions into “More” under `lg`; stack time grids to 1-col on `<sm`; confirm dialogs use `modalMd` / full-screen on mobile. Use Create Project dialog as the in-file pattern to copy.

---

## Suggested implementation order

```
Wave 1.1  Bottom nav suppression (workflow/kickoff)
Wave 1.2  Hook unification (no layout flash)
Wave 1.3  Planning wizard single mount
Wave 1.4  MobileWorkflowView chrome + scroll + touch
Wave 1.5  Project Dashboard header two-row + targets
Wave 1.6  Task Manager cards + subtask stack + targets
Wave 1.7  Dialog min-heights / Progress Gantt
─── ship user-facing mobile sanity ───
Wave 2.*  Parity, kickoff, editors, wrap, nested dialogs
Wave 3.*  Dead code, tokens, desktop polish, admin
```

Each wave should be a focused PR with manual checks on ~375px and ~768px widths for:
- Project Dashboard list
- Project & Task Manager list + edit task + subtasks
- Workflow step (instructions, tools sheet, Prev/Next)
- Kickoff first step
- One planning/progress dialog opened from workflow

---

## Out of scope (this review)

- Landing/marketing pages
- Auth screens
- Deep visual redesign / new design system
- Changing product rules (membership gates, which tools exist) — only how they surface on mobile

---

## Success criteria

- [ ] No stacked bottom nav + workflow footer on phones
- [ ] No desktop flash on first paint for mobile shell
- [ ] Project Dashboard and Task Manager toolbars usable one-handed (≥44px primary controls)
- [ ] Task/subtask forms usable at 320px without horizontal page scroll
- [ ] Mobile workflow exposes Notes, Critical, overview, and Progress (or documented deferral)
- [ ] Full-screen windows use `100dvh` / standard window pattern without min-height clipping
- [ ] Dead unused management/landing components removed or clearly owned
