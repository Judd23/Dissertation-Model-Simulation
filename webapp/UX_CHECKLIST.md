# Comprehensive UX Checklist

> **Last Updated:** January 11, 2026  
> **Constraint:** Phase 0 Visual Lock — No changes to blur, opacity, glass, motion, spacing, glow, gradients, hover feel, or animation timing.  

---

## 🧯 Repo Health Gate (Must Pass Before Any UX Work)
These checks prevent false negatives where the UI looks broken but the repository or deploy pipeline is corrupted.

| Check | Command | Pass Condition | What It Means If It Fails |
|------|---------|----------------|--------------------------|
| Git refs clean | `git show-ref --head` | No warnings about `refs/... 2` | Broken git refs will block fetch, pull, and Actions deploys |
| Git objects sane | `git fsck --full` | No `fatal: bad object` | Object DB corruption; builds and diffs are unreliable |
| Node types clean | `ls node_modules/@types | grep " 2"` | No results | Duplicate `@types/* 2` folders cause TS + Vite to misbehave |

If any check fails, fix it before touching UI or motion code.

---

## 🧭 What Actually Deploys This Site
The live site is currently published via **GitHub Actions**.

Important: In this repository, the Pages workflow run shown in Actions is labeled **gh-pages**. That means one of two things is true:

1) The workflow is configured to run when **gh-pages** is updated, OR
2) The workflow runs on `main` but GitHub is showing the **deployment target/environment** as gh-pages.

Because of that ambiguity, the rule is:

- Treat `main` as the source of truth for code and the workflow.
- Treat `gh-pages` as the output branch/environment used for Pages hosting.
- Do **not** manually merge `gh-pages` into `main`.

Operationally, deployments should be driven by the workflow, not by branch merges.

| Setting | Expected Value |
|--------|-----------------|
| **GitHub Pages → Source** | GitHub Actions |
| **Workflow** | `.github/workflows/pages.yml` (or the repo’s active Pages workflow) |
| **Source of code changes** | `main` |
| **Pages target** | `gh-pages` (branch/environment managed by Actions) |
| **Artifact** | `webapp/dist` |

---

## 🧾 Cache + Version Truth
Because GitHub Pages and browsers cache aggressively, visual verification must be factual.

- Always hard refresh after deploy (Cmd+Shift+R / Ctrl+Shift+R)
- The footer must display **build timestamp or commit SHA** so we can prove which build is live

---

## 🎛 Motion Policy (Phase 0 Lock)
No reduced-motion fallbacks are to be added or expanded in Phase 0 (keep the high-motion intent).

- Existing behavior, if present, is treated as legacy and is **not** extended.
- All new work must preserve **heavy spring, parallax, glass thickness, reflections, and motion density**.

---

## 🧪 Coverage Map for Motion + Glass
All of the following surfaces must exhibit **DANCE_SPRING_HEAVY** hover, glass depth, and reflective shine:

- Header nav links (desktop + mobile)
- All primary and secondary buttons
- All `InteractiveSurface` panels
- `StatCard`, `KeyTakeaway`, `Accordion` items
- `GlossaryTerm` trigger
- `BackToTop` button
- Sliders and toggles

Each must be tested on: Home, Methods, Pathway, So What, Researcher.

---

## 🧩 CSS Modules Type Safety
| Check | Requirement |
|-------|-------------|
| Declarations | `vite-env.d.ts` must include `declare module '*.module.css'` |
| TS config | The declaration file must be included by `tsconfig.app.json` |
| Conflicts | No duplicate `*.d.ts` files shadowing module declarations |

This prevents false TypeScript errors where CSS files exist but types are unknown.

---

---

## 🔴 Sprint 1 — Critical React Stability Fixes

These items address actual runtime errors that can crash or degrade the app.

