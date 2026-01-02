# Process-SEM: Conditional-Process SEM Analysis

**Dissertation Study**: Psychosocial Effects of Accelerated Dual Credit on First-Year Developmental Adjustment

---

## Overview

This repository contains the statistical analysis pipeline for an Ed.D. dissertation examining how accelerated dual credit participation (FASt status) affects first-year developmental adjustment among equity-impacted California State University students, mediated by emotional distress and quality of engagement.

### Conceptual Model

```
                    ┌─────────────┐
                    │  EmoDiss    │
        a1,a1z      │  (M₁)       │     b1
    ┌──────────────►│             │──────────┐
    │               └─────────────┘          │
    │                                        ▼
┌───┴───┐                              ┌──────────┐
│ FASt  │          c, cz               │ DevAdj   │
│ (X)   │─────────────────────────────►│  (Y)     │
└───┬───┘                              └──────────┘
    │               ┌─────────────┐          ▲
    │    a2,a2z     │ QualEngag   │     b2   │
    └──────────────►│  (M₂)       │──────────┘
                    └─────────────┘

Moderation: Z = credit_dose_c (mean-centered credit dose)
```

### Key Variables

| Variable | Description |
|----------|-------------|
| `x_FASt` | Treatment (1 = ≥12 transferable credits at matriculation) |
| `credit_dose_c` | Moderator: Mean-centered credit dose |
| `XZ_c` | Interaction term (x_FASt × credit_dose_c) |
| `EmoDiss` | Mediator 1: Emotional Distress (latent) |
| `QualEngag` | Mediator 2: Quality of Engagement (latent) |
| `DevAdj` | Outcome: Developmental Adjustment (second-order latent) |

---

## Repository Structure

```
Process-SEM/
├── README.md                    # This file
├── rep_data.csv                 # Representative dataset (N=5,000)
├── requirements.txt             # Python dependencies
├── .github/
│   └── copilot-instructions.md  # Development guidelines
├── Codebooks/                   # Variable documentation
├── r/
│   ├── models/                  # lavaan model specifications
│   │   └── mg_fast_vs_nonfast_model.R
│   ├── themes/                  # ggplot themes
│   └── utils/                   # Helper functions
├── scripts/
│   ├── run_all_RQs_official.R   # ★ MAIN ENTRY POINT
│   ├── bootstrap_*.R            # Bootstrap inference scripts
│   ├── build_*.py               # Table generation
│   ├── plot_*.py                # Visualization
│   └── make_*.R                 # Supporting utilities
└── results/
    └── official/                # ★ FINAL RESULTS
        ├── RQ1_RQ3_main/        # Main model outputs
        ├── RQ4_measurement/     # Measurement invariance
        ├── RQ4_structural_MG/   # Multi-group structural
        ├── A0_total_effect/     # Total effect model
        ├── A1_serial_exploratory/  # Serial mediation
        ├── Bootstrap_Tables.docx
        ├── Dissertation_Tables.docx
        ├── fig1-12 (*.png)      # Descriptive figures
        └── verification_checklist.txt
```

---

## Official Results Summary

**Run Date**: January 1, 2026  
**Sample**: N = 5,000 (simulated to reflect CSU demographics)  
**Bootstrap**: B = 2,000 replicates with BCA/percentile CIs  
**Weighting**: Propensity Score Overlap Weights (PSW)

### Main Findings (RQ1–RQ3)

| Path | Label | Estimate | SE | p | Interpretation |
|------|-------|----------|-----|---|----------------|
| X → EmoDiss | a1 | 0.21 | 0.04 | <.001 | FASt increases emotional distress |
| X×Z → EmoDiss | a1z | 0.17 | 0.02 | <.001 | Effect strengthens with more credits |
| X → QualEngag | a2 | 0.04 | 0.05 | .477 | No main effect |
| X×Z → QualEngag | a2z | -0.26 | 0.02 | <.001 | More credits → lower engagement |
| EmoDiss → DevAdj | b1 | -0.15 | 0.01 | <.001 | Distress harms adjustment |
| QualEngag → DevAdj | b2 | 0.11 | 0.01 | <.001 | Engagement helps adjustment |
| X → DevAdj (direct) | c | -0.02 | 0.02 | .294 | No direct effect (full mediation) |

### Indices of Moderated Mediation
- **EmoDiss pathway**: Index = -0.025, p < .001 ✓
- **QualEngag pathway**: Index = -0.028, p < .001 ✓

---

## Running the Analysis

### Prerequisites

```r
# R 4.5+ with lavaan 0.6-21+
install.packages("lavaan")
stopifnot(packageVersion("lavaan") >= "0.6-21")
```

```bash
# Python 3.10+ for table/figure generation
pip install -r requirements.txt
```

### Execute Main Pipeline

```bash
# Full analysis (RQ1-4, bootstrap, tables, figures)
Rscript scripts/run_all_RQs_official.R
```

Environment variables for customization:
```bash
export OUT_BASE="results/official"
export B_BOOT_MAIN=2000
export BOOT_CI_TYPE_MAIN="bca.simple"
```

---

## Key Output Files

| File | Description |
|------|-------------|
| `results/official/Dissertation_Tables.docx` | All dissertation tables (APA 7) |
| `results/official/Bootstrap_Tables.docx` | Bootstrap inference tables |
| `results/official/verification_checklist.txt` | Data validation audit |
| `results/official/RQ1_RQ3_main/structural/` | Main model parameter estimates |
| `results/official/fig*.png` | Descriptive visualizations |

---

## Methodological Notes

### Estimation
- **Estimator**: ML with FIML for missing data
- **Weights**: Propensity score overlap weights
- **Bootstrap**: Stratified bootstrap-then-weight procedure (B=2,000)
- **CIs**: Bias-corrected accelerated (BCA) or percentile

### Measurement Model
- **DevAdj**: Second-order factor (Belong, Gains, SupportEnv, Satisf)
- **EmoDiss**: 6 indicators (MHWd items)
- **QualEngag**: 5 indicators (QI items)
- Marker-variable identification with `1*` loadings

### Covariates
`cohort`, `hgrades_c`, `bparented_c`, `pell`, `hapcl`, `hprecalc13`, `hchallenge_c`, `cSFcareer_c`

---

## Citation

Johnson, J. (2026). *Psychosocial effects of accelerated dual credit on first-year developmental adjustment among equity-impacted California students* [Doctoral dissertation]. California State University.

---

## Contact

For questions about this analysis, contact the author through the dissertation committee.
