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
- `x_FASt = 1(trnsfr_cr >= 12)` - Always derived from transfer credits
- `credit_dose_c` - Centered credit dose
- `XZ_c` - Treatment x Moderator interaction (centered)

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
| Prefix | Purpose | Example |
|--------|---------|---------|
| `build_*` | Construct model syntax | `build_model_fast_treat_control()` |
| `fit_*` | Execute lavaan model | `fit_mg_fast_vs_nonfast_with_outputs()` |
| `compute_*` | Derive data (mutative) | `compute_psw_overlap()` |
| `write_*` | Persist to files | `write_lavaan_txt_tables()` |
| `run_*` | Execute sub-pipeline | `run_wald_tests_fast_vs_nonfast()` |
| `get_*` | Retrieve/transform | `get_measurement_syntax_official()` |

### Variables
| Type | Convention | Example |
|------|------------|---------|
| Raw | snake_case | `trnsfr_cr`, `hgrades` |
| Derived | snake_case | `x_FASt`, `credit_dose` |
| Centered | `*_c` suffix | `credit_dose_c`, `XZ_c` |
| Latent | CamelCase | `DevAdj`, `EmoDiss`, `QualEngag` |
| Indicators | snake_case | `sbvalued`, `MHWdacad`, `QIadmin` |

### Files
| Pattern | Meaning |
|---------|---------|
| `*_official` | Primary, publication-ready |
| `*_exploratory` | Secondary/sensitivity analysis |
| `build_*_tables.py` | Report generation |
| `plot_*.py` | Visualization |
| `executed_*.lav` | Exact model syntax used |

## Model Specification Pattern

All lavaan models use consistent identification:

1. **First-order factors**: All loadings freely estimated (use `std.lv = TRUE`)
2. **Second-order factor (DevAdj)**: Marker variable on Belong (loading = 1)
3. **Mediator factors**: Marker variable on first indicator

Structural comments document identification strategy inline.

See: `mg_fast_vs_nonfast_model.R:44-51` for identification documentation.

## State Checkpoint Strategy

Data checkpointed at each stage in separate output folders:
```
OUT_BASE/
├── RQ1_RQ3_main/structural/      # Primary model
├── A0_total_effect/              # Total effect comparison
├── A1_serial_exploratory/        # Serial mediation
├── RQ4_measurement/W{1..5}_*/    # Invariance by W
├── RQ4_structural_MG/W{1..5}_*/  # Multi-group by W
└── sensitivity_unweighted_parallel/
```

Each folder contains:
- `structural_parameterEstimates.txt`
- `structural_fitMeasures.txt`
- `executed_model_*.lav`

## Defensive Data Handling

- Original data never modified; derived versions created as copies
- PSW computed once, stored as `psw` column, reused downstream
- `dat_main <- dat` pattern before transformations

See: `run_all_RQs_official.R:890-893` for defensive copying.

## File-Based Inter-Process Communication

R → Python hand-off:
1. R writes `rep_data_with_psw.csv` with all preprocessing
2. Python reads and applies `VARIABLE_LABELS` dict
3. Python outputs DOCX tables and PNG figures

Python → R (rare):
- `standards_data.json` for visualization script parameters

See: `run_all_RQs_official.R:1315-1377` for subprocess invocation.