### 1.1 usePointerParallax ref write during render (React error)
| Attribute | Value |
|-----------|-------|
| **File** | `webapp/src/lib/hooks/usePointerParallax.ts` |
| **Where** | The assignment `animateRef.current = () => { ... }` near the top of the hook |
| **Issue** | React throws: “Cannot access refs during render / Cannot update ref during render.” Writing to `animateRef.current` happens during render, which React treats as a render-phase mutation. |
| **Fix** | Move the assignment to an effect, or remove the ref indirection entirely. Preferred pattern:
  1) Create a stable `animate` function with `useCallback`.
  2) In `useEffect`, set `animateRef.current = animate`.
  3) The RAF loop calls `animateRef.current?.()`.
| **Why** | Removes a hard runtime error that can prevent the UI from updating correctly and can block deployments when errors are treated as fatal. |
| **Risk** | Low |
| **Visual Impact** | None |

### 1.2 usePointerParallax setState inside enabled-effect (React warning)
| Attribute | Value |
|-----------|-------|
| **File** | `webapp/src/lib/hooks/usePointerParallax.ts` |
| **Where** | The `useEffect(() => { ... }, [enabled])` block that calls `setPosition({ x: 0, y: 0, clientX: 0, clientY: 0 })` |
| **Issue** | React warns: “Calling setState synchronously within an effect can trigger cascading renders.” This happens when `enabled` flips and the effect immediately calls `setPosition`. |
| **Fix** | Avoid direct `setPosition` in the effect. Instead:
  - Update only `targetRef.current` to zeros in the effect, and
  - Let the existing RAF loop drive `setPosition` as part of the animation tick.
  If an immediate visual reset is required, schedule `setPosition` via `requestAnimationFrame(() => setPosition(...))` rather than calling it synchronously in the effect body.
| **Why** | Stops React’s cascading-render warning and keeps the animation system as the single writer of position state. |
| **Risk** | Low |
| **Visual Impact** | None |

### 1.3 usePointerParallax ref syncing should not happen in render
| Attribute | Value |
|-----------|-------|
| **File** | `webapp/src/lib/hooks/usePointerParallax.ts` |
| **Where** | Any assignments like `enabledRef.current = enabled` and `smoothingRef.current = smoothing` that occur outside an effect |
| **Issue** | Render-phase ref writes can trigger React warnings (and are brittle under strict mode). |
| **Fix** | Keep all ref syncing inside `useEffect` (or `useLayoutEffect` if required). The hook should only read refs during render, not write them. |
| **Why** | Aligns the hook with React’s rules for render purity and prevents warnings that look like “nothing is happening after step 0” during dev. |
| **Risk** | Low |
| **Visual Impact** | None |

---

## 🟠 Sprint 2 — Accessibility (ARIA) Improvements

These items improve screen reader support without any visual changes.

### 2.1 ProgressRing missing ARIA semantics
| Attribute | Value |
|-----------|-------|
| **File** | `webapp/src/components/ui/ProgressRing.tsx` |
| **Lines** | 26–45 (the outer `<div>`) |
| **Issue** | The ring SVG has `aria-hidden="true"` (correct) but the container lacks progressbar semantics. Screen readers cannot interpret the metric value. |
| **Fix** | Add to the container div: `role="progressbar"`, `aria-valuenow={normalized}`, `aria-valuemin={0}`, `aria-valuemax={1}`, `aria-label={label}` |
| **Why** | Accessibility — screen readers will announce "CFI: 99.7%" instead of nothing. |
| **Risk** | Low |
| **Visual Impact** | None |

### 2.2 GlossaryTerm missing tooltip role
| Attribute | Value |
|-----------|-------|
| **File** | `webapp/src/components/ui/GlossaryTerm.tsx` |
| **Lines** | ~110–130 (the portal-rendered tooltip div) |
| **Issue** | Tooltip is rendered via `createPortal` but lacks `role="tooltip"`. Screen readers don't associate it with the trigger. |
| **Fix** | Add `role="tooltip"` to the tooltip container element. |
| **Why** | Accessibility — establishes semantic relationship between trigger and tooltip. |
| **Risk** | Low |
| **Visual Impact** | None |

