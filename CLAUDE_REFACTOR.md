# CLAUDE REFACTOR CHECKLIST — MUST READ

You are working in repo: **Dissertation-Model-Simulation_clean**.

## FOLLOW THE REPO WORKING AGREEMENT IN CLAUDE.md:

- Minimal-diff edits only.
- Read relevant files first; do not speculate.
- Touch at most 3 files per task by default.
- BEFORE editing: list exact files you will change and why. WAIT for approval.
- After edits: summarize changes file-by-file; confirm no extra visual diffs.

---

## GOAL

Implement a **"one-button push" manifest-driven architecture**:

1. **Analysis (R)** runs in `rocker/verse` and writes all artifacts into:

   ```
   4_Model_Results/Outputs/runs/<RUN_ID>/
   ```

   including a REQUIRED `manifest.json`.

2. **Python** reads that manifest and writes DOCX/PNG into the same run folder and updates `manifest.json`.

3. **A sync step** copies the run folder into the webapp static results container:

   ```
   webapp/public/results/<RUN_ID>/
   ```

   and updates:

   ```
   webapp/public/results/runs_index.json
   ```

4. **Webapp** (React/Vite, HashRouter, base path set) loads runs via:
   ```js
   import.meta.env.BASE_URL + "results/runs_index.json";
   ```
   and each run via:
   ```js
   import.meta.env.BASE_URL + "results/<RUN_ID>/manifest.json";
   ```

**DO NOT refactor unrelated code. Keep changes surgical.**

---

## KEY CLARIFICATIONS

| Item                 | Decision                                                                           |
| -------------------- | ---------------------------------------------------------------------------------- |
| **R execution**      | Only R runs in `rocker/verse` container                                            |
| **Python execution** | Runs locally in `.venv`, NOT in container                                          |
| **Webapp execution** | Runs via `npm` scripts (no container)                                              |
| **Docker approach**  | Prefer direct `docker run rocker/verse` unless compose already manages R analysis  |
| **Manifest check**   | Orchestrator MUST exit with clear error if `manifest.json` not found after R stage |

---

## DECISIONS BY PHASE

### General / Phase 0

| Question               | Decision                                                                                                                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Python stage**       | Assume NO reliable single entrypoint exists. Phase 3 will create a minimal Python entrypoint that takes `--manifest`, writes `tables/` and `figures/`, and updates manifest. If Phase 0 finds an existing script that works, Phase 3 wraps it. |
| **R output structure** | Keep `results/` for backward compatibility. New canonical = `4_Model_Results/Outputs/runs/<RUN_ID>/`. During transition: copy/symlink key artifacts or redirect gradually. Once stable, mark `results/` legacy.                                |

### Phase 2 — Env Vars

| Env Var    | Behavior                                                                      |
| ---------- | ----------------------------------------------------------------------------- |
| `OUT_BASE` | **Default allowed**: `4_Model_Results/Outputs` if not set                     |
| `RUN_ID`   | **REQUIRED** — fail fast if missing. Must match orchestrator's folder naming. |

### Phase 3 — Python

| Question         | Decision                                                                  |
| ---------------- | ------------------------------------------------------------------------- |
| **Environment**  | Local `.venv` (not containerized) — simpler, faster, consistent with Node |
| **DOCX library** | `python-docx` (already installed, straightforward for tables)             |

### Phase 5 — Webapp UI

| Question                  | Decision                                                                          |
| ------------------------- | --------------------------------------------------------------------------------- |
| **Run Library placement** | New route `#/runs` (HashRouter). Optionally set as home page. Minimal disruption. |

### Phase 6 — Run Modes

| Mode          | Purpose                   | Bootstrap B | Seed               | Notes                                           |
| ------------- | ------------------------- | ----------- | ------------------ | ----------------------------------------------- |
| `smoke`       | Does pipeline work E2E?   | 50–200      | Fixed (12345)      | Minimal, fastest. Optionally skip multi-group.  |
| `main`        | Real working run          | 500–2000    | Explicit, can vary | Your current default settings                   |
| `Full_Deploy` | Deploy-ready, full checks | 2000+       | Explicit, recorded | Full model set, groups, inference, verification |

