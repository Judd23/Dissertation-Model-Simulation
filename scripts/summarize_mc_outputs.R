#!/usr/bin/env Rscript

# Summarize MC outputs into dissertation-ready tables.
#
# Inputs:
# - A lavaan run directory produced by mc_allRQs_PSW_pooled_MG_a1.R with --save_fits 1
#   containing repXXX_pooled_pe.csv and (optionally) repXXX_mg_<W>_pe.csv
# - A diagnostics CSV produced when --diag 1
#
# Outputs (under --out_dir):
# - pooled_param_summary.csv : mean/sd/bias, MC SE, RMSE for selected pooled params
# - pooled_convergence.csv   : convergence and error counts
# - mg_re_all_power.csv      : MG “power” + failure counts (read from diagnostics)
# - diagnostics_summary.csv  : compact summary of key diagnostic columns

suppressWarnings(suppressMessages({
  library(optparse)
}))

option_list <- list(
  make_option(c("--run_dir"), type = "character", default = NULL,
              help = "Run directory under results/lavaan (required)"),
  make_option(c("--diag_csv"), type = "character", default = NULL,
              help = "Diagnostics CSV path (optional; autodetect under results/diagnostics if omitted)"),
  make_option(c("--out_dir"), type = "character", default = "results/tables",
              help = "Output directory (default: %default)"),
  make_option(c("--W"), type = "character", default = "re_all",
              help = "W moderator for MG outputs (default: %default)"),
  make_option(c("--R"), type = "integer", default = 50,
              help = "Nominal number of reps (default: %default)"),
  make_option(c("--seed"), type = "character", default = NA,
              help = "Optional seed/run id string for labeling")
)

opt <- parse_args(OptionParser(option_list = option_list))

stop_if_missing <- function(x, msg) if (is.null(x) || !nzchar(x)) stop(msg)
stop_if_missing(opt$run_dir, "--run_dir is required")
if (!dir.exists(opt$run_dir)) stop("run_dir not found: ", opt$run_dir)

dir.create(opt$out_dir, recursive = TRUE, showWarnings = FALSE)

read_csv_safe <- function(path) {
  if (!file.exists(path)) return(NULL)
  tryCatch(utils::read.csv(path, stringsAsFactors = FALSE), error = function(e) NULL)
}

summ_num <- function(x) {
  x <- x[is.finite(x)]
  if (!length(x)) return(c(n = 0, mean = NA, sd = NA, rmse = NA))
  c(n = length(x), mean = mean(x), sd = sd(x), rmse = sqrt(mean(x^2)))
}

# ------------------------
# Load pooled parameterEstimates (per-rep)
# ------------------------
pe_files <- list.files(opt$run_dir, pattern = "^rep[0-9]{3}_pooled_pe\\.csv$", full.names = TRUE)
if (length(pe_files) == 0) stop("No repXXX_pooled_pe.csv files in ", opt$run_dir)
pe_files <- sort(pe_files)

extract_rep_id <- function(path) {
  m <- regexec("rep([0-9]{3})_", basename(path))
  r <- regmatches(basename(path), m)[[1]]
  if (length(r) < 2) return(NA_integer_)
  as.integer(r[2])
}

pooled_long <- do.call(rbind, lapply(pe_files, function(f) {
  dat <- read_csv_safe(f)
  if (is.null(dat)) return(NULL)
  dat$rep <- extract_rep_id(f)
  dat
}))

if (is.null(pooled_long) || nrow(pooled_long) == 0) stop("Could not read pooled PE CSVs")

# Keep the regression coefficients of primary interest.
# These labels follow lavaan conventions: lhs, op, rhs, label.
# We prefer label-based selection when present.
key_labels <- c("c", "cxz", "cz", "a1", "a1xz", "a1z", "a2", "a2xz", "a2z", "b1", "b2", "d")

sel <- pooled_long
if ("label" %in% names(sel)) {
  sel <- sel[sel$label %in% key_labels, ]
}

# Fall back to lhs/op/rhs if label not present
if (nrow(sel) == 0 && all(c("lhs","op","rhs") %in% names(pooled_long))) {
  sel <- pooled_long[pooled_long$op == "~" & pooled_long$rhs %in% c("X","XZ_c","crdt_d_"), ]
}

