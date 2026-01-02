# Conditional-Process Structural Equation Model Analysis

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
