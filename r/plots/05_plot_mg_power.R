#!/usr/bin/env Rscript

# MG power figure (from console.log produced by r/mc/02_mc_allRQs_pooled_mg_psw.R).
#
# Input:
# - results/runs/<run_id>/console.log (default)
# Output:
# - results/runs/<run_id>/plots/MG_power_<W>.pdf (+ PNG)

suppressWarnings(suppressMessages({
  library(optparse)
  library(ggplot2)
}))

source(file.path("r", "themes", "theme_basic.R"))

option_list <- list(
  make_option(c("--run_dir"), type = "character", default = NULL,
              help = "Run directory under results/runs/<run_id> (required)"),
  make_option(c("--log"), type = "character", default = NULL,
              help = "Optional path to console.log (defaults to <run_dir>/console.log)"),
  make_option(c("--diag_csv"), type = "character", default = NULL,
              help = "Optional diagnostics CSV (defaults to <run_dir>/diagnostics/diagnostics.csv if present)"),
  make_option(c("--out_dir"), type = "character", default = NULL,
              help = "Output directory (defaults to <run_dir>/plots)"),
  make_option(c("--W"), type = "character", default = "re_all",
              help = "W label (default: %default)"),
  make_option(c("--title"), type = "character", default = "Multi-group test power",
              help = "Plot title")
)

opt <- parse_args(OptionParser(option_list = option_list))

if (is.null(opt$run_dir) || !nzchar(opt$run_dir)) stop("--run_dir is required")
if (!dir.exists(opt$run_dir)) stop("run_dir not found: ", opt$run_dir)

log_path <- opt$log
if (is.null(log_path) || !nzchar(log_path)) log_path <- file.path(opt$run_dir, "console.log")
if (!file.exists(log_path)) stop("console log not found: ", log_path)

out_dir <- opt$out_dir
if (is.null(out_dir) || !nzchar(out_dir)) out_dir <- file.path(opt$run_dir, "plots")
dir.create(out_dir, recursive = TRUE, showWarnings = FALSE)

lines <- readLines(log_path, warn = FALSE)

# Extract key lines
# Examples:
#   Used reps:191 / 200
#   Power (reject equal a1 across groups): 0.8638743
get_first_match <- function(pattern) {
  idx <- grep(pattern, lines)
  if (!length(idx)) return(NA_character_)
  lines[idx[1]]
}

used_line <- get_first_match("^Used reps:")
power_line <- get_first_match("^Power ")

extract_nums <- function(x) {
  if (is.na(x) || !nzchar(x)) return(numeric(0))
  suppressWarnings(as.numeric(regmatches(x, gregexpr("[-+]?[0-9]*\\.?[0-9]+([eE][-+]?[0-9]+)?", x))[[1]]))
}

used_nums <- extract_nums(used_line)
power_nums <- extract_nums(power_line)

used <- if (length(used_nums) >= 1) used_nums[1] else NA_real_
Rtot <- if (length(used_nums) >= 2) used_nums[2] else NA_real_
power <- if (length(power_nums) >= 1) power_nums[1] else NA_real_

# Prefer diagnostics.csv for rep counts (handles resume-skipped reps cleanly)
read_csv_safe <- function(path) {
  if (!file.exists(path)) return(NULL)
  tryCatch(utils::read.csv(path, stringsAsFactors = FALSE), error = function(e) NULL)
}

diag_path <- opt$diag_csv
if (is.null(diag_path) || !nzchar(diag_path)) {
  guess <- file.path(opt$run_dir, "diagnostics", "diagnostics.csv")
  if (file.exists(guess)) diag_path <- guess
}

diag <- if (!is.null(diag_path) && nzchar(diag_path)) read_csv_safe(diag_path) else NULL
if (!is.null(diag) && nrow(diag) > 0 && all(c("rep","mg_reason") %in% names(diag))) {
  if ("W" %in% names(diag)) diag <- diag[diag$W == opt$W, , drop = FALSE]
  diag$rep <- suppressWarnings(as.integer(diag$rep))
  diag <- diag[!is.na(diag$rep), , drop = FALSE]

  # Only override counts if diagnostics covers the full range
  if (nrow(diag) > 0) {
    if ("R" %in% names(diag) && any(is.finite(diag$R))) {
      Rtot <- as.numeric(diag$R[which(is.finite(diag$R))[1]])
    } else {
      Rtot <- max(diag$rep)
    }
    used <- sum(diag$mg_reason == "ok", na.rm = TRUE)
  }
}

if (!is.finite(power)) {
  stop(
    "Could not parse power from console log. Expected a line like: ",
    "'Power (reject equal a1 across groups): <num>'"
  )
}

plot_df <- data.frame(
  W = opt$W,
  power = power,
  used = used,
  R = Rtot,
  stringsAsFactors = FALSE
)

subtitle <- paste0(
  "W = ", opt$W,
  if (is.finite(used) && is.finite(Rtot)) paste0("; MG ok reps ", used, "/", Rtot) else ""
)

p <- ggplot(plot_df, aes(x = W, y = power)) +
  geom_col(width = 0.55) +
  geom_hline(yintercept = 0.80, linetype = "dashed", linewidth = 0.6) +
  coord_cartesian(ylim = c(0, 1)) +
  labs(
    title = opt$title,
    subtitle = subtitle,
    x = "Moderator",
    y = "Estimated power"
  ) +
  basic_theme(base_size = 12)

out_pdf <- file.path(out_dir, paste0("MG_power_", opt$W, ".pdf"))
out_png <- file.path(out_dir, paste0("MG_power_", opt$W, ".png"))

ggsave(out_pdf, p, width = 6.5, height = 4.5, dpi = 300)
suppressWarnings(ggsave(out_png, p, width = 6.5, height = 4.5, dpi = 600))

cat("Wrote:\n")
cat("- ", out_pdf, "\n", sep = "")
cat("- ", out_png, "\n", sep = "")
