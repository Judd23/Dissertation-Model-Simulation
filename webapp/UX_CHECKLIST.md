@ -1,445 +1 @@
# UX Checklist and Operating Rules (Phase 0)

> **Last updated:** January 11, 2026  
> **Phase 0 visual lock:** Do not change blur, opacity, glass thickness, motion density, timing, spacing, glow, gradients, hover feel, or animation timing.

This file is the single source of truth for (a) repo health gates, (b) how the site deploys, (c) the global motion + glass system, and (d) the verification steps that prove changes are real in production.

---

## 0) Repo Health Gate (run before any UX work)

If these fail, UI symptoms can be misleading (stale deploys, broken pulls, inconsistent builds).

| Gate | Command | Pass condition | If it fails |
|---|---|---|---|
| Git refs clean | `git show-ref --head` | No warnings mentioning `refs/... 2` | Local `.git` refs are corrupted. Fix before pull/rebase/deploy. |
| Git object DB sane | `git fsck --full` | No `fatal: bad object` | Object DB corruption. Diffs/builds can be unreliable. |
| Node types clean (local installs only) | `ls node_modules/@types | grep " 2"` | No results | `@types/* 2` duplicates. Delete `node_modules` and reinstall. |

**Rule:** Do not start UI work until the gates pass.

---

## 1) What deploys the live site

The live site is published via **GitHub Pages using GitHub Actions**.

### 1.1 Pages source of truth

- Code changes are made on: `main`
- Pages deployment output: managed by Actions (often labeled `github-pages` or `gh-pages` in the Actions UI)
- Do **not** merge `gh-pages` into `main`.

### 1.2 Verify Pages settings

GitHub repo → **Settings → Pages**

| Setting | Expected value |
|---|---|
| **Source** | GitHub Actions |

If Settings → Pages is set to “Deploy from a branch”, stop and change it to GitHub Actions (or align the workflow accordingly). The workflow should be the only deploy mechanism.

### 1.3 Build output that Pages serves

- Build output directory: `webapp/dist`
- Vite base path: `/Dissertation-Model-Simulation/`

---

## 2) Cache + Version Truth (how to prove you are seeing the right build)

GitHub Pages and browsers cache aggressively. Visual checks must be verifiable.

- After each deploy: hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
- Add a visible build identifier (timestamp or commit SHA) in the UI footer when convenient, so production can be verified without guessing.

---

## 3) Motion policy (Phase 0)

- No new reduced-motion behavior is added in Phase 0.
- If reduced-motion logic already exists in the codebase, it stays as-is. Do not expand it.
- All new work preserves heavy spring, parallax, glass thickness, reflections, and motion density.

---

## 4) Global UX scaffold (what must be consistent across pages)

### 4.1 Global background orbs (all pages)

Intent: every page background should match the “Wow it Works” page’s orb system.

**Owner:** the global layout background component(s).  
**Rule:** pages should not override the background with their own competing gradients unless explicitly approved.

Verification checklist:
- Background orbs visible on every route.
- Same orb palette + blur intensity + depth feel across routes.
- No route has a flat fallback color that wipes the orb layers.

### 4.2 Glass + shine system (shared CSS)

Source of truth:
- `webapp/src/styles/glass.css`
- `webapp/src/styles/global.css` imports `glass.css`

Required characteristics (Phase 0 locked):
- translucent tint + blur
- laminated thickness (multi-layer shadow)
- specular highlight (`::before`)
- inner bevel ring (`::after`)

### 4.3 Interaction system (heavy spring)

The heavy spring feel must apply to every interactive surface.

- Motion preset: `DANCE_SPRING_HEAVY` in `webapp/src/lib/transitionConfig.ts`
- Common surface component(s): `InteractiveSurface`, `TiltSurface`, and any button/panel wrappers

Coverage list (must match across pages):
- Header nav links (desktop + mobile)
- Primary + secondary buttons
- All `InteractiveSurface` panels
- `StatCard`, `KeyTakeaway`, accordion items
- `GlossaryTerm` trigger
- `BackToTop`
- Sliders and toggles

Pages to test (Phase 0): Home, Methods, Pathway, So What, Researcher.

---

## 5) React stability gates (do these before polish)

These are runtime correctness checks. If they fail, UI can look frozen or inconsistent.

### 5.1 `usePointerParallax` must not mutate refs during render

| Field | Value |
|---|---|
| File | `webapp/src/lib/hooks/usePointerParallax.ts` |
| Symptom | React error: “Cannot access refs during render / Cannot update ref during render.” |
| Failure pattern | Assigning `someRef.current = ...` in render body (outside effects/callbacks) |
| Fix standard | Move ref writes into an effect, or replace with `useCallback` + effect wiring |

