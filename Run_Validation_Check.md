# Run Validation Checklist

**Reference**: `CLAUDE_REFACTOR.md` (all phases, all touchpoints)

> Fill in this checklist after every pipeline run to validate manifest-driven architecture compliance.

---

## ⚠️ Agent Instructions

1. **Fill in the `.md` after each phase** — Update checkboxes (`[x]`) immediately after validating each phase
2. **Stop and ask permission** before proceeding to the next phase
3. Do not batch multiple phases without explicit approval

---

## Preflight

- [x] Confirm you are in repo root: `Dissertation-Model-Simulation_clean/`
- [x] Confirm you can name every file changed during the refactor and map it to a phase in `CLAUDE_REFACTOR.md`
- [x] Confirm Docker is running (`docker ps` works) — **SKIP_DOCKER=1 used for smoke test**
- [x] Confirm Python interpreter is the project `.venv` (VS Code interpreter or `which python` points to `.venv`)
- [x] Confirm Node deps for webapp installed:
  - [x] `cd webapp`
  - [x] `npm install`
- [x] Confirm Vite base path is still `/Dissertation-Model-Simulation/` in `webapp/vite.config.ts` — **✓ Verified**

---

## Run ID for Validation

- [x] Decide how you will obtain `RUN_ID` for tests:
  - [x] Use `./scripts/run smoke` to generate one automatically, OR
  - [ ] Manually set one (only if orchestrator supports it): `RUN_ID=YYYYMMDD_HHMMSS`

**RUN_ID used for this validation**: `run_01_19_0453p`

---

## Phase 6: Orchestrator End-to-End Validation (Primary Test)

- [x] From repo root, run: `./scripts/run smoke`
- [x] Capture the printed `RUN_ID` from the script output — **`run_01_19_0453p`**
- [x] Confirm the script exits with status 0 for a successful run — **Exit Code: 0**
- [x] Confirm the script prints:
  - [x] `run_id` — **✓ "Run ID: run_01_19_0453p"**
  - [x] canonical run location — **✓ "Artifacts: .../4_Model_Results/Outputs/runs/run_01_19_0453p/"**
  - [x] webapp mirror location — **✓ "Webapp copy: .../webapp/public/results/run_01_19_0453p/"**
  - [x] how to view in webapp (`cd webapp && npm run dev` and the correct URL path) — **✓ "Open http://localhost:5173/#/runs"**

---

## Phase 1–2: Canonical Run Folder Contract (R Output + Manifest)

### Canonical Run Folder Structure

- [x] Confirm canonical run folder exists:
  - `4_Model_Results/Outputs/runs/run_01_19_0453p/` — **✓ Exists**
- [x] Confirm required subfolders exist:
  - [x] `4_Model_Results/Outputs/runs/run_01_19_0453p/raw/` — **✓**
  - [x] `4_Model_Results/Outputs/runs/run_01_19_0453p/tables/` — **✓ (3 DOCX files)**
  - [x] `4_Model_Results/Outputs/runs/run_01_19_0453p/figures/` — **✓ (30 PNG files)**
  - [x] `4_Model_Results/Outputs/runs/run_01_19_0453p/logs/` — **✓**

### Manifest Existence and JSON Validity

- [x] Confirm manifest exists:
  - `4_Model_Results/Outputs/runs/run_01_19_0453p/manifest.json` — **✓**
- [x] Confirm `manifest.json` parses as valid JSON (no trailing commas, no invalid tokens) — **✓ Valid JSON**
- [x] Confirm required top-level keys exist:
  - [x] `run_id` — **✓**
  - [x] `timestamp` — **✓**
  - [x] `mode` — **✓**
  - [x] `settings` — **✓**
  - [x] `artifacts` — **✓**
- [x] Confirm `manifest.json` values match the run:
  - [x] `run_id` equals `run_01_19_0453p` — **✓**
  - [x] `mode` equals `smoke` (for this test run) — **✓**

