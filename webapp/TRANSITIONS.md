# Transition System Documentation

> **Last Updated:** January 8, 2026  
> **Status:** Core infrastructure complete, page integration pending

---

## Overview

The webapp uses **Framer Motion** for shared-element morphing and page transitions. The goal is to make everything move like an "organized dance" — slow, elegant, viewport-aware animations.

### Design Principles

1. **No fast transitions** — Minimum 600ms for any animation
2. **Center-out awareness** — Elements closer to viewport center animate first
3. **Spring physics** — Natural motion with `stiffness: 60, damping: 20, mass: 1.2`
4. **Seamless page swaps** — No exit fade, instant swap with enter reveals
5. **Accessibility first** — Respects `prefers-reduced-motion`

---

## Architecture

### App.tsx Structure

```tsx
<ThemeProvider>
  <MotionConfig reducedMotion="user">
    <ModelDataProvider>
      <ResearchProvider>
        <ChoreographerProvider>
          <HashRouter>
            <ScrollToTop />
            <LayoutGroup id="app">
              <AnimatePresence mode="sync">
                <Routes location={location} key={location.pathname}>
                  ...
                </Routes>
              </AnimatePresence>
            </LayoutGroup>
          </HashRouter>
        </ChoreographerProvider>
      </ResearchProvider>
    </ModelDataProvider>
  </MotionConfig>
</ThemeProvider>
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `MotionConfig` | App.tsx | Global reduced-motion handling |
| `LayoutGroup` | App.tsx | Namespaces layoutId morphs |
| `AnimatePresence` | App.tsx | Route enter/exit orchestration |
| `ChoreographerProvider` | Context | Viewport tracking, center-out stagger |
| `MorphableElement` | Transitions | Smart wrapper with category springs |
| `SharedElement` | Transitions | Cross-page element morphing |

---

## Component Reference

### MorphableElement

Smart wrapper that auto-registers with viewport tracking and applies category-specific spring physics.

```tsx
import MorphableElement, { MorphableCard, MorphableHero } from '../components/transitions/MorphableElement';

// Basic usage
<MorphableElement layoutId="stat-1" category="card">
  <StatCard ... />
</MorphableElement>

// Convenience presets
<MorphableHero layoutId="page-hero">...</MorphableHero>
<MorphableCard layoutId="card-1">...</MorphableCard>
```

**Props:**
- `layoutId` (required) — Unique ID for cross-page morphing
- `category` — Spring physics preset: `hero | card | text | chart | decoration`
- `revealOnScroll` — Enable viewport-triggered reveal
- `revealDirection` — `up | down | left | right | scale`

**Category Springs:**
| Category | Stiffness | Damping | Mass | Settle Time |
|----------|-----------|---------|------|-------------|
| hero | 50 | 22 | 1.5 | ~1400ms |
| card | 60 | 20 | 1.2 | ~1200ms |
| text | 80 | 18 | 0.8 | ~800ms |
| chart | 60 | 20 | 1.2 | ~1200ms |
| decoration | 80 | 18 | 0.8 | ~800ms |

### SharedElement

Simpler wrapper for cross-page morphing without viewport tracking.

```tsx
import SharedElement from '../components/transitions/SharedElement';

// On Page A
<SharedElement id="page-title">
  <h1>Title</h1>
</SharedElement>

// On Page B (same layoutId = morph)
<SharedElement id="page-title">
  <h1>Different Title</h1>
</SharedElement>
```

### StatCard & KeyTakeaway

These components have built-in `layoutId` prop support:

```tsx
<StatCard layoutId="stat-main" value="42%" label="Success" />
<KeyTakeaway layoutId="takeaway-1">...</KeyTakeaway>
```

---

## Integration Checklist

### Per-Page Tasks

For each page, add SharedElement wrappers for continuity:

- [ ] **LandingPage** — `page-kicker`, `page-title`, `page-panel`
- [ ] **HomePage** — Match IDs from LandingPage for morph
- [ ] **DemographicsPage** — Header elements
- [ ] **DoseExplorerPage** — Header elements
- [ ] **MethodsPage** — Header elements
- [ ] **PathwayPage** — Header elements
- [ ] **SoWhatPage** — Header elements
- [ ] **ResearcherPage** — Header elements

### Standard SharedElement IDs

| ID | Purpose | Pages Using |
|----|---------|-------------|
| `page-kicker` | Eyebrow text above title | All |
| `page-title` | Main h1 heading | All |
| `page-panel` | Primary content panel | Landing, Home |

---

## Verification Protocol

### After Any Transition Change

1. **No flash/gap test**
   ```bash
   # Navigate Landing → Home in browser
   # Confirm: No white flash, instant swap
   ```

2. **Scroll position test**
   ```bash
   # Scroll down on any page, then navigate
   # Confirm: New page starts at top (scrollY === 0)
   ```

3. **Reduced motion test**
   ```bash
   # DevTools > Rendering > Emulate prefers-reduced-motion
   # Confirm: Animations skip/instant
   ```

4. **Console clean test**
   ```bash
   # Open DevTools Console
   # Navigate all routes
   # Confirm: No AnimatePresence warnings or errors
   ```

### Performance Checks

- [ ] Lighthouse Performance ≥ 90
- [ ] No "Forced reflow" warnings
- [ ] 60fps during transitions (DevTools > Rendering > Frame Stats)
- [ ] Animated elements use GPU (transform, not width/height)

---

## Troubleshooting

### SharedElement Not Morphing

1. **Check layoutId match** — Must be identical string on both pages
2. **Check LayoutGroup** — Both pages must be inside same `LayoutGroup`
3. **Check AnimatePresence mode** — Must be `mode="sync"` (not "wait")
4. **Check element mounting** — Both elements must exist during transition

### Page Flashes White

1. **Remove exit animation** — Set `exit: {}` in pageVariants
2. **Use mode="sync"** — Not "wait" which unmounts before mounting

### Animations Too Fast/Slow

Edit `webapp/src/config/transitionConfig.ts`:
- `DANCE_SPRING` — Main spring physics
- `TIMING` — Duration constants
- `pageVariants` — Page enter/exit

---

## Configuration Reference

### transitionConfig.ts

```typescript
// Main spring (1200ms settle)
export const DANCE_SPRING = {
  type: 'spring',
  stiffness: 60,
  damping: 20,
  mass: 1.2,
};

// Timing constants
export const TIMING = {
  hover: 600,
  reveal: 1000,
  enter: 1200,
  exit: 700,
  morph: 900,
  stagger: 150,
};

// Page variants (no exit = seamless)
export const pageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.25, when: 'beforeChildren', staggerChildren: 0.06 },
  },
  exit: { opacity: 1, transition: { duration: 0 } },
};
```

### variables.css (CSS Tokens)

```css
--spring-stiffness: 60;
--spring-damping: 20;
--spring-mass: 1.2;
--stagger-delay: 150ms;
--transition-reveal: 1000ms;
--transition-morph-duration: 1000ms;
```

---

## Changelog

| Date | Change |
|------|--------|
| Jan 8, 2026 | Split from Debugs.md into dedicated file |
| Jan 7, 2026 | App.tsx: Added MotionConfig, LayoutGroup, AnimatePresence mode="sync" |
| Jan 7, 2026 | Added ChoreographerProvider for viewport tracking |
| Jan 6, 2026 | Created transitionConfig.ts, MorphableElement, ChoreographedReveal |
