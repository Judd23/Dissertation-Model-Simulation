#!/usr/bin/env Rscript

# Johnson–Neyman plots from a saved pooled replication output.
#
# This script does NOT re-fit the SEM. It extracts the key interaction terms
# from the saved text output (repNNN_pooled.txt) and produces a J-N plot + CSV.
#
# Why text parsing?
# - Your repo saves lavaan outputs as text (e.g., results/runs/.../rep099_pooled.txt)
# - This lets us reproduce J-N plots without needing to save/load RDS fit objects.
#
# J-N here is for the conditional effect of X on M1 when M1 ~ a1*X + a1xz*XZ_c + a1z*Z + ...
# Effect: dM1/dX = a1 + a1xz * Z
# We treat Z as the centered moderator (credit_dose_c).

suppressWarnings(suppressMessages({
  library(optparse)
  library(ggplot2)
}))

source(file.path("r", "utils", "results_paths.R"))

parse_numeric_after <- function(line, pattern) {
  m <- regexpr(pattern, line, perl = TRUE)
  if (m[1] == -1) return(NA_real_)
  s <- regmatches(line, m)
  as.numeric(sub(pattern, "\\1", s, perl = TRUE))
}

extract_row <- function(lines, var) {
  # Extract the first matching regression row starting with the variable name.
  # Expected row style (from lavaan print):
  #   X         (a1)    0.211    0.038    5.509    0.000
  # We keep it flexible and split on whitespace.
  idx <- grep(paste0("^\\s*", var, "\\b"), lines)
  if (length(idx) == 0) return(NULL)
  row <- lines[idx[1]]

  # Collapse repeated spaces and split
  fields <- strsplit(gsub("\\s+", " ", trimws(row)), " ")[[1]]

  # Heuristic: last 4-5 numeric columns include Estimate, Std.Err, z-value, p
  nums <- suppressWarnings(as.numeric(fields))
  num_pos <- which(!is.na(nums))
  if (length(num_pos) < 4) return(NULL)

  # Use first two numbers as Estimate and Std.Err
  est <- nums[num_pos[1]]
  se  <- nums[num_pos[2]]

  list(var = var, line = row, est = est, se = se)
}

read_rep_txt <- function(path) {
  lines <- readLines(path, warn = FALSE)

  # Slice down to the Regressions block (more robust than searching entire file)
  reg_start <- grep("^Regressions:", lines)
  if (length(reg_start) == 0) stop("Couldn't find 'Regressions:' block in ", path)

  reg_lines <- lines[(reg_start[1] + 1):length(lines)]

  # Grab the three key rows
  x_row  <- extract_row(reg_lines, "X")
  xz_row <- extract_row(reg_lines, "XZ_c")

  # credit_dose is truncated in the print (looks like 'crdt_d_' in your output)
  z_idx <- grep("^\\s*crdt_d_", reg_lines)
  z_row <- if (length(z_idx)) {
    extract_row(reg_lines[z_idx[1]:length(reg_lines)], "crdt_d_")
  } else {
    NULL
  }

  if (is.null(x_row) || is.null(xz_row)) {
    stop("Couldn't extract both X and XZ_c rows from ", path)
  }

  list(
    a1 = x_row$est,
    se_a1 = x_row$se,
    a1xz = xz_row$est,
    se_a1xz = xz_row$se,
    z_label = if (!is.null(z_row)) "credit_dose_c" else "Z",
    source_file = normalizePath(path)
  )
}

jn_compute <- function(a1, a1xz, se_a1, se_a1xz, alpha = 0.05) {
  # Approximate J-N ignoring covariance between a1 and a1xz.
  # Var(a1 + a1xz*z) = se_a1^2 + z^2 * se_a1xz^2
  # Find z where |a1 + a1xz*z| = zcrit * sqrt(se_a1^2 + z^2 * se_a1xz^2)
  zcrit <- qnorm(1 - alpha / 2)

  A <- a1xz^2 - (zcrit^2) * (se_a1xz^2)
  B <- 2 * a1 * a1xz
  C <- a1^2 - (zcrit^2) * (se_a1^2)

  if (abs(A) < 1e-12) {
    # Degenerate case: linear boundary
    if (abs(B) < 1e-12) return(numeric(0))
    return(-C / B)
  }

  disc <- B^2 - 4 * A * C
  if (disc < 0) return(numeric(0))

  roots <- sort(c((-B - sqrt(disc)) / (2 * A), (-B + sqrt(disc)) / (2 * A)))
  roots
}

