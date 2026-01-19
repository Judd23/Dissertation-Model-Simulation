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
│       ├─ raw/      (lavaan outputs)                                 │
│       ├─ tables/   (DOCX)                                           │
│       ├─ figures/  (PNG)                                            │
│       └─ logs/     (verification)                                   │
│                                                                     │
│   2. [SEM fitting: RQ1-RQ4, PSW, bootstrap]                         │
│                                                                     │
│   3. Python stage (if !SKIP_POST_PROCESSING):                       │
│       if (MANIFEST_FIRST_PYTHON) {                                  │
│         → run_python_stage.py --manifest manifest.json              │
│       } else {                                                      │
│         → Individual Python calls (legacy)                          │
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

- [ ] Load `runs_index.json` using BASE_URL:
  ```js
  new URL("results/runs_index.json", import.meta.env.BASE_URL);
  ```
- [ ] Load a run manifest the same way:
  ```js
  new URL(`results/${runId}/manifest.json`, import.meta.env.BASE_URL);
  ```
- [ ] Render a basic "Run Library" list and "Run Details" view (no design changes, minimal UI).
- [ ] Add graceful missing-file handling (plain text message).

Do NOT change styling/animations unless necessary. Motion remains framer-motion only.

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

- [ ] Generate `RUN_ID`
- [ ] Run R pipeline via `docker run rocker/verse` (direct, not compose)
- [ ] **CHECK**: If `manifest.json` not found after R, exit with clear error message
- [ ] Run Python stage in local `.venv` (manifest-first)
- [ ] Sync to `webapp/public/results/<RUN_ID>`
- [ ] Update `runs_index.json`
- [ ] Print final instructions:
  - [ ] `run_id`
  - [ ] where artifacts are
  - [ ] how to view in webapp (`npm run dev`)

**⛔ STOP and ask for approval before moving to PHASE 7.**

---

### PHASE 7: ACCEPTANCE TESTS (NO NEW FEATURES)

Run and report:

- [ ] `./scripts/run smoke` creates canonical run folder + webapp results mirror + `runs_index.json` update
- [ ] `cd webapp && npm run dev` → run list loads + run detail loads
- [ ] `npm run build && npm run preview` → same works
- [ ] Optional: `npm run deploy` → works on GH Pages base path

---

## REMINDER AT EACH PHASE

- Show exact files you propose to modify and why.
- Wait for approval before editing.
- Keep diffs minimal and focused.