if (!all(c("est") %in% names(sel))) stop("Expected column 'est' in pooled PE")

# Summaries per parameter label
param_name <- if ("label" %in% names(sel)) sel$label else paste(sel$lhs, sel$op, sel$rhs)
sel$param <- as.character(param_name)

# Build per-parameter summaries.
pooled_summary <- do.call(rbind, lapply(names(split(sel$est, sel$param)), function(p) {
  x <- sel$est[sel$param == p]
  s <- summ_num(x)
  data.frame(
    param = p,
    n = unname(s["n"]),
    mean_est = unname(s["mean"]),
    sd_est = unname(s["sd"]),
    rmse = unname(s["rmse"]),
    stringsAsFactors = FALSE
  )
}))

utils::write.csv(pooled_summary, file.path(opt$out_dir, "pooled_param_summary.csv"), row.names = FALSE)

# Convergence proxy: number of pooled PE files present
pooled_conv <- data.frame(
  reps_expected = opt$R,
  reps_with_pooled_pe = length(pe_files),
  reps_missing = opt$R - length(pe_files),
  stringsAsFactors = FALSE
)
utils::write.csv(pooled_conv, file.path(opt$out_dir, "pooled_convergence.csv"), row.names = FALSE)

# ------------------------
# Diagnostics summaries (if available)
# ------------------------
# Try to infer diag CSV if omitted.
if (is.null(opt$diag_csv) || !nzchar(opt$diag_csv)) {
  # Look for diagnostics/<run_id>/diagnostics.csv where run_id is basename(run_dir)
  run_id <- basename(normalizePath(opt$run_dir))
  guess <- file.path("results", "diagnostics", run_id, "diagnostics.csv")
  if (file.exists(guess)) opt$diag_csv <- guess
}

diag <- NULL
if (!is.null(opt$diag_csv) && nzchar(opt$diag_csv) && file.exists(opt$diag_csv)) {
  diag <- read_csv_safe(opt$diag_csv)
}

if (!is.null(diag) && nrow(diag) > 0) {
  # Pick a compact set of columns if present.
  keep_cols <- intersect(
    c("rep", "elapsed_sec",
      "pooled_converged", "pooled_ok", "pooled_n_warnings", "pooled_warnings_head",
      "W", "mg_ok", "mg_reason", "mg_err_msg",
      "mg_n_groups", "mg_min_group_n", "mg_groups_n",
      "mg_converged", "mg_n_warnings", "mg_warnings_head",
      "min_cat_prop_overall", "min_cat_prop_overall_var",
      "min_cat_prop_post_mgprep", "min_cat_prop_post_mgprep_var"),
    names(diag)
  )
  diag_small <- diag[, keep_cols, drop = FALSE]
  utils::write.csv(diag_small, file.path(opt$out_dir, "diagnostics_summary.csv"), row.names = FALSE)
}

# ------------------------
# MG power + group a1 summaries (from saved MG outputs)
# ------------------------
mg_txt_files <- list.files(opt$run_dir, pattern = sprintf("^rep[0-9]{3}_mg_%s\\.txt$", opt$W), full.names = TRUE)
mg_pe_files <- list.files(opt$run_dir, pattern = sprintf("^rep[0-9]{3}_mg_%s_pe\\.csv$", opt$W), full.names = TRUE)

extract_first_numeric <- function(x) {
  nums <- suppressWarnings(as.numeric(regmatches(x, gregexpr("[-+]?[0-9]*\\.?[0-9]+([eE][-+]?[0-9]+)?", x))[[1]]))
  if (!length(nums)) return(NA_real_)
  nums[1]
}

