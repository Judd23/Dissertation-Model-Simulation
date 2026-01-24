# Process-SEM Copilot Instructions

## Study Context

Ed.D. dissertation studying psychosocial effects of accelerated dual credit (FASt status + credit dose) on first-year developmental adjustment among equity-impacted California students. Statistical approach: **conditional-process SEM with latent variables** in R (lavaan + semTools).

## Conceptual Model

### Two-Stage Dual Credit Categorization
1. **Stage 1**: `DC_student = 1(hdc17 >= 2)` — DC vs No_DC based on HS dual credit courses
2. **Stage 2**: `x_FASt = 1(trnsfr_cr >= 12)` — FASt (≥12 credits) vs non-FASt (0-11 credits)

### Treatment & Dose
- **X (treatment)**: `x_FASt` (0/1 — ≥12 transferable credits at matriculation)
- **Z (dose moderator)**: `credit_dose = pmax(0, trnsfr_cr - 12)/10` — units above threshold; Z=0 for all non-FASt
- **Z centered**: `credit_dose_c = credit_dose - mean(credit_dose)`
- **Interaction**: `XZ_c = x_FASt * credit_dose_c` (first-stage moderation)

### Sample Distribution
- **FASt (x_FASt=1)**: n=1,321 (26.4%)
- **non-FASt (x_FASt=0)**: n=3,679 (73.6%) — combines No_Cred + Lite_DC

### Constructs
- **Mediators** (parallel): `EmoDiss` (emotional distress), `QualEngag` (quality of engagement)
- **Outcome**: `DevAdj` (second-order latent: Belong, Gains, SupportEnv, Satisf)

### Covariates
- **PSW Covariates** (9, all centered): `hgrades_c`, `bparented_c`, `hapcl_c`, `hprecalc13_c`, `hchallenge_c`, `cSFcareer_c`, `hacadpr13_c`, `tcare_c`, `StemMaj_c`
- **SEM Structural Covariates** (10): PSW covariates + `cohort`
- **PSW Formula**: `psw = X·(1−ps) + (1−X)·ps; normalized` (overlap weights for ATO)
- **Exclusions**: `cohort` excluded from PSW (design variable); `pell` is W-moderator only (not in PSW or SEM structural paths)

## STRICT Naming Rules

- ✅ Use: `QualEngag`, `EmoDiss`, `DevAdj`, `x_FASt`, `credit_dose_c`, `XZ_c`
- ❌ NEVER use: `QualInteract` (banned construct name)
- All `_c` suffixed variables are mean-centered; recompute after any data manipulation

## Architecture

### Entry Points

- `scripts/run_all_RQs_official.R` — Full analysis pipeline (RQ1–RQ4)
- `r/mc/02_mc_allRQs_pooled_mg_psw.R` — Monte Carlo simulation engine
- `scripts/e2e_integration_test_fa_st_pipeline.R` — E2E validation test

### Model Definitions

- `r/models/mg_fast_vs_nonfast_model.R` — Defines `MEASUREMENT_SYNTAX`, `MODEL_FULL`
- Measurement syntax is **shared** across CFA/invariance and SEM (keep identical)
- Marker-variable identification (`1*` loadings) for all factors

### Analysis Types

1. **Pooled single-group SEM** — Main conditional-process model
2. **Multi-group SEM** — By W moderators (race, Pell, cohort, etc.) with group-specific structural paths
3. **Measurement invariance** — CFA-only sequences for group comparisons

## Estimation Defaults

### Main SEM Runs (ML/FIML)

```r
lavaan::sem(model, data, estimator = "ML", missing = "fiml", sampling.weights = "psw")
```

### Monte Carlo / WLSMV Runs

```r
lavaan::sem(model, data, ordered = ORDERED_VARS, estimator = "WLSMV", parameterization = "theta")
```

WLSMV does not support FIML — use listwise or MI (`mice` + `semTools::runMI`).

### Bootstrap CIs

- Production: `bca.simple` with B=2000
- Debug/smoke: `perc` or `none` with reduced B

## Defined Parameters (Conditional Effects)

Models define conditional effects at Z = {−1 SD, 0, +1 SD}:

- `dir_z_low/mid/high` — Conditional direct effects
- `ind_EmoDiss_*`, `ind_QualEngag_*` — Conditional indirects
- `total_*` — Conditional totals
- `index_MM_*` — Index of moderated mediation

## Red Flag Diagnostics

Check immediately when results look wrong:

1. **Non-invertible info matrix / missing SEs** — identification trouble, Heywood cases, collinearity
2. **Grouping var as covariate in MG model** — lavaan chokes if covariate is constant within group
3. **Banned names reappearing** — especially `QualInteract`
4. **Measurement syntax drift** — downstream comparisons depend on exact consistency

## Workflow Rules

1. **Do not invent numbers** — If no output file in hand, say so
2. **Preserve model intent** — Keep shared measurement syntax, stable naming, minimal disruptions
3. **"Industry standard" = peer-review ready** for higher-ed quantitative SEM journals
4. **Toolchain**: R/lavaan + semTools primary; Mplus as conceptual reference only
5. **Naming consistency**: `x_FASt`, `credit_dose_c`, `XZ_c`, `EmoDiss`, `QualEngag`, `DevAdj`

## Running Tests & Workflows

### Pipeline Run Modes

```bash
./scripts/run smoke        # Quick test (B=10, perc CIs)
./scripts/run main         # Standard run (B=500, bca.simple)
./scripts/run Full_Deploy  # Production (B=2000, bca.simple, 8 cores)
```

### Full_Deploy Study Settings (Official)

| Variable             | Value         |
| -------------------- | ------------- |
| `RUN_MODE`           | `Full_Deploy` |
| `B_BOOT_MAIN`        | 2000          |
| `BOOT_CI_TYPE_MAIN`  | bca.simple    |
| `BOOT_NCPUS`         | 8             |
| `SKIP_RQ4`           | 1             |
| `SKIP_RQ4_STRUCT_MG` | 0             |

### E2E Integration Test

```bash
Rscript scripts/e2e_integration_test_fa_st_pipeline.R
```

Outputs to `results/e2e_test/<timestamp>/` with `verification_checklist.txt`

### Monte Carlo Simulation

```bash
Rscript r/mc/02_mc_allRQs_pooled_mg_psw.R --N 500 --R 10 --seed 12345 --cores 4
```

Key flags: `--psw 1`, `--mg 1`, `--save_fits 1`, `--resume 1`

### VS Code Tasks

Use pre-configured tasks: `PSW Stage`, `SEM Stage`, `PSW + SEM (full pipeline)`

## File Conventions

- `results/fast_treat_control/official_all_RQs_*` — Production runs
- `results/repstudy_bootstrap/` — Representative study outputs
- `rep_data.csv` (repo root) — Representative dataset

## R Package Requirements

```r
stopifnot(packageVersion("lavaan") >= "0.6-21")
# Also: mice, semTools (for MI), parallel (base R)
```

## Common Pitfalls

1. **Never use `hgrades_AF`** — deprecated column, scripts explicitly remove it
2. **Standardized output fails for MI fits** — use `standardized = FALSE` with `lavaan.mi` objects
3. **Multi-group convergence** — MG models (`--mg 1`) can be fragile; check error logs in `*_ERROR.txt`
4. **Parallel MI** — `analysis=mi` with `cores>1` can be unstable; use `--cores 1` if errors occur