make_plot_df <- function(a1, a1xz, se_a1, se_a1xz, zmin, zmax, alpha = 0.05, n = 401) {
  zcrit <- qnorm(1 - alpha / 2)
  z <- seq(zmin, zmax, length.out = n)
  eff <- a1 + a1xz * z
  se_eff <- sqrt(se_a1^2 + (z^2) * se_a1xz^2)
  lo <- eff - zcrit * se_eff
  hi <- eff + zcrit * se_eff

  data.frame(z = z, effect = eff, lo = lo, hi = hi)
}

option_list <- list(
  make_option(c("--rep_file"), type = "character", default = NULL,
              help = "Path to repNNN_pooled.txt"),
  make_option(c("--run_dir"), type = "character", default = NULL,
              help = "Directory containing rep*_pooled.txt (if --rep_file not provided)"),
  make_option(c("--run_id"), type = "character", default = NULL,
              help = "Run id under results/runs/<run_id> (optional alternative to --run_dir)"),
  make_option(c("--reps"), type = "character", default = NULL,
              help = "Optional rep filter for --run_dir. Examples: 'all' (default), '99', '1,2,5', '1:10'."),
  make_option(c("--rep"), type = "integer", default = 99,
              help = "Replication ID to use when --run_dir is given (default: %default)"),
  make_option(c("--alpha"), type = "double", default = 0.05,
              help = "Alpha for two-sided CI/JN (default: %default)"),
  make_option(c("--zmin"), type = "double", default = -2,
              help = "Plot range min for moderator (centered scale) (default: %default)"),
  make_option(c("--zmax"), type = "double", default =  2,
              help = "Plot range max for moderator (centered scale) (default: %default)"),
  make_option(c("--out_dir"), type = "character", default = file.path("results", "runs", "_latest", "plots"),
              help = "Output directory (default: %default)"),
  make_option(c("--prefix"), type = "character", default = NULL,
              help = "Optional filename prefix for outputs")
)

opt <- parse_args(OptionParser(option_list = option_list))

if (is.null(opt$rep_file) || !nzchar(opt$rep_file)) {
  opt$run_dir <- resolve_run_dir(run_dir = opt$run_dir, run_id = opt$run_id)
}

parse_rep_selector <- function(x) {
  if (is.null(x) || identical(tolower(x), "all")) return(NULL)
  x <- gsub("\\s+", "", x)
  if (grepl("^[0-9]+$", x)) return(as.integer(x))
  if (grepl("^[0-9]+:[0-9]+$", x)) {
    parts <- strsplit(x, ":")[[1]]
    a <- as.integer(parts[1]); b <- as.integer(parts[2])
    return(seq.int(a, b))
  }
  if (grepl("^[0-9]+(,[0-9]+)+$", x)) return(as.integer(strsplit(x, ",")[[1]]))
  stop("Invalid --reps selector: ", x, " (expected all | N | N,M,K | A:B)")
}

