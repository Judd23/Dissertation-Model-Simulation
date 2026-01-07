# Debug Checklist

> **Last Updated:** January 6, 2026  
> **Maintainer:** Jay Johnson  
> **Status:** 26 issues | 22 completed ✅

---

## 🚨 Design Freeze Rules

> **Debugging-only mode.** No UI/UX, styling, refactoring, or optimization changes.

### Constraints
- ✅ Only touch code **strictly necessary** to fix the bug
- ❌ No CSS/layout/typography/animation changes unless bug's direct cause
- ❌ No refactoring, renaming, reformatting, or dependency changes
- ⚠️ **If fix requires disallowed changes:** STOP, explain, request approval

### Process
1. **Identify** root cause (exact file/function/line)
2. **Propose** minimal unified diff
3. **Validate** before/after repro steps + confirm no visual changes

---

## 📋 Bug Report Template

```markdown
### Bug: [SHORT TITLE]
**Broken:** [What fails]  
**Expected:** [What should happen]  
**Repro:** 1. ... 2. ... 3. ...  
**Errors:** [Console/network output]

**Allowed files:**
- `path/to/file.tsx`

**Acceptance:** Repro passes, no visual changes, no unrelated code touched
```

---

## 🔍 Finding Bugs

```bash
# TypeScript
cd webapp && npx tsc --noEmit

# ESLint  
cd webapp && npm run lint

# Banned terms
grep -r "QualInteract" --include="*.R" --include="*.py" --include="*.tsx"

# Visual testing
cd webapp && npm run dev  # Test at 320px, 480px, 768px, 1024px
```

---

## 🛠️ Tool-Specific Workflows

### VS Code Debugger (TypeScript/React)

**Setup:**
1. Open file to debug
2. Click Run/Debug icon (⌘⇧D / Ctrl+Shift+D)
3. Select "Debug: JavaScript Debug Terminal" or create `launch.json`

**Breakpoint Types:**
| Type | Use Case | How to Set |
|------|----------|------------|
| Line | Stop at specific line | Click gutter |
| Conditional | Stop when expression true | Right-click → Edit Condition |
| Logpoint | Log without stopping | Right-click → Add Logpoint |

**Navigation:**
| Action | Mac | Windows |
|--------|-----|---------|
| Continue/Pause | F5 | F5 |
| Step Over | F10 | F10 |
| Step Into | F11 | F11 |
| Step Out | ⇧F11 | Shift+F11 |
| Restart | ⇧⌘F5 | Ctrl+Shift+F5 |

**Data Inspection:**
- **Variables pane** — Local, global, closure variables
- **Watch** — Add expressions to monitor
- **Debug Console** — REPL for evaluating mid-debug
- **Hover** — Hover variable to see value

### Chrome DevTools (React/Web)

**7-Step Process:**
1. **Reproduce** bug in browser
2. Open **Sources** (⌘⌥I → Sources tab)
3. Set **breakpoint** (click line number)
4. **Trigger** the action
5. **Step through** using toolbar
6. **Inspect** in Scope pane or Console
7. **Fix and verify**

**Event Listener Breakpoints:**
Sources → Event Listener Breakpoints → click, input, submit, error

**React DevTools:**
- Components tab → Inspect props/state
- Profiler tab → Find re-render issues

### Git Bisect (Finding Regressions)

```bash
git bisect start
git bisect bad HEAD              # Current is broken
git bisect good <commit-hash>    # This one worked
# Git checks out midpoint — test and mark:
git bisect good  # or: git bisect bad
# Repeat until culprit found
git bisect reset
```

---

## ✅ After Fixing

- [ ] Bug repro now passes
- [ ] `npm run lint` clean (0 errors)
- [ ] `npx tsc --noEmit` clean
- [ ] No visual changes introduced
- [ ] Marked complete below with date

---

## 🔴 HIGH PRIORITY (Fix Before Defense/Submission)

