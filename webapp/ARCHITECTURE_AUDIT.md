# Webapp Architecture Audit

## Scope

- Included: `webapp/src/**`, `webapp/public/**`, `webapp/scripts/**`, and top-level webapp files.
- Excluded: `webapp/node_modules/**`, `webapp/dist/**`.
- Asset coverage: binary images in `webapp/public/**` and `webapp/L3091 copy.jpg` included as inventory items (no binary inspection).

## Summary of clutter and efficiency risks

- High: Multiple transition systems coexist (TransitionContext, ChoreographerContext, Framer Motion, CSS reveal) with several unused transition components. This adds cognitive overhead and makes routing effects harder to reason about.
- High: Data schema drift and placeholders. `sampleDescriptives.json` shape does not match the assumptions in `webapp/src/context/ModelDataContext.tsx`, `groupComparisons.json` includes placeholder values, and `fastComparison.json` has zeroed sex counts.
- Medium: CSS bloat. Page-level CSS modules are very large (700-1600 lines each), plus global styles and multiple glass systems in `webapp/src/styles/global.css`, `webapp/src/styles/glass.css`, and `webapp/src/components/ui/GlassPanel.module.css`.
- Medium: D3 chart code is duplicated across multiple components (axes, grid, tooltip, resizing patterns) with full redraws on most updates, which is both verbose and harder to optimize.
- Medium: Unused components and assets remain from prior iterations or templates (e.g., `MorphProvider`, `TransitionOverlay`, `useD3`, `Badge`, `Skeleton`, template SVGs).
- Low: Fonts load via CSS `@import` (render-blocking), and large unused binary assets add repository weight.

## High-level architecture map

- Runtime tree: `App.tsx` wraps providers (Theme, MotionConfig, ModelData, Research, Transition, Choreographer) -> `HashRouter` -> `Routes` -> `Layout` -> `TransitionOrchestrator` -> page components.
- Data flow: pipeline scripts in `webapp/scripts/**` transform project outputs into JSON in `webapp/src/data/**`. Components either import JSON directly or use `ModelDataContext` for derived helpers.
- Styling: global tokens in `webapp/src/styles/variables.css`, global defaults and utility classes in `webapp/src/styles/global.css`, and per-component CSS Modules. A separate glass style system also exists in `webapp/src/styles/glass.css` and in the `GlassPanel` component.

## Major findings and implications

- Transition system complexity:
  - `TransitionContext` and `ChoreographerContext` both manage reduced motion and transition phases; CSS reveal classes add a third animation layer.
  - Several transition components are present but unused, which implies dead code paths and unclear “source of truth” for navigation effects.
- Data consistency issues:
  - `ModelDataContext` expects `sampleDescriptives.demographics.transferCredits.fast` and `.nonFast`, but `sampleDescriptives.json` only provides aggregate `transferCredits` stats, so `fastCount` and `fastPercent` default to fallbacks.
  - `groupComparisons.json` includes a `_metadata` note that placeholders exist for some multi-group results.
  - `fastComparison.json` has zero values for sex across fast/nonfast groups, suggesting pipeline or data issues.
  - `variableMetadata.json` contains constructs/paths but no `variables` map (the pipeline probably could not read the codebook).
- UI and styling complexity:
  - Page CSS modules are large and embed layout, animation, and decorative backgrounds in one file, creating big maintenance surfaces.
  - The glass design system is implemented in three places (global, glass.css, and `GlassPanel`), leading to duplication and drift.
- Code organization:
  - Several components and hooks appear unused (see file-by-file notes). This increases bundle size and makes onboarding harder.
  - D3 chart components reimplement similar scaling, grid, tooltip, and resize logic instead of sharing utilities.

## Overhaul direction (conceptual)

- Pick one transition system and remove or consolidate the rest. Keep either the Framer Motion path or the custom context-based orchestration, but not both.
- Enforce data schemas at runtime by wiring `webapp/src/schemas/modelData.ts` into `ModelDataContext` and/or build scripts.
- Split large page components into sections with co-located CSS, then extract repeatable patterns (cards, grids, section headers).
- Centralize D3 chart scaffolding (axes, grid, tooltip positioning, resize) into shared helpers to reduce duplication.
- Consolidate glass styles into a single implementation (either global utilities or `GlassPanel`, not both).
- Remove unused assets and template files after confirming they are not referenced.