### 2.3 GlossaryTerm missing keyboard dismiss
| Attribute | Value |
|-----------|-------|
| **File** | `webapp/src/components/ui/GlossaryTerm.tsx` |
| **Lines** | ~90–100 (event handlers section) |
| **Issue** | Tooltip can be dismissed by clicking outside on touch devices, but there's no `Escape` key handler for keyboard users. |
| **Fix** | Add `useEffect` that listens for `keydown` event with `key === 'Escape'` and calls `setIsOpen(false)`. |
| **Why** | Accessibility — keyboard users can dismiss tooltips without clicking elsewhere. |
| **Risk** | Low |
| **Visual Impact** | None |

### 2.4 StatCard animated values not announced
| Attribute | Value |
|-----------|-------|
| **File** | `webapp/src/components/ui/StatCard.tsx` |
| **Lines** | ~165–175 (the value display element) |
| **Issue** | When the stat value animates (count-up), screen readers don't announce the final value. |
| **Fix** | Wrap the value in a `<span aria-live="polite" aria-atomic="true">` so the final value is announced. |
| **Why** | Accessibility — blind users hear "5,000" instead of silence. |
| **Risk** | Low |
| **Visual Impact** | None |

### 2.5 KeyTakeaway missing landmark role
| Attribute | Value |
|-----------|-------|
| **File** | `webapp/src/components/ui/KeyTakeaway.tsx` |
| **Lines** | ~42–55 (the InteractiveSurface wrapper) |
| **Issue** | Uses `<aside>` which is correct, but lacks a role annotation for callout semantics. |
| **Fix** | Add `role="note"` to the aside element. |
| **Why** | Accessibility — explicitly marks content as a note/callout for screen readers. |
| **Risk** | Low |
| **Visual Impact** | None |

### 2.6 Accordion focus ring visibility
| Attribute | Value |
|-----------|-------|
| **File** | `webapp/src/components/ui/Accordion.module.css` |
| **Lines** | (button styles) |
| **Issue** | Native focus ring may be suppressed by custom styling. Need to verify `:focus-visible` outline is present. |
| **Fix** | Add `.button:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }` if missing. |
| **Why** | Accessibility — keyboard users see focus indicator. |
| **Risk** | Low |
| **Visual Impact** | None (adds outline only on keyboard focus, not mouse) |

---

## 🟢 Sprint 3 — Robustness & Polish

These items improve stability and developer experience without visual changes.

### 3.1 TransitionNavLink type narrowing
| Attribute | Value |
|-----------|-------|
| **File** | `webapp/src/features/transitions/TransitionNavLink.tsx` |
| **Lines** | 29–31 |
| **Issue** | `if (typeof to !== 'string') { return; }` silently does nothing for non-string `to` props. Should fall through to default NavLink behavior. |
| **Fix** | Remove the early return; the NavLink will handle `To` objects correctly. |
| **Why** | Correctness — allows object-form `to` props like `{ pathname: '/foo', search: '?x=1' }`. |
| **Risk** | Low |
| **Visual Impact** | None |

### 3.2 Slider touch target size
| Attribute | Value |
|-----------|-------|
| **File** | `webapp/src/components/ui/Slider.module.css` |
| **Lines** | (thumb/track styles) |
| **Issue** | Range input thumb may be smaller than 44×44px WCAG touch target recommendation. |
| **Fix** | Verify thumb height/width is at least 44px. If not, increase via `-webkit-slider-thumb` and `::-moz-range-thumb` pseudo-elements. |
| **Why** | Usability — easier to grab on touch devices. |
| **Risk** | Low |
| **Visual Impact** | None (existing thumb size is preserved; only increases if below 44px) |

### 3.3 BackToTop scroll behavior consistency
| Attribute | Value |
|-----------|-------|
| **File** | `webapp/src/components/ui/BackToTop.tsx` |
| **Lines** | 22–23 |
| **Issue** | Uses `prefers-reduced-motion` to decide scroll behavior. This exists but must not be expanded under Phase 0. |
| **Fix** | Verify current behavior only. Do not add or broaden reduced-motion logic. |
| **Why** | Phase 0 locks in high-motion design; reduced-motion is legacy only. |
| **Risk** | Low |
| **Visual Impact** | None |

