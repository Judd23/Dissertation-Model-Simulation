#!/usr/bin/env Rscript

# Aggregate per-rep Johnson–Neyman curve CSVs into a single figure.
#
# Input: many *_JN_curve.csv files with columns z, effect, lo, hi, sig.
# Output:
# - results/plots/JN_aggregate_<prefix>.pdf  (primary dissertation figure)
# - results/plots/JN_aggregate_<prefix>.png  (preview)
# - results/plots/JN_aggregate_<prefix>.csv  (aggregated curve)
#
# Styling: minimal.

suppressWarnings(suppressMessages({
  library(optparse)
  library(ggplot2)
}))

source(file.path("r", "themes", "theme_basic.R"))

option_list <- list(
  make_option(c("--curves_glob"), type = "character", default = "results/runs/*/plots/pooled_rep*_pooled_JN_curve.csv",
              help = "Glob for per-rep JN curve CSVs (default: %default)"),
  make_option(c("--out_dir"), type = "character", default = "results/plots",
              help = "Output directory (default: %default)"),
  make_option(c("--prefix"), type = "character", default = "pooled_R50",
              help = "Prefix for output files (default: %default)"),
  make_option(c("--zmin"), type = "double", default = -2,
              help = "Min z (default: %default)"),
  make_option(c("--zmax"), type = "double", default = 2,
              help = "Max z (default: %default)"),
  make_option(c("--band"), type = "double", default = 0.95,
              help = "Quantile band for between-rep variation (default: %default)"),
  make_option(c("--title"), type = "character", default = "Johnson-Neyman: Conditional Effect of X on M1",
              help = "Plot title"),
  make_option(c("--subtitle"), type = "character", default = "Median curve with between-rep band (R=50; converged reps)",
              help = "Plot subtitle")
)

opt <- parse_args(OptionParser(option_list = option_list))

dir.create(opt$out_dir, recursive = TRUE, showWarnings = FALSE)

# Expand glob using system ls (portable enough on macOS).
files <- tryCatch(system(paste("ls", opt$curves_glob), intern = TRUE), error = function(e) character(0))
files <- files[file.exists(files)]
if (!length(files)) stop("No curve files matched: ", opt$curves_glob)
files <- sort(files)

read_one <- function(path) {
  dat <- utils::read.csv(path, stringsAsFactors = FALSE)
  dat$source <- basename(path)
  dat
}

curves <- do.call(rbind, lapply(files, read_one))

# Restrict range
curves <- curves[curves$z >= opt$zmin & curves$z <= opt$zmax, ]

qlo <- (1 - opt$band) / 2
qhi <- 1 - qlo

agg <- do.call(rbind, lapply(split(curves, curves$z), function(d) {
  data.frame(
    z = d$z[1],
    effect_med = stats::median(d$effect, na.rm = TRUE),
    effect_lo = stats::quantile(d$effect, probs = qlo, na.rm = TRUE, names = FALSE),
    effect_hi = stats::quantile(d$effect, probs = qhi, na.rm = TRUE, names = FALSE),
    # Proportion significant (per-rep CI excludes 0)
    prop_sig = mean(isTRUE(d$sig), na.rm = TRUE),
    n_reps = length(unique(d$source)),
    stringsAsFactors = FALSE
  )
}))
agg <- agg[order(agg$z), ]

# Approximate JN region from aggregated band: where band excludes 0
agg$band_sig <- (agg$effect_lo > 0) | (agg$effect_hi < 0)

out_csv <- file.path(opt$out_dir, paste0("JN_aggregate_", opt$prefix, ".csv"))
utils::write.csv(agg, out_csv, row.names = FALSE)

p <- ggplot(agg, aes(x = z, y = effect_med)) +
  geom_ribbon(aes(ymin = effect_lo, ymax = effect_hi), fill = "grey80", color = NA) +
  geom_line(linewidth = 0.9, color = "black") +
  geom_hline(yintercept = 0, linetype = "dashed", linewidth = 0.6) +
  labs(
    title = opt$title,
    subtitle = opt$subtitle,
    x = "Moderator (centered Z)",
    y = "Conditional effect of X on M1"
  ) +
  basic_theme(base_size = 12) +
  theme(legend.position = "none")

out_pdf <- file.path(opt$out_dir, paste0("JN_aggregate_", opt$prefix, ".pdf"))
out_png <- file.path(opt$out_dir, paste0("JN_aggregate_", opt$prefix, ".png"))

ggsave(out_pdf, p, width = 6.5, height = 4.5, dpi = 300)
# High-res PNG preview
suppressWarnings(ggsave(out_png, p, width = 6.5, height = 4.5, dpi = 600))

cat("Wrote:\n")
cat("- ", out_pdf, "\n", sep = "")
cat("- ", out_png, "\n", sep = "")
cat("- ", out_csv, "\n", sep = "")