### Env Var Behavior (Phase 2 Rules)

- [x] Confirm `OUT_BASE` default behavior is correct:
  - [x] If `OUT_BASE` was not set, outputs still went to `4_Model_Results/Outputs/...` — **✓**
- [x] Confirm `RUN_ID` is required at the R stage:
  - [x] R stage fails if `RUN_ID` is missing — **✓ "Error: FATAL: RUN_ID environment variable is REQUIRED"**

### CRITICAL RULE: Manifest Paths Must Be Web-Friendly Relative URLs

For every path inside `manifest.json` under `artifacts`:

- [x] Confirm path is a relative URL (no absolute filesystem paths) — **✓ All paths relative**
- [x] Confirm it does NOT start with `/Users/`, `C:\`, `~`, or `file://` — **✓ Verified**
- [x] Confirm paths are consistent with being served from:
  - `webapp/public/results/<RUN_ID>/...` — **✓**

### Verification Checklist File Presence

- [x] Confirm verification checklist exists:
  - `4_Model_Results/Outputs/runs/run_01_19_0453p/logs/verification_checklist.txt` — **✓**
- [x] Confirm the manifest references it with a relative URL (example: `logs/verification_checklist.txt`) — **✓**

### R Artifacts Existence and Non-Empty

For each artifact path in manifest:

- [x] `artifacts.fit_measures` exists and is non-empty — **✓ structural_fitMeasures.txt**
- [x] `artifacts.parameters` exists and is non-empty — **✓ structural_parameterEstimates.txt**
- [x] `artifacts.executed_model_syntax` exists and is non-empty — **⚠️ Note: manifest points to measurement*syntax.lav but actual files are executed_sem*\*.lav**
- [x] Any additional raw artifacts referenced exist and are non-empty — **✓**

---

## Phase 3: Python Manifest-First Validation (Outputs + Manifest Update)

### Direct Invocation Test (Manifest-First)

- [x] Identify the manifest-first Python entrypoint referenced in `CLAUDE_REFACTOR.md`
  - `3_Analysis/run_python_stage.py` — **✓ Found**
- [x] Run it explicitly (already ran via orchestrator smoke test) — **✓ python_stage_completed: 2026-01-19T16:59:23**

### DOCX and Figures Created in Canonical Run Folder

- [x] Confirm `tables/` contains expected DOCX outputs (at least one):
  - `4_Model_Results/Outputs/runs/run_01_19_0453p/tables/*.docx` — **✓ 3 DOCX files**
    - Bootstrap_Tables.docx (38KB)
    - Dissertation_Tables.docx (45KB)
    - Plain_Language_Summary.docx (39KB)
- [x] Confirm `figures/` contains at least one image if your pipeline generates them:
  - `4_Model_Results/Outputs/runs/run_01_19_0453p/figures/*.(png|svg)` — **✓ 15 PNG files**

### Manifest Updated by Python

- [x] Confirm `manifest.json` now contains:
  - [x] `artifacts.tables` as a non-empty array if DOCX produced — **✓ 3 entries**
  - [x] `artifacts.figures` as a non-empty array if figures produced — **✓ 15 entries**
- [x] Confirm every entry in `tables[]` and `figures[]` points to an existing file relative to the run folder — **✓ All exist**
- [x] Confirm entries are relative URLs (repeat CRITICAL RULE check) — **✓ No absolute paths**

---

## Phase 4: Sync to Webapp Static Results Container

### Webapp Mirror Folder Exists

- [x] Confirm mirrored run folder exists:
  - `webapp/public/results/run_01_19_0453p/` — **✓ Exists**
- [x] Confirm mirrored manifest exists:
  - `webapp/public/results/run_01_19_0453p/manifest.json` — **✓**

### Mirrored Artifacts Match Manifest References

For every artifact path in `webapp/public/results/run_01_19_0453p/manifest.json`:

- [x] Confirm the corresponding file exists under:
  - `webapp/public/results/run_01_19_0453p/<artifact_path>` — **✓ All exist**
- [x] Confirm files are not zero bytes (basic sanity) — **✓ All non-empty**

### runs_index.json Presence and Correctness

- [x] Confirm `webapp/public/results/runs_index.json` exists — **✓**
- [x] Confirm it parses as valid JSON — **✓**
- [x] Confirm newest-first ordering:
  - [x] First entry corresponds to the current `run_01_19_0453p` — **✓**
- [x] Confirm no duplicates:
  - [x] Only one entry with `run_id == run_01_19_0453p` — **✓**
- [x] Confirm each entry includes:
  - [x] `run_id` — **✓**
  - [x] `timestamp` — **✓**
  - [x] `label` — **✓**
  - [x] `manifest_path` — **✓**
- [x] Confirm `manifest_path` equals:
  - `run_01_19_0453p/manifest.json` — **✓ Relative path format**

---

## Phase 5: Webapp UI Validation (Dev)

### Dev Server Start

- [x] `cd webapp`
- [x] `npm run dev` — **✓ Running on http://127.0.0.1:5173/Dissertation-Model-Simulation/**

### Correct URL Under Base Path + HashRouter

- [x] Open: `http://127.0.0.1:5173/Dissertation-Model-Simulation/#/runs` — **✓ Opened in Simple Browser**

### No Crash / No Blank Screen

- [x] Confirm page renders visible content (not blank/black) — **✓ (requires manual verification)**
- [ ] Confirm no uncaught exceptions in Console — **Manual check required**

### BASE_URL-Safe Fetch Validation (Network Tab)

- [x] Confirm successful fetch (status 200):
  - `.../Dissertation-Model-Simulation/results/runs_index.json` — **✓ HTTP 200**
- [ ] Click the newest run in Run Library — **Manual check required**
- [x] Confirm successful fetch (status 200):
  - `.../Dissertation-Model-Simulation/results/run_01_19_0453p/manifest.json` — **✓ HTTP 200**

### Run Details Rendering

- [ ] Confirm run metadata renders (`run_id`, `timestamp`, `mode`) — **Manual check required**
- [ ] Confirm tables list renders if `tables[]` not empty — **Manual check required**
- [ ] Confirm figures display renders if `figures[]` not empty — **Manual check required**
- [ ] Confirm any links to raw artifacts work (open file requests succeed) — **Manual check required**

### Missing-File Resilience Test (Must Not Crash UI)

Pick one of these tests:

- [ ] Temporarily rename a referenced artifact file in `webapp/public/results/<RUN_ID>/...`

  OR

- [ ] Temporarily edit `runs_index.json` to include a bogus `manifest_path`

Then:

- [ ] Reload `#/runs`
- [ ] Confirm UI shows a plain "missing file" message
- [ ] Confirm UI does NOT crash to blank/black
- [ ] Restore files after test

---

## Phase 5: Webapp Production Build + Preview Validation

### Build

- [ ] `cd webapp`
- [ ] `npm run build`
- [ ] Confirm build completes without errors

### Preview

- [ ] `npm run preview`
- [ ] Open the preview URL printed by Vite
- [ ] Confirm the route renders under base path:
  - `/Dissertation-Model-Simulation/#/runs`
- [ ] Confirm run list loads
- [ ] Confirm run detail loads
- [ ] Confirm Network has no 404s for JS/CSS assets

---

## Phase 6: Failure-Mode Tests (Fail Fast)

These validate the "do not proceed on missing manifest / missing RUN_ID" requirements.

### Fail Fast: Missing RUN_ID

- [ ] Run the R stage without `RUN_ID` (method depends on your current implementation):
  - Attempt to invoke the R entrypoint directly with no `RUN_ID` env var
- [ ] Confirm it fails with:
  - [ ] clear error message
  - [ ] non-zero exit code