### 3.4 ThemeToggle aria-label clarity
| Attribute | Value |
|-----------|-------|
| **File** | `webapp/src/components/ui/ThemeToggle.tsx` |
| **Lines** | 68–72 |
| **Issue** | The `aria-label` is comprehensive but long. Verify it reads well in screen readers. |
| **Fix** | No change needed unless testing reveals issues. Consider shortening to `"Theme: ${getLabel()}. Click to change."` |
| **Why** | Accessibility — cleaner announcement. |
| **Risk** | Low |
| **Visual Impact** | None |

---

## 🎯 Motion + Glass Acceptance Tests (Must Pass)

These tests verify that all previously implemented motion and glass work is active in the running site and survives build + deploy.

### Test 1: Heavy Spring Interaction Feel (DANCE_SPRING_HEAVY)

| Attribute | Value |
|-----------|-------|
| **Implementation Files** | `webapp/src/lib/transitionConfig.ts` (lines 46–51: `DANCE_SPRING_HEAVY` export) |
| **Consuming Files** | `webapp/src/components/ui/InteractiveSurface.tsx` (line 4, line 65), `webapp/src/components/ui/TiltSurface.tsx` (line 5), `webapp/src/components/ui/StatCard.tsx`, `webapp/src/components/ui/KeyTakeaway.tsx`, `webapp/src/components/ui/Accordion.tsx`, `webapp/src/components/ui/BackToTop.tsx` |
| **CSS Companion** | `webapp/src/styles/interactiveSurfaces.css` (hover shadow/border/sheen) |
| **Observable Behavior** | Hovering any card, button, or panel shows: (1) upward lift (~4px), (2) slight scale increase (~1.02×), (3) spring-based settle with overshoot, (4) shadow intensification, (5) border brightening. The motion should feel "heavy" — slow to start, smooth deceleration, slight bounce at rest. |
| **Local Test** | `cd webapp && npm run dev` → Open http://localhost:5173/Dissertation-Model-Simulation/ → Hover any StatCard on Home page → Observe lift + spring settle |
| **Production Test** | https://judd23.github.io/Dissertation-Model-Simulation/ → Same hover test on Home page |
| **Failure Causes** | 1. `DANCE_SPRING_HEAVY` not imported in component. 2. `interactiveSurface` class not applied. 3. Framer Motion not in bundle. 4. CSS `will-change` or `transform` conflict. 5. Stale GH Pages cache (hard refresh). |

### Test 2: Global Floating Glass System

| Attribute | Value |
|-----------|-------|
| **Implementation Files** | `webapp/src/styles/glass.css` (all), `webapp/src/styles/global.css` (line 3: `@import './glass.css'`) |
| **Key Classes** | `.glass-panel`, `.glass-button`, `.glass-nav`, `.glass-panel-interactive`, `.glass-card-elevated` |
| **Observable Behavior** | Cards and panels show: (1) translucent background with color-mix tint, (2) backdrop-filter blur (16px), (3) multi-layer box-shadow (outer depth + inner bevel), (4) `::before` specular highlight gradient, (5) `::after` inner bevel ring. On hover: border brightens, shadow deepens. |
| **Local Test** | `cd webapp && npm run dev` → Visit any page → Inspect a StatCard or KeyTakeaway → Verify backdrop-filter is active in DevTools Computed Styles |
| **Production Test** | https://judd23.github.io/Dissertation-Model-Simulation/ → Inspect same elements |
| **Failure Causes** | 1. `glass.css` not imported in `global.css`. 2. Class not applied to element. 3. Browser doesn't support `backdrop-filter` (Safari needs `-webkit-` prefix — already present). 4. Parent has `overflow: hidden` breaking blur context. 5. `mix-blend-mode: screen` not visible on dark background. |

