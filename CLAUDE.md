# Process-SEM

Ed.D. dissertation project: Conditional-Process Structural Equation Model analysis examining how accelerated dual credit participation (FASt status) affects first-year developmental adjustment among equity-impacted California State University students.

**Research Model:** FASt Status → Emotional Distress / Quality of Engagement → Developmental Adjustment, moderated by credit dose.

## Tech Stack

**R 4.5+** (primary - statistical modeling):
- lavaan (>=0.6-21) - SEM/CFA analysis
- semTools - Diagnostics and extensions
- mice - Multiple imputation
- parallel - Bootstrap parallelization

**Python 3.9+** (secondary - visualization/tables):
- pandas, numpy, scipy - Data processing
- matplotlib, seaborn - Visualization
- python-docx - APA 7 table generation
- pytest, pytest-cov - Testing

**Webapp** (React 19 + TypeScript + Vite):
- Interactive research visualization platform
- D3.js for SEM pathway diagrams
- CSS-only scroll animations (Intersection Observer)
- React Router v6 with HashRouter (GitHub Pages compatibility)
- CSS Modules for component-scoped styling
- Node 18+ / npm 9+
- Build output: `webapp/dist`
- Deployed to GitHub Pages

## Directory Structure

```
Process-SEM/
├── 1_Dataset/           # Analysis data (rep_data.csv, N=5,000)
├── 2_Codebooks/         # Variable dictionaries (Variable_Table.csv, survey codebooks)
├── 3_Analysis/          # Scripts organized by stage
│   ├── 1_Main_Pipeline_Code/   # Entry point orchestrator
│   ├── 2_Bootstrap_Code/       # Resampling inference
│   ├── 3_Tables_Code/          # Report generation (Python)
│   ├── 4_Plots_Code/           # Visualization (Python)
│   └── 5_Utilities_Code/       # Shared helpers
├── 4_Model_Results/     # Outputs (Tables/, Figures/, Summary/, Outputs/)
├── 5_Statistical_Models/# Model specifications (models/, themes/, utils/)
├── webapp/              # Interactive research visualization platform
└── _Setup/              # Dependencies (requirements.txt)
```

## Essential Commands

### Full Analysis Pipeline
```bash
Rscript 3_Analysis/1_Main_Pipeline_Code/run_all_RQs_official.R
```