## File-by-file notes

### Top-level webapp files

- `webapp/README.md`: Vite template README; no project-specific info. Consider replacing with project docs.
- `webapp/BUGS.md`: Open issues list; calls out missing data validation, chart theme centralization, and E2E tests.
- `webapp/TRANSITIONS.md`: Detailed transition design doc; notes that page integration is still pending.
- `webapp/CLAUDE.md`: Local rules for tooling and changes.
- `webapp/index.html`: Vite entry with title/metadata and root mount.
- `webapp/vite.config.ts`: Vite config sets `base` for GitHub Pages.
- `webapp/eslint.config.js`: ESLint config for TS/React; ignores public/scripts.
- `webapp/tsconfig.json`: TypeScript project references.
- `webapp/tsconfig.app.json`: App TS config (strict, bundler mode).
- `webapp/tsconfig.node.json`: Node TS config for Vite config.
- `webapp/package.json`: React 19 + Vite + Framer Motion + D3. Build copies `dist/index.html` to `dist/404.html` for GH Pages.
- `webapp/package-lock.json`: NPM lockfile.
- `webapp/.gitignore`: Webapp-specific ignores.
- `webapp/.DS_Store`: OS artifact; safe to remove.
- `webapp/L3091 copy.jpg`: 22MB binary image in repo root; not referenced by app.

### Scripts

- `webapp/scripts/generate_fast_comparison.py`: Reads `1_Dataset/rep_data.csv` and produces `fastComparison.json` with demographic comparisons.
- `webapp/scripts/transform-results.py`: Main pipeline transformer; outputs `modelResults.json`, `doseEffects.json`, `groupComparisons.json`, `sampleDescriptives.json`, `variableMetadata.json`, `dataMetadata.json`. Note: includes placeholder logic for multi-group results and metadata generation.

### App entry

- `webapp/src/main.tsx`: React root; renders `<App />` inside `StrictMode`.
- `webapp/src/App.tsx`: Provider stack + HashRouter + routes. Notes: uses `TransitionProvider` and `ChoreographerProvider` in parallel.

### Context

- `webapp/src/context/ThemeContext.tsx`: Theme persistence + system theme handling.
- `webapp/src/context/ModelDataContext.tsx`: Parses JSON data and exposes helpers. Mismatch with `sampleDescriptives.json` structure causes fallback `fastCount` and `fastPercent`.
- `webapp/src/context/ResearchContext.tsx`: UI state for dose, grouping, toggles, highlighted paths.
- `webapp/src/context/TransitionContext.tsx`: Transition phases, particle settings, shared element registry. No `TransitionOverlay` usage means particle transitions likely have no visible overlay.
- `webapp/src/context/ChoreographerContext.tsx`: Center-out animation orchestration; separate from `TransitionContext`.
- `webapp/src/context/ChartThemeContext.tsx`: Chart theme configuration; currently unused.

### Hooks

- `webapp/src/hooks/useScrollRestoration.ts`: Scroll position map for back/forward navigation.
- `webapp/src/hooks/useScrollReveal.ts`: IntersectionObserver-based reveal system + staggered reveal helpers.
- `webapp/src/hooks/useParallax.ts`: Scroll-based parallax offset with reduced motion handling.
- `webapp/src/hooks/usePageTransition.ts`: Drives transitions using `TransitionContext` and router.
- `webapp/src/hooks/useD3.ts`: D3 helper; currently unused.

### Utilities

- `webapp/src/utils/colorScales.ts`: Color utilities tied to CSS variables with fallbacks.
- `webapp/src/utils/formatters.ts`: Numeric formatting and label mappings.
- `webapp/src/utils/particleEngine.ts`: Particle system for transition overlay; unused without `TransitionOverlay`.

### Config

- `webapp/src/config/transitionConfig.ts`: Central motion constants, page variants, reveal variants.

### Styles

