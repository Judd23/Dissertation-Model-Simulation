#!/usr/bin/env Rscript

# Johnson–Neyman curves from saved multi-group parameterEstimates CSVs.
#
# Uses repNNN_mg_<W>_pe.csv saved by the MC run.
# Computes conditional effect of X on M1 for moderator Z = credit_dose_c:
#   effect(z) = a1_g + a1xz_g * z
# with an approximation that ignores Cov(a1_g, a1xz_g):
#   Var(effect(z)) = se(a1_g)^2 + z^2 * se(a1xz_g)^2

suppressWarnings(suppressMessages({
  library(optparse)
  library(ggplot2)
}))

source(file.path("r", "utils", "results_paths.R"))
source(file.path("r", "themes", "theme_basic.R"))

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

jn_compute <- function(a1, a1xz, se_a1, se_a1xz, alpha = 0.05) {
  zcrit <- qnorm(1 - alpha / 2)

  A <- a1xz^2 - (zcrit^2) * (se_a1xz^2)
  B <- 2 * a1 * a1xz
  C <- a1^2 - (zcrit^2) * (se_a1^2)

  if (abs(A) < 1e-12) {
    if (abs(B) < 1e-12) return(numeric(0))
    return(-C / B)
  }

  disc <- B^2 - 4 * A * C
  if (disc < 0) return(numeric(0))

  roots <- sort(c((-B - sqrt(disc)) / (2 * A), (-B + sqrt(disc)) / (2 * A)))
  roots
}

make_curve_df <- function(a1, a1xz, se_a1, se_a1xz, zmin, zmax, alpha = 0.05, n = 401) {
  zcrit <- qnorm(1 - alpha / 2)
  z <- seq(zmin, zmax, length.out = n)
  eff <- a1 + a1xz * z
  se_eff <- sqrt(se_a1^2 + (z^2) * se_a1xz^2)
  lo <- eff - zcrit * se_eff
  hi <- eff + zcrit * se_eff

  data.frame(z = z, effect = eff, lo = lo, hi = hi, sig = (lo > 0 | hi < 0))
}

extract_coef_by_group <- function(pe, lhs, rhs, label_prefix = NULL) {
  d <- pe[pe$lhs == lhs & pe$op == "~" & pe$rhs == rhs, , drop = FALSE]
  if (!is.null(label_prefix)) {
    d <- d[grepl(paste0("^", label_prefix), d$label), , drop = FALSE]
  }
  d
}

option_list <- list(
  make_option(c("--run_dir"), type = "character", default = NULL,
              help = "Run directory containing rep*_mg_<W>_pe.csv"),
  make_option(c("--run_id"), type = "character", default = NULL,
              help = "Run id under results/runs/<run_id> (alternative to --run_dir)"),
  make_option(c("--W"), type = "character", default = "re_all",
              help = "W condition name used in filenames (default: %default)"),
  make_option(c("--reps"), type = "character", default = "all",
              help = "Replication selector: all | N | N,M,K | A:B (default: %default)"),
  make_option(c("--alpha"), type = "double", default = 0.05,
              help = "Alpha for two-sided CI/JN (default: %default)"),
  make_option(c("--zmin"), type = "double", default = -2,
              help = "Min moderator value (centered scale) (default: %default)"),
  make_option(c("--zmax"), type = "double", default = 2,
              help = "Max moderator value (centered scale) (default: %default)"),
  make_option(c("--n"), type = "integer", default = 401,
              help = "Number of points in curve (default: %default)"),
  make_option(c("--out_subdir"), type = "character", default = file.path("plots", "jn_mg_curves"),
              help = "Subdirectory under run_dir for curve CSVs (default: %default)"),
  make_option(c("--plot_each"), type = "integer", default = 0,
              help = "If 1, save a per-rep faceted PNG (default: %default)")
)

opt <- parse_args(OptionParser(option_list = option_list))

run_dir <- resolve_run_dir(run_dir = opt$run_dir, run_id = opt$run_id)
if (!dir.exists(run_dir)) stop("run_dir not found: ", run_dir)

rep_selector <- parse_rep_selector(opt$reps)

pattern <- paste0("^rep[0-9]{3}_mg_", opt$W, "_pe\\.csv$")
files <- list.files(run_dir, pattern = pattern, full.names = TRUE)
if (!length(files)) stop("No files matched pattern ", pattern, " in ", run_dir)

