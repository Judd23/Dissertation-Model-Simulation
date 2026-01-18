# Key Findings Summary
## Psychosocial Effects of Accelerated Dual Credit on First-Year Developmental Adjustment

**Analysis Date**: January 18, 2026  
**Sample Size**: N = 5,000 students  
**Statistical Method**: Structural Equation Modeling with Propensity Score Weighting

---

## Overview

This study examined whether students who enter college with significant dual credit experience ("FASt" students—those with 12 or more transferable credits at matriculation) differ in their first-year developmental adjustment compared to their peers. The analysis tested whether any effects operate through two psychological mechanisms: emotional distress and quality of engagement with the campus community.

---

## Research Question 1: Does FASt Status Affect Developmental Adjustment?

**Finding: No significant total effect of FASt status on developmental adjustment.**

In the total-effect model, FASt status is not a significant predictor of developmental adjustment (total effect = -0.022, p = .195). 

In the full model, neither the direct effect of FASt (c = 0.018, p = .338) nor the FASt × credit dose interaction (c′z = 0.001, p = .842) is significant.

**Interpretation**: The current run does not show evidence that FASt status (or its interaction with credit dose) directly affects developmental adjustment.

---

## Research Question 2: How Does FASt Status Affect Emotional Distress?

**Finding: FASt students report higher emotional distress, but moderation by credit dose is not supported.**

FASt status predicts higher emotional distress (a₁ = 0.124, p = .014). 

The FASt × credit dose interaction is not significant (a₁z = 0.023, p = .206).

**Interpretation**: FASt students show modestly higher distress in this run, but there is no evidence that this effect varies by credit dose.

---

## Research Question 3: How Does FASt Status Affect Quality of Engagement?

**Finding: No significant effects of FASt status on quality of engagement.**

FASt status does not significantly affect engagement (a₂ = -0.011, p = .828), and the interaction is not significant (a₂z = -0.018, p = .295).

**Interpretation**: The current run does not support either a main effect or a moderation effect of FASt status on engagement.

---

## Mediation Analysis: How Do the Effects Work?

**Finding: Distress and engagement strongly relate to adjustment, but evidence for mediation from FASt is limited in this run.**

### Emotional Distress Pathway
- Distress significantly harms developmental adjustment (b₁ = -0.199, p < .001)

### Quality of Engagement Pathway  
- Engagement significantly supports developmental adjustment (b₂ = 0.159, p < .001)

### Direct Effect
- The direct effect of FASt on adjustment (controlling for mediators) is not significant (c = 0.018, p = .338)
- The total effect is also not significant (c_total = -0.022, p = .195)

---

## Model Fit

The structural equation model demonstrated excellent fit to the data:

| Fit Index | Value | Interpretation |
|-----------|-------|----------------|
| CFI | 0.995 | Excellent (>0.95) |
| TLI | 0.995 | Excellent (>0.95) |
| RMSEA | 0.013 | Excellent (<0.05) |
| SRMR | 0.046 | Excellent (<0.05) |

---

## Summary of Key Takeaways

1. **No direct or total effect detected.** FASt status does not show a significant total or direct effect on developmental adjustment in this run.

2. **Distress is elevated.** FASt status is associated with modestly higher emotional distress (a₁ significant), but the credit-dose interaction is not.

3. **Engagement is unchanged.** FASt status does not significantly predict engagement, and there is no evidence of moderation by credit dose.

4. **Strong mediator paths.** Distress harms adjustment (b₁) and engagement supports adjustment (b₂), indicating key mechanisms even if FASt does not strongly shift engagement.

5. **Implications for practice.** Supports aimed at reducing distress may be more immediately relevant than engagement interventions tied to FASt status alone.

---

## Technical Notes

- **Estimator**: Maximum Likelihood with Full Information Maximum Likelihood (FIML) for missing data
- **Weighting**: Propensity Score Overlap Weights to balance treatment and control groups
- **Bootstrap**: 10 replicates for confidence intervals
- **Software**: R 4.5.2 with lavaan 0.6-21