- `webapp/src/styles/variables.css`: Design tokens and theme overrides.
- `webapp/src/styles/global.css`: Global resets, typography, utilities, button system, reveal classes, and glass-like panel styles.
- `webapp/src/styles/glass.css`: Separate glass system, overlaps with `global.css` and `GlassPanel` styles.

### Data (JSON)

- `webapp/src/data/modelResults.json`: 11 structural paths + fit measures. Used for charts and model stats.
- `webapp/src/data/doseEffects.json`: Dose coefficients and 17 dose levels; includes Johnson-Neyman points.
- `webapp/src/data/groupComparisons.json`: Group comparisons for race/firstgen/pell/sex/living. Includes `_metadata` note that some groups are placeholders.
- `webapp/src/data/sampleDescriptives.json`: Demographics and outcomes. Structure does not match `ModelDataContext` expectations for transfer credit splits.
- `webapp/src/data/fastComparison.json`: FASt vs non-FASt comparisons; sex section is all zeros (likely bad data).
- `webapp/src/data/variableMetadata.json`: Constructs and path labels only; `variables` list is empty, likely due to missing codebook parsing.
- `webapp/src/data/dataMetadata.json`: Pipeline timestamps and metadata.

### Schema

- `webapp/src/schemas/modelData.ts`: Zod schemas for data validation; currently unused, but would directly address data drift.

### Assets (src)

- `webapp/src/assets/react.svg`: Template asset; not referenced.

### Pages (TSX + CSS)

- `webapp/src/pages/LandingPage.tsx`: Animated landing with dust particles + logo; heavy visual logic.
- `webapp/src/pages/LandingPage.module.css` (878 lines): Landing layout, hero, animations.
- `webapp/src/pages/HomePage.tsx`: Summary page with stats, key findings, and navigation.
- `webapp/src/pages/HomePage.module.css` (695 lines): Home page styling.
- `webapp/src/pages/DemographicsPage.tsx`: Equity breakdown, toggles, forest plots.
- `webapp/src/pages/DemographicsPage.module.css` (925 lines): Dense layout and card styles.
- `webapp/src/pages/DoseExplorerPage.tsx`: Slider-driven charts and JN plots.
- `webapp/src/pages/DoseExplorerPage.module.css` (749 lines): Controls, charts, and layout styles.
- `webapp/src/pages/MethodsPage.tsx`: Large, narrative methods page with charts and tables.
- `webapp/src/pages/MethodsPage.module.css` (840 lines): Methods layout, tables, cards, reveals.
- `webapp/src/pages/PathwayPage.tsx`: Interactive pathway view, path highlights, formulas.
- `webapp/src/pages/PathwayPage.module.css` (1019 lines): Large visual styling for path diagram sections.
- `webapp/src/pages/SoWhatPage.tsx`: Implications and actions.
- `webapp/src/pages/SoWhatPage.module.css` (634 lines): Card layouts and callouts.
- `webapp/src/pages/ResearcherPage.tsx`: Researcher profile, image, scroll reveals.
- `webapp/src/pages/ResearcherPage.module.css` (1601 lines): Extremely large styling with animated backgrounds and extensive layout rules.

### Components - layout

- `webapp/src/components/layout/Layout.tsx`: Layout shell + `TransitionOrchestrator` + `BackToTop` and `MobileNav`.
- `webapp/src/components/layout/Layout.module.css`: Layout and background gradient.
- `webapp/src/components/layout/Header.tsx`: Top nav + scroll progress bar.
- `webapp/src/components/layout/Header.module.css`: Header styling.
- `webapp/src/components/layout/Footer.tsx`: Citation and attribution block.
- `webapp/src/components/layout/Footer.module.css`: Footer styling.
- `webapp/src/components/layout/MobileNav.tsx`: Mobile nav bar.
- `webapp/src/components/layout/MobileNav.module.css`: Mobile nav styling.
- `webapp/src/components/layout/navItems.ts`: Navigation config with SVG paths.
- `webapp/src/components/layout/PageTransition.tsx`: Page wrapper; currently unused.
- `webapp/src/components/layout/PageTransition.module.css`: Page transition wrapper styles.

### Components - transitions