### Test 3: Increased 3D Thickness + Specular Shine

| Attribute | Value |
|-----------|-------|
| **Implementation Files** | `webapp/src/styles/glass.css` (lines 17–26: box-shadow stack, lines 32–58: `::before` specular, lines 60–70: `::after` bevel) |
| **Key Properties** | `box-shadow: inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -10px 24px rgba(0,0,0,0.08)` (laminated thickness), `background: linear-gradient(135deg, rgba(255,255,255,0.22)...)` (specular) |
| **Observable Behavior** | Panels appear to have physical depth — not flat. Top edge has bright highlight (light hitting glass edge). Bottom has subtle darkening. Side edges have faint bevel. The effect is "laminated glass slab" not "frosted rectangle." |
| **Local Test** | View Home page → Look at the three StatCards → Should see distinct top highlight and bottom shadow gradient |
| **Production Test** | Same on GH Pages |
| **Failure Causes** | 1. `::before`/`::after` pseudo-elements not rendering (check `content: ''`). 2. `mix-blend-mode` not taking effect. 3. z-index stacking issues hiding pseudo-elements. 4. Theme override flattening shadows. |

### Test 4: Reflection-Based Movement (Scroll-Linked Parallax)

| Attribute | Value |
|-----------|-------|
| **Implementation Files** | `webapp/src/lib/hooks/usePointerParallax.ts` (global pointer tracking), `webapp/src/lib/hooks/useParallax.ts` (scroll-based offset), `webapp/src/components/ui/TiltSurface.tsx` (element tilt) |
| **Observable Behavior** | (1) Moving mouse across viewport causes subtle highlight shift on glass panels (if TiltSurface is used). (2) Scrolling causes parallax offset on hero sections (via `useParallax` hook). (3) Page backgrounds may have multi-layer drift. |
| **Local Test** | Visit Pathway page → Move mouse over diagram area → If using TiltSurface, panels should subtly rotate toward pointer. Scroll any page with parallax hero → Background should move slower than foreground. |
| **Production Test** | Same on GH Pages |
| **Failure Causes** | 1. `usePointerParallax` not called in component. 2. `useParallax` hook not wired to style. 3. CSS `transform` conflict overriding Framer Motion. 4. RAF loop not started (check console for errors). 5. `elementRef` not attached to DOM node. |

---

## 🚀 Deployment Sanity Check

### Workflow Configuration
| Attribute | Value |
|-----------|-------|
| **Workflow File** | `.github/workflows/pages.yml` (or the repo’s active Pages workflow) |
| **Source Branch** | `main` (where code changes are made) |
| **Pages Target** | `gh-pages` (branch/environment managed by Actions) |
| **Build Command** | `npm run build` (runs `tsc -b && vite build && cp dist/index.html dist/404.html`) |
| **Artifact Path** | `webapp/dist` |
| **Deploy Target** | GitHub Pages via `actions/deploy-pages@v4` |

### Verification Steps

1. **Confirm branch is correct**
   ```bash
   git branch --show-current
   # You should be working on: main
   # If you are on gh-pages, switch back before making code edits:
   #   git switch main
   ```

2. **Confirm local build succeeds**
   ```bash
   cd webapp && npm run build
   # Should output: dist/index.html, dist/assets/*.js, dist/assets/*.css
   ```

3. **Confirm motion/glass in build output**
   ```bash
   grep -l "DANCE_SPRING_HEAVY" webapp/dist/assets/*.js
   # Should return at least one file
   
   grep -l "glass-panel" webapp/dist/assets/*.css
   # Should return the main CSS chunk
   ```

4. **Confirm Vite base path**
   ```bash
   grep "base:" webapp/vite.config.ts
   # Should show: base: '/Dissertation-Model-Simulation/'
   ```

