# Process-SEM: Conditional-Process SEM Analysis

**Dissertation Study**: Psychosocial Effects of Accelerated Dual Credit on First-Year Developmental Adjustment

---

## 📋 For Reviewers — Quick Links

| What You Need | Location |
|---------------|----------|
| **Results Tables** | [4_Model_Results/Tables/Dissertation_Tables.md](4_Model_Results/Tables/Dissertation_Tables.md) |
| **Bootstrap Tables** | [4_Model_Results/Tables/Bootstrap_Tables.md](4_Model_Results/Tables/Bootstrap_Tables.md) |
| **Figures** | [4_Model_Results/Figures/](4_Model_Results/Figures/) |
| **Plain-Language Summary** | [4_Model_Results/Summary/Key_Findings_Summary.md](4_Model_Results/Summary/Key_Findings_Summary.md) |
| **Variable Dictionary** | [2_Codebooks/Variable_Table.csv](2_Codebooks/Variable_Table.csv) |

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
├── 0_Overview.md                # This file
├── 1_Dataset/                   # Representative dataset (N=5,000)
│   └── rep_data.csv
├── 2_Codebooks/                 # Survey documentation
│   ├── BCSSE_Codebook.xlsx
│   ├── NSSE_Core_Codebook.docx
│   └── NSSE_MHW_Codebook.docx
├── 3_Analysis/                  # All analysis scripts
│   ├── 1_Main_Pipeline_Code/    # ★ MAIN ENTRY POINT
│   ├── 2_Bootstrap_Code/        # Bootstrap inference
│   ├── 3_Tables_Code/           # Table generation (Python)
│   ├── 4_Plots_Code/            # Visualization (Python)
│   └── 5_Utilities_Code/        # Supporting utilities
├── 4_Model_Results/             # ★ ALL OUTPUTS
│   ├── Tables/                  # APA 7 formatted tables
│   ├── Figures/                 # Publication-ready plots
│   ├── Summary/                 # Plain-language findings
│   └── Outputs/                 # Raw model outputs
├── 5_Statistical_Models/        # lavaan model specifications
│   └── models/
│       └── mg_fast_vs_nonfast_model.R
└── _Setup/                      # Technical setup files
    └── requirements.txt
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
Rscript 3_Analysis/1_Main_Pipeline_Code/run_all_RQs_official.R
```

Environment variables for customization:
```bash
export OUT_BASE="4_Model_Results/Outputs"
export B_BOOT_MAIN=2000
export BOOT_CI_TYPE_MAIN="bca.simple"
```

---

## Key Output Files

| File | Description |
|------|-------------|
| `4_Model_Results/Tables/Dissertation_Tables.docx` | All dissertation tables (APA 7) |
| `4_Model_Results/Tables/Bootstrap_Tables.docx` | Bootstrap inference tables |
| `4_Model_Results/Outputs/logs/verification_checklist.txt` | Data validation audit |
| `4_Model_Results/Outputs/RQ1_RQ3_main/structural/` | Main model parameter estimates |
| `4_Model_Results/Figures/fig*.png` | Descriptive visualizations |

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
SEM controls: `hgrades_c`, `bparented_c`, `hapcl_c`, `hprecalc13_c`, `hchallenge_c`, `cSFcareer_c`, `hacadpr13_c`, `tcare_c`, `StemMaj_c`  
PSW covariates use the same centered set and exclude `cohort` and `pell` (pell is W-only).

---

## Citation

Johnson, J. (2026). *Psychosocial effects of accelerated dual credit on first-year developmental adjustment among equity-impacted California students* [Doctoral dissertation]. California State University.

---

## Contact

For questions about this analysis, contact the author through the dissertation committee.
