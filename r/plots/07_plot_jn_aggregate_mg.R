#!/usr/bin/env Rscript

# Aggregate MG J–N curve CSVs (produced by 06_compute_jn_from_mg_pe.R)
# into a single faceted figure (one panel per group).

suppressWarnings(suppressMessages({
  library(optparse)
  library(ggplot2)
}))

source(file.path("r", "themes", "theme_basic.R"))

option_list <- list(
  make_option(c("--curves_glob"), type = "character",
              default = "results/runs/*/plots/jn_mg_curves/rep*_mg_*_JN_curve.csv",
              help = "Glob for per-rep MG JN curve CSVs (default: %default)"),
  make_option(c("--group_labels_file"), type = "character", default = NULL,
              help = "Optional path to a rep*_mg_<W>.txt file used to extract group labels (default: auto-detect from run_dir)"),
  make_option(c("--out_dir"), type = "character", default = "results/plots",
              help = "Output directory (default: %default)"),
  make_option(c("--prefix"), type = "character", default = "mg",
              help = "Prefix for output files (default: %default)"),
  make_option(c("--zmin"), type = "double", default = -2,
              help = "Min z (default: %default)"),
  make_option(c("--zmax"), type = "double", default = 2,
              help = "Max z (default: %default)"),
  make_option(c("--band"), type = "double", default = 0.95,
              help = "Quantile band for between-rep variation (default: %default)"),
  make_option(c("--title"), type = "character",
              default = "Johnson–Neyman (approx.): Conditional Effect of X on M1",
              help = "Plot title"),
  make_option(c("--subtitle"), type = "character",
              default = "Median curve with between-rep band (multi-group)",
              help = "Plot subtitle")
)

opt <- parse_args(OptionParser(option_list = option_list))

dir.create(opt$out_dir, recursive = TRUE, showWarnings = FALSE)

files <- tryCatch(system(paste("ls", opt$curves_glob), intern = TRUE), error = function(e) character(0))
files <- files[file.exists(files)]
if (!length(files)) stop("No curve files matched: ", opt$curves_glob)
files <- sort(files)

extract_W_from_curve_name <- function(path) {
  b <- basename(path)
  # Expected: repNNN_mg_<W>_pe_JN_curve.csv (as produced by 06_compute_jn_from_mg_pe.R)
  m <- regexec("^rep[0-9]{3}_mg_(.+)_pe_JN_curve\\.csv$", b)
  g <- regmatches(b, m)[[1]]
  if (length(g) >= 2) return(g[2])
  NA_character_
}

guess_run_dir_from_curve_file <- function(curve_path) {
  # curve files live at: <run_dir>/plots/jn_mg_curves/<file>
  d <- dirname(curve_path)
  # if user passed relative paths, normalize for reliability
  d <- normalizePath(d)
  if (basename(d) != "jn_mg_curves") return(NULL)
  plots_dir <- dirname(d)
  if (basename(plots_dir) != "plots") return(NULL)
  dirname(plots_dir)
}

extract_group_labels_from_mg_txt <- function(txt_path) {
  if (is.null(txt_path) || !nzchar(txt_path) || !file.exists(txt_path)) return(NULL)
  lines <- readLines(txt_path, warn = FALSE)
  m <- regexec("^Group\\s+([0-9]+)\\s+\\[(.*)\\]:\\s*$", lines)
  hits <- regmatches(lines, m)
  hits <- hits[lengths(hits) > 0]
  if (!length(hits)) return(NULL)

  grp <- as.integer(vapply(hits, function(x) x[2], character(1)))
  lab <- vapply(hits, function(x) x[3], character(1))
  out <- stats::setNames(lab, grp)
  out
}

auto_group_labels <- NULL
if (!is.null(opt$group_labels_file) && nzchar(opt$group_labels_file)) {
  auto_group_labels <- extract_group_labels_from_mg_txt(opt$group_labels_file)
} else {
  # Try to infer from the first curve file
  w_guess <- extract_W_from_curve_name(files[1])
  run_dir <- guess_run_dir_from_curve_file(files[1])
  if (!is.na(w_guess) && !is.null(run_dir) && dir.exists(run_dir)) {
    mg_txt_pat <- paste0("^rep[0-9]{3}_mg_", w_guess, "\\.txt$")
    txts <- list.files(run_dir, pattern = mg_txt_pat, full.names = TRUE)
    txts <- sort(txts)
    if (length(txts)) {
      auto_group_labels <- extract_group_labels_from_mg_txt(txts[1])
      if (!is.null(auto_group_labels)) {
        cat("Detected group labels from: ", basename(txts[1]), "\n", sep = "")
      }
    }
  }
}

