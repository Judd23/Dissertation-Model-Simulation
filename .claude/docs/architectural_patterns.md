# Architectural Patterns

## Pipeline Architecture

The project follows a linear multi-stage analysis pipeline:

1. **Data Prep & Validation** - Load, clean, derive variables, verify assumptions
2. **PSW Weighting** - Propensity score overlap weights for causal inference
3. **SEM Fitting** - lavaan models with bootstrap inference
4. **Output Generation** - Tables (Python/docx) and figures (Python/matplotlib)

R handles stages 1-3; Python handles stage 4. Inter-process communication uses file-based hand-off (CSV, JSON).

See: `run_all_RQs_official.R:4-8` for RQ mapping, `:839-882` for PSW computation.

## Configuration via Environment Variables

Runtime behavior controlled via env vars with three-tier fallback:

1. Explicit env var (highest priority)
2. Known default candidates
3. Error if nothing found

Key variables:

- `OUT_BASE` - Output directory (default: `4_Model_Results/Outputs`)
- `B_BOOT_MAIN`, `B_BOOT_TOTAL`, etc. - Bootstrap replicate counts
- `BOOT_CI_TYPE_MAIN` - CI method (`bca.simple`, `perc`, `none`)
- `W_SELECT` - Comma-separated W indices for invariance testing (e.g., `"1,3,4"`)
- `TABLE_CHECK_MODE=1` - Quick verification (B=20, serial bootstrap)
- `SMOKE_ONLY_A=1` - Run only RQ1-RQ3, skip RQ4

See: `run_all_RQs_official.R:51-172` for all env var definitions.

## Single Source of Truth

Derived variables are recomputed each run from raw sources to prevent stale values:

- `x_FASt = 1(trnsfr_cr >= 12)` - Binary treatment; 0=non-FASt (0-11 credits), 1=FASt (≥12 credits)
- `credit_dose = pmax(0, trnsfr_cr - 12)/10` - Credits above threshold in 10-unit increments; Z=0 for all non-FASt
- `credit_dose_c = credit_dose - mean(credit_dose)` - Centered dose moderator
- `XZ_c = x_FASt * credit_dose_c` - Treatment × Dose interaction (first-stage moderation)
- `psw = X·(1−ps) + (1−X)·ps; normalized` - Overlap weights for ATO estimand

See: `run_all_RQs_official.R:357-411` for derived variable computation.

## Validation Patterns

### Precondition Checking

Functions fail fast with informative messages using `stopifnot()` and `stop()`.

See: `run_all_RQs_official.R:248-249` for file existence checks.

### Tolerance-Based Validation

Numerical comparisons use explicit tolerances (default: `1e-10`) to avoid floating-point errors.

See: `run_all_RQs_official.R:367, 543-546` for centering verification.

### Audit Trails

Every run produces `verification_checklist.txt` documenting:

- Data quality checks (recode integrity, range enforcement)
- Derived variable validation
- Centering verification
- Directional alignment checks

See: `run_all_RQs_official.R:596-820` for verification logic.

## Naming Conventions

### Functions

| Prefix      | Purpose                | Example                                 |
| ----------- | ---------------------- | --------------------------------------- |
| `build_*`   | Construct model syntax | `build_model_fast_treat_control()`      |
| `fit_*`     | Execute lavaan model   | `fit_mg_fast_vs_nonfast_with_outputs()` |
| `compute_*` | Derive data (mutative) | `compute_psw_overlap()`                 |
| `write_*`   | Persist to files       | `write_lavaan_txt_tables()`             |
| `run_*`     | Execute sub-pipeline   | `run_wald_tests_fast_vs_nonfast()`      |
| `get_*`     | Retrieve/transform     | `get_measurement_syntax_official()`     |

### Variables

| Type       | Convention   | Example                           |
| ---------- | ------------ | --------------------------------- |
| Raw        | snake_case   | `trnsfr_cr`, `hgrades`            |
| Derived    | snake_case   | `x_FASt`, `credit_dose`           |
| Centered   | `*_c` suffix | `credit_dose_c`, `XZ_c`           |
| Latent     | CamelCase    | `DevAdj`, `EmoDiss`, `QualEngag`  |
| Indicators | snake_case   | `sbvalued`, `MHWdacad`, `QIadmin` |

### Files

| Pattern             | Meaning                        |
| ------------------- | ------------------------------ |
| `*_official`        | Primary, publication-ready     |
| `*_exploratory`     | Secondary/sensitivity analysis |
| `build_*_tables.py` | Report generation              |
| `plot_*.py`         | Visualization                  |
| `executed_*.lav`    | Exact model syntax used        |

## Model Specification Pattern

All lavaan models use consistent identification:

1. **First-order factors**: All loadings freely estimated (use `std.lv = TRUE`)
2. **Second-order factor (DevAdj)**: Marker variable on Belong (loading = 1)
3. **Mediator factors**: Marker variable on first indicator

Structural comments document identification strategy inline.

See: `mg_fast_vs_nonfast_model.R:44-51` for identification documentation.

