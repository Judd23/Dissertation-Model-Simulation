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

source(file.path("r", "utils", "results_paths.R"))

option_list <- list(
  make_option(c("--run_dir"), type = "character", default = NULL,
              help = "Run directory under results/runs (required)"),
  make_option(c("--run_id"), type = "character", default = NULL,
              help = "Run id under results/runs/<run_id> (optional alternative to --run_dir)"),
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
opt$run_dir <- resolve_run_dir(run_dir = opt$run_dir, run_id = opt$run_id)
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

format_round <- function(x, digits = 3) {
  ifelse(is.na(x), NA, round(x, digits))
}

# ------------------------
# Load pooled parameterEstimates (per-rep)
# ------------------------
pe_files <- list.files(opt$run_dir, pattern = "^rep[0-9]{3}_pooled(_[A-Za-z0-9]+)?_pe\\.csv$", full.names = TRUE)
pe_files <- sort(pe_files)

extract_rep_id <- function(path) {
  m <- regexec("rep([0-9]{3})_", basename(path))
  r <- regmatches(basename(path), m)[[1]]
  if (length(r) < 2) return(NA_integer_)
  as.integer(r[2])
}

pooled_long <- NULL
if (length(pe_files) > 0) {
  pooled_long <- do.call(rbind, lapply(pe_files, function(f) {
    dat <- read_csv_safe(f)
    if (is.null(dat)) return(NULL)
    dat$rep <- extract_rep_id(f)
    dat
  }))
}

# Keep the regression coefficients of primary interest.
# These labels follow lavaan conventions: lhs, op, rhs, label.
# We prefer label-based selection when present.
key_labels <- c("c", "cxz", "cz", "a1", "a1xz", "a1z", "a2", "a2xz", "a2z", "b1", "b2", "d")

# True values used in the simulation (for bias/RMSE reporting)
true_vals <- c(
  c = 0.20,
  cxz = -0.08,
  cz = -0.10,
  a1 = 0.35,
  a1xz = 0.16,
  a1z = 0.20,
  a2 = 0.30,
  a2xz = -0.08,
  a2z = -0.08,
  b1 = -0.30,
  b2 = 0.35,
  d = -0.30
)

apa_labels <- c(
  c = "c (direct effect)",
  cxz = "c×Z (moderation of c)",
  cz = "Z (covariate in Y)",
  a1 = "a1 (X → M1)",
  a1xz = "a1×Z (X → M1 moderation)",
  a1z = "Z (predictor of M1)",
  a2 = "a2 (X → M2)",
  a2xz = "a2×Z (X → M2 moderation)",
  a2z = "Z (predictor of M2)",
  b1 = "b1 (M1 → Y)",
  b2 = "b2 (M2 → Y)",
  d = "d (X → Y residual)"
)

if (length(pe_files) == 0 || is.null(pooled_long) || nrow(pooled_long) == 0) {
  warning(
    "No pooled PE CSVs found/readable under run_dir; skipping pooled tables. ",
    "(Expected files like rep001_pooled_..._pe.csv)."
  )
} else {
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

  # APA/Word-ready pooled table (most complete)
  pooled_apa <- pooled_summary
  pooled_apa$true <- true_vals[pooled_apa$param]
  pooled_apa$bias <- pooled_apa$mean_est - pooled_apa$true
  pooled_apa$mcse_mean <- pooled_apa$sd_est / sqrt(pooled_apa$n)
  pooled_apa$ci95_lo <- pooled_apa$mean_est - 1.96 * pooled_apa$mcse_mean
  pooled_apa$ci95_hi <- pooled_apa$mean_est + 1.96 * pooled_apa$mcse_mean
  pooled_apa$label <- apa_labels[pooled_apa$param]

  # Reorder rows in a standard PROCESS-style order
  order_params <- key_labels
  pooled_apa <- pooled_apa[match(order_params, pooled_apa$param), ]

  # Round for Word
  pooled_apa_out <- data.frame(
    Parameter = pooled_apa$label,
    Symbol = pooled_apa$param,
    True = format_round(pooled_apa$true, 3),
    Mean = format_round(pooled_apa$mean_est, 3),
    SD = format_round(pooled_apa$sd_est, 3),
    MCSE = format_round(pooled_apa$mcse_mean, 3),
    Bias = format_round(pooled_apa$bias, 3),
    RMSE = format_round(pooled_apa$rmse, 3),
    CI95_L = format_round(pooled_apa$ci95_lo, 3),
    CI95_U = format_round(pooled_apa$ci95_hi, 3),
    Reps = pooled_apa$n,
    stringsAsFactors = FALSE
  )

  utils::write.csv(pooled_apa_out, file.path(opt$out_dir, "pooled_param_summary_word_ready.csv"), row.names = FALSE)
}

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
  # Prefer run_dir-local diagnostics first (newer layout)
  guess_local <- file.path(opt$run_dir, "diagnostics", "diagnostics.csv")
  if (file.exists(guess_local)) {
    opt$diag_csv <- guess_local
  } else {
    # Legacy layout: results/diagnostics/<run_id>/diagnostics.csv
    run_id <- basename(normalizePath(opt$run_dir))
    guess_legacy <- file.path("results", "diagnostics", run_id, "diagnostics.csv")
    if (file.exists(guess_legacy)) opt$diag_csv <- guess_legacy
  }
}