- `webapp/src/components/transitions/TransitionOrchestrator.tsx`: Route transition wrapper used by `Layout`.
- `webapp/src/components/transitions/TransitionOverlay.tsx`: Particle overlay; not used in layout.
- `webapp/src/components/transitions/TransitionOverlay.module.css`: Overlay styles.
- `webapp/src/components/transitions/TransitionLink.tsx`: Link wrapper that calls `usePageTransition`.
- `webapp/src/components/transitions/TransitionNavLink.tsx`: NavLink wrapper for transitions.
- `webapp/src/components/transitions/ParticleCanvas.tsx`: Particle animation; not used without `TransitionOverlay`.
- `webapp/src/components/transitions/ParticleCanvas.module.css`: Canvas styles.
- `webapp/src/components/transitions/SharedElement.tsx`: Shared element registration; no usage found.
- `webapp/src/components/transitions/MorphableElement.tsx`: Morphing element wrapper; no usage found.
- `webapp/src/components/transitions/ChoreographedReveal.tsx`: Reveal components; unused.
- `webapp/src/components/transitions/ViewportTracker.tsx`: Viewport tracking hook/component; unused.
- `webapp/src/components/transitions/MorphProvider.tsx`: Provider wrapper; unused.
- `webapp/src/components/transitions/index.ts`: Barrel exports.

### Components - charts

- `webapp/src/components/charts/AnalysisPipeline.tsx`: Methods pipeline diagram.
- `webapp/src/components/charts/AnalysisPipeline.module.css`: Pipeline styling.
- `webapp/src/components/charts/DoseResponseCurve.tsx`: D3 chart with tooltips and CI bands.
- `webapp/src/components/charts/DoseResponseCurve.module.css`: Chart styles.
- `webapp/src/components/charts/JohnsonNeymanPlot.tsx`: D3 chart with significance regions.
- `webapp/src/components/charts/JohnsonNeymanPlot.module.css`: Chart styles.
- `webapp/src/components/charts/PathwayDiagram.tsx`: Large D3 graph with interactivity.
- `webapp/src/components/charts/PathwayDiagram.module.css`: Diagram styling.
- `webapp/src/components/charts/GroupComparison.tsx`: Forest plot for group comparisons.
- `webapp/src/components/charts/GroupComparison.module.css`: Forest plot styles.
- `webapp/src/components/charts/EffectDecomposition.tsx`: Stacked bar decomposition; note shared math with PathwayPage.
- `webapp/src/components/charts/EffectDecomposition.module.css`: Chart styles.

### Components - UI

- `webapp/src/components/ui/Accordion.tsx`: Animated accordion.
- `webapp/src/components/ui/Accordion.module.css`: Accordion styles.
- `webapp/src/components/ui/BackToTop.tsx`: Floating scroll-to-top button.
- `webapp/src/components/ui/BackToTop.module.css`: Button styles.
- `webapp/src/components/ui/Badge.tsx`: Badge UI; unused.
- `webapp/src/components/ui/Badge.module.css`: Badge styles.
- `webapp/src/components/ui/Breadcrumb.tsx`: Breadcrumb; unused.
- `webapp/src/components/ui/Breadcrumb.module.css`: Breadcrumb styles.
- `webapp/src/components/ui/DataTimestamp.tsx`: Data timestamp label.
- `webapp/src/components/ui/DataTimestamp.module.css`: Timestamp styles.
- `webapp/src/components/ui/GlassPanel.tsx`: Glass panel component; unused.
- `webapp/src/components/ui/GlassPanel.module.css`: Glass panel styles; duplicates global glass system.
- `webapp/src/components/ui/GlossaryTerm.tsx`: Tooltip glossary term; heavily used.
- `webapp/src/components/ui/GlossaryTerm.module.css`: Tooltip styles.
- `webapp/src/components/ui/Icon.tsx`: Simple icon set for cards.
- `webapp/src/components/ui/Icon.module.css`: Icon styling.
- `webapp/src/components/ui/KeyTakeaway.tsx`: Highlight callout; used across pages.
- `webapp/src/components/ui/KeyTakeaway.module.css`: Callout styles.
- `webapp/src/components/ui/ProgressRing.tsx`: Circular score ring.
- `webapp/src/components/ui/ProgressRing.module.css`: Progress ring styles.
- `webapp/src/components/ui/ScrollToTop.tsx`: Legacy scroll-to-top helper; unused.
- `webapp/src/components/ui/Skeleton.tsx`: Skeleton loaders; unused.
- `webapp/src/components/ui/Skeleton.module.css`: Skeleton styles.
- `webapp/src/components/ui/Slider.tsx`: Range slider with tick marks.
- `webapp/src/components/ui/Slider.module.css`: Slider styles.
- `webapp/src/components/ui/StatCard.tsx`: Animated stat display; used on multiple pages.
- `webapp/src/components/ui/StatCard.module.css`: Stat card styles.
- `webapp/src/components/ui/ThemeToggle.tsx`: Light/dark/system toggle.
- `webapp/src/components/ui/ThemeToggle.module.css`: Toggle styles.
- `webapp/src/components/ui/Toggle.tsx`: Simple checkbox toggle.
- `webapp/src/components/ui/Toggle.module.css`: Toggle styles.
- `webapp/src/components/ui/index.ts`: Barrel export.

