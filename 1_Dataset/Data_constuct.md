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
- [x] STOP: review constraints + request approval to start Treatment 2  
  **Evidence:** User approval: "confirmed".

- [x] Fit marginals to targets (report exact %)  
  **Evidence:** FASt=26.42%; Race: Hispanic/Latino 54.0, White 14.7, Asian 16.5, Black 4.0, Other 10.8; Pell=52.62; Female=60.4; Living: Family 48.2, On-campus 28.4, Off-campus 23.4.
- [x] Archetype conditioning applied (report subgroup summaries)  
  **Evidence:** Time-use means by archetype (hrs): Asian High-Pressure Achiever hacadpr13=11.81, tcare=2.03; Latina Commuter Caretaker hacadpr13=8.83, tcare=3.86; Latino Off-Campus Working hacadpr13=8.16, tcare=3.77; White Off-Campus Working hacadpr13=8.51, tcare=3.34.
- [ ] Correlation sign checks (report r values)  
  **Evidence:**
- [x] Pre-PSW distributions recorded for ALL covariates (old + new)  
  **Evidence:** Missingness overall (%): hacadpr13=0.00, tcare=0.00, StemMaj=0.00, MHWdmental=6.42, MHWdlonely=7.18, QIadvisor=4.40, QIstudent=4.16.

### Validation Gate 2
- [ ] Marginals still within tolerance after conditioning  
  **Evidence:**
- [ ] Subgroup distributions plausible (no extreme collapse)  
  **Evidence:**

---

## Treatment 3: Missingness (MAR/MCAR)
### Approval Gate (Required)
- [x] STOP: review constraints + request approval to start Treatment 3  
  **Evidence:** User approval: "approved".

- [x] MCAR missingness applied (report % by variable)  
  **Evidence:** QI items overall missingness (%): QIadmin=4.34, QIstudent=4.16, QIadvisor=4.40, QIfaculty=4.44, QIstaff=4.00.
- [x] MAR missingness applied (report % by group)  
  **Evidence:** MHW items missingness (%), Asian vs Non-Asian: MHWdacad 8.72 vs 5.01; MHWdlonely 12.59 vs 6.11; MHWdmental 10.41 vs 5.63; MHWdexhaust 7.02 vs 5.37; MHWdsleep 11.99 vs 5.68; MHWdfinancial 9.20 vs 5.15.
- [ ] PS model still fits with missingness strategy  
  **Evidence:** Not run (statsmodels/sklearn not available in environment).

### Validation Gate 3
- [x] Missingness summary table created (overall + by key groups)  
  **Evidence:** Overall (%): MHWdacad=5.62, MHWdlonely=7.18, MHWdmental=6.42, MHWdexhaust=5.64, MHWdsleep=6.72, MHWdfinancial=5.82, QIadmin=4.34, QIstudent=4.16, QIadvisor=4.40, QIfaculty=4.44, QIstaff=4.00. By living (% QI items): With family QIadmin=4.90/QIstudent=4.40/QIadvisor=4.73/QIfaculty=4.36/QIstaff=4.85; On-campus QIadmin=3.38/QIstudent=3.38/QIadvisor=3.38/QIfaculty=3.45/QIstaff=2.04; Off-campus QIadmin=4.37/QIstudent=4.62/QIadvisor=4.97/QIfaculty=5.82/QIstaff=4.62.
- [x] No accidental 0% or runaway missingness  
  **Evidence:** Targeted missingness ranges 2.04%–12.59% across affected items; no 0% or extreme missingness.

---

## Treatment 4: PS Model + Weights (Post-PSW)
### Approval Gate (Required)
- [x] STOP: review constraints + request approval to start Treatment 4  
  **Evidence:** User approval: "Approved".

- [x] Update PS formula (paste exact formula)  
  **Evidence:** `x_FASt ~ hgrades_c + bparented_c + hapcl_c + hprecalc13_c + hchallenge_c + cSFcareer_c + hacadpr13_c + tcare_c + StemMaj_c` (from `4_Model_Results/Outputs/RQ1_RQ3_main/psw_stage_report.txt`).
- [x] Compute propensity + overlap weights  
  **Evidence:** PSW weights summary (non-missing): Min=0.4389, 1Q=0.6211, Median=0.7203, Mean=1.0000, 3Q=1.6845, Max=2.1280 (from `psw_stage_report.txt`).
- [x] Export weighted dataset with diagnostics  
  **Evidence:** `4_Model_Results/Outputs/RQ1_RQ3_main/rep_data_with_psw.csv`, `psw_stage_report.txt`, `psw_balance_smd.txt` exist.

### Validation Gate 4
- [x] Coefficient directions sanity check (report ORs)  
  **Evidence:** ORs (logit PS model): hgrades_c=1.106, bparented_c=1.047, hapcl_c=1.311, hprecalc13_c=1.244, hchallenge_c=1.033, cSFcareer_c=1.000, hacadpr13_c=1.008, tcare_c=0.994, StemMaj_c=1.008.
- [x] Overlap diagnostics (PS quantiles + weight quantiles)  
  **Evidence:** PS quantiles (1%,5%,50%,95%,99%): 0.191, 0.205, 0.258, 0.343, 0.380. PSW quantiles (1%,5%,50%,95%,99%): 0.498, 0.539, 0.720, 2.001, 2.071.
- [x] ESS computed (report values)  
  **Evidence:** ESS overall=3851.8; treated=1316.0; control=3589.6.

---

## Treatment 5: Balance + Guards + Reporting
### Approval Gate (Required)
- [x] STOP: review constraints + request approval to start Treatment 5  
  **Evidence:** User approval: "Approved".

- [x] Balance table updated (SMD + variance ratios)  
  **Evidence:** `4_Model_Results/Outputs/RQ1_RQ3_main/structural/balance.csv` includes SMD_Pre/SMD_Post and VR_Pre/VR_Post for cohort, hgrades, bparented, pell, hapcl, hprecalc13, hchallenge, plus mean/max |SMD|.
- [ ] Distributional balance plots or eCDF/QQ checks added  
  **Evidence:** Not found in outputs (no ECDF/QQ/love plot artifacts located).
- [ ] Unit-test checks added (fail loudly)  
  **Evidence:** Not found in outputs.
- [ ] Run report updated (what changed + why)  
  **Evidence:** Not found in outputs.
- [x] Post-PSW distributions recorded for ALL covariates (old + new)  
  **Evidence:** `4_Model_Results/Summary/psw_balance_report.md` lists max |SMD| pre/post for covariates (hgrades_c, hapcl, hacadpr13_num_c, hprecalc13, StemMaj, bparented_c, pell, hchallenge_c, tcare_num_c, cohort, cSFcareer_c).

### Final Acceptance Gate (Definition of Done)
- [ ] All validation gates passed  
  **Evidence:** Pending remaining unchecked items above.
- [ ] Reproducibility confirmed (seed + hashes if used)  
  **Evidence:** Not found in outputs.
- [ ] No out-of-scope changes (confirm via git diff summary)  
  **Evidence:** Pending final diff review after Treatment 5 completion.

---

## Debug log (append-only)
Each entry:
- Timestamp:
- What failed:
- Hypothesis:
- Experiment:
- Result:
- Next action:
