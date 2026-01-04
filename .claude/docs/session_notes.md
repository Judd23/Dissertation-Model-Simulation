# Session Notes - January 3, 2026

## Last Pipeline Run Status

**Run was killed mid-execution** during RUN B (Measurement Invariance), but:

### Completed:
- **RUN A0, A, A1**: RQ1-RQ3 main analyses (from earlier run, TABLE_CHECK_MODE)
- **RUN B**: RQ4 Measurement Invariance - **FULLY COMPLETE**
  - All 5 grouping variables finished (19 files each):
    - `by_re_all`, `by_firstgen`, `by_pell`, `by_sex`, `by_living18`
  - Last file written: `by_sex/meas_scalar_fitMeasures.txt` at 16:35

### Incomplete/Stale:
- **RUN C2**: RQ4 Structural Multi-Group
  - Folders exist with only 2-3 files each (from Jan 1-2, old run)
  - Needs to be re-run: `W1_re_all`, `W1_sex`, `W2_firstgen`, `W3_pell`, `W4_sex`, `W5_living18`
- **RUN C**: RQ4 Race-stratified (exploratory) - not run

## To Resume

Run full pipeline (will redo everything but fast for completed parts):
```bash
BOOT_NCPUS=8 Rscript 3_Analysis/1_Main_Pipeline_Code/run_all_RQs_official.R
```

Or to add a SKIP_TO_C2 flag, modify `run_all_RQs_official.R`:
1. Add after line 148: `SKIP_TO_C2 <- env_flag("SKIP_TO_C2", FALSE)`
2. Wrap lines 943-1008 (RUN A0/A/A1 fitting) in `if (!isTRUE(SKIP_TO_C2)) { ... }`
3. Wrap lines 1027-1039 (RUN B) in `if (!isTRUE(SKIP_TO_C2)) { ... }`

Then run: `SKIP_TO_C2=1 BOOT_NCPUS=8 Rscript 3_Analysis/1_Main_Pipeline_Code/run_all_RQs_official.R`

## Note on Parallelization

- RUN C2 uses `BOOT_NCPUS` **only if** `BOOTSTRAP_MG=TRUE`
- Default: `BOOTSTRAP_MG=FALSE` means no bootstrap, single-core lavaan fits
- For bootstrapped MG CIs: `BOOTSTRAP_MG=1 BOOT_NCPUS=8`

## Key Files Reference

| Stage | Output Location |
|-------|-----------------|
| RUN A (main) | `4_Model_Results/Outputs/RQ1_RQ3_main/` |
| RUN A0 (total effect) | `4_Model_Results/Outputs/A0_total_effect/` |
| RUN A1 (serial) | `4_Model_Results/Outputs/A1_serial_exploratory/` |
| RUN B (meas inv) | `4_Model_Results/Outputs/RQ4_measurement/by_*` |
| RUN C2 (struct MG) | `4_Model_Results/Outputs/RQ4_structural_MG/W*` |