### Public assets

- `webapp/public/researcher/researcher-800.jpg`, `researcher-1600.jpg`, `researcher-2400.jpg`, `researcher-3200.jpg`: Used by `ResearcherPage.tsx` image `srcSet`.
- `webapp/public/researcher/SDSUColor.png`, `SDSUforDark.png`: Used by `ResearcherPage.tsx` logo.
- `webapp/public/researcher/SDSUPrmary Bar.png`, `sdsu_primary-logo_rgb_horizontal_reverse.png`: Used by `LandingPage.tsx` logo.
- `webapp/public/researcher.jpg`: Not referenced in code (likely unused).
- `webapp/public/vite.svg`: Template asset; not referenced.
- Unreferenced logos in `webapp/public/researcher/`: `NSSELogo.png`, `SDSUCCLEAD.png`, `sdsu_primary-logo_rgb_horizontal_1_color_black.png`, `sdsu_primary-logo_rgb_stacked_1_color_black.png`.

## Unused or likely unused code/artifacts (quick list)

- Transitions: `MorphProvider`, `MorphableElement`, `ChoreographedReveal`, `ViewportTracker`, `TransitionOverlay`, `SharedElement`, `ParticleCanvas` (overlay not mounted).
- UI: `Badge`, `Breadcrumb`, `GlassPanel`, `ScrollToTop`, `Skeleton`.
- Hooks: `useD3`.
- Context: `ChartThemeContext`.
- Assets: `webapp/src/assets/react.svg`, `webapp/public/vite.svg`, `webapp/public/researcher.jpg`, several unused logos, and `webapp/L3091 copy.jpg`.

## Phase 0: Baseline Visual Lock (Option B - checklist)

Screenshots: provided by user (no automated capture).

Design contract checklist (must remain unchanged):

- Background gradients, glow orbs, and page-level overlays (especially `Layout` background and page `::before/::after` visuals).
- Glass panels: blur radius, opacity/alpha values, border colors, and shadow stack as currently rendered.
- Card sizing, padding, and spacing rhythm across pages and sections.
- Typography scale, font families, weights, and text colors (including muted and accent colors).
- Button treatments and hover/press states (no visual or motion change).
- Chart colors, axes styling, and gridline appearance (no visual or perceptual change).
- Section dividers, reveal animations, and motion timings (no perceptible change).

## Phase 3: Architecture Simplification (Progress)

Batch 3A (App shell + providers + routes):

- `webapp/src/App.tsx` -> `webapp/src/app/AppShell.tsx` (App entry moved)
- `webapp/src/App.tsx` (AnimatedRoutes) -> `webapp/src/app/routes.tsx` (route wiring extracted)
- `webapp/src/App.tsx` (provider stack) -> `webapp/src/app/providers.tsx` (provider wiring extracted)
- `webapp/src/main.tsx` -> updated import to `webapp/src/app/AppShell.tsx`
  Batch 3B (Routes folder):