**Important**: Define modes by setting env vars, not by branching logic.

### General Architecture

| Question              | Decision                                                                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`runs_index.json`** | Create fresh if not exists. If exists, update by inserting new run (newest-first), deduplicate by `run_id`. Never overwrite.                                                         |
| **Git tracking**      | **Option A (curated)**: Track `runs_index.json` + selected run folders (e.g., last 3 Full_Deploy runs). Gitignore everything else. Only "Full_Deploy" runs get synced and committed. |

### ⚠️ CRITICAL RULE — Manifest Paths

> **Artifact paths in manifest MUST be web-friendly relative URLs, NOT local filesystem paths.**

| ✅ Good                  | ❌ Bad                            |
| ------------------------ | --------------------------------- |
| `figures/path_a.png`     | `/Users/jjohnson3/.../path_a.png` |
| `tables/fit_indices.csv` | `C:\Users\...\fit_indices.csv`    |

This single rule prevents half the "why is the UI blank?" debugging.

---

## WIRING DIAGRAM (Phases 0-4)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ENV: RUN_ID=xxx (REQUIRED)                                          │
│ ENV: RUN_MODE=smoke|main|Full_Deploy (default: main)                │
│ ENV: MANIFEST_FIRST_PYTHON=0|1 (default: 0 = legacy mode)           │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│ R: 3_Analysis/1_Main_Pipeline_Code/run_all_RQs_official.R           │
│                                                                     │
│   1. set_out_base() → 4_Model_Results/Outputs/runs/<RUN_ID>/        │
│       ├─ raw/                                                       │
│       │   ├─ RQ1_RQ3_main/structural/                               │
│       │   │   ├─ structural_parameterEstimates.txt  (PSW-weighted)  │
│       │   │   ├─ structural_fitMeasures.txt                         │
│       │   │   └─ rep_data_with_psw.csv              (has psw col)   │
│       │   ├─ bootstrap_results.csv                  (PSW-weighted)  │
│       │   └─ psw_balance_smd.txt                    (SMD table)     │
│       ├─ tables/   (DOCX)                                           │
│       ├─ figures/  (PNG)                                            │
│       └─ logs/     (verification)                                   │
│                                                                     │
│   2. [SEM fitting: RQ1-RQ4, PSW, bootstrap]                         │
│      └─ lavaan::sem(..., sampling.weights = "psw")                  │
│                                                                     │
│   3. Python stage (if !SKIP_POST_PROCESSING):                       │
│       if (MANIFEST_FIRST_PYTHON) {                                  │
│         → run_python_stage.py --manifest manifest.json              │
│       } else {                                                      │
│         → Individual Python calls (legacy)                          │
│           • build_bootstrap_tables.py (reads PSW-weighted .txt)     │
│           • build_dissertation_tables.py (reads PSW-weighted .txt)  │
│           • build_plain_language_summary.py (reads bootstrap .csv)  │
│           • plot_descriptives.py --weights psw (applies PSW)        │
│       }                                                             │
│                                                                     │
│   4. write_manifest() → manifest.json                               │
│                                                                     │
│   5. if (!SKIP_WEBAPP_SYNC) {                                       │
│        → sync_run_to_webapp.py --run-dir OUT_RUN                    │
│      }                                                              │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Python: scripts/sync_run_to_webapp.py                               │
│   ├─ Copies manifest + artifacts → webapp/public/results/<RUN_ID>/ │
│   └─ Updates runs_index.json (newest-first, deduped)                │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│ webapp/public/results/                                              │
│   ├─ runs_index.json                                                │
│   └─ <RUN_ID>/                                                      │
│       ├─ manifest.json                                              │
│       ├─ raw/...                                                    │
│       ├─ tables/*.docx                                              │
│       └─ figures/*.png                                              │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Webapp UI (Phase 5): #/runs route                                   │
│   ├─ Fetch: results/runs_index.json                                 │
│   ├─ Fetch: results/<RUN_ID>/manifest.json                          │
│   └─ Display: Run Library + Run Details                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Files

| File                                                     | Purpose                          |
| -------------------------------------------------------- | -------------------------------- |
| `3_Analysis/1_Main_Pipeline_Code/run_all_RQs_official.R` | R entrypoint (SEM pipeline)      |
| `3_Analysis/run_python_stage.py`                         | Manifest-first Python entrypoint |
| `scripts/sync_run_to_webapp.py`                          | Sync run to webapp public folder |
| `webapp/public/results/runs_index.json`                  | Index of all synced runs         |
| `4_Model_Results/Outputs/runs/<RUN_ID>/manifest.json`    | Canonical run manifest           |

---

## PHASED EXECUTION PLAN (DO THIS IN MULTIPLE TASKS)

You will proceed phase-by-phase. At the end of each phase, **STOP and ask for approval** before continuing.

### ⚠️ MANDATORY: Phase Review After Each Phase

After completing each phase, perform a **Phase Review: Completion Status** that includes:

1. **Verification of all deliverables** — List each item and confirm it exists
2. **Update checkboxes** — Mark all completed items as `[x]` in this document
3. **Evidence** — Show file paths, line numbers, or output confirming completion
4. **Summary table** — Quick-glance status of what was done

Example format:

```
## Phase Review: PHASE N — Completion Status

| Deliverable | Status | Evidence |
|-------------|--------|----------|
| Item 1      | ✅ Done | `path/to/file` exists |
| Item 2      | ✅ Done | Added at line X |

**Files modified:** (list)
**Checkboxes updated:** (count)
```

---

### PHASE 0 (NO EDITS): INVESTIGATE + REPORT

#### Required Deliverables:

- [x] **Identify the single R entrypoint** and output the exact command:

  ```
  PRIMARY SCRIPT: 3_Analysis/1_Main_Pipeline_Code/run_all_RQs_official.R
  EXACT COMMAND:  Rscript 3_Analysis/1_Main_Pipeline_Code/run_all_RQs_official.R
  ```

- [x] **Investigate `results/` folder**:
  - [x] What currently writes there? → Only old test artifacts
  - [x] Is it still needed, or is it legacy? → LEGACY
  - [x] Recommendation: declare `results/` as "legacy" OR propose reorganization → Declared LEGACY

- [x] **Investigate `Dockerfile` and `docker-compose.yml`**:
  - [x] What are they currently for? → Neither exists in repo
  - [x] Do they use `rocker/verse` or something else? → N/A
  - [x] Recommendation: use direct `docker run rocker/verse` unless compose already manages R analysis → Use `docker run`

- [x] **Confirm Python stage**:
  - [x] Does a Python script exist for tables/figures? → Yes, but no single manifest-first entrypoint
  - [x] Where does it live? → `3_Analysis/3_Tables_Code/build_dissertation_tables.py`, `webapp/scripts/transform-results.py`
  - [x] Confirm it runs in local `.venv` (not in container) → Confirmed

- [x] **Confirm webapp facts**:
  - [x] Vite base path (`vite.config.ts`) → `/Dissertation-Model-Simulation/`
  - [x] HashRouter usage → Confirmed in `webapp/src/app/providers.tsx`

- [x] **Produce short report** with:
  - [x] R entrypoint + exact command
  - [x] `results/` status (legacy or active)
  - [x] Docker recommendation (`docker run` vs `docker-compose`)
  - [x] List of files to edit for PHASE 1 (max 3)

**⛔ STOP and wait for approval after PHASE 0 report.**

---

### PHASE 1: DEFINE RUN CONTRACT (MANIFEST + INDEX) [MAX 3 FILES]

- [x] Implement the run artifact schema and manifest format with minimal changes:

- [x] **Canonical run folder:**

  ```
  4_Model_Results/Outputs/runs/<RUN_ID>/
  ```

  - [x] subfolders: `raw/`, `tables/`, `figures/`, `logs/`

- **Manifest file:**

  ```
  4_Model_Results/Outputs/runs/<RUN_ID>/manifest.json
  ```

  MUST include:

  ```json
  {
    "run_id": "",
    "timestamp": "",
    "mode": "",
    "settings": {
      "seed": null,
      "N": null,
      "estimator": "",
      "bootstrap": null,
      "CI": null,
      "group_flags": {}
    },
    "artifacts": {
      "fit_measures": "",
      "parameters": "",
      "executed_model_syntax": "",
      "verification_checklist": "",
      "tables": [],
      "figures": []
    }
  }
  ```

- **Web index file (for UI):**
  ```
  webapp/public/results/runs_index.json
  ```
  An array sorted newest-first with:
  ```json
  [
    {
      "run_id": "",
      "timestamp": "",
      "label": "",
      "manifest_path": "results/<RUN_ID>/manifest.json"
    }
  ]
  ```

If you need to add a small doc note, add it to `webapp/ARCHITECTURE_AUDIT.md` ONLY if it already exists and is canonical; otherwise ask first.

**⛔ STOP and ask for approval before moving to PHASE 2.**

---

### PHASE 2: R PIPELINE WRITES TO RUN FOLDER + CREATES MANIFEST [MAX 3 FILES]

Modify the R entrypoint (only the smallest necessary change) so that:

- [x] It reads env vars: `OUT_BASE` and `RUN_ID` (required).
- [x] It writes all outputs into: `OUT_BASE/runs/RUN_ID/`
- [x] It writes verification checklist into `logs/`
- [x] It writes `manifest.json` at end, listing produced artifacts.

Do not restructure modeling code. Only redirect output paths and add manifest writing.

**⛔ STOP and ask for approval before moving to PHASE 3.**

---

### PHASE 3: PYTHON BECOMES MANIFEST-FIRST [MAX 3 FILES]

Modify/introduce a single Python entrypoint (minimal changes) to:

- [x] Accept: `--manifest path/to/manifest.json`
- [x] Read artifacts listed in manifest rather than guessing filenames
- [x] Output to `run_dir/tables` and `run_dir/figures`
- [x] Update `manifest.json` with `tables[]` and `figures[]`

If Python scripts are scattered, do not reorganize aggressively; keep minimal and ask before moving files.

**⛔ STOP and ask for approval before moving to PHASE 4.**

---

### PHASE 4: SYNC RUN ARTIFACTS INTO WEBAPP PUBLIC RESULTS [MAX 3 FILES]

Add a sync step that:

- [x] Copies: `4_Model_Results/Outputs/runs/<RUN_ID>/` → `webapp/public/results/<RUN_ID>/`
- [x] Ensures `manifest.json` ends up at:
  ```
  webapp/public/results/<RUN_ID>/manifest.json
  ```
- [x] Updates:
  ```
  webapp/public/results/runs_index.json
  ```

Only copy what the UI needs (manifest + referenced artifacts). Keep it simple and deterministic.

**⛔ STOP and ask for approval before moving to PHASE 5.**

---

### PHASE 5: WEBAPP RUN LIBRARY + BASE-AWARE FETCH [MAX 3 FILES]

Implement (or minimally extend) UI to:

- [x] Load `runs_index.json` using BASE_URL:
  ```js
  new URL("results/runs_index.json", import.meta.env.BASE_URL);
  ```
- [x] Load a run manifest the same way:
  ```js
  new URL(`results/${runId}/manifest.json`, import.meta.env.BASE_URL);
  ```
- [x] Render a basic "Run Library" list and "Run Details" view (no design changes, minimal UI).
- [x] Add graceful missing-file handling (plain text message).

Do NOT change styling/animations unless necessary. Motion remains framer-motion only.

**Files created/modified:**

- `webapp/src/lib/runs.ts` — Fetch utilities and types
- `webapp/src/routes/RunsPage.tsx` — Run Library UI component
- `webapp/src/routes/RunsPage.module.css` — Styling for RunsPage
- `webapp/src/app/routes.tsx` — Added `/runs` route

**⛔ STOP and ask for approval before moving to PHASE 6.**

---

### PHASE 6: ONE-BUTTON ORCHESTRATOR USING ROCKER/VERSE [MAX 3 FILES]

Create or modify a single script in `scripts/` (minimal) such as:

```bash
scripts/run
```

that supports:

```bash
./scripts/run smoke
./scripts/run main
./scripts/run Full_Deploy
```

It must:

- [x] Generate `RUN_ID`
- [x] Run R pipeline via `docker run rocker/verse` (direct, not compose)
- [x] **CHECK**: If `manifest.json` not found after R, exit with clear error message
- [x] Run Python stage in local `.venv` (manifest-first)
- [x] Sync to `webapp/public/results/<RUN_ID>`
- [x] Update `runs_index.json`
- [x] Print final instructions:
  - [x] `run_id`
  - [x] where artifacts are
  - [x] how to view in webapp (`npm run dev`)

**Files created:**

- `scripts/run` — One-button orchestrator (bash script)

**⛔ STOP and ask for approval before moving to PHASE 7.**

---

### PHASE 7: ACCEPTANCE TESTS (NO NEW FEATURES)

Run and report:

- [ ] `./scripts/run smoke` creates canonical run folder + webapp results mirror + `runs_index.json` update
- [ ] `cd webapp && npm run dev` → run list loads + run detail loads
- [ ] `npm run build && npm run preview` → same works
- [ ] Optional: `npm run deploy` → works on GH Pages base path

---

### PHASE 8: AUTO-POPULATE TABLES & SUMMARY (APA 7)

**Goal**: Wire `Plain_Language_Summary.docx` and `Dissertation_Tables.docx` to auto-populate from R outputs with APA 7 formatting. Change run ID format to human-readable `run_MM_DD_HHMMp`.

---

#### PHASE 8.0: RUN ID FORMAT CHANGE [1 FILE] ✅

**File**: `scripts/run` (lines 60-62)

- [x] Change `generate_run_id()` from `run_YYYYMMDD_HHMMSS` to `run_MM_DD_HHMMa/p`
  - Example: `run_01_19_0337p` (January 19, 3:37 PM)
- [x] Use 12-hour format with `a`/`p` suffix (lowercase)
- [x] Verify downstream consumers handle new format (manifest.json, runs_index.json)

**Estimated changes**: ~15 lines

**⛔ STOP and verify run ID propagates correctly before Phase 8.1.**

---

#### PHASE 8.1: R PIPELINE PS MODEL EXPORT [1 FILE] ✅

**File**: `3_Analysis/1_Main_Pipeline_Code/run_all_RQs_official.R`

**Problem**: `compute_psw_overlap()` creates `ps_mod` but discards it. Table 4 (PS Model Coefficients) needs this data.

- [x] Modify `compute_psw_overlap()` to return `list(psw = w, model = ps_mod)` instead of just `w`
- [x] Update caller (~line 1023) to unpack: `psw_result <- compute_psw_overlap(...); psw <- psw_result$psw; ps_mod <- psw_result$model`
- [x] Export `ps_model.csv` with columns: `term`, `estimate`, `std_error`, `z_value`, `p_value`, `odds_ratio`, `or_ci_low`, `or_ci_high`
- [x] Export `weight_diagnostics.csv` with columns: `metric`, `value` (min, max, mean, sd, n_extreme, ess)
- [x] Add variance ratio (VR) column to `psw_balance_smd.txt` or create new `balance.csv`

**Estimated changes**: ~50 lines

**⛔ STOP and verify CSVs appear in `raw/` folder before Phase 8.2.**

---

#### PHASE 8.2: PLAIN LANGUAGE SUMMARY REWRITE [1 FILE] ✅

**File**: `3_Analysis/3_Tables_Code/build_plain_language_summary.py`

**Problem**: Current file is a 253-line STUB with hardcoded `[Placeholder: ...]` text.

**Rewrite approach** (~650 lines total):

- [x] Add `load_structural_params(run_dir)` - parse `structural_parameterEstimates.txt`
- [x] Add `load_fit_measures(run_dir)` - parse `structural_fitMeasures.txt`
- [x] Add `load_bootstrap_effects(run_dir)` - read `bootstrap_results.csv`
- [x] Add `format_apa_stat(estimate, ci_low, ci_high, p)` - returns `β = 0.XX, 95% CI [0.XX, 0.XX], p < .001`
- [x] Add `interpret_effect_size(beta)` - returns "small"/"medium"/"large" per Cohen's d conventions
- [x] Add `generate_rq1_section(params, boot)` - Total effect interpretation
- [x] Add `generate_rq2_section(params, boot)` - Mediation pathways (EmoDiss, QualEngag)
- [x] Add `generate_rq3_section(params, boot)` - Moderated mediation (credit_dose interaction)
- [x] Add `generate_rq4_section(fit)` - Measurement model fit (CFI, RMSEA, SRMR)
- [x] Add `generate_limitations_section()` - Static text with study limitations
- [x] Add `generate_implications_section(boot)` - Data-driven implications based on effect directions
- [x] Wire `main()` to call all sections and write DOCX with APA 7 heading styles

**Key data mappings**:
| Section | R Output File | Key Values |
|---------|---------------|------------|
| RQ1 Total Effect | `bootstrap_results.csv` | `total_z_mid` row |
| RQ2 Indirect Effects | `bootstrap_results.csv` | `ind_EmoDiss_*`, `ind_QualEngag_*` rows |
| RQ3 Moderation | `bootstrap_results.csv` | `index_MM_*` rows |
| RQ4 Fit | `structural_fitMeasures.txt` | CFI, RMSEA, SRMR values |

**⛔ STOP and verify summary populates correctly before Phase 8.3.**

---

#### PHASE 8.3: DISSERTATION TABLES - COMPUTE FUNCTIONS [1 FILE]

**File**: `3_Analysis/3_Tables_Code/build_dissertation_tables.py`

**Problem**: Tables 1-8, 13 show "—" because they expect CSV files R doesn't produce.

**Add compute functions** (~200 lines):

- [ ] `compute_sample_descriptives(df)` - For Table 1: N, %, M, SD by demographic
- [ ] `compute_construct_descriptives(df)` - For Table 2: Item-level M, SD, α, ω
- [ ] `compute_correlations(df)` - For Table 3: Correlation matrix with significance stars
- [ ] `compute_ps_model_table(ps_csv)` - For Table 4: Read `ps_model.csv`, format ORs
- [ ] `compute_balance_table(balance_csv)` - For Table 5: SMD and VR pre/post weighting
- [ ] `compute_weight_diagnostics(diag_csv)` - For Table 6: Weight distribution stats
- [ ] `compute_measurement_model(fit_txt)` - For Table 7: Factor loadings from CFA
- [ ] `compute_fit_indices(fit_txt)` - For Table 8: Model fit comparison table
- [ ] `compute_sensitivity_analysis(boot_csv)` - For Table 13: Robustness checks

**Data sources**:
| Table | Source File | Notes |
|-------|-------------|-------|
| 1 | `rep_data_with_psw.csv` | Compute from raw data |
| 2 | `rep_data_with_psw.csv` | Compute from raw data |
| 3 | `rep_data_with_psw.csv` | Compute from raw data |
| 4 | `ps_model.csv` | NEW from Phase 8.1 |
| 5 | `balance.csv` or `psw_balance_smd.txt` | Needs VR added |
| 6 | `weight_diagnostics.csv` | NEW from Phase 8.1 |
| 7 | `measurement_parameterEstimates.txt` | Already exists |
| 8 | `structural_fitMeasures.txt` | Already exists |
| 9-12 | Various `.txt` files | Already working |
| 13 | `bootstrap_results.csv` | Compute sensitivity |

**⛔ STOP and verify compute functions return expected DataFrames before Phase 8.4.**

---

#### PHASE 8.3 & 8.4: DISSERTATION TABLES - COMPUTE FUNCTIONS & WIRING ✅

**File**: `3_Analysis/3_Tables_Code/build_dissertation_tables.py`

**Added compute functions** (~250 lines):

- [x] `compute_sample_descriptives(data_dir)` - For Table 1: derives from rep_data_with_psw.csv
- [x] `compute_variable_descriptives(data_dir)` - For Table 2: M, SD, Min, Max
- [x] `compute_missing_data(data_dir)` - For Table 3: Missing percentages
- [x] `compute_ps_model_from_csv(data_dir)` - For Table 4: Read ps_model.csv
- [x] `compute_balance_from_txt(data_dir)` - For Table 5: SMD and VR from psw_balance_smd.txt
- [x] `compute_weight_diagnostics_from_csv(data_dir)` - For Table 6: Weight distribution

**Wired table builders**:

- [x] Update `table1_sample_flow()` to call `compute_sample_descriptives()`
- [x] Update `table2_descriptives()` to call `compute_variable_descriptives()`
- [x] Update `table3_missing_data()` to call `compute_missing_data()`
- [x] Update `table4_ps_model()` to call `compute_ps_model_from_csv()`
- [x] Update `table5_balance()` to call `compute_balance_from_txt()`
- [x] Update `table6_weights()` to call `compute_weight_diagnostics_from_csv()`
- [x] Tables 7-12 already work (read from R .txt files)
- [x] APA 7 table notes already present
- [x] Column alignment and borders already configured

---

#### PHASE 8.5: VERIFICATION SMOKE TEST

**Run full pipeline and verify**:

- [ ] `./scripts/run smoke` completes without errors
- [ ] Run ID follows new format: `run_01_19_HHMMp`
- [ ] `raw/RQ1_RQ3_main/ps_model.csv` exists with correct columns
- [ ] `raw/RQ1_RQ3_main/weight_diagnostics.csv` exists with correct columns
- [ ] `tables/Plain_Language_Summary.docx` has NO `[Placeholder` text
- [ ] `tables/Dissertation_Tables.docx` Tables 1-8 show actual values (not "—")
- [ ] `tables/Dissertation_Tables.docx` Table 13 shows sensitivity results
- [ ] All 15 figures still generate correctly
- [ ] Webapp loads run and displays manifest

**Verification commands**:

```bash
# Check for placeholders
grep -i "placeholder" tables/Plain_Language_Summary.docx && echo "FAIL: Placeholders found" || echo "PASS"

# Check for dashes in tables (crude check)
grep -c "—" tables/Dissertation_Tables.docx | xargs -I{} test {} -lt 5 && echo "PASS" || echo "FAIL: Too many placeholders"

# Verify new CSVs
ls -la raw/RQ1_RQ3_main/ps_model.csv raw/RQ1_RQ3_main/weight_diagnostics.csv
```

---

#### PHASE 8 FILE SUMMARY

| Phase     | File                              | Lines Changed  |
| --------- | --------------------------------- | -------------- |
| 8.0       | `scripts/run`                     | ~15            |
| 8.1       | `run_all_RQs_official.R`          | ~50            |
| 8.2       | `build_plain_language_summary.py` | ~400 (rewrite) |
| 8.3-8.4   | `build_dissertation_tables.py`    | ~300           |
| **Total** | **4 files**                       | **~765 lines** |

---

## REMINDER AT EACH PHASE

- Show exact files you propose to modify and why.
- Wait for approval before editing.
- Keep diffs minimal and focused.