make_one <- function(rep_file, out_dir, alpha, zmin, zmax, prefix_override = NULL) {
  if (!file.exists(rep_file)) {
    warning("rep_file not found: ", rep_file)
    return(invisible(FALSE))
  }

  coefs <- read_rep_txt(rep_file)
  jn_roots <- jn_compute(
    a1 = coefs$a1,
    a1xz = coefs$a1xz,
    se_a1 = coefs$se_a1,
    se_a1xz = coefs$se_a1xz,
    alpha = alpha
  )

  plot_df <- make_plot_df(
    a1 = coefs$a1,
    a1xz = coefs$a1xz,
    se_a1 = coefs$se_a1,
    se_a1xz = coefs$se_a1xz,
    zmin = zmin,
    zmax = zmax,
    alpha = alpha
  )
  plot_df$sig <- with(plot_df, lo > 0 | hi < 0)

  prefix <- prefix_override
  if (is.null(prefix)) {
    prefix <- tools::file_path_sans_ext(basename(rep_file))
  }

  csv_path <- file.path(out_dir, paste0(prefix, "_JN_curve.csv"))
  write.csv(plot_df, csv_path, row.names = FALSE)

  p <- ggplot(plot_df, aes(x = z, y = effect)) +
    geom_ribbon(aes(ymin = lo, ymax = hi), alpha = 0.2) +
    geom_line(linewidth = 0.9) +
    geom_hline(yintercept = 0, linetype = "dashed") +
    theme_minimal(base_size = 12) +
    labs(
      title = "Johnson–Neyman (approx.) for moderated path: X → M1",
      subtitle = sprintf("Source: %s | a1=%.3f (SE=%.3f), a1xz=%.3f (SE=%.3f)",
                         basename(coefs$source_file), coefs$a1, coefs$se_a1, coefs$a1xz, coefs$se_a1xz),
      x = paste0(coefs$z_label, " (centered)"),
      y = "Conditional effect of X on M1"
    )

  if (length(jn_roots) > 0) {
    for (r in jn_roots) {
      if (is.finite(r)) {
        p <- p + geom_vline(xintercept = r, linetype = "dotdash")
      }
    }
  }

  png_path <- file.path(out_dir, paste0(prefix, "_JN_plot.png"))
  ggsave(png_path, p, width = 9, height = 5, dpi = 160)

  cat("Wrote:\n")
  cat("- ", png_path, "\n", sep = "")
  cat("- ", csv_path, "\n", sep = "")
  if (length(jn_roots) == 0) {
    cat("JN: no real roots found (always or never significant under this approximation)\n")
  } else {
    cat("JN roots (approx, ignoring cov): ", paste(sprintf("%.3f", jn_roots), collapse = ", "), "\n", sep = "")
  }
  cat("\n")
  invisible(TRUE)
}

dir.create(opt$out_dir, recursive = TRUE, showWarnings = FALSE)

if (!is.null(opt$rep_file)) {
  make_one(opt$rep_file, opt$out_dir, opt$alpha, opt$zmin, opt$zmax, opt$prefix)
} else {
  if (is.null(opt$run_dir)) {
  opt$run_dir <- "results/runs/seed20251219_N3000_R100_psw1_mg1"
  }
  if (!dir.exists(opt$run_dir)) stop("run_dir not found: ", opt$run_dir)

  rep_selector <- parse_rep_selector(opt$reps)

  files <- list.files(opt$run_dir, pattern = "^rep[0-9]{3}_pooled\\.txt$", full.names = TRUE)
  if (length(files) == 0) stop("No repXXX_pooled.txt files found in ", opt$run_dir)

  if (!is.null(rep_selector)) {
    keep <- sprintf("rep%03d_pooled.txt", rep_selector)
    files <- files[basename(files) %in% keep]
  }

  if (length(files) == 0) stop("No pooled rep files matched selector in ", opt$run_dir)
  files <- sort(files)

  cat("Batch mode: ", length(files), " pooled rep files\n", sep = "")
  cat("Run dir: ", normalizePath(opt$run_dir), "\n\n", sep = "")

  # Optional prefix in batch mode: treated as a prefix for each rep filename
  prefix_base <- opt$prefix
  for (f in files) {
    rep_prefix <- tools::file_path_sans_ext(basename(f))
    if (!is.null(prefix_base)) rep_prefix <- paste0(prefix_base, "_", rep_prefix)
    try(make_one(f, opt$out_dir, opt$alpha, opt$zmin, opt$zmax, rep_prefix), silent = TRUE)
  }
}