diag <- NULL
if (!is.null(opt$diag_csv) && nzchar(opt$diag_csv) && file.exists(opt$diag_csv)) {
  diag <- read_csv_safe(opt$diag_csv)
}

parse_mg_converged_from_txt <- function(txt_path) {
  if (!file.exists(txt_path)) return(NA)
  lines <- readLines(txt_path, warn = FALSE, n = 50)
  hit <- grep("^Converged:\\s*", lines)
  if (!length(hit)) return(NA)
  val <- trimws(sub("^Converged:\\s*", "", lines[hit[1]]))
  if (tolower(val) %in% c("true","t")) return(TRUE)
  if (tolower(val) %in% c("false","f")) return(FALSE)
  NA
}

parse_group_counts_from_txt <- function(txt_path) {
  if (!file.exists(txt_path)) return(NULL)
  lines <- readLines(txt_path, warn = FALSE)
  i <- grep("^\\s*Number of observations per group:", lines)
  if (!length(i)) return(NULL)
  j <- i[1] + 1
  out <- list()
  while (j <= length(lines)) {
    ln <- lines[j]
    if (!nzchar(trimws(ln))) break
    if (!grepl("^\\s+", ln)) break
    # Capture last integer as n; everything before as label
    n <- suppressWarnings(as.integer(sub("^.*?([0-9]+)\\s*$", "\\1", ln)))
    lab <- trimws(sub("\\s+[0-9]+\\s*$", "", ln))
    if (!is.na(n) && nzchar(lab)) out[[lab]] <- n
    j <- j + 1
  }
  if (!length(out)) return(NULL)
  v <- unlist(out)
  names(v) <- names(out)
  v
}

backfill_diag_missing_reps <- function(diag, run_dir, W, R_expected) {
  if (is.null(diag) || nrow(diag) == 0) return(diag)
  if (!"rep" %in% names(diag)) return(diag)

  # Coerce rep to integer safely
  diag$rep <- suppressWarnings(as.integer(diag$rep))
  diag <- diag[!is.na(diag$rep), , drop = FALSE]

  missing <- setdiff(seq_len(R_expected), unique(diag$rep))
  if (!length(missing)) return(diag)

  # Build new rows using the existing diagnostics schema
  cols <- names(diag)
  make_blank <- function() {
    row <- as.list(rep(NA, length(cols)))
    names(row) <- cols
    row
  }

  new_rows <- list()
  for (r in missing) {
    base <- sprintf("rep%03d_mg_%s", r, W)
    txt_path <- file.path(run_dir, paste0(base, ".txt"))
    pe_path <- file.path(run_dir, paste0(base, "_pe.csv"))
    err_path <- file.path(run_dir, sprintf("rep%03d_mg_%s_ERROR.txt", r, W))

    row <- make_blank()
    row$rep <- r

    # Copy run-level fields if present (take from first row)
    for (k in intersect(c("seed","N","R","psw","mg","W"), cols)) {
      if (k == "W") {
        row[[k]] <- W
      } else {
        row[[k]] <- diag[[k]][1]
      }
    }

    # Pooled fields: keep consistent with this run's diag defaults
    if ("pooled_ok" %in% cols) row$pooled_ok <- 1
    if ("pooled_converged" %in% cols) row$pooled_converged <- 0
    if ("pooled_n_warnings" %in% cols) row$pooled_n_warnings <- 0

    # MG status from files
    if (file.exists(err_path)) {
      if ("mg_ok" %in% cols) row$mg_ok <- 0
      if ("mg_reason" %in% cols) row$mg_reason <- "fit_error"
      if ("mg_err_msg" %in% cols) {
        msg <- tryCatch(paste(readLines(err_path, warn = FALSE), collapse = " | "), error = function(e) NA)
        row$mg_err_msg <- ifelse(nzchar(msg), msg, NA)
      }
      if ("mg_converged" %in% cols) row$mg_converged <- 0
    } else if (file.exists(txt_path) && file.exists(pe_path)) {
      if ("mg_ok" %in% cols) row$mg_ok <- 1
      if ("mg_reason" %in% cols) row$mg_reason <- "ok"
      if ("mg_converged" %in% cols) {
        conv <- parse_mg_converged_from_txt(txt_path)
        row$mg_converged <- ifelse(is.na(conv), 1, as.integer(conv))
      }
      if ("mg_n_warnings" %in% cols) row$mg_n_warnings <- 0
    } else {
      # Truly missing outputs
      if ("mg_ok" %in% cols) row$mg_ok <- 0
      if ("mg_reason" %in% cols) row$mg_reason <- "missing_output"
      if ("mg_converged" %in% cols) row$mg_converged <- 0
    }

    # Optional group counts if we can parse them
    if (file.exists(txt_path)) {
      gc <- parse_group_counts_from_txt(txt_path)
      if (!is.null(gc)) {
        if ("mg_groups_n" %in% cols) {
          row$mg_groups_n <- paste(paste0(names(gc), ":", as.integer(gc)), collapse = "|")
        }
        if ("mg_n_groups" %in% cols) row$mg_n_groups <- length(gc)
        if ("mg_min_group_n" %in% cols) row$mg_min_group_n <- min(gc)
      }
    }

    new_rows[[length(new_rows) + 1]] <- row
  }

  new_df <- as.data.frame(do.call(rbind, lapply(new_rows, function(x) {
    # Ensure correct column order
    x[cols]
  })), stringsAsFactors = FALSE)

  out <- rbind(diag, new_df)
  out$rep <- suppressWarnings(as.integer(out$rep))
  out <- out[order(out$rep), , drop = FALSE]

  # Ensure no list columns remain (these break write.csv)
  for (nm in names(out)) {
    if (is.list(out[[nm]])) {
      out[[nm]] <- vapply(out[[nm]], function(v) {
        if (is.null(v) || length(v) == 0) return(NA_character_)
        as.character(v)[1]
      }, character(1))
    }
  }
  out
}