### Python Environment Setup
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r _Setup/requirements.txt
```

### Quick Verification (fast smoke test)
```bash
TABLE_CHECK_MODE=1 Rscript 3_Analysis/1_Main_Pipeline_Code/run_all_RQs_official.R
```

### Generate Tables
```bash
python 3_Analysis/3_Tables_Code/build_dissertation_tables.py --outdir 4_Model_Results/Tables
python 3_Analysis/3_Tables_Code/build_bootstrap_tables.py
```

### Generate Plots
```bash
python 3_Analysis/4_Plots_Code/plot_descriptives.py
python 3_Analysis/4_Plots_Code/plot_deep_cuts.py
```

### Run Tests
```bash
pytest
```

### Webapp Development
```bash
cd webapp
npm install
npm run dev      # Start dev server
npm run build    # Production build
npm run deploy   # Deploy to GitHub Pages
```

## Key Entry Points

| Purpose | File |
|---------|------|
| Main pipeline | `3_Analysis/1_Main_Pipeline_Code/run_all_RQs_official.R` |
| Model specification | `5_Statistical_Models/models/mg_fast_vs_nonfast_model.R` |
| Dataset | `1_Dataset/rep_data.csv` |
| Variable dictionary | `2_Codebooks/Variable_Table.csv` |
| Python dependencies | `_Setup/requirements.txt` |
| Webapp entry | `webapp/src/App.tsx` |
| Webapp data (from R pipeline) | `webapp/src/data/*.json` |

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `OUT_BASE` | Output directory | `4_Model_Results/Outputs` |
| `B_BOOT_MAIN` | Bootstrap replicates (main) | `2000` |
| `BOOT_CI_TYPE_MAIN` | CI method | `bca.simple` |
| `W_SELECT` | W moderators to test (e.g., `"1,3,4"`) | All (W1-W5) |
| `TABLE_CHECK_MODE` | Quick verification mode | `0` |
| `SMOKE_ONLY_A` | Run only RQ1-RQ3 | `0` |
| `BOOTSTRAP_MG` | Bootstrap multi-group | `0` |

See `run_all_RQs_official.R:51-172` for complete list.

## VS Code Tasks

Pre-configured tasks available (`.vscode/tasks.json`):
- **PSW Stage** - Compute overlap weights
- **SEM Stage** - Run weighted lavaan model
- **PSW + SEM** - Full sequential pipeline

## Webapp Architecture

**Live URL:** https://judd23.github.io/Dissertation-Model-Simulation

### Structure
```
webapp/src/
├── components/
│   ├── charts/       # PathwayDiagram (D3, responsive), DoseResponseCurve, GroupComparison
│   ├── layout/       # Header (with scroll progress bar), Footer, Layout
│   └── ui/           # StatCard, Slider (with tick marks), Toggle, ThemeToggle, Icon, GlossaryTerm, DataTimestamp
├── context/          # ThemeContext, ResearchContext, ModelDataContext
├── data/             # JSON from R pipeline (modelResults, doseEffects, dataMetadata, etc.)
├── hooks/            # useScrollReveal, useStaggeredReveal (Intersection Observer animations)
├── pages/            # 7 pages: Landing, Home, Dose, Demographics, Pathway, Methods, Researcher
└── styles/           # variables.css (design tokens), global.css (bounce animation system)
```

### Design System
- **Colors**: Semantic construct colors (distress=red, engagement=blue, FASt=orange)
- **Typography**: Source Serif Pro (headings), Source Sans Pro (body), Source Code Pro (mono)
- **Animations**: CSS-only bounce animations (`--ease-out-back` spring easing), respects `prefers-reduced-motion`
- **Themes**: Light/dark mode with system preference detection
- **Accessibility**: WCAG 2.1 AA compliant (44px touch targets, keyboard navigation, aria labels)

### Key Patterns
- **Data Flow**: R pipeline → JSON exports → React context → components (no hardcoded values)
- **Editorial/storytelling layout**: Scroll-triggered reveals with `useScrollReveal` and `useStaggeredReveal` hooks
- **Sticky controls**: PathwayPage controls with backdrop blur effect
- **Header scroll progress**: Gradient bar (accent → engagement) tracks page position
- **Responsive breakpoints**: 480px (mobile), 768px (tablet), 1024px (desktop)
- **Theme switching**: Light/dark mode with CSS custom properties + system preference detection
- **Interactive elements**: Hover effects with lift animations, focus-visible outlines, active states
- **Glossary system**: Inline tooltips with auto-positioning (5 key terms on HomePage)
- **Responsive diagrams**: PathwayDiagram auto-sizes based on container width with aspect ratio preservation

## Development Workflow

### Typical Development Sequence
1. **Modify statistical models** in R (e.g., `5_Statistical_Models/models/`)
2. **Run pipeline** to generate updated JSON: `Rscript 3_Analysis/1_Main_Pipeline_Code/run_all_RQs_official.R`
3. **Copy JSON outputs** to `webapp/src/data/` (if not automated)
4. **Test webapp locally**: `cd webapp && npm run dev`
5. **Build and deploy**: `npm run build && npm run deploy`

### Data Update Flow
```
R lavaan model → run_all_RQs_official.R → JSON exports → webapp/src/data/
                                                              ↓
                                              ModelDataContext.tsx reads JSON
                                                              ↓
                                              Components consume via useModelData()
```

## Performance Notes

- **Bootstrap replicates**: Default `B_BOOT_MAIN=2000` takes ~15-20 min. Reduce to 500 for testing.
- **Webapp bundle size**: ~120KB gzipped JS, ~11KB gzipped CSS (D3.js is largest dependency)
- **Large datasets**: rep_data.csv (N=5,000) loads in <1s with lavaan caching

## Troubleshooting

### R Pipeline Issues
- **lavaan won't install**: Ensure R >= 4.5, try `install.packages("lavaan", dependencies=TRUE)`
- **Missing packages**: Run `install.packages(c("semTools", "mice", "parallel"))`
- **Bootstrap timeout**: Reduce `B_BOOT_MAIN` or increase `parallel::detectCores()` usage
- **R process hangs/dies**: Check for stuck processes with `ps aux | grep "[R]script"`. Kill with `kill -9 <PID>`. Common causes:
  - Multiple pipeline instances running simultaneously
  - Insufficient memory for bootstrap operations
  - Parallel processing conflicts
- **Terminal instability**: Run pipeline in background: `Rscript run_all_RQs_official.R > pipeline.log 2>&1 &` and monitor with `tail -f pipeline.log`

### Python Issues
- **Module not found**: Activate venv first (`source .venv/bin/activate`)
- **pandas/numpy conflicts**: Use fresh venv, install from `requirements.txt`

### Webapp Issues
- **Build fails**: Check Node version (`node -v` should be 18+), run `npm install` again
- **GitHub Pages 404**: Ensure `vite.config.ts` has `base: '/Dissertation-Model-Simulation/'`
- **Dark mode broken**: Clear browser cache, check CSS custom properties in DevTools
- **Animations janky**: Verify `prefers-reduced-motion` isn't enabled, check browser support for Intersection Observer

## Browser Support

The webapp is tested on:
- Chrome 120+ (primary)
- Safari 17+ (macOS/iOS)
- Firefox 121+
- Edge 120+

**Required APIs**: Intersection Observer (98%+ support), CSS custom properties, CSS `color-mix()`

## cSpell Dictionary

Add these terms to `.vscode/settings.json` or project cSpell config to suppress warnings:
```json
{
  "cSpell.words": [
    "codebooks",
    "glassmorphism",
    "lavaan",
    "semTools",
    "FIML",
    "RMSEA",
    "SRMR",
    "multigroup"
  ]
}
```

## UX Implementation Status

### ✅ Completed (January 2026)
- **Touch targets**: 44px minimum on all interactive elements (WCAG 2.1 AA)
- **Slider tick marks**: Visual markers at credit thresholds on PathwayPage
- **Icon components**: 4 SVG icons (chart, users, network, microscope)
- **Glossary tooltips**: 5 key terms with auto-positioning tooltips (HomePage)
- **Bounce animations**: Global `--ease-out-back` spring easing on all reveals
- **Functional scroll indicator**: LandingPage "Scroll to explore" button
- **ResearcherPage enhancements**: Scroll reveals and hover animations on all blocks
- **Demographics section**: Bar/donut charts on HomePage with sample data

### 🔧 Needs Work
- **PathwayDiagram mobile**: Fixed 700px width causes horizontal scroll on mobile
- **Sticky control feedback**: `.stuck` class defined but not applied via JS
- **StatCard animations**: No count-up animation on number reveal
- **Header nav overflow**: Horizontal scroll works but lacks visual indicators

### 🔮 Future Roadmap
- Guided tour/walkthrough for first-time visitors
- PDF export for key findings
- Advanced filtering on DemographicsPage
- Methods page table of contents sidebar

## Additional Documentation

| Document | When to Reference |
|----------|-------------------|
| `.claude/docs/architectural_patterns.md` | Understanding design patterns, naming conventions, validation strategies |
| `0_Overview.md` | Conceptual model, research questions, variable definitions |
| `4_Model_Results/Summary/Key_Findings_Summary.md` | Interpreting results |
| `2_Codebooks/Variable_Table.csv` | Variable meanings and coding |

## Session Changelog

> **Note**: Consider moving detailed session notes to `.claude/session-notes/` to keep CLAUDE.md focused on reference material.

### January 4, 2026 - Full Pipeline Run & Data Transparency

#### Dataset Regeneration
- Regenerated synthetic dataset via `1_Dataset/generate_empirical_dataset.py`
- N=5,000 students with 13 archetypes (Latina Commuter Caretaker, Latino Off-Campus Working, Asian High-Pressure Achiever, etc.)
- Demographics: 43.5% FASt, 47% Hispanic/Latino, 47.1% first-gen, 43.2% Pell

#### Full R Pipeline Execution
- Ran complete analysis with settings: `B_BOOT_MAIN=2000`, `B_BOOT_MG=10`, `BOOT_NCPUS=6`, `BOOTSTRAP_MG=1`
- Generated all outputs in `4_Model_Results/Outputs/`
- Created bootstrap tables (B=2,000, bca.simple CIs)
- Generated standards compliance visualizations and 12 descriptive/deep-cut plots

#### Data Timestamp System (New Feature)
- **Added `dataMetadata.json`**: Transform script now generates ISO timestamp with each pipeline run
- **Created `DataTimestamp` component** (`webapp/src/components/ui/DataTimestamp.tsx`)
  - Small monospace text format: "Data: YYYY-MM-DD HH:MM"
  - Subtle border separator, dark mode compatible
- **Integrated timestamps into data panels**:
  - `PathwayDiagram` - Under the full diagram visualization
  - `DoseResponseCurve` - Under each dose-response chart
  - `GroupComparison` - Under each equity comparison chart
  - `HomePage` stats section - Under key stats grid
  - `DoseExplorerPage` effect cards - Under conditional effects panel

#### Transform Script Updates
- Added `datetime` import to `webapp/scripts/transform-results.py`
- New step [6/6] writes `dataMetadata.json` with:
  - `generatedAt` (ISO format)
  - `generatedAtFormatted` (human-readable)
  - `generatedAtShort` (YYYY-MM-DD HH:MM)
  - Pipeline metadata (version, bootstrap settings)

#### Mobile Responsiveness (Prior in Session)
- PathwayDiagram: 500px minimum width on mobile with horizontal scroll
- Visual scroll hints via gradient mask
- Styled scrollbar for mobile
- Responsive button sizing on screens < 480px

#### Files Modified
- `webapp/scripts/transform-results.py` - Added timestamp generation
- `webapp/src/components/ui/DataTimestamp.tsx` - New component
- `webapp/src/components/ui/DataTimestamp.module.css` - New styles
- `webapp/src/components/charts/PathwayDiagram.tsx` - Added DataTimestamp import/render
- `webapp/src/components/charts/DoseResponseCurve.tsx` - Added DataTimestamp import/render
- `webapp/src/components/charts/GroupComparison.tsx` - Added DataTimestamp import/render
- `webapp/src/pages/HomePage.tsx` - Added DataTimestamp to stats section
- `webapp/src/pages/DoseExplorerPage.tsx` - Added DataTimestamp to effects section
- `webapp/src/data/dataMetadata.json` - New file (auto-generated)

---

### January 4, 2026 (Evening) - UX Enhancement Sprint

#### Quick Wins Implementation (6 Tasks)
1. **WCAG Touch Targets**: Added 44px minimum height to all interactive elements
   - PathwayPage buttons, LandingPage scroll indicator, hero CTA
2. **Sticky Control Feedback**: IntersectionObserver detects when PathwayPage controls stick
   - Added `.stuck` class with visual feedback
3. **Slider Tick Marks**: Visual credit thresholds at [12, 24, 36, 48, 60]
   - New `tickMarks` prop on Slider component
   - Percentage-based positioning with labels
4. **Icon System**: Created reusable Icon component with 4 SVG icons
   - Icons: chart, users, network, microscope
   - Configurable size and className props
5. **Glossary Tooltips**: Implemented GlossaryTerm component with 5 key research terms
   - Terms: Transfer Credits, Developmental Adjustment, FASt Status, Dose-Response Effect, Mediation Model
   - Auto-positioning (top/bottom) based on available space
   - Hover and keyboard accessible
6. **Responsive Diagram**: PathwayDiagram auto-resizes with window resize listener
   - Maintains aspect ratio on resize
   - Adaptive dimensions based on container width

#### Global Animation System Updates
- Changed all `.reveal` animations from `--ease-out-expo` to `--ease-out-back` for subtle bounce
- Applied to: `.reveal`, `.reveal-up`, `.reveal-scale`, `.reveal-left`, `.reveal-right`
- Maintains `--ease-out-expo` for opacity transitions (smoothness)
- Respects `prefers-reduced-motion` preference

#### ResearcherPage Redesign
- Added scroll reveals using `useScrollReveal` and `useStaggeredReveal` hooks
  - `heroRef`, `factsRef`, `blockARef`, `blockBRef`, `blockCRef`, `blockDRef`
- Implemented staggered animations on facts strip (3 facts with 100ms delays)
- Added hover effects to all content blocks:
  - Lift animations: `translateY(-4px)` on hover
  - Shadow elevation: `var(--shadow-lg)`
  - Border color transitions to accent
  - Block number scaling (`scale(1.1)`) on parent hover

#### LandingPage Enhancements
- Made scroll indicator functional (changed from `<div>` to `<button>`)
  - Navigates to `/home` on click
  - Added `aria-label` for accessibility
- Hover effects:
  - Color change to accent (`var(--color-accent)`)
  - Lift animation: `translateY(-4px)`
  - Text opacity increases to 1.0
  - Chevron animation switches to faster `bounceActive` (0.6s)
- WCAG compliant: 44px touch target, keyboard focus styles with outline

#### Panel Hover Effects (Global Consistency)
Added hover effects to all major content panels:
- **PathwayPage**: `.coefficientCard` and `.summaryCard`
- **DoseExplorerPage**: `.chartContainer` and `.interpretationCard`
- **HomePage**: `.diagramContainer`
- **ResearcherPage**: All blocks (`.blockA`, `.blockB`, `.blockC`, `.blockD`)

All panels now feature:
- `translateY(-4px)` lift on hover
- Shadow elevation to `var(--shadow-lg)`
- Border color transition to accent
- Consistent transition timing via `var(--transition-fast)`

#### Updated StatCard Component
- Changed `label` prop from `string` to `string | React.ReactNode`
- Enables embedding of GlossaryTerm components inside labels
- Used on HomePage for "FASt Status" glossary term integration

#### Files Modified (20+)
**Animation System:**
- `webapp/src/styles/global.css` - Bounce easing system

**Components:**
- `webapp/src/components/ui/Slider.tsx` - Tick marks prop and rendering
- `webapp/src/components/ui/Slider.module.css` - Tick mark styles
- `webapp/src/components/ui/Icon.tsx` - New component
- `webapp/src/components/ui/Icon.module.css` - New styles
- `webapp/src/components/ui/GlossaryTerm.tsx` - New component
- `webapp/src/components/ui/GlossaryTerm.module.css` - New styles
- `webapp/src/components/ui/StatCard.tsx` - Accept ReactNode for label
- `webapp/src/components/charts/PathwayDiagram.tsx` - Responsive sizing

**Pages:**
- `webapp/src/pages/PathwayPage.tsx` - Sticky observer, tick marks
- `webapp/src/pages/PathwayPage.module.css` - Hover effects, sticky styles
- `webapp/src/pages/ResearcherPage.tsx` - Scroll reveals
- `webapp/src/pages/ResearcherPage.module.css` - Hover effects on all blocks
- `webapp/src/pages/LandingPage.tsx` - Functional scroll indicator
- `webapp/src/pages/LandingPage.module.css` - Scroll indicator button styles
- `webapp/src/pages/HomePage.tsx` - Glossary term integrations (5 terms)
- `webapp/src/pages/HomePage.module.css` - Diagram container hover
- `webapp/src/pages/DoseExplorerPage.module.css` - Chart hover effects

#### R Pipeline Debugging
- Identified and killed 2 stuck R processes (PIDs 21226, 18563)
- Documented troubleshooting steps in CLAUDE.md
- Added background execution pattern for terminal stability

---

### January 4, 2026 (Late Evening) - Demographics Section & Deployment

#### Sample Demographics Section Implementation
Created a comprehensive demographics visualization section on HomePage to showcase the diverse student population:

**Visual Design:**
- **3-card layout** with horizontal bar charts and donut charts
- **Gradient background**: Subtle transition from background → surface → background
- **Staggered scroll reveals**: Cards animate in sequentially
- **Consistent hover effects**: Lift animation, shadow elevation, accent border

**Card 1: Race & Ethnicity**
- 5 horizontal bar charts with animated fills
- Data: Hispanic/Latino (47%), White (21.4%), Asian (16.7%), Other/Multiracial (10.9%), Black/African American (4%)
- Shows both percentage and student count for each group
- Bars use accent color with bounce easing animation

**Card 2: Access & Equity**
- 2 SVG-based donut charts for equity indicators
- First-Generation students: 47.1% (2,353 students) - accent color
- Pell Grant recipients: 43.2% (2,158 students) - engagement color
- Centered layout with percentage in middle of donut

**Card 3: Student Profile**
- Gender distribution with colored bars
  - Female: 62.1% (3,104 students) - distress color
  - Male: 37.9% (1,896 students) - engagement color
- Highlighted stats box with gradient background
  - Average transfer credits: 18.3
  - Range: 0–80 credits

**Technical Implementation:**
- Pulls data from `sampleDescriptives.json` (no hardcoded values)
- Dynamically renders based on JSON structure
- Fully responsive: 3-column (desktop) → 1-column (mobile)
- WCAG accessible with proper ARIA labels

**Files Modified:**
- `webapp/src/pages/HomePage.tsx` - Added demographics section (+143 lines)
- `webapp/src/pages/HomePage.module.css` - Demographics styles (+200 lines)

#### Deployment
- Successfully deployed to GitHub Pages
- Build stats: CSS 66.31 KB (gzip: 11.06 KB), JS 377.96 KB (gzip: 119.58 KB)
- Build time: ~2 seconds
- Live URL: https://judd23.github.io/Dissertation-Model-Simulation

#### Session Summary
This session completed a comprehensive UX enhancement sprint including:
- 6 quick wins (touch targets, sticky controls, tick marks, icons, glossary, responsive diagram)
- Global bounce animation system
- ResearcherPage redesign with scroll reveals
- LandingPage functional scroll indicator
- HomePage demographics section (new!)
- All changes deployed to production

---

### January 5, 2026 - ResearcherPage Artistic & Dynamic Enhancements

#### Comprehensive Visual Overhaul
Made the ResearcherPage significantly more artistic and dynamic with layered animations, gradient effects, shimmer overlays, and glow decorations.

**New Animation Keyframes Added:**
- `@keyframes floatGlow` - Complex 4-stage movement with rotation and scale (used by background orbs)
- `@keyframes pulseGlow` - Breathing opacity/blur effect for background orbs
- `@keyframes shimmer` - Gradient position animation for shine effects (200% sweep)
- `@keyframes borderGlow` - Pulsing box-shadow for cards
- `@keyframes textGlow` - Text shadow pulse for name
- `@keyframes pulse` - Arrow bounce animation for CTA

**Hero Section Enhancements:**
- **Background orbs**: Increased size (600px/550px), dual-color gradients, added `pulseGlow` breathing effect
- **Hero glow**: Radial gradient background on `.hero` section
- **heroFigure**: 
  - Shimmer top border (4px) that appears on hover with `shimmer` animation
  - Gradient corner accent (80px) slides in from top-right on hover
  - Enhanced transform: `translateY(-8px) rotate(-1deg) scale(1.01)`
  - Glow shadow: `0 0 40px` with accent color
- **Image**: Brightness/contrast filter boost on hover
- **Name**: `textGlow` animation on hero hover, shimmer underline with gradient

**Facts Strip Enhancements:**
- **Shine sweep overlay**: Gradient sweeps left-to-right on hover (`.fact::after`)
- **Bottom bars**: Increased to 4px, added shimmer animation
- **Transform**: Enhanced to `scale(1.03) translateY(-2px)` with glow shadow

**Content Blocks (A, B, C, D):**
- **Block A/C**: 
  - Side gradient bars (5px) with 3-color gradient and shimmer animation
  - Corner glow orbs that appear and scale on hover
  - Background shifts to subtle gradient on hover
  - Border increased to 2px
- **Block B**:
  - Opening + closing quotation marks (10rem) with gradient text (`-webkit-background-clip: text`)
  - Quotes animate: scale and translate on hover
  - Engagement-colored glow shadow
- **Block D**:
  - Top border animates from center with shimmer
  - Larger corner glow (200px) with dual-color gradient
  - Enhanced scale on hover (1.8x)

**Quote Styling:**
- Emphasized text (`em`) uses gradient text (`background-clip: text`) in both accent→engagement and engagement→accent directions
- Border thickness increased to 4px

**List Items:**
- Custom gradient bullet points (8px circles)
- Bullets glow and scale (1.3x) on hover
- Items slide 8px (up from 4px) on hover

**CTA Button Complete Redesign:**
- Full button styling with border (2px), rounded corners (8px), padding
- Shine sweep overlay on hover
- Gradient underline (3px) with shimmer animation
- Pulsing arrow animation (`@keyframes pulse`)
- Glow shadow effect
- Transform lift on hover

**Accessibility:**
- Full `prefers-reduced-motion` support updated for all new animations
- All new pseudo-elements included in reduced motion query
- Touch states preserved

**Files Modified:**
- `webapp/src/pages/ResearcherPage.module.css` - Comprehensive artistic enhancements (~200 lines changed)

**Build Stats:**
- CSS: 103.09 KB (gzip: 15.39 KB)
- JS: 406.52 KB (gzip: 125.50 KB)
- Build time: ~940ms

**Deployed:** https://judd23.github.io/Dissertation-Model-Simulation/#/researcher

---

### January 5, 2026 (Afternoon) - Bug Fix Sprint

#### 5 Bugs Fixed

| # | Priority | Issue | Fix |
|---|----------|-------|-----|
| 1 | HIGH | PathwayDiagram resize listener memory leak | Wrapped `updateDimensions` in `useCallback` to stabilize function reference |
| 2 | MEDIUM | GlossaryTerm tooltip z-index stacking | Increased tooltip z-index to `100000`, sticky controls to `100` |
| 3 | LOW | PathwayPage sticky observer edge case | Changed rootMargin from `-1px` to `-10px` for reliable triggering |
| 4 | MEDIUM | Slider tick marks overlapping on mobile | Added media query to hide labels and enlarge marks on screens < 480px |
| 5 | LOW | HomePage missing React keys in comparison mode | Added composite key `${group}-${showComparison ? 'compare' : 'default'}` |

#### Technical Details

**#1 - Memory Leak Fix (PathwayDiagram.tsx)**
- Problem: `updateDimensions` was recreated on every render, causing resize listener to be added/removed repeatedly
- Solution: Wrapped in `useCallback` with `[initialWidth, initialHeight]` dependencies
- Impact: Prevents performance degradation and memory leaks on window resize

**#2 - Z-Index Stacking Fix (GlossaryTerm.module.css, PathwayPage.module.css)**
- Problem: Tooltips could appear behind sticky headers due to stacking context inheritance
- Solution: Boosted tooltip z-index from `9999` to `100000`, sticky controls from `10` to `100`
- Impact: Tooltips now reliably appear above all other UI elements

**#3 - Sticky Observer Reliability (PathwayPage.tsx)**
- Problem: `-1px` rootMargin could fail on certain zoom levels due to sub-pixel rendering
- Solution: Increased to `-10px` for more reliable intersection detection
- Impact: Sticky control visual feedback triggers consistently across browsers/zoom levels

**#4 - Mobile Slider Tick Labels (Slider.module.css)**
- Problem: 5 tick marks [12, 24, 36, 48, 60] overlapped on narrow screens (~320px)
- Solution: Added `@media (max-width: 480px)` to hide labels and enlarge tick marks
- Impact: Slider remains usable and readable on mobile devices

**#5 - React Keys Stability (HomePage.tsx)**
- Problem: Conditional rendering in demographics comparison mode could cause reconciliation issues
- Solution: Changed key from `group` to `${group}-${showComparison ? 'compare' : 'default'}`
- Impact: Prevents potential React strict mode warnings and ensures clean re-renders

#### Files Modified
- `webapp/src/components/charts/PathwayDiagram.tsx` - useCallback for resize handler
- `webapp/src/components/ui/GlossaryTerm.module.css` - z-index: 100000
- `webapp/src/components/ui/Slider.module.css` - mobile media query
- `webapp/src/pages/PathwayPage.tsx` - rootMargin: -10px
- `webapp/src/pages/PathwayPage.module.css` - z-index: 100
- `webapp/src/pages/HomePage.tsx` - stable composite keys

**Build Stats:**
- CSS: 103.20 KB (gzip: 15.40 KB)
- JS: 406.58 KB (gzip: 125.53 KB)
- Build time: ~950ms

**Deployed:** https://judd23.github.io/Dissertation-Model-Simulation