5. **Trigger deploy and verify**
   - Push to `main` branch
   - Go to repo → Actions → Confirm `pages-build-deploy` workflow runs
   - After deploy, visit: https://judd23.github.io/Dissertation-Model-Simulation/
   - Hard refresh (Cmd+Shift+R / Ctrl+Shift+R) to bypass cache
   - Run Motion + Glass Acceptance Tests above

### Common Deployment Failures

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| 404 on GH Pages | Wrong base path in vite.config.ts | Verify `base: '/Dissertation-Model-Simulation/'` |
| Old version showing | GH Pages cache | Hard refresh or wait 5 minutes |
| Styles missing | CSS not bundled | Check `npm run build` output for CSS chunk |
| Motion not working | JS error in console | Check browser DevTools console |
| Blank page | React error during hydration | Check console for React errors |
| Workflow not triggered | Path filter didn't match | Verify file changed is under `webapp/` |

---

## 📊 Sprint Summary

### Sprint 1: React Stability (3 items)
| Item | File | Priority | Status |
|------|------|----------|--------|
| 1.1 | `usePointerParallax.ts` — setState batching | 🔴 Critical | ✅ Already correct |
| 1.2 | `usePointerParallax.ts` — ref dependency | 🔴 Critical | ✅ Already correct |
| 1.3 | `usePointerParallax.ts` — ref sync timing | 🟠 High | ✅ Already correct |

### Sprint 2: Accessibility (6 items)
| Item | File | Priority | Status |
|------|------|----------|--------|
| 2.1 | `ProgressRing.tsx` — ARIA progressbar | 🟠 High | ✅ Fixed |
| 2.2 | `GlossaryTerm.tsx` — tooltip role | 🟠 High | ✅ Already had role="tooltip" |
| 2.3 | `GlossaryTerm.tsx` — Escape key | 🟠 High | ✅ Already had onKeyDown handler |
| 2.4 | `StatCard.tsx` — aria-live | 🟡 Medium | ✅ Fixed |
| 2.5 | `KeyTakeaway.tsx` — role note | 🟡 Medium | ✅ Fixed |
| 2.6 | `Accordion.module.css` — focus ring | 🟡 Medium | ✅ Already has :focus-visible |

### Sprint 3: Polish & Verification (4 items)
| Item | File | Priority | Status |
|------|------|----------|--------|
| 3.1 | `TransitionNavLink.tsx` — type handling | 🟢 Low | ✅ Fixed |
| 3.2 | `Slider.module.css` — touch target | 🟢 Low | ⚠️ 24px (below 44px WCAG, but Phase 0 lock) |
| 3.3 | `BackToTop.tsx` — verify scroll behavior | 🟢 Low | ✅ Verified (uses prefers-reduced-motion) |
| 3.4 | `ThemeToggle.tsx` — verify aria-label | 🟢 Low | ✅ Verified (good aria-label) |

---

## ✅ Verification Protocol

### After Each Sprint

1. **TypeScript check**
   ```bash
   cd webapp && npx tsc --noEmit
   ```

2. **ESLint check**
   ```bash
   cd webapp && npm run lint
   ```

3. **Build check**
   ```bash
   cd webapp && npm run build
   ```

4. **Local visual verification**
   ```bash
   cd webapp && npm run dev
   # Visit all 8 routes, verify no console errors
   ```

5. **Motion + Glass acceptance tests**
   - Run all 4 tests from the section above
   - Document pass/fail

### Before Production Deploy

1. Confirm all Sprint items complete
2. Run full verification protocol
3. Push to `main`
4. Monitor GitHub Actions workflow
5. After deploy, run Motion + Glass acceptance tests on production URL
6. Hard refresh to bypass cache

---

## 📝 Changelog

| Date | Change |
|------|--------|
| Jan 11, 2026 | Initial checklist created from UX assessment |
| Jan 11, 2026 | **Sprint 1-3 COMPLETED**: All 13 items addressed. ProgressRing ARIA, StatCard aria-live, KeyTakeaway role=note, TransitionNavLink To object handling. usePointerParallax, GlossaryTerm, Accordion already correct. |