## State Checkpoint Strategy

Each pipeline run produces a self-contained folder under `runs/<RUN_ID>/`:

```
4_Model_Results/Outputs/runs/<RUN_ID>/
├── manifest.json                 # Run metadata + artifact paths
├── raw/                          # R-produced artifacts
│   ├── RQ1_RQ3_main/
│   │   └── structural/
│   │       ├── structural_parameterEstimates.txt
│   │       ├── structural_fitMeasures.txt
│   │       ├── structural_rsquare.txt
│   │       └── executed_model_*.lav
│   ├── rep_data_with_psw.csv     # Data with PSW column
│   ├── bootstrap_results.csv     # Bootstrap inference results
│   ├── psw_balance_smd.txt       # Covariate balance (SMD)
│   ├── A0_total_effect/          # Total effect comparison
│   ├── A1_serial_exploratory/    # Serial mediation
│   ├── RQ4_measurement/W{1..5}_*/# Invariance by W (if enabled)
│   └── RQ4_structural_MG/W{1..5}_*/ # Multi-group by W (if enabled)
├── tables/                       # Python-produced DOCX
│   ├── Bootstrap_Tables.docx
│   ├── Dissertation_Tables.docx
│   └── Plain_Language_Summary.docx
├── figures/                      # Python-produced PNG
│   └── fig_*.png (15+ figures)
└── logs/
    └── verification_checklist.txt
```

After sync, mirrored to: `webapp/public/results/<RUN_ID>/`

## Defensive Data Handling

- Original data never modified; derived versions created as copies
- PSW computed once, stored as `psw` column, reused downstream
- `dat_main <- dat` pattern before transformations

See: `run_all_RQs_official.R:890-893` for defensive copying.

## File-Based Inter-Process Communication

R → Python hand-off:

1. R writes `rep_data_with_psw.csv` with all preprocessing and `psw` column
2. R writes SEM results to `structural_parameterEstimates.txt`, `structural_fitMeasures.txt`
3. R writes bootstrap inference to `bootstrap_results.csv`
4. R writes covariate balance to `psw_balance_smd.txt`
5. Python reads these files and outputs DOCX tables and PNG figures

### R Output Files Consumed by Python

| File                                | Format | Consumer                                                          | Content                                  |
| ----------------------------------- | ------ | ----------------------------------------------------------------- | ---------------------------------------- |
| `rep_data_with_psw.csv`             | CSV    | `plot_descriptives.py`                                            | Raw data + PSW column                    |
| `structural_parameterEstimates.txt` | TSV    | `build_bootstrap_tables.py`, `build_dissertation_tables.py`       | All lavaan parameters (est, SE, CI, std) |
| `structural_fitMeasures.txt`        | TSV    | `build_dissertation_tables.py`, `build_plain_language_summary.py` | CFI, TLI, RMSEA, SRMR                    |
| `bootstrap_results.csv`             | CSV    | `build_plain_language_summary.py`                                 | Bootstrap SEs and CIs for defined params |
| `psw_balance_smd.txt`               | TSV    | `build_dissertation_tables.py`                                    | SMD before/after weighting               |

Python → R (rare):

- `standards_data.json` for visualization script parameters

See: `run_all_RQs_official.R:1315-1377` for subprocess invocation.

## PSW Weighting in Output Generation

All tables and figures reflect PSW-weighted estimates for causal inference.

### Data Flow

```
R: compute_psw_overlap()
    │
    ├─→ writes 'psw' column to dat_main
    │
    ├─→ lavaan::sem(..., sampling.weights = "psw")
    │       │
    │       └─→ structural_parameterEstimates.txt (PSW-weighted)
    │
    └─→ write.csv(dat_main, "rep_data_with_psw.csv")
            │
            └─→ Python scripts read 'psw' column
```

### PSW Usage by Script

| Script                            | PSW Applied | Mechanism                                                              |
| --------------------------------- | ----------- | ---------------------------------------------------------------------- |
| `plot_descriptives.py`            | ✅ Direct   | `--weights psw` flag; weighted means/SDs                               |
| `plot_deep_cuts.py`               | ✅ Direct   | `--weights psw` flag; weighted visualizations                          |
| `build_bootstrap_tables.py`       | ✅ Indirect | Reads PSW-weighted SEM estimates from `.txt`                           |
| `build_dissertation_tables.py`    | ✅ Indirect | Reads PSW-weighted estimates; balance table from `psw_balance_smd.txt` |
| `build_plain_language_summary.py` | ✅ Indirect | Reads `bootstrap_results.csv` (PSW-weighted)                           |

### Gap: Descriptive Statistics Table

Table 2 (Descriptive Statistics) in `build_dissertation_tables.py` expects `descriptives.csv`.
Currently, R does not generate this file. Options:

1. Add R code to write PSW-weighted descriptives
2. Have Python compute from `rep_data_with_psw.csv` using the `psw` column
3. Accept placeholder until resolved

See: `run_all_RQs_official.R:839-882` for PSW computation.
