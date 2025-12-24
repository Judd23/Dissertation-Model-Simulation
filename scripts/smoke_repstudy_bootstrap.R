#!/usr/bin/env Rscript

# Smoke test wrapper for representative-study bootstrap.
#
# Intended usage (from repo root):
#   Rscript scripts/smoke_repstudy_bootstrap.R
#
# This calls the main script in smoke mode (it generates its own data):
#   Rscript r/mc/03_repstudy_bootstrap.R --smoke 1

main_script <- "r/mc/03_repstudy_bootstrap.R"

if (!file.exists(main_script)) {
  stop("Missing main script: ", main_script, " (run from repo root)")
}

cmd <- c(main_script, "--smoke", "1")

status <- system2("Rscript", cmd)
if (!identical(status, 0L)) {
  stop("Smoke test failed (exit code ", status, ")")
}

cat("Smoke test completed. See results/repstudy_bootstrap/*_SMOKE/\n")