- `webapp/src/pages/LandingPage.tsx` -> `webapp/src/routes/LandingPage.tsx`
- `webapp/src/pages/LandingPage.module.css` -> `webapp/src/routes/LandingPage.module.css`
- `webapp/src/pages/HomePage.tsx` -> `webapp/src/routes/HomePage.tsx`
- `webapp/src/pages/HomePage.module.css` -> `webapp/src/routes/HomePage.module.css`
- `webapp/src/pages/DemographicsPage.tsx` -> `webapp/src/routes/DemographicsPage.tsx`
- `webapp/src/pages/DemographicsPage.module.css` -> `webapp/src/routes/DemographicsPage.module.css`
- `webapp/src/pages/DoseExplorerPage.tsx` -> `webapp/src/routes/DoseExplorerPage.tsx`
- `webapp/src/pages/DoseExplorerPage.module.css` -> `webapp/src/routes/DoseExplorerPage.module.css`
- `webapp/src/pages/MethodsPage.tsx` -> `webapp/src/routes/MethodsPage.tsx`
- `webapp/src/pages/MethodsPage.module.css` -> `webapp/src/routes/MethodsPage.module.css`
- `webapp/src/pages/PathwayPage.tsx` -> `webapp/src/routes/PathwayPage.tsx`
- `webapp/src/pages/PathwayPage.module.css` -> `webapp/src/routes/PathwayPage.module.css`
- `webapp/src/pages/SoWhatPage.tsx` -> `webapp/src/routes/SoWhatPage.tsx`
- `webapp/src/pages/SoWhatPage.module.css` -> `webapp/src/routes/SoWhatPage.module.css`
- `webapp/src/pages/ResearcherPage.tsx` -> `webapp/src/routes/ResearcherPage.tsx`
- `webapp/src/pages/ResearcherPage.module.css` -> `webapp/src/routes/ResearcherPage.module.css`
  Batch 3C1 (Shared helpers -> lib):
- `webapp/src/config/transitionConfig.ts` -> `webapp/src/lib/transitionConfig.ts`
- `webapp/src/utils/colorScales.ts` -> `webapp/src/lib/colorScales.ts`
- `webapp/src/utils/formatters.ts` -> `webapp/src/lib/formatters.ts`
- `webapp/src/utils/particleEngine.ts` -> `webapp/src/lib/particleEngine.ts`
  Batch 3C2 (Hooks -> lib/hooks):
- `webapp/src/hooks/useD3.ts` -> `webapp/src/lib/hooks/useD3.ts`
- `webapp/src/hooks/usePageTransition.ts` -> `webapp/src/lib/hooks/usePageTransition.ts`
- `webapp/src/hooks/useParallax.ts` -> `webapp/src/lib/hooks/useParallax.ts`
- `webapp/src/hooks/useScrollRestoration.ts` -> `webapp/src/lib/hooks/useScrollRestoration.ts`
- `webapp/src/hooks/useScrollReveal.ts` -> `webapp/src/lib/hooks/useScrollReveal.ts`
  Batch 3C3 (Contexts -> app/contexts):
- `webapp/src/context/ChoreographerContext.tsx` -> `webapp/src/app/contexts/ChoreographerContext.tsx`
- `webapp/src/context/ResearchContext.tsx` -> `webapp/src/app/contexts/ResearchContext.tsx`
- `webapp/src/context/ThemeContext.tsx` -> `webapp/src/app/contexts/ThemeContext.tsx`
- `webapp/src/context/TransitionContext.tsx` -> `webapp/src/app/contexts/TransitionContext.tsx`
- `webapp/src/context/ChartThemeContext.tsx` -> `webapp/src/app/contexts/ChartThemeContext.tsx`
- `webapp/src/context/ModelDataContext.tsx` -> `webapp/src/app/contexts/ModelDataContext.tsx`
  Batch 3C4 (Layout -> app/layout):