read_one <- function(path) {
  dat <- utils::read.csv(path, stringsAsFactors = FALSE)
  dat$source <- basename(path)
  dat
}

curves <- do.call(rbind, lapply(files, read_one))
curves <- curves[curves$z >= opt$zmin & curves$z <= opt$zmax, ]

qlo <- (1 - opt$band) / 2
qhi <- 1 - qlo

# Aggregate by group + z
key <- paste(curves$group, curves$z, sep = "::")
agg <- do.call(rbind, lapply(split(curves, key), function(d) {
  data.frame(
    group = d$group[1],
    z = d$z[1],
    effect_med = stats::median(d$effect, na.rm = TRUE),
    effect_lo = stats::quantile(d$effect, probs = qlo, na.rm = TRUE, names = FALSE),
    effect_hi = stats::quantile(d$effect, probs = qhi, na.rm = TRUE, names = FALSE),
    prop_sig = mean(isTRUE(d$sig), na.rm = TRUE),
    n_reps = length(unique(d$source)),
    stringsAsFactors = FALSE
  )
}))
agg$group <- as.integer(agg$group)
agg <- agg[order(agg$group, agg$z), ]
agg$band_sig <- (agg$effect_lo > 0) | (agg$effect_hi < 0)

if (!is.null(auto_group_labels) && length(auto_group_labels)) {
  # Add readable labels while preserving numeric group ordering
  name_vec <- unname(auto_group_labels[as.character(agg$group)])
  agg$group_label <- ifelse(
    is.na(name_vec) | !nzchar(name_vec),
    paste0("Group ", agg$group),
    paste0("Group ", agg$group, ": ", name_vec)
  )
} else {
  agg$group_label <- paste0("Group ", agg$group)
}

out_csv <- file.path(opt$out_dir, paste0("JN_mg_aggregate_", opt$prefix, ".csv"))
utils::write.csv(agg, out_csv, row.names = FALSE)

# Approximate boundary points where aggregated band changes significance
find_boundaries <- function(d) {
  d <- d[order(d$z), ]
  sig <- d$band_sig
  if (!any(sig, na.rm = TRUE)) return(numeric(0))

  idx <- which(sig[-1] != sig[-length(sig)])
  if (!length(idx)) return(numeric(0))

  # Use midpoint between z[i] and z[i+1] as a simple boundary proxy
  (d$z[idx] + d$z[idx + 1]) / 2
}

bnds <- do.call(rbind, lapply(split(agg, agg$group), function(d) {
  zs <- find_boundaries(d)
  if (!length(zs)) {
    data.frame(group = unique(d$group), group_label = unique(d$group_label), boundary = NA_real_, stringsAsFactors = FALSE)
  } else {
    data.frame(group = unique(d$group), group_label = unique(d$group_label), boundary = zs, stringsAsFactors = FALSE)
  }
}))

out_bnds <- file.path(opt$out_dir, paste0("JN_mg_boundaries_", opt$prefix, ".csv"))
utils::write.csv(bnds, out_bnds, row.names = FALSE)

p <- ggplot(agg, aes(x = z, y = effect_med)) +
  geom_ribbon(aes(ymin = effect_lo, ymax = effect_hi), fill = "grey80", color = NA) +
  geom_line(linewidth = 0.9, color = "black") +
  geom_hline(yintercept = 0, linetype = "dashed", linewidth = 0.6) +
  facet_wrap(~ group_label, scales = "free_y") +
  labs(
    title = opt$title,
    subtitle = opt$subtitle,
    x = "credit_dose_c (centered)",
    y = "Conditional effect of X on M1"
  ) +
  basic_theme(base_size = 12) +
  theme(legend.position = "none")

out_pdf <- file.path(opt$out_dir, paste0("JN_mg_aggregate_", opt$prefix, ".pdf"))
out_png <- file.path(opt$out_dir, paste0("JN_mg_aggregate_", opt$prefix, ".png"))

suppressWarnings(ggsave(out_pdf, p, width = 7.5, height = 5.2, dpi = 300))
suppressWarnings(ggsave(out_png, p, width = 7.5, height = 5.2, dpi = 600))

cat("Wrote:\n")
cat("- ", out_pdf, "\n", sep = "")
cat("- ", out_png, "\n", sep = "")
cat("- ", out_csv, "\n", sep = "")
cat("- ", out_bnds, "\n", sep = "")