### 5.2 `usePointerParallax` state updates must be driven by the RAF loop

| Field | Value |
|---|---|
| File | `webapp/src/lib/hooks/usePointerParallax.ts` |
| Symptom | React warning about cascading renders from setState inside an effect |
| Fix standard | Let the RAF tick be the single writer of `setPosition`; if immediate reset is necessary, schedule it via `requestAnimationFrame` |

### 5.3 Ref syncing must be effect-based

| Field | Value |
|---|---|
| File | `webapp/src/lib/hooks/usePointerParallax.ts` |
| Failure pattern | `enabledRef.current = enabled` (or similar) executed in render |
| Fix standard | Sync those refs in an effect (`useEffect` or `useLayoutEffect` only when needed) |

---

## 6) Accessibility checklist (no visual impact)

Phase 0 is a visual lock, not a functional lock. These changes are allowed if they do not change appearance.

### 6.1 ProgressRing semantics

| Field | Value |
|---|---|
| File | `webapp/src/components/ui/ProgressRing.tsx` |
| Requirement | Container has `role="progressbar"` + `aria-valuenow/min/max` + a clear `aria-label` |

### 6.2 Glossary tooltip semantics + dismiss

| Field | Value |
|---|---|
| File | `webapp/src/components/ui/GlossaryTerm.tsx` |
| Requirement | Tooltip container has `role="tooltip"` and keyboard users can dismiss via Escape |

### 6.3 StatCard live region

| Field | Value |
|---|---|
| File | `webapp/src/components/ui/StatCard.tsx` |
| Requirement | Animated numeric value is wrapped in `aria-live="polite" aria-atomic="true"` |

### 6.4 KeyTakeaway callout role

| Field | Value |
|---|---|
| File | `webapp/src/components/ui/KeyTakeaway.tsx` |
| Requirement | Callout container has `role="note"` |

### 6.5 Accordion focus visibility

| Field | Value |
|---|---|
| File | `webapp/src/components/ui/Accordion.module.css` |
| Requirement | `:focus-visible` is present and visible for keyboard users |

---

## 7) Motion + glass acceptance tests (must pass in dev and production)

These prove the Phase 0 system is actually active.

### Test A: Heavy spring interaction feel

- Hover any `StatCard` on Home
- Expected: lift + subtle scale + heavy spring settle + shadow/border intensify

### Test B: Glass thickness + specular shine

- Inspect a glass panel/card on any route
- Expected: blur + layered depth + visible top highlight + inner bevel ring

### Test C: Scroll-linked parallax + reflections

- Scroll a page with parallax sections and move pointer over `TiltSurface` regions
- Expected: visible parallax drift and subtle highlight shift where used

### Test D: Background orbs

- Visit Home, Methods, Pathway, So What
- Expected: orb background visible and consistent, matching the “Wow it Works” intent

---

## 8) Deploy sanity check (local build to Pages)

### 8.1 Confirm branch and sync state

```bash
git branch --show-current
# Expected: main

git status -sb
```

### 8.2 Local build must succeed

```bash
cd webapp
npm run build
```

Expected artifacts:
- `webapp/dist/index.html`
- `webapp/dist/assets/*.js`
- `webapp/dist/assets/*.css`

### 8.3 Vite base path must match Pages

```bash
grep "base:" webapp/vite.config.ts
# Expected: base: '/Dissertation-Model-Simulation/'
```

### 8.4 Deploy

- Push to `main`
- GitHub → Actions: confirm Pages workflow runs
- After it completes, hard refresh the production site

---

## 9) Backlog tracker (status must be explicit)

Use this section to record what is actually verified. Do not mark items complete unless they were tested after the last pull/rebase.

### 9.1 React stability

- [ ] 5.1 No render-phase ref writes in `usePointerParallax`
- [ ] 5.2 RAF loop is the single state writer for pointer position
- [ ] 5.3 Ref syncing occurs only in effects

### 9.2 Accessibility

- [ ] 6.1 ProgressRing has correct progressbar semantics
- [ ] 6.2 Glossary tooltip has `role="tooltip"` and Escape dismiss
- [ ] 6.3 StatCard value announces final number
- [ ] 6.4 KeyTakeaway has `role="note"`
- [ ] 6.5 Accordion keyboard focus ring is visible

### 9.3 Visual system checks (Phase 0)

- [ ] Background orbs consistent across routes (matches “Wow it Works” intent)
- [ ] Glass thickness + shine visible across routes
- [ ] Heavy spring present on all interactive surfaces

---

## 10) Changelog

| Date | Change |
|---|---|
| Jan 11, 2026 | Consolidated into a single UX scaffold: repo gates → deploy truth → Phase 0 policy → global background/glass/motion system → acceptance tests → deploy checks → explicit backlog tracker |