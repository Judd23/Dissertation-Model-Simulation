# Data Construct Checklist (Authoritative)

## Purpose
Ensure the PSW covariate expansion is implemented, validated, and documented without refactoring the Jan 4 baseline pipeline.

## Scope lock
- Allowed changes:
  - `1_Dataset/generate_empirical_dataset.py`
  - `1_Dataset/rep_data.csv`
  - `2_Codebooks/Variable_Table.csv`
  - `3_Analysis/1_Main_Pipeline_Code/` (PSW model, diagnostics, exports)
  - `4_Model_Results/Outputs/` (new run artifacts)
  - `1_Dataset/Overview.md`, `1_Dataset/Data_constuct.md`
  - `.claude/docs/dissertation_context.md`
- Disallowed changes:
  - `webapp/`
  - Structural refactors outside the files above
  - Renaming archetypes or changing N=5,000
- Stop rule:
  - If a task requires touching a disallowed area, STOP and report why + minimal alternative.

## Archetype lock (final generator list)
- 1: Latina Commuter Caretaker
- 2: Latino Off-Campus Working
- 3: Asian High-Pressure Achiever
- 4: Asian First-Gen Navigator
- 5: Black Campus Connector
- 6: White Residential Traditional
- 7: White Off-Campus Working
- 8: Multiracial Bridge-Builder
- 9: Hispanic On-Campus Transitioner
- 10: Continuing-Gen Cruiser
- 11: White Rural First-Gen
- 12: Black Male Striver
- 13: White Working-Class Striver
- Rule: names, prevalence targets, and FASt rates are locked to the generator; documentation must mirror the generator.

## Approval rule (required)
- Before each Treatment starts: review rules/constraints and request approval.
- Do not begin a Treatment without explicit approval.

## Covariate usage rules
- PSW and SEM use centered versions for continuous covariates.
- SEM uses centered versions for binary covariates (no raw binaries in SEM balance/structural lists).
- PSW excludes `cohort` and `pell` (`pell` is W-only).

## Inputs
- Branch / commit:
- Data / seeds:
- Config flags:
- References:
  - `2_Codebooks/BCSSE2024_US First Year Student (Web only).docx`
  - `2_Codebooks/Variable_Table.csv`
  - `.claude/docs/dissertation_context.md`

## Evidence rules (how to check a box)
A box may be checked only if evidence is attached directly under it:
- Command output (paste)
- Link to CI run
- Table of metrics
- Screenshot
- Diff snippet (short)

---

## Treatment 1: Schema + Variable Construction (Build / Schema)
### Approval Gate (Required)
- [x] STOP: review constraints + request approval to start Treatment 1  
  **Evidence:** User approval: "go".

- [x] Confirm codebook variable names for the 3 covariates  
  - HS study hours (last year of HS): `hacadpr13`  
  - Caregiving hours: `tcare`  
  - STEM major intent: `StemMaj`  
  **Evidence:** Updated `2_Codebooks/Variable_Table.csv` with `hacadpr13`, `tcare`, `StemMaj` and centered variants.
- [x] Add/verify base variables in `rep_data` generator  
  **Evidence:** `1_Dataset/generate_empirical_dataset.py` now creates `hacadpr13`, `tcare`, `StemMaj`.
- [x] Create numeric midpoint recodes and centered versions  
  **Evidence:** Generator writes `hacadpr13`/`tcare` as midpoint-coded hours and adds `*_c` versions.
- [x] Export artifacts contain new fields (cleaned + PSW outputs)  
  **Evidence:** Regenerated `1_Dataset/rep_data.csv` and `1_Dataset/archetype_assignments.csv`.

### Validation Gate 1 (must pass before Treatment 2)
- [x] Frequency tables match targets within tolerance (pre-PSW)  
  **Evidence:**  
  - `hacadpr13` midpoints (%): 0=0.98, 3=31.50, 8=29.18, 13=18.40, 18=10.08, 23=5.12, 28=1.86, 35=2.88  
  - `tcare` midpoints (%): 0=70.80, 3=12.72, 8=7.44, 13=3.86, 18=2.64, 23=1.42, 28=0.66, 35=0.46  
  - `StemMaj` (%): 0=75.98, 1=24.02  
- [x] No out-of-range values  
  **Evidence:** `hacadpr13` bad_count=0; `tcare` bad_count=0  
- [x] Centered vars have mean ~ 0 (report exact mean)  
  **Evidence:** `hacadpr13_c=0.000000`, `tcare_c=0.000000`, `StemMaj_c=0.000000`

---

## Treatment 2: Calibration + Conditioning (Pre-PSW Distributions)
### Approval Gate (Required)
- [ ] STOP: review constraints + request approval to start Treatment 2  
  **Evidence:**

- [ ] Fit marginals to targets (report exact %)  
  **Evidence:**
- [ ] Archetype conditioning applied (report subgroup summaries)  
  **Evidence:**
- [ ] Correlation sign checks (report r values)  
  **Evidence:**
- [ ] Pre-PSW distributions recorded for ALL covariates (old + new)  
  **Evidence:**

### Validation Gate 2
- [ ] Marginals still within tolerance after conditioning  
  **Evidence:**
- [ ] Subgroup distributions plausible (no extreme collapse)  
  **Evidence:**

---

## Treatment 3: Missingness (MAR/MCAR)
### Approval Gate (Required)
- [ ] STOP: review constraints + request approval to start Treatment 3  
  **Evidence:**

- [ ] MCAR missingness applied (report % by variable)  
  **Evidence:**
- [ ] MAR missingness applied (report % by group)  
  **Evidence:**
- [ ] PS model still fits with missingness strategy  
  **Evidence:**

### Validation Gate 3
- [ ] Missingness summary table created (overall + by key groups)  
  **Evidence:**
- [ ] No accidental 0% or runaway missingness  
  **Evidence:**

---

## Treatment 4: PS Model + Weights (Post-PSW)
### Approval Gate (Required)
- [ ] STOP: review constraints + request approval to start Treatment 4  
  **Evidence:**

- [ ] Update PS formula (paste exact formula)  
  **Evidence:**
- [ ] Compute propensity + overlap weights  
  **Evidence:**
- [ ] Export weighted dataset with diagnostics  
  **Evidence:**

### Validation Gate 4
- [ ] Coefficient directions sanity check (report ORs)  
  **Evidence:**
- [ ] Overlap diagnostics (PS quantiles + weight quantiles)  
  **Evidence:**
- [ ] ESS computed (report values)  
  **Evidence:**

---

## Treatment 5: Balance + Guards + Reporting
### Approval Gate (Required)
- [ ] STOP: review constraints + request approval to start Treatment 5  
  **Evidence:**

- [ ] Balance table updated (SMD + variance ratios)  
  **Evidence:**
- [ ] Distributional balance plots or eCDF/QQ checks added  
  **Evidence:**
- [ ] Unit-test checks added (fail loudly)  
  **Evidence:**
- [ ] Run report updated (what changed + why)  
  **Evidence:**
- [ ] Post-PSW distributions recorded for ALL covariates (old + new)  
  **Evidence:**

### Final Acceptance Gate (Definition of Done)
- [ ] All validation gates passed  
  **Evidence:**
- [ ] Reproducibility confirmed (seed + hashes if used)  
  **Evidence:**
- [ ] No out-of-scope changes (confirm via git diff summary)  
  **Evidence:**

---

## Debug log (append-only)
Each entry:
- Timestamp:
- What failed:
- Hypothesis:
- Experiment:
- Result:
- Next action:
