# Interactive Research Visualization Platform

## Design Specification & Development Prompt

**Document Version:** 1.0  
**Date:** January 3, 2026  
**Project:** Process-SEM Dissertation — Accelerated Dual Credit & Student Adjustment  

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Target Audiences](#target-audiences)
3. [Communication Guidelines](#communication-guidelines)
4. [Research Summary](#research-summary)
5. [Study Context](#study-context)
6. [Data Architecture](#data-architecture)
7. [Design Requirements](#design-requirements)
8. [Interactive Experiences](#interactive-experiences)
9. [Visual Design System](#visual-design-system)
10. [Information Architecture](#information-architecture)
11. [Interface Specifications](#interface-specifications)
12. [Technical Implementation](#technical-implementation)
13. [Success Criteria](#success-criteria)
14. [Data Sources](#data-sources)

---

## Design Philosophy

### Accessible Scholarship

This platform bridges rigorous academic research and practical understanding. The goal is to communicate complex statistical findings to diverse professional stakeholders without sacrificing methodological precision or scholarly credibility.

**Guiding Principle:** Sophisticated presentation of nuanced findings. The platform should demonstrate that complex conditional process models can be communicated effectively to research-literate audiences who may not specialize in SEM.

The platform should feel like an interactive supplement to a peer-reviewed journal article — rigorous, well-documented, and intellectually engaging. Design references: New York Times Upshot, Pew Research Center, Urban Institute data tools.

---

## Target Audiences

**Primary Context:** Research symposium presentation and academic dissemination

| Audience | Primary Need | Engagement Mode |
|----------|-------------|-----------------|
| **Academic Researchers** | Methodological rigor, replicability, theoretical contribution | Deep dive into model specification and diagnostics |
| **Faculty & Department Chairs** | Evidence for curriculum and advising decisions | Findings summary with institutional implications |
| **Institutional Research Professionals** | Actionable data for enrollment management and student success | Subgroup analyses and effect heterogeneity |
| **Policymakers & Legislative Staff** | Executive summary for resource allocation decisions | Key findings with confidence levels |
| **Higher Education Administrators** | Implementation guidance — which students benefit, under what conditions | Practical recommendations with supporting evidence |
| **Doctoral Students & Early-Career Researchers** | Methodological exemplar for conditional process analysis | Technical appendix and code availability |

---

## Communication Guidelines

### Plain Language Standards

Research findings should be communicated in clear, accessible language while maintaining academic precision. The goal is comprehension, not condescension. Don't use Em-Dashes. Don't use the phrase "Plain Language".

| Technical Term | Accessible Alternative |
|----------------|----------------------|
| Propensity score weighting | Comparing similar students to account for pre-existing differences |
| Mediator variable | Intermediate outcome / mechanism |
| Conditional effect at Z = +1 SD | Effect for students with above-average dual credit exposure |
| Statistically significant (p < .05) | Reliable finding (unlikely due to chance) |
| Latent construct | Composite measure derived from multiple survey items |
| Effect size (d = 0.3) | Modest but meaningful difference |
| Bootstrap confidence interval | Range of plausible values for the true effect |
| RMSEA, CFI, TLI | Model fit indicators (present in technical appendix only) |
| Moderated mediation | The mechanism varies depending on student characteristics |
| Variance explained | Proportion of differences accounted for by the model |

**Presentation Rule:** Every statistical finding should be accompanied by a contextual interpretation in plain language.

---

## Research Summary

### The Central Question

Does accelerated dual credit participation improve first-year college students' psychosocial adjustment — and if so, through what mechanisms and for whom?

### Key Findings

1. **Overall Effect:** Students entering with ≥12 transferable dual credits (FASt status) demonstrated better developmental adjustment outcomes
   
2. **Mechanisms Identified:** The positive effects operated through two parallel pathways:
   - Reduced emotional distress during the transition
   - Enhanced quality of engagement with institutional support systems

3. **Differential Benefits:** Effect magnitudes varied by student background, with first-generation and Pell-eligible students showing particularly strong responses

### Policy Relevance

Dual credit programs represent substantial public investment. This research provides evidence on program efficacy and identifies which student populations benefit most — critical information for equitable resource allocation.

---

## Study Context

### Methodological Framework

This study employs Conditional Process Analysis (Hayes Model 59) with propensity score overlap weighting to examine treatment effects while addressing selection bias inherent in observational dual credit data.

### Analytical Approach

| Component | Method |
|-----------|--------|
| Causal inference | Propensity score overlap weighting (PSW) |
| Structural model | Conditional process SEM with parallel mediation |
| Missing data | Full information maximum likelihood (FIML) |
| Uncertainty quantification | BCa bootstrap confidence intervals (B = 2,000) |
| Heterogeneity analysis | Multi-group SEM by demographic moderators |

---

## Data Architecture

### Data Sources
- **Primary Dataset:** `1_Dataset/rep_data.csv` (N = 5,000)
- **Weighted Dataset:** `4_Model_Results/Outputs/*/RQ1_RQ3_main/rep_data_with_psw.csv`

### Variable Classification

#### Treatment Variables
| Variable | Label | Description | Scale |
|----------|-------|-------------|-------|
| `x_FASt` | FASt Status | ≥12 transferable credits at matriculation | Binary (0/1) |
| `credit_dose` | Credit Accumulation | Total dual credits earned | Continuous (0–30+) |
| `XZ_c` | Treatment × Dose Interaction | Mean-centered interaction term | Continuous |

#### Parallel Mediators
| Construct | Label | Indicators |
|-----------|-------|------------|
| `EmoDiss` | Emotional Distress | MHWdacad, MHWdlonely, MHWdmental, MHWdexhaust, MHWdsleep, MHWdfinancial |
| `QualEngag` | Quality of Engagement | QIstudent, QIadvisor, QIfaculty, QIstaff, QIadmin |

#### Outcome Constructs (Developmental Adjustment)
| Construct | Label | Indicators |
|-----------|-------|------------|
| `Belong` | Sense of Belonging | sbvalued, sbmyself, sbcommunity |
| `Gains` | Perceived Gains | pgthink, pganalyze, pgwork, pgvalues, pgprobsolve |
| `SupportEnv` | Supportive Environment | SEwellness, SEnonacad, SEactivities, SEacademic, SEdiverse |
| `Satisf` | Satisfaction | evalexp, sameinst |

#### Covariates & Demographics
| Variable | Label | Description |
|----------|-------|-------------|
| `firstgen` | First-Generation Status | First in family to attend college |
| `pell` | Pell Grant Recipient | Federal financial aid indicator |
| `hgrades` | High School GPA | Self-reported grades (3–8 scale) |
| `re_all` | Race/Ethnicity | Categorical demographic |
| `cohort` | Entry Cohort | Academic year of matriculation |
| `archetype_name` | Student Profile | Cluster-derived typology (10 categories) |

#### Propensity Score Weights
| Variable | Purpose |
|----------|---------|
| `psw` | Overlap weights for covariate balance |

### Student Typology

The dataset includes 10 empirically-derived student archetypes:

| ID | Profile Name | Characteristics |
|----|-------------|-----------------|
| 1 | High-Achieving FASt | Strong academic background with substantial dual credit |
| 2 | Moderate FASt | Average preparation with moderate dual credit |
| 3 | Threshold FASt | Minimal dual credit (near 12-credit cutoff) |
| 4 | High-Achieving Traditional | Strong academics without dual credit |
| 5 | First-Generation Striver | First-gen student with strong motivation |
| 6 | Financial Aid Recipient | Pell-eligible with varied preparation |
| 7 | Traditional Pathway | Standard college-preparatory trajectory |
| 8 | Emerging Scholar | Improvement trajectory post-high school |
| 9 | Adjustment Challenge | Elevated transition difficulties |
| 10 | Transfer-Oriented | Early transfer planning indicators |

---

## Design Requirements

### Visual Identity

The platform should communicate academic credibility while remaining accessible. Design references include:

- **The New York Times** data visualizations (Upshot)
- **Pew Research Center** interactive reports
- **Urban Institute** data tools
- **Brookings Institution** policy briefs

### Aesthetic Principles

| Attribute | Implementation |
|-----------|---------------|
| **Professional** | Clean typography, restrained color palette, ample whitespace |
| **Trustworthy** | Visible methodology, cited sources, uncertainty quantification |
| **Accessible** | Progressive disclosure, plain language defaults, expert mode available |
| **Equitable** | Asset-based framing, diverse representation, no deficit narratives |
| **Sophisticated** | Purposeful animation, meaningful interaction, polished details |

### Innovation Elements

- **Narrative-driven exploration** — Guide users through findings as a structured argument
- **Counterfactual comparison** — Side-by-side "what if" scenarios for matched students
- **Causal pathway animation** — Visualize how effects propagate through mediators
- **Uncertainty visualization** — Make confidence intervals intuitive, not intimidating
- **Personalized relevance** — Allow users to see findings for profiles similar to themselves

---

## Interactive Experiences

### 1. Landing Page: Research Overview

Present a clean, professional entry point establishing scholarly context:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ACCELERATED DUAL CREDIT AND                               │
│   FIRST-YEAR DEVELOPMENTAL ADJUSTMENT                       │
│                                                             │
│   A Conditional Process Analysis with Propensity            │
│   Score Weighting                                           │
│                                                             │
│   ┌─────────────────┐  ┌─────────────────┐                  │
│   │ Key Findings    │  │ Full Model      │                  │
│   │ Summary         │  │ Results         │                  │
│   └─────────────────┘  └─────────────────┘                  │
│                                                             │
│   ┌─────────────────┐  ┌─────────────────┐                  │
│   │ Interactive     │  │ Methodology &   │                  │
│   │ Effect Explorer │  │ Technical Notes │                  │
│   └─────────────────┘  └─────────────────┘                  │
│                                                             │
│   N = 5,000 | Hayes Model 59 | BCa Bootstrap (B = 2,000)    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. Executive Summary (Research Brief)

Three primary findings with supporting evidence:

**Finding 1:** FASt status demonstrates a positive total effect on developmental adjustment (provide effect estimate, CI, interpretation)

**Finding 2:** Parallel mediation through emotional distress and quality of engagement accounts for [X%] of the total effect

**Finding 3:** Moderation analysis reveals heterogeneous treatment effects, with first-generation students showing particularly strong response

Each finding includes: standardized estimate, confidence interval, practical significance interpretation, and link to full results.

### 3. Interactive Effect Explorer

Professional research tool for examining conditional effects:

**Control Panel:**
- Credit dose level selector (−1 SD, Mean, +1 SD, or continuous slider)
- Moderator subgroup selection (by W variable)
- Direct/indirect/total effect toggle
- Standardized vs. unstandardized coefficient display

**Output Display:**
- Point estimates with 95% BCa confidence intervals
- Effect decomposition table
- Statistical significance indicators
- Comparison to established effect size benchmarks (Cohen's conventions)

### 4. Counterfactual Comparison Visualization

Propensity-score matched comparison display:

| Non-FASt (Weighted) | FASt (Weighted) | Difference | 95% CI |
|---------------------|-----------------|------------|--------|
| EmoDiss: X.XX | EmoDiss: X.XX | Δ = X.XX | [X.XX, X.XX] |
| QualEngag: X.XX | QualEngag: X.XX | Δ = X.XX | [X.XX, X.XX] |
| DevAdj: X.XX | DevAdj: X.XX | Δ = X.XX | [X.XX, X.XX] |

Caption: "Treatment effects estimated under overlap weighting. Standardized mean differences reported."

### 5. Heterogeneity Analysis (Moderation Results)

Multi-group and moderated mediation findings:

- Effect estimates stratified by each W moderator
- Tests of moderation (interaction terms, multi-group invariance)
- Index of moderated mediation with confidence intervals
- Forest plot visualization of subgroup effects
- Policy implications for targeted intervention

### 6. Structural Model Visualization

Interactive path diagram with full parameter estimates:

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   X (FASt)   │──a₁────▶│   M₁         │──b₁────▶│              │
│   Z (Dose)   │         │  (EmoDiss)   │         │      Y       │
│   X×Z        │         └──────────────┘         │   (DevAdj)   │
└──────────────┘                                  │              │
       │                 ┌──────────────┐         │  Second-     │
       │                 │   M₂         │         │  Order       │
       └───────a₂───────▶│ (QualEngag)  │──b₂────▶│  Latent      │
                         └──────────────┘         └──────────────┘
                                                         │
                                  c′ (direct) ───────────┘
```

- Hover: Display parameter estimate, SE, p-value, 95% CI
- Click: Expand to show conditional effects at different Z levels
- Toggle: Show/hide covariates, latent variable indicators
- Color scale: Effect magnitude and statistical significance

### 7. Model Diagnostics Dashboard

For methodologically-oriented audiences:

**Fit Indices Panel:**
- χ², df, p-value
- CFI, TLI (with ≥ .95 benchmark)
- RMSEA with 90% CI (with ≤ .06 benchmark)
- SRMR (with ≤ .08 benchmark)

**Assumption Checks:**
- PSW balance diagnostics (SMD before/after weighting)
- Residual distributions
- Multicollinearity indicators
- Measurement invariance summary (if applicable)

**Bootstrap Diagnostics:**
- Convergence rate
- Distribution of bootstrap estimates (density plots)
- BCa adjustment magnitude

### 8. Technical Appendix

Full documentation for replication and extension:

- Complete model syntax (lavaan)
- Variable operationalization and coding
- Missing data patterns and FIML implementation
- Sensitivity analyses (unweighted, alternative specifications)
- Downloadable parameter tables (CSV/Excel)
- R package versions and reproducibility information

---

## Visual Design System

### Professional Academic Aesthetic

| Element | Specification |
|---------|---------------|
| **Typography** | Serif for headers (scholarly credibility), sans-serif for body (readability) |
| **Color Palette** | Muted, professional — navy, slate, warm gray; accent colors for statistical significance |
| **Data Visualization** | Clean axes, minimal chartjunk, APA-style formatting where applicable |
| **Whitespace** | Generous margins, clear visual hierarchy |
| **Icons** | Minimal, functional — avoid decorative elements |

### Color System

| Color | Use Case |
|-------|----------|
| Navy (#1e3a5f) | Primary headers, significant effects |
| Slate (#64748b) | Secondary text, non-significant effects |
| Teal (#0d9488) | Positive effects, FASt group |
| Amber (#d97706) | Comparison group, caution indicators |
| Light Gray (#f1f5f9) | Backgrounds, confidence bands |
| White (#ffffff) | Cards, primary background |

### Data Visualization Standards

- **Confidence intervals:** Always displayed; use shaded bands or error bars
- **Effect sizes:** Include standardized coefficients with benchmarks
- **Statistical significance:** Indicated by color intensity, not asterisks alone
- **Sample sizes:** Displayed for all subgroup analyses
- **Uncertainty:** Visualized, not hidden — bootstrap distributions available on demand

### Animation Guidelines

- **Purpose-driven only:** Animation should reveal insight, not decorate
- **Subtle transitions:** Fade and ease, never bounce or overshoot
- **User-controlled:** Complex animations should be triggered, not automatic
- **Performance:** 60fps minimum, no animation on reduced-motion preference

---

## Information Architecture

### Navigation Structure

```
Home
├── Executive Summary
│   ├── Key Findings (3)
│   ├── Policy Implications
│   └── Citation Information
├── Full Results
│   ├── Total Effect Model
│   ├── Parallel Mediation Model
│   ├── Conditional Effects
│   └── Moderation Analysis
├── Interactive Explorer
│   ├── Effect Calculator
│   ├── Path Diagram
│   └── Subgroup Comparisons
├── Methodology
│   ├── Study Design
│   ├── Sample & Measures
│   ├── Analytic Strategy
│   └── Model Diagnostics
└── Technical Appendix
    ├── Model Syntax
    ├── Parameter Tables
    ├── Sensitivity Analyses
    └── Variable Table
```

### Content Depth Levels

| Level | Audience | Content |
|-------|----------|---------|
| **L1: Executive** | Policymakers, administrators | 3 key findings, practical significance, policy implications |
| **L2: Standard** | Researchers, IR professionals | Full results with estimates, CIs, fit indices |
| **L3: Technical** | Methodologists, replicators | Syntax, diagnostics, robustness checks, raw output |

---

## Interface Specifications

### Key Findings Card

```
┌─────────────────────────────────────────────────────────────┐
│  FINDING 1: Treatment Effect on Developmental Adjustment    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  FASt status is associated with improved developmental      │
│  adjustment outcomes, controlling for pre-college           │
│  characteristics.                                           │
│                                                             │
│  Total Effect: β = 0.24, 95% CI [0.15, 0.32]               │
│                                                             │
│  ────────────[████████████░░░░░░░░]────────────            │
│              0.15        0.24      0.32                     │
│                                                             │
│  Interpretation: A modest but reliable effect, comparable   │
│  to established educational interventions.                  │
│                                                             │
│  [View Decomposition]  [Conditional Effects]  [Full Table]  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Effect Decomposition Table

```
┌─────────────────────────────────────────────────────────────┐
│  EFFECT DECOMPOSITION: X → Y                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Effect Type          Estimate    SE      95% CI      Sig   │
│  ─────────────────────────────────────────────────────────  │
│  Direct Effect (c′)    0.12     0.03   [0.06, 0.18]   ***   │
│  Indirect via M₁       0.07     0.02   [0.04, 0.11]   ***   │
│  Indirect via M₂       0.05     0.02   [0.02, 0.09]   **    │
│  ─────────────────────────────────────────────────────────  │
│  Total Effect          0.24     0.04   [0.15, 0.32]   ***   │
│                                                             │
│  Note: BCa bootstrap CIs (B = 2,000). *** p < .001          │
│                                                             │
│  [Export CSV]  [View Conditional Effects]                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Conditional Effects Display

```
┌─────────────────────────────────────────────────────────────┐
│  CONDITIONAL INDIRECT EFFECTS BY CREDIT DOSE                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Credit Dose Level    Indirect (M₁)    Indirect (M₂)        │
│  ─────────────────────────────────────────────────────────  │
│  Low (−1 SD)          0.04 [0.01, 0.08]  0.03 [0.00, 0.06]  │
│  Mean                 0.07 [0.04, 0.11]  0.05 [0.02, 0.09]  │
│  High (+1 SD)         0.10 [0.05, 0.15]  0.08 [0.04, 0.12]  │
│                                                             │
│  Index of Moderated Mediation:                              │
│    via M₁: 0.03 [0.01, 0.05]                               │
│    via M₂: 0.02 [0.00, 0.04]                               │
│                                                             │
│  [Interactive Slider]  [Forest Plot]                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Model Fit Summary

```
┌─────────────────────────────────────────────────────────────┐
│  MODEL FIT INDICES                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Index       Value     Benchmark    Assessment              │
│  ─────────────────────────────────────────────────────────  │
│  χ²(df)      1247.3    p < .001     Expected with N=5000    │
│  CFI         0.957     ≥ 0.95       ● Excellent             │
│  TLI         0.952     ≥ 0.95       ● Excellent             │
│  RMSEA       0.022     ≤ 0.06       ● Excellent             │
│   90% CI     [0.020, 0.024]                                 │
│  SRMR        0.031     ≤ 0.08       ● Excellent             │
│                                                             │
│  Overall: Model demonstrates excellent fit to data.         │
│                                                             │
│  [Residual Diagnostics]  [Modification Indices]             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### Recommended Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Framework | Next.js 14+ (App Router) | SSG for performance, React ecosystem |
| Styling | Tailwind CSS + custom tokens | Rapid development, consistent design |
| Visualization | D3.js + Observable Plot | Publication-quality graphics |
| Animation | Framer Motion | Smooth, accessible transitions |
| Data | Pre-computed JSON | No server-side computation needed |
| Hosting | Vercel | Fast CDN, easy deployment |

### Performance Requirements

| Metric | Target |
|--------|--------|
| Initial load | < 2 seconds |
| Interaction response | < 100ms |
| Lighthouse score | > 90 |
| Accessibility | WCAG 2.1 AA |

### Accessibility Standards

- Full keyboard navigation
- Screen reader compatible (ARIA labels)
- Color-blind safe palette
- Reduced motion support
- Alt text for all visualizations
- Minimum contrast ratios met

### Export Capabilities

- PNG/SVG for all visualizations (publication-ready, 300 DPI)
- CSV/Excel for all data tables
- PDF summary report generation
- BibTeX citation export
- Model syntax download (lavaan format)

---

## Success Criteria

### Research Communication

| Criterion | Measure |
|-----------|---------|
| Methodological transparency | Full model specification accessible within 2 clicks |
| Finding comprehension | Key results understood without statistical training |
| Confidence communication | Uncertainty visualized for all estimates |
| Replicability | Complete syntax and data dictionary available |

### User Experience

| Criterion | Target |
|-----------|--------|
| Time to key finding | < 30 seconds |
| Time to specific effect | < 2 minutes |
| Expert deep-dive time | < 10 minutes for full results |
| Mobile functionality | Readable (not primary interface) |

### Academic Standards

- Screenshots suitable for publication or presentation
- Compliant with APA 7th edition formatting where applicable
- Citation information prominently displayed
- Methodology section meets peer-review standards

---

## Data Sources

### Primary Files

```
1_Dataset/rep_data.csv                              # Source dataset (N = 5,000)
1_Dataset/archetype_assignments.csv                 # Student typology definitions
2_Codebooks/Variable_Table.csv                      # Complete variable codebook
```

### Model Output Files

```
4_Model_Results/Outputs/*/RQ1_RQ3_main/
  ├── rep_data_with_psw.csv                         # PSW-weighted analysis dataset
  ├── psw_balance_smd.txt                           # Covariate balance diagnostics
  └── psw_stage_report.txt                          # PSW estimation log

4_Model_Results/Outputs/*/A0_total_effect/          # Total effect model results
4_Model_Results/Outputs/*/A1_serial_exploratory/    # Alternative model specification
4_Model_Results/Outputs/*/RQ4_*/                    # Moderation analyses
```

### Pre-Generated Visualizations

```
4_Model_Results/Figures/
  ├── fig6_correlation_matrix_grouped.png           # Correlation structure
  └── fig7_correlation_matrix_post_psw.png          # Post-weighting correlations
```

### Documentation

```
0_Overview.md                                       # Project documentation
.github/copilot-instructions.md                     # Technical specifications
docs/APP_DESIGN_PROMPT.md                           # This document
```

---

## Reference Materials

### Design Inspiration

| Source | Relevant Feature |
|--------|------------------|
| [Pew Research Center](https://pewresearch.org) | Clear data communication, progressive disclosure |
| [Urban Institute](https://urban.org) | Interactive policy tools |
| [Our World in Data](https://ourworldindata.org) | Rigorous yet accessible visualization |
| [FiveThirtyEight](https://fivethirtyeight.com) | Uncertainty communication |
| [Seeing Theory](https://seeing-theory.brown.edu) | Statistical concept visualization |

### Methodological References

- Hayes, A. F. (2022). *Introduction to Mediation, Moderation, and Conditional Process Analysis* (3rd ed.)
- Li, F., Morgan, K. L., & Zaslavsky, A. M. (2018). Balancing covariates via propensity score weighting. *JASA*
- Rosseel, Y. (2012). lavaan: An R package for structural equation modeling. *JSS*

---

## Summary

This platform serves as an interactive companion to dissertation research on accelerated dual credit effects. It balances scholarly rigor with accessible presentation, enabling diverse professional audiences to engage with complex conditional process findings.

**Core principle:** Sophisticated analysis, clearly communicated.

---

*Document Version: 1.0*  
*Created: January 3, 2026*  
*Context: Research Symposium Presentation Support*