if (!is.null(rep_selector)) {
  keep <- sprintf("rep%03d_mg_%s_pe.csv", rep_selector, opt$W)
  files <- files[basename(files) %in% keep]
}
files <- sort(files)
if (!length(files)) stop("No rep files matched selector")

out_dir <- ensure_run_subdir(run_dir, opt$out_subdir)

coef_rows <- list()

cat("Computing JN curves from MG PE CSVs\n")
cat("Run dir: ", normalizePath(run_dir), "\n", sep = "")
cat("W: ", opt$W, " | Files: ", length(files), "\n\n", sep = "")

for (f in files) {
  rep_base <- tools::file_path_sans_ext(basename(f))
  pe <- utils::read.csv(f, stringsAsFactors = FALSE)

  # Extract group-specific a1 and a1xz for M1
  a1_rows <- extract_coef_by_group(pe, lhs = "M1", rhs = "X", label_prefix = "a1")
  a1xz_rows <- extract_coef_by_group(pe, lhs = "M1", rhs = "XZ_c", label_prefix = "a1xz")

  if (!nrow(a1_rows) || !nrow(a1xz_rows)) {
    warning("Missing a1/a1xz rows in ", f)
    next
  }

  groups <- sort(unique(intersect(a1_rows$group, a1xz_rows$group)))
  if (!length(groups)) {
    warning("No overlapping groups for a1/a1xz in ", f)
    next
  }

  curve_all <- list()

  for (g in groups) {
    a1_g <- a1_rows[a1_rows$group == g, , drop = FALSE]
    a1xz_g <- a1xz_rows[a1xz_rows$group == g, , drop = FALSE]

    if (!nrow(a1_g) || !nrow(a1xz_g)) next

    # If multiple matches, take first (should be unique)
    a1 <- a1_g$est[1]
    se_a1 <- a1_g$se[1]
    a1xz <- a1xz_g$est[1]
    se_a1xz <- a1xz_g$se[1]

    roots <- jn_compute(a1 = a1, a1xz = a1xz, se_a1 = se_a1, se_a1xz = se_a1xz, alpha = opt$alpha)

    coef_rows[[length(coef_rows) + 1]] <- data.frame(
      rep_file = basename(f),
      rep = sub("^rep([0-9]{3}).*$", "\\1", basename(f)),
      group = g,
      a1 = a1,
      se_a1 = se_a1,
      a1xz = a1xz,
      se_a1xz = se_a1xz,
      jn_root_1 = if (length(roots) >= 1) roots[1] else NA_real_,
      jn_root_2 = if (length(roots) >= 2) roots[2] else NA_real_,
      stringsAsFactors = FALSE
    )

    d <- make_curve_df(a1, a1xz, se_a1, se_a1xz, zmin = opt$zmin, zmax = opt$zmax, alpha = opt$alpha, n = opt$n)
    d$group <- g
    d$rep <- rep_base
    curve_all[[length(curve_all) + 1]] <- d
  }

  if (!length(curve_all)) next

  curve_df <- do.call(rbind, curve_all)
  out_csv <- file.path(out_dir, paste0(rep_base, "_JN_curve.csv"))
  utils::write.csv(curve_df, out_csv, row.names = FALSE)

  if (opt$plot_each == 1) {
    p <- ggplot(curve_df, aes(x = z, y = effect)) +
      geom_ribbon(aes(ymin = lo, ymax = hi), alpha = 0.2) +
      geom_line(linewidth = 0.8) +
      geom_hline(yintercept = 0, linetype = "dashed", linewidth = 0.6) +
      facet_wrap(~ group, nrow = 1) +
      labs(
        title = "Johnson–Neyman (approx.) for moderated path: X → M1",
        subtitle = rep_base,
        x = "credit_dose_c (centered)",
        y = "Conditional effect of X on M1"
      ) +
      basic_theme(base_size = 11)

    out_png <- file.path(out_dir, paste0(rep_base, "_JN_plot.png"))
    suppressWarnings(ggsave(out_png, p, width = 10, height = 3.2, dpi = 160))
  }
}

coef_df <- if (length(coef_rows)) do.call(rbind, coef_rows) else data.frame()
coef_out <- file.path(out_dir, "jn_mg_coeffs.csv")
utils::write.csv(coef_df, coef_out, row.names = FALSE)

cat("Wrote:\n")
cat("- ", normalizePath(out_dir), " (curve CSVs)\n", sep = "")
cat("- ", coef_out, "\n", sep = "")
