#!/usr/bin/env Rscript

# MG a1-by-group figure.
#
# Input: results/tables/mg_re_all_a1_by_group.csv
# Output: results/runs/<run_id>/plots/MG_a1_by_group_<W>.pdf (+ PNG)

suppressWarnings(suppressMessages({
  library(optparse)
  library(ggplot2)
}))

source(file.path("r", "themes", "theme_basic.R"))

option_list <- list(
  make_option(c("--in_csv"), type = "character", default = "results/tables/mg_re_all_a1_by_group.csv",
              help = "Input CSV with group summaries (default: %default)"),
  make_option(c("--out_dir"), type = "character", default = file.path("results", "runs", "_latest", "plots"),
              help = "Output directory (default: %default)"),
  make_option(c("--W"), type = "character", default = "re_all",
              help = "W label (default: %default)"),
  make_option(c("--title"), type = "character", default = "Multi-group a1 estimates by group",
              help = "Plot title")
)

opt <- parse_args(OptionParser(option_list = option_list))

if (!file.exists(opt$in_csv)) stop("Input not found: ", opt$in_csv)
dir.create(opt$out_dir, recursive = TRUE, showWarnings = FALSE)

dat <- utils::read.csv(opt$in_csv, stringsAsFactors = FALSE)
req_cols <- c("group", "mean_a1", "sd_a1")
if (!all(req_cols %in% names(dat))) {
  stop("Expected columns: ", paste(req_cols, collapse = ", "), ". Found: ", paste(names(dat), collapse = ", "))
}

dat$group <- factor(dat$group, levels = sort(unique(dat$group)))
# Approx 95% interval across-rep variation (not SE of mean)
dat$lo <- dat$mean_a1 - 1.96 * dat$sd_a1
dat$hi <- dat$mean_a1 + 1.96 * dat$sd_a1

p <- ggplot(dat, aes(x = group, y = mean_a1)) +
  geom_point(size = 2.4) +
  geom_errorbar(aes(ymin = lo, ymax = hi), width = 0.15, linewidth = 0.6) +
  geom_hline(yintercept = 0, linetype = "dashed", linewidth = 0.6) +
  labs(
    title = opt$title,
    subtitle = paste0("Moderator W = ", opt$W, "; error bars reflect between-rep variation"),
    x = "Group",
    y = "Mean a1 (across reps)"
  ) +
  basic_theme(base_size = 12)

out_pdf <- file.path(opt$out_dir, paste0("MG_a1_by_group_", opt$W, ".pdf"))
out_png <- file.path(opt$out_dir, paste0("MG_a1_by_group_", opt$W, ".png"))

ggsave(out_pdf, p, width = 6.5, height = 4.5, dpi = 300)
suppressWarnings(ggsave(out_png, p, width = 6.5, height = 4.5, dpi = 600))

cat("Wrote:\n")
cat("- ", out_pdf, "\n", sep = "")
cat("- ", out_png, "\n", sep = "")