flatten_list_cols <- function(df) {
  if (is.null(df) || nrow(df) == 0) return(df)
  for (nm in names(df)) {
    if (is.list(df[[nm]])) {
      df[[nm]] <- vapply(df[[nm]], function(v) {
        if (is.null(v) || length(v) == 0) return(NA_character_)
        as.character(v)[1]
      }, character(1))
    }
  }
  df
}

if (!is.null(diag) && nrow(diag) > 0) {
  # Backfill missing reps in diagnostics (common after --resume runs)
  diag2 <- backfill_diag_missing_reps(diag, opt$run_dir, opt$W, opt$R)
  if (nrow(diag2) != nrow(diag)) {
    diag <- diag2
    # Persist backfilled diagnostics for downstream scripts
    tryCatch(utils::write.csv(diag, opt$diag_csv, row.names = FALSE), error = function(e) NULL)
  }

  diag <- flatten_list_cols(diag)

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
  diag_small <- flatten_list_cols(diag_small)
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

# MG power table:
# In this repo, the rep-level MG text outputs don't include an explicit Wald-test line,
# and the script does not currently save a per-rep wald CSV for this run.
# So we summarize what we *can* from diagnostics: how many MG reps ran successfully.
mg_tab <- data.frame(
  W = opt$W,
  alpha = 0.05,
  reps_expected = opt$R,
  reps_with_mg_txt = length(mg_txt_files),
  reps_with_mg_pe = length(mg_pe_files),
  reps_used = if (!is.null(diag) && nrow(diag) > 0 && "mg_reason" %in% names(diag)) {
    sum(diag$W == opt$W & diag$mg_reason == "ok", na.rm = TRUE)
  } else {
    NA_integer_
  },
  reps_failed = if (!is.null(diag) && nrow(diag) > 0 && "mg_reason" %in% names(diag)) {
    opt$R - sum(diag$W == opt$W & diag$mg_reason == "ok", na.rm = TRUE)
  } else {
    opt$R - length(mg_txt_files)
  },
  power_reject_equal_a1 = NA_real_,
  note = "Per-rep Wald p-values not found in rep*_mg_*.txt; power available from console summary or if per-rep wald CSVs are saved.",
  stringsAsFactors = FALSE
)
utils::write.csv(mg_tab, file.path(opt$out_dir, sprintf("mg_%s_power.csv", opt$W)), row.names = FALSE)

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
cat("- pooled_param_summary_word_ready.csv\n")
cat("- pooled_convergence.csv\n")
if (!is.null(diag)) cat("- diagnostics_summary.csv\n")
if (file.exists(file.path(opt$out_dir, sprintf("mg_%s_power.csv", opt$W)))) cat("- mg_", opt$W, "_power.csv\n", sep = "")
if (file.exists(file.path(opt$out_dir, sprintf("mg_%s_a1_by_group.csv", opt$W)))) cat("- mg_", opt$W, "_a1_by_group.csv\n", sep = "")