- `webapp/src/components/layout/Layout.tsx` -> `webapp/src/app/layout/Layout.tsx`
- `webapp/src/components/layout/Layout.module.css` -> `webapp/src/app/layout/Layout.module.css`
- `webapp/src/components/layout/Header.tsx` -> `webapp/src/app/layout/Header.tsx`
- `webapp/src/components/layout/Header.module.css` -> `webapp/src/app/layout/Header.module.css`
- `webapp/src/components/layout/Footer.tsx` -> `webapp/src/app/layout/Footer.tsx`
- `webapp/src/components/layout/Footer.module.css` -> `webapp/src/app/layout/Footer.module.css`
- `webapp/src/components/layout/MobileNav.tsx` -> `webapp/src/app/layout/MobileNav.tsx`
- `webapp/src/components/layout/MobileNav.module.css` -> `webapp/src/app/layout/MobileNav.module.css`
- `webapp/src/components/layout/PageTransition.tsx` -> `webapp/src/app/layout/PageTransition.tsx`
- `webapp/src/components/layout/PageTransition.module.css` -> `webapp/src/app/layout/PageTransition.module.css`
- `webapp/src/components/layout/navItems.ts` -> `webapp/src/app/layout/navItems.ts`
  Batch 3C5 (Transitions -> features/transitions):
- `webapp/src/components/transitions/TransitionOrchestrator.tsx` -> `webapp/src/features/transitions/TransitionOrchestrator.tsx`
- `webapp/src/components/transitions/TransitionOverlay.tsx` -> `webapp/src/features/transitions/TransitionOverlay.tsx`
- `webapp/src/components/transitions/TransitionOverlay.module.css` -> `webapp/src/features/transitions/TransitionOverlay.module.css`
- `webapp/src/components/transitions/TransitionLink.tsx` -> `webapp/src/features/transitions/TransitionLink.tsx`
- `webapp/src/components/transitions/TransitionNavLink.tsx` -> `webapp/src/features/transitions/TransitionNavLink.tsx`
- `webapp/src/components/transitions/ParticleCanvas.tsx` -> `webapp/src/features/transitions/ParticleCanvas.tsx`
- `webapp/src/components/transitions/ParticleCanvas.module.css` -> `webapp/src/features/transitions/ParticleCanvas.module.css`
- `webapp/src/components/transitions/SharedElement.tsx` -> `webapp/src/features/transitions/SharedElement.tsx`
- `webapp/src/components/transitions/MorphableElement.tsx` -> `webapp/src/features/transitions/MorphableElement.tsx`
- `webapp/src/components/transitions/ChoreographedReveal.tsx` -> `webapp/src/features/transitions/ChoreographedReveal.tsx`
- `webapp/src/components/transitions/ViewportTracker.tsx` -> `webapp/src/features/transitions/ViewportTracker.tsx`
- `webapp/src/components/transitions/MorphProvider.tsx` -> `webapp/src/features/transitions/MorphProvider.tsx`
- `webapp/src/components/transitions/index.ts` -> `webapp/src/features/transitions/index.ts`
  Batch 3C6 (Charts -> features/charts):
- `webapp/src/components/charts/AnalysisPipeline.tsx` -> `webapp/src/features/charts/AnalysisPipeline.tsx`
- `webapp/src/components/charts/AnalysisPipeline.module.css` -> `webapp/src/features/charts/AnalysisPipeline.module.css`
- `webapp/src/components/charts/DoseResponseCurve.tsx` -> `webapp/src/features/charts/DoseResponseCurve.tsx`
- `webapp/src/components/charts/DoseResponseCurve.module.css` -> `webapp/src/features/charts/DoseResponseCurve.module.css`
- `webapp/src/components/charts/EffectDecomposition.tsx` -> `webapp/src/features/charts/EffectDecomposition.tsx`
- `webapp/src/components/charts/EffectDecomposition.module.css` -> `webapp/src/features/charts/EffectDecomposition.module.css`
- `webapp/src/components/charts/GroupComparison.tsx` -> `webapp/src/features/charts/GroupComparison.tsx`
- `webapp/src/components/charts/GroupComparison.module.css` -> `webapp/src/features/charts/GroupComparison.module.css`
- `webapp/src/components/charts/JohnsonNeymanPlot.tsx` -> `webapp/src/features/charts/JohnsonNeymanPlot.tsx`
- `webapp/src/components/charts/JohnsonNeymanPlot.module.css` -> `webapp/src/features/charts/JohnsonNeymanPlot.module.css`
- `webapp/src/components/charts/PathwayDiagram.tsx` -> `webapp/src/features/charts/PathwayDiagram.tsx`
- `webapp/src/components/charts/PathwayDiagram.module.css` -> `webapp/src/features/charts/PathwayDiagram.module.css`
  Batch 3C7 (Data adapters):