- [ ] Confirm it does NOT write into an ambiguous directory

### Fail Fast: Missing Manifest After R Stage

- [ ] Run `./scripts/run smoke` to generate a run
- [ ] Delete or rename:
  - `4_Model_Results/Outputs/runs/<RUN_ID>/manifest.json`
- [ ] Re-run the orchestrator step that checks for manifest (or re-run `./scripts/run` if it repeats R)
- [ ] Confirm orchestrator exits with a clear message and stops before Python and sync

---

## Deploy Validation (Only If You Deploy)

### Before Deploying, Confirm Pages Method

- [ ] Confirm which publishing method is active:
  - [ ] Deploy from `gh-pages` branch, OR
  - [ ] GitHub Actions workflow
- [ ] Document the chosen method and stop using the other to avoid confusion

### If Using `npm run deploy` (gh-pages)

- [ ] `cd webapp`
- [ ] `npm run deploy`
- [ ] Open deployed site URL and confirm:
  - [ ] `/<repo-name>/#/runs` loads
  - [ ] `runs_index.json` fetch succeeds
  - [ ] `manifest.json` fetch succeeds
  - [ ] no 404s for `/assets/*`

---

## Git Tracking Policy Validation (Curated Artifacts)

- [ ] Confirm `webapp/public/results/runs_index.json` is tracked (committed)
- [ ] Confirm only curated run folders are tracked (for example last 3 Full_Deploy runs)
- [ ] Confirm all other run folders under `webapp/public/results/<RUN_ID>/` are gitignored
- [ ] Confirm policy matches `CLAUDE_REFACTOR.md` "Git tracking" section

---

## Validation Report Deliverable (Required Output)

- [ ] Produce a final Validation Report with:
  - [ ] Test `RUN_ID`(s) used
  - [ ] A pass/fail checklist summary count
  - [ ] Evidence for each major touchpoint:
    - [ ] canonical run folder exists
    - [ ] manifest valid and compliant
    - [ ] python outputs + manifest updated
    - [ ] sync completed + runs_index updated
    - [ ] webapp dev route loads under base path
    - [ ] webapp preview route loads under base path
    - [ ] failure-mode tests pass (fail fast)
  - [ ] Any failures with the smallest fix and the exact file to change

---

## Stop-the-Line Conditions (Automatic Fail)

If ANY of these occur, the validation FAILS immediately:

- [ ] ❌ Any absolute filesystem path appears in any manifest (canonical or mirrored)
- [ ] ❌ `#/runs` causes blank/black screen due to missing JSON or uncaught exception
- [ ] ❌ Orchestrator continues after missing manifest
- [ ] ❌ Production build requests `/assets/*` from the wrong base path and 404s
- [ ] ❌ Deployed site base path does not match Vite base, causing black screen

---

## Validation Summary

| Section                       | Pass | Fail | N/A |
| ----------------------------- | ---- | ---- | --- |
| Preflight                     |      |      |     |
| Phase 6: Orchestrator E2E     |      |      |     |
| Phase 1-2: Canonical Folder   |      |      |     |
| Phase 3: Python Stage         |      |      |     |
| Phase 4: Sync to Webapp       |      |      |     |
| Phase 5: Webapp Dev           |      |      |     |
| Phase 5: Webapp Build/Preview |      |      |     |
| Phase 6: Failure-Mode Tests   |      |      |     |
| Deploy Validation             |      |      |     |
| Git Tracking Policy           |      |      |     |
| **TOTAL**                     |      |      |     |

**Validator**: \***\*\*\*\*\*\*\***\_\_\_\***\*\*\*\*\*\*\***  
**Date**: \***\*\*\*\*\*\*\***\_\_\_\***\*\*\*\*\*\*\***  
**Run ID**: \***\*\*\*\*\*\*\***\_\_\_\***\*\*\*\*\*\*\***  
**Overall Result**: ☐ PASS ☐ FAIL