parse_wald_p_from_txt <- function(path) {
  if (!file.exists(path)) return(NA_real_)
  lines <- readLines(path, warn = FALSE)
  # Heuristic: find a test line containing "Wald" and "p".
  idx <- grep("Wald|wald", lines)
  if (!length(idx)) return(NA_real_)
  cand <- lines[idx]
  # Prefer lines with p-value token.
  cand2 <- cand[grepl("p", cand, ignore.case = TRUE)]
  if (length(cand2)) cand <- cand2
  # Prefer lines with "p-value" or "p ="
  cand3 <- cand[grepl("p[- ]?value|p\\s*=", cand, ignore.case = TRUE)]
  if (length(cand3)) cand <- cand3
  # Take the last numeric on the best candidate line as p.
  nums <- suppressWarnings(as.numeric(regmatches(cand[1], gregexpr("[-+]?[0-9]*\\.?[0-9]+([eE][-+]?[0-9]+)?", cand[1]))[[1]]))
  if (!length(nums)) return(NA_real_)
  nums[length(nums)]
}

# MG reject indicator (alpha=.05)
mg_pvals <- data.frame(
  rep = vapply(mg_txt_files, extract_rep_id, integer(1)),
  mg_wald_p = vapply(mg_txt_files, parse_wald_p_from_txt, numeric(1)),
  stringsAsFactors = FALSE
)
mg_pvals$mg_wald_reject <- as.integer(is.finite(mg_pvals$mg_wald_p) & mg_pvals$mg_wald_p < 0.05)

if (nrow(mg_pvals) > 0) {
  reps_used <- sum(is.finite(mg_pvals$mg_wald_p))
  power <- if (reps_used > 0) mean(mg_pvals$mg_wald_reject == 1, na.rm = TRUE) else NA_real_
  reps_ok <- reps_used
  reps_failed <- opt$R - reps_ok
  mg_tab <- data.frame(
    W = opt$W,
    alpha = 0.05,
    reps_expected = opt$R,
    reps_with_mg_txt = length(mg_txt_files),
    reps_with_mg_pe = length(mg_pe_files),
    reps_used = reps_used,
    reps_failed = reps_failed,
    power_reject_equal_a1 = power,
    stringsAsFactors = FALSE
  )
  utils::write.csv(mg_tab, file.path(opt$out_dir, sprintf("mg_%s_power.csv", opt$W)), row.names = FALSE)
}

# Group-specific a1 summaries if we can extract per-group a1 from mg PE
if (length(mg_pe_files) > 0) {
  mg_pe_long <- do.call(rbind, lapply(mg_pe_files, function(f) {
    dat <- read_csv_safe(f)
    if (is.null(dat)) return(NULL)
    dat$rep <- extract_rep_id(f)
    dat
  }))

  if (!is.null(mg_pe_long) && nrow(mg_pe_long) > 0 && all(c("label","est","group") %in% names(mg_pe_long))) {
    # In this project MG labels look like: a1_1, a1_2, ... plus a1xz_1, etc.
    # We treat group as numeric and summarize the a1 (X -> M1) path by group.
    a1_rows <- mg_pe_long[grepl("^a1_[0-9]+$", mg_pe_long$label), ]
    if (nrow(a1_rows) > 0) {
      a1_rows$group_id <- as.character(a1_rows$group)

      a1_by_group <- do.call(rbind, lapply(sort(unique(a1_rows$group_id)), function(g) {
        x <- a1_rows$est[a1_rows$group_id == g]
        s <- summ_num(x)
        data.frame(
          group = paste0("g", g),
          n = unname(s["n"]),
          mean_a1 = unname(s["mean"]),
          sd_a1 = unname(s["sd"]),
          stringsAsFactors = FALSE
        )
      }))

      utils::write.csv(a1_by_group, file.path(opt$out_dir, sprintf("mg_%s_a1_by_group.csv", opt$W)), row.names = FALSE)
    }
  }
}

cat("Wrote tables to: ", normalizePath(opt$out_dir), "\n", sep = "")
cat("- pooled_param_summary.csv\n")
cat("- pooled_convergence.csv\n")
if (!is.null(diag)) cat("- diagnostics_summary.csv\n")
if (file.exists(file.path(opt$out_dir, sprintf("mg_%s_power.csv", opt$W)))) cat("- mg_", opt$W, "_power.csv\n", sep = "")
if (file.exists(file.path(opt$out_dir, sprintf("mg_%s_a1_by_group.csv", opt$W)))) cat("- mg_", opt$W, "_a1_by_group.csv\n", sep = "")