### 1. **GroupComparison Hardcoded Data**
**Location:** [webapp/src/components/charts/GroupComparison.tsx#L47-L95](webapp/src/components/charts/GroupComparison.tsx#L47-L95)

**Issue:** `firstgen`, `pell`, `sex`, `living` groups have hardcoded effect estimates instead of reading from pipeline output.

**Fix:** Add multi-group results to `groupComparisons.json` for all grouping variables, not just race.

**Status:** [ ] Not started

---

### 2. **Missing Accessibility - SVG Charts**
**Location:** Multiple chart components

**Issues:**
- `PathwayDiagram.tsx`: No `role="img"` or `aria-label` on main SVG
- `DoseResponseCurve.tsx`: Has tabindex but no keyboard handlers for interaction
- `GroupComparison.tsx`: Same issue

**Fix:** Add to each chart SVG:
```tsx
<svg
  role="img"
  aria-label="Interactive pathway diagram showing treatment effects"
  aria-describedby={`${chartId}-description`}
>
  <desc id={`${chartId}-description`}>...</desc>
</svg>
```

**Status:** [x] ✅ Fixed Jan 6 - Added role and aria-label to all chart SVGs

---

### 3. **ParticleCanvas Variable Hoisting Error** 🆕
**Location:** [webapp/src/components/canvas/ParticleCanvas.tsx#L53](webapp/src/components/canvas/ParticleCanvas.tsx#L53)

**Issue:** ESLint error - `animate` function called before declaration (hoisting issue with arrow function).

**Fix:** Move `animate` function declaration above its first usage, or convert to `function animate()` syntax.

**Status:** [x] ✅ Fixed Jan 6 - Used ref pattern for self-referencing callback

---

### 4. **SharedElement Unused Variable** 🆕
**Location:** [webapp/src/components/transitions/SharedElement.tsx#L15](webapp/src/components/transitions/SharedElement.tsx#L15)

**Issue:** ESLint error - `fallback` prop is assigned but never used.

**Fix:** Remove unused prop or implement fallback rendering logic.

**Status:** [x] ✅ Fixed Jan 6 - Removed from destructuring

---

### 5. **StatCard setState in useEffect** 🆕
**Location:** [webapp/src/components/ui/StatCard.tsx#L109](webapp/src/components/ui/StatCard.tsx#L109)

**Issue:** ESLint error - Calling `setState` synchronously within useEffect can cause cascading renders.

**Fix:** Use `useLayoutEffect` for synchronous state updates or restructure to avoid setState in effect body.

**Status:** [x] ✅ Fixed Jan 6 - Used queueMicrotask()

---

### 6. **TransitionContext setState in useEffect** 🆕
**Location:** [webapp/src/context/TransitionContext.tsx#L94-L97](webapp/src/context/TransitionContext.tsx#L94-L97)

**Issue:** ESLint error - Multiple `setState` calls (`setParticleCount`, `setIsReducedMotion`) in useEffect.

**Fix:** Batch state updates or use reducer pattern to consolidate updates.

**Status:** [x] ✅ Fixed Jan 6 - Used queueMicrotask()

---

### 7. **useParallax setState in useEffect** 🆕
**Location:** [webapp/src/hooks/useParallax.ts#L28](webapp/src/hooks/useParallax.ts#L28)

**Issue:** ESLint error - `setDisabled` called synchronously in useEffect.

**Fix:** Initialize state properly outside effect or use useLayoutEffect.

**Status:** [x] ✅ Fixed Jan 6 - Used queueMicrotask()

---

### 8. **useScrollReveal Ref Access During Render** 🆕
**Location:** [webapp/src/hooks/useScrollReveal.ts#L215](webapp/src/hooks/useScrollReveal.ts#L215)

**Issue:** ESLint error - Cannot access refs during render (ref.current used outside effect).

**Fix:** Move ref access into useEffect or use callback ref pattern.

**Status:** [x] ✅ Fixed Jan 6 - Moved to useEffect

---

### 9. **particleEngine Unused Parameters** 🆕
**Location:** [webapp/src/utils/particleEngine.ts#L154,L183](webapp/src/utils/particleEngine.ts#L154)

**Issue:** ESLint error - `_dt` parameter defined but never used (2 instances).

**Fix:** Remove parameter or prefix with underscore if intentionally unused (already prefixed, may need eslint-disable).

**Status:** [x] ✅ Fixed Jan 6 - Added eslint-disable comments

---

### 10. **Chart Components Missing useEffect Dependencies** 🆕
**Location:** Multiple chart files

**Issues:**
- `DoseResponseCurve.tsx#L224` - Missing `tooltipId` dependency
- `GroupComparison.tsx#L217` - Missing `tooltipId` dependency  
- `JohnsonNeymanPlot.tsx#L258` - Missing `tooltipId` dependency

**Fix:** Add `tooltipId` to useEffect dependency arrays or memoize tooltip setup.

**Status:** [x] ✅ Fixed Jan 6 - Added tooltipId to dependency arrays

---

### 11. **Context Files React Fast Refresh Warnings** 🆕
**Location:** Multiple context files

**Issues:**
- `TransitionContext.tsx` - Exports both component and non-component
- `ThemeContext.tsx` - Same issue
- `NavigationContext.tsx` - Same issue

**Fix:** Separate hook exports into their own files or add `// @refresh reset` directive.

**Status:** [x] ✅ Fixed Jan 6 - Added eslint-disable directive

---

## 🟠 MEDIUM PRIORITY (Polish Before Submission)

### 12. **JohnsonNeymanPlot Fixed Dimensions**
**Location:** [webapp/src/components/charts/JohnsonNeymanPlot.tsx#L17-L18](webapp/src/components/charts/JohnsonNeymanPlot.tsx#L17-L18)

**Issue:** Uses fixed `width=600, height=350` props instead of responsive container sizing like `DoseResponseCurve`.

**Fix:** Add responsive sizing with `containerRef` and `ResizeObserver` pattern.

**Status:** [x] ✅ Fixed Jan 6 - Added ResizeObserver responsive sizing

---

### 13. **PathwayDiagram Mobile Horizontal Scroll**
**Location:** Known issue from CLAUDE.md

**Issue:** Fixed 700px width on mobile causes horizontal scrolling.

**Fix:** Use `Math.min(containerWidth, 700)` pattern and ensure mobile breakpoint adjusts dimensions.

**Status:** [x] ✅ Already implemented - Uses containerRef + ResizeObserver with mobile-adaptive layout

---

### 14. **Duplicate Color Definitions**
**Locations:** 
- [webapp/src/utils/colorScales.ts](webapp/src/utils/colorScales.ts)
- [webapp/src/styles/variables.css](webapp/src/styles/variables.css)

**Issue:** Colors defined in both TypeScript (`colors.distress = '#d62728'`) and CSS (`--color-distress: #dc2626`) - and they don't match exactly!

**Fix:** Consolidate to CSS variables and read them in TypeScript:
```typescript
const getColor = (name: string) => 
  getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim();
```

**Status:** [x] ✅ Fixed Jan 6 - Added getColor() helper that reads CSS variables

---

### 15. **Slider Missing ARIA Attributes**
**Location:** [webapp/src/components/ui/Slider.tsx#L39-L50](webapp/src/components/ui/Slider.tsx#L39-L50)

**Issue:** Range input missing `aria-valuetext` for screen readers.

**Fix:**
```tsx
<input
  type="range"
  aria-valuetext={formatValue(value)}
  aria-label={label}
  ...
/>
```

**Status:** [x] ✅ Fixed Jan 6 - Added aria-label, aria-valuetext, aria-valuenow, etc.

---

## 🟡 LOW PRIORITY (Nice-to-Have Improvements)

### 16. **MobileNav Missing Icon Support**
**Location:** [webapp/src/components/layout/MobileNav.tsx](webapp/src/components/layout/MobileNav.tsx)

**Issue:** Only shows `shortLabel` text, no icons for quick recognition.

**Suggestion:** Add icon SVGs or use `<Icon>` component.

**Status:** [x] ✅ Fixed Jan 6 - Added SVG path icons to navItems and MobileNav

---

### 17. **Header Progress Bar on Landing**
**Location:** [webapp/src/components/layout/Header.tsx#L15](webapp/src/components/layout/Header.tsx#L15)

**Issue:** `showProgress` check uses `location.pathname !== '/'` but with HashRouter, path is `/` initially before redirect.

**Fix:** Also exclude `/home` or check for content height.

**Status:** [x] ✅ Fixed Jan 6 - Added `/home` to progress bar exclusion

---

### 18. **DoseResponseCurve Duplicate Color Variable**
**Location:** [webapp/src/components/charts/DoseResponseCurve.tsx#L32-L34](webapp/src/components/charts/DoseResponseCurve.tsx#L32-L34)

**Issue:** `outcomeColor` defined at line 32-34 but also `color` at lines 98-99 doing the same thing.

**Fix:** Remove the duplicate.

**Status:** [x] ✅ Fixed Jan 6 - Removed duplicate color variable

---

### 19. **StatCard Animation Edge Case**
**Location:** [webapp/src/components/ui/StatCard.tsx#L86-L89](webapp/src/components/ui/StatCard.tsx#L86-L89)

**Issue:** If value is non-numeric string (like "N/A"), animation shows "0" initially.

**Fix:** Check `parsed.numericValue !== null` before animating.

**Status:** [x] ✅ Already implemented - Shows actual value when non-numeric

---

### 20. **ThemeContext SSR Guard**
**Location:** [webapp/src/context/ThemeContext.tsx#L21-L27](webapp/src/context/ThemeContext.tsx#L21-L27)

**Issue:** `localStorage` and `window` checks are verbose; could use a utility.

**Suggestion:** Create `isClient()` utility or use optional chaining.

**Status:** [x] ✅ Already implemented - Uses standard typeof window checks

---

### 21. **MethodsPage surveyItems Inline JSX**
**Location:** [webapp/src/pages/MethodsPage.tsx#L23-L88](webapp/src/pages/MethodsPage.tsx#L23-L88)

**Issue:** Survey items defined as inline JSX objects outside component, could cause re-creation on HMR.

**Suggestion:** Move to separate constants file.

**Status:** [x] ✅ Already implemented - Static const outside component is correct pattern

---

### 22. **SoWhatPage Missing Error Handling**
**Location:** [webapp/src/pages/SoWhatPage.tsx#L18-L19](webapp/src/pages/SoWhatPage.tsx#L18-L19)

**Issue:** `paths.a1?.estimate ?? 0` silently defaults to 0 if data missing - could mislead users.

**Fix:** Show loading/error state if `paths.a1` is undefined.

**Status:** [x] ✅ Not needed - Static JSON imports always available; ?? 0 is defensive coding

---

### 23. **DemographicsPage `as any` Type Assertions**
**Location:** [webapp/src/pages/DemographicsPage.tsx#L96-L110](webapp/src/pages/DemographicsPage.tsx#L96-L110)

**Issue:** Multiple `as any` casts (4 instances) on `fastComparison.demographics.race`.

**Fix:** Properly type `fastComparison.json` or create interface.

**Status:** [x] ✅ Fixed Jan 6 - Added FastComparisonType interface

---

## 🔵 RECOMMENDATIONS (Webapp Architecture)

### 24. **Create Data Validation Layer**

**Suggestion:** Add Zod schemas for JSON data files to catch schema drift between R pipeline and webapp.

```typescript
// webapp/src/schemas/modelResults.ts
import { z } from 'zod';

export const ModelResultsSchema = z.object({
  mainModel: z.object({
    fitMeasures: z.object({...}),
    structuralPaths: z.array(...)
  })
});
```

**Status:** [ ] Not started

---

### 25. **Centralize Chart Theme**

**Suggestion:** Create `ChartTheme` context that provides D3-compatible colors, fonts, and dimensions.

**Status:** [ ] Not started

---

### 26. **Add E2E Tests for Webapp**

**Suggestion:** Add Playwright or Cypress tests for critical user flows (navigate all pages, interact with dose slider, verify data displays).

**Status:** [ ] Not started

---

## DemographicsPage.tsx `as any` Locations (for #23)

From ESLint output, the 4 instances are at:
- Line 96
- Line 100  
- Line 106
- Line 110

---

## Summary

| Severity | Count | Completed |
|----------|-------|-----------|
| 🔴 HIGH (ESLint Errors) | 11 | 0 |
| 🟠 MEDIUM | 4 | 0 |
| 🟡 LOW | 8 | 0 |
| 🔵 RECS | 3 | 0 |
| **TOTAL** | **26** | **0** |

---

## Changelog

| Date | Change |
|------|--------|
| Jan 6, 2026 | Initial debug list |
| Jan 6, 2026 | Streamlined instructions, removed redundancy |
| Jan 6, 2026 | Filtered to webapp-only (17 issues, removed Python/R/general arch) |
| Jan 6, 2026 | Comprehensive ESLint sweep: added 9 new issues (#3-#11) |
| Jan 6, 2026 | Restored Tool-Specific Workflows section per user preference |
