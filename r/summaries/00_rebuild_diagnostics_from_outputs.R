#!/usr/bin/env Rscript

# Rebuild diagnostics.csv from saved run outputs.
#
# This is a recovery utility for cases where diagnostics rows are missing (e.g., resume)
# or the diagnostics file is incomplete/corrupted.

suppressWarnings(suppressMessages({
  library(optparse)
}))

source(file.path("r", "utils", "results_paths.R"))

option_list <- list(
  make_option(c("--run_dir"), type = "character", default = NULL,
              help = "Run directory under results/runs/<run_id> (required)"),
  make_option(c("--run_id"), type = "character", default = NULL,
              help = "Run id under results/runs/<run_id> (alternative to --run_dir)"),
  make_option(c("--W"), type = "character", default = "re_all",
              help = "W label (default: %default)"),
  make_option(c("--R"), type = "integer", default = NA,
              help = "Expected number of reps (default: inferred from run_summary.txt)"),
  make_option(c("--out_csv"), type = "character", default = NULL,
              help = "Output diagnostics.csv path (default: <run_dir>/diagnostics/diagnostics.csv)")
)

opt <- parse_args(OptionParser(option_list = option_list))

run_dir <- resolve_run_dir(run_dir = opt$run_dir, run_id = opt$run_id)
if (!dir.exists(run_dir)) stop("run_dir not found: ", run_dir)

run_sum_path <- file.path(run_dir, "run_summary.txt")
run_summary <- list()
if (file.exists(run_sum_path)) {
  lines <- readLines(run_sum_path, warn = FALSE)
  kv <- strsplit(lines, "=", fixed = TRUE)
  for (p in kv) {
    if (length(p) < 2) next
    k <- trimws(p[1])
    v <- trimws(paste(p[-1], collapse = "="))
    run_summary[[k]] <- v
  }
}

seed <- suppressWarnings(as.integer(run_summary$seed))
N <- suppressWarnings(as.integer(run_summary$N))
Rtot <- suppressWarnings(as.integer(run_summary$R))
psw <- suppressWarnings(as.integer(run_summary$psw))
mg <- suppressWarnings(as.integer(run_summary$mg))

if (is.na(opt$R)) {
  if (!is.na(Rtot)) opt$R <- Rtot else stop("Provide --R (could not infer from run_summary.txt)")
}

parse_mg_converged_from_txt <- function(txt_path) {
  if (!file.exists(txt_path)) return(NA)
  lines <- readLines(txt_path, warn = FALSE, n = 50)
  hit <- grep("^Converged:\\s*", lines)
  if (!length(hit)) return(NA)
  val <- trimws(sub("^Converged:\\s*", "", lines[hit[1]]))
  if (tolower(val) %in% c("true","t")) return(1)
  if (tolower(val) %in% c("false","f")) return(0)
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

rows <- list()
for (r in seq_len(opt$R)) {
  base <- sprintf("rep%03d_mg_%s", r, opt$W)
  txt_path <- file.path(run_dir, paste0(base, ".txt"))
  pe_path <- file.path(run_dir, paste0(base, "_pe.csv"))
  err_path <- file.path(run_dir, sprintf("rep%03d_mg_%s_ERROR.txt", r, opt$W))

  mg_reason <- NA_character_
  mg_ok <- NA_integer_
  mg_err_msg <- NA_character_
  mg_converged <- NA_integer_

  if (file.exists(err_path)) {
    mg_ok <- 0
    mg_reason <- "fit_error"
    mg_err_msg <- tryCatch(paste(readLines(err_path, warn = FALSE), collapse = " | "), error = function(e) NA_character_)
    mg_converged <- 0
  } else if (file.exists(txt_path) && file.exists(pe_path)) {
    mg_ok <- 1
    mg_reason <- "ok"
    mg_converged <- parse_mg_converged_from_txt(txt_path)
    if (is.na(mg_converged)) mg_converged <- 1
  } else {
    mg_ok <- 0
    mg_reason <- "missing_output"
    mg_converged <- 0
  }

  gc <- if (file.exists(txt_path)) parse_group_counts_from_txt(txt_path) else NULL
  mg_groups_n <- if (!is.null(gc)) paste(paste0(names(gc), ":", as.integer(gc)), collapse = "|") else NA_character_
  mg_n_groups <- if (!is.null(gc)) length(gc) else NA_integer_
  mg_min_group_n <- if (!is.null(gc)) min(gc) else NA_integer_

  rows[[length(rows) + 1]] <- data.frame(
    rep = r,
    seed = seed,
    N = N,
    R = opt$R,
    psw = psw,
    mg = mg,
    W = opt$W,
    pooled_ok = 1,
    pooled_converged = 0,
    pooled_n_warnings = 0,
    pooled_warnings_head = NA,
    mg_ok = mg_ok,
    mg_reason = mg_reason,
    mg_err_msg = mg_err_msg,
    mg_n_groups = mg_n_groups,
    mg_min_group_n = mg_min_group_n,
    mg_groups_n = mg_groups_n,
    mg_converged = mg_converged,
    mg_n_warnings = 0,
    mg_warnings_head = NA,
    min_cat_prop_overall = NA,
    min_cat_prop_overall_var = NA,
    min_cat_prop_post_mgprep = NA,
    min_cat_prop_post_mgprep_var = NA,
    elapsed_sec = NA,
    stringsAsFactors = FALSE
  )
}

df <- do.call(rbind, rows)

out_csv <- opt$out_csv
if (is.null(out_csv) || !nzchar(out_csv)) {
  out_csv <- file.path(run_dir, "diagnostics", "diagnostics.csv")
}

dir.create(dirname(out_csv), recursive = TRUE, showWarnings = FALSE)
utils::write.csv(df, out_csv, row.names = FALSE)

cat("Wrote rebuilt diagnostics to:\n")
cat("- ", normalizePath(out_csv), "\n", sep = "")