- `webapp/src/data/adapters/modelData.ts`: adapter for model data view models.
  Batch 3C8 (Data types):
- `webapp/src/data/types/modelData.ts`: shared model data types.
  Batch 3C9 (Additional data adapters + types):
- `webapp/src/data/adapters/fastComparison.ts`: adapter for `fastComparison.json`.
- `webapp/src/data/adapters/groupComparisons.ts`: adapter for `groupComparisons.json`.
- `webapp/src/data/adapters/sampleDescriptives.ts`: adapter for `sampleDescriptives.json`.
- `webapp/src/data/adapters/dataMetadata.ts`: adapter for `dataMetadata.json`.
- `webapp/src/data/adapters/variableMetadata.ts`: adapter for `variableMetadata.json`.
- `webapp/src/data/types/fastComparison.ts`: shared types for fast comparison.
- `webapp/src/data/types/groupComparisons.ts`: shared types for group comparisons.
- `webapp/src/data/types/sampleDescriptives.ts`: shared types for sample descriptives.
- `webapp/src/data/types/dataMetadata.ts`: shared types for data metadata.
- `webapp/src/data/types/variableMetadata.ts`: shared types for variable metadata.

---

## Manifest-Driven Run Architecture (Added 2026-01-19)

### Run Storage Locations

| Location                                 | Purpose                                   |
| ---------------------------------------- | ----------------------------------------- |
| `4_Model_Results/Outputs/runs/<RUN_ID>/` | Canonical source (R + Python write here)  |
| `webapp/public/results/<RUN_ID>/`        | Webapp mirror (synced for static serving) |

### Run Folder Structure

```
runs/<RUN_ID>/
├── raw/           # R model outputs (lavaan .txt, TSV, CSV)
├── tables/        # DOCX tables (Python-generated)
├── figures/       # PNG figures (Python-generated)
├── logs/          # Verification checklist, run logs
└── manifest.json  # REQUIRED artifact manifest
```

### Manifest Schema (`manifest.json`)

```json
{
  "run_id": "20260119_143022_smoke",
  "timestamp": "2026-01-19T14:30:22Z",
  "mode": "smoke | main | Full_Deploy",
  "settings": {
    "seed": 12345,
    "N": 5000,
    "estimator": "ML",
    "bootstrap_B": 200,
    "CI_type": "perc",
    "group_flags": {
      "BOOTSTRAP_MG": false,
      "BOOTSTRAP_RACE": false
    }
  },
  "artifacts": {
    "fit_measures": "raw/RQ1_RQ3_main/fit_measures.csv",
    "parameters": "raw/RQ1_RQ3_main/structural/parameter_estimates.tsv",
    "executed_model_syntax": "raw/syntax/executed_model.lav",
    "verification_checklist": "logs/verification_checklist.txt",
    "tables": ["tables/Dissertation_Tables.docx"],
    "figures": ["figures/path_diagram.png", "figures/dose_response.png"]
  }
}
```

### Web Index Schema (`webapp/public/results/runs_index.json`)

```json
[
  {
    "run_id": "20260119_143022_smoke",
    "timestamp": "2026-01-19T14:30:22Z",
    "label": "Smoke test run",
    "manifest_path": "results/20260119_143022_smoke/manifest.json"
  }
]
```

Sorted newest-first. Deduplicated by `run_id`.

### Critical Rule

> **Artifact paths in manifest MUST be web-friendly relative URLs, NOT local filesystem paths.**

| ✅ Good                  | ❌ Bad                            |
| ------------------------ | --------------------------------- |
| `figures/path_a.png`     | `/Users/jjohnson3/.../path_a.png` |
| `tables/fit_indices.csv` | `C:\Users\...\fit_indices.csv`    |
