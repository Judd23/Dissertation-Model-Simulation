#!/usr/bin/env Rscript
# ==============================================================================
# make_identification_diagram.R
# APA 7 SEM Path Diagram: Second-Order Factor Identification
# ==============================================================================

suppressPackageStartupMessages({
  library(ggplot2)
})

out_dir <- "results/figures"
if (!dir.exists(out_dir)) dir.create(out_dir, recursive = TRUE)

# ==============================================================================
# HELPER
# ==============================================================================

make_ellipse <- function(cx, cy, rx, ry, n = 50) {
  theta <- seq(0, 2 * pi, length.out = n)
  data.frame(x = cx + rx * cos(theta), y = cy + ry * sin(theta))
}

# ==============================================================================
# LAYOUT - VERY COMPACT
# ==============================================================================

# Y positions (tight)
y_2nd <- 5.0
y_1st <- 3.5
y_ind <- 2.0
y_err <- 1.4

# X positions for 4 factors
x_f <- c(-2.4, -0.8, 0.8, 2.4)
names(x_f) <- c("Belong", "Gains", "SupportEnv", "Satisf")

# ==============================================================================
# ACTUAL INDICATOR NAMES FROM MODEL
# ==============================================================================

ind_names <- list(
  Belong     = c("sbval", "sbmy", "sbcom"),
  Gains      = c("pgana", "pgthk", "pgwrk", "pgval", "pgprb"),
  SupportEnv = c("SEaca", "SEwel", "SEnon", "SEact", "SEdiv"),
  Satisf     = c("samin", "evexp")
)

# Build indicator data frame
indicators <- data.frame(
  factor = character(),
  label = character(),
  x = numeric(),
  stringsAsFactors = FALSE
)

for (f in names(x_f)) {
  n <- length(ind_names[[f]])
  # Spread indicators evenly under factor
  if (n == 1) {
    offsets <- 0
  } else {
    span <- min(0.8, 0.2 * (n - 1))  # Max spread
    offsets <- seq(-span/2, span/2, length.out = n)
  }
  for (i in seq_along(ind_names[[f]])) {
    indicators <- rbind(indicators, data.frame(
      factor = f,
      label = ind_names[[f]][i],
      x = x_f[f] + offsets[i],
      stringsAsFactors = FALSE
    ))
  }
}
indicators$y <- y_ind
indicators$parent_x <- x_f[indicators$factor]

# ==============================================================================
# SHAPE SIZES
# ==============================================================================

ell_2nd_rx <- 0.4
ell_2nd_ry <- 0.18

ell_1st_rx <- 0.32
ell_1st_ry <- 0.14

rect_w <- 0.18
rect_h <- 0.12

err_rx <- 0.06
err_ry <- 0.045

# ==============================================================================
# CREATE PLOT
# ==============================================================================

p <- ggplot() +
  coord_cartesian(xlim = c(-3.2, 3.2), ylim = c(1.1, 5.6), expand = FALSE) +
  theme_void() +
  theme(
    plot.background = element_rect(fill = "white", color = NA),
    panel.background = element_rect(fill = "white", color = NA),
    plot.margin = margin(3, 3, 3, 3)
  )

# ==============================================================================
# LAYER 1: SECOND-ORDER PATHS (DevAdj -> factors)
# ==============================================================================

for (i in 1:4) {
  is_marker <- (i == 1)  # Belong = marker
  p <- p + annotate(
    "segment",
    x = 0, y = y_2nd - ell_2nd_ry,
    xend = x_f[i], yend = y_1st + ell_1st_ry,
    linetype = ifelse(is_marker, "dashed", "solid"),
    linewidth = 0.35,
    arrow = arrow(length = unit(0.05, "inches"), type = "closed")
  )
}

# ==============================================================================
# LAYER 2: FIRST-ORDER PATHS (factors -> indicators)
# ==============================================================================

for (i in seq_len(nrow(indicators))) {
  p <- p + annotate(
    "segment",
    x = indicators$parent_x[i], y = y_1st - ell_1st_ry,
    xend = indicators$x[i], yend = y_ind + rect_h / 2,
    linetype = "solid",
    linewidth = 0.25,
    arrow = arrow(length = unit(0.03, "inches"), type = "closed")
  )
}

# ==============================================================================
# LAYER 3: ERROR VARIANCE ARROWS (curved, below indicators)
# ==============================================================================

for (i in seq_len(nrow(indicators))) {
  err_x <- indicators$x[i]
  
  # Draw curved double-headed arrow (variance) on error term
  # Arc below the error circle
  theta <- seq(0.3 * pi, 0.7 * pi, length.out = 15)
  arc_r <- 0.05
  arc_df <- data.frame(
    x = err_x + arc_r * cos(theta),
    y = y_err - err_ry - 0.02 - arc_r * sin(theta)
  )
  p <- p + geom_path(data = arc_df, aes(x = x, y = y), linewidth = 0.15)
}

# ==============================================================================
# LAYER 4: ERROR PATHS (error -> indicator)
# ==============================================================================

for (i in seq_len(nrow(indicators))) {
  p <- p + annotate(
    "segment",
    x = indicators$x[i], y = y_err + err_ry,
    xend = indicators$x[i], yend = y_ind - rect_h / 2,
    linewidth = 0.2,
    arrow = arrow(length = unit(0.02, "inches"), type = "closed")
  )
}

# ==============================================================================
# LAYER 5: SHAPES
# ==============================================================================

# DevAdj ellipse
ell_dev <- make_ellipse(0, y_2nd, ell_2nd_rx, ell_2nd_ry)
p <- p + geom_polygon(data = ell_dev, aes(x = x, y = y),
                      fill = "white", color = "black", linewidth = 0.4)

# First-order factor ellipses
for (i in 1:4) {
  ell <- make_ellipse(x_f[i], y_1st, ell_1st_rx, ell_1st_ry)
  p <- p + geom_polygon(data = ell, aes(x = x, y = y),
                        fill = "white", color = "black", linewidth = 0.3)
}

# Indicator rectangles
for (i in seq_len(nrow(indicators))) {
  p <- p + annotate(
    "rect",
    xmin = indicators$x[i] - rect_w / 2,
    xmax = indicators$x[i] + rect_w / 2,
    ymin = y_ind - rect_h / 2,
    ymax = y_ind + rect_h / 2,
    fill = "white", color = "black", linewidth = 0.25
  )
}

# Error term circles (below indicators)
for (i in seq_len(nrow(indicators))) {
  ell_err <- make_ellipse(indicators$x[i], y_err, err_rx, err_ry)
  p <- p + geom_polygon(data = ell_err, aes(x = x, y = y),
                        fill = "white", color = "black", linewidth = 0.2)
}

# ==============================================================================
# LAYER 6: LABELS IN SHAPES
# ==============================================================================

# DevAdj
p <- p + annotate("text", x = 0, y = y_2nd, label = "DevAdj",
                  size = 2.2, fontface = "italic")

# First-order factor labels (abbreviated)
f_labels <- c("Bel", "Gns", "Sup", "Sat")
for (i in 1:4) {
  p <- p + annotate("text", x = x_f[i], y = y_1st,
                    label = f_labels[i], size = 1.6, fontface = "italic")
}

# Indicator labels
for (i in seq_len(nrow(indicators))) {
  p <- p + annotate("text", x = indicators$x[i], y = y_ind,
                    label = indicators$label[i], size = 0.9)
}

# Error labels (ε)
for (i in seq_len(nrow(indicators))) {
  p <- p + annotate("text", x = indicators$x[i], y = y_err,
                    label = "ε", size = 0.8)
}

# ==============================================================================
# LAYER 7: PATH COEFFICIENTS
# ==============================================================================

# Second-order loadings at midpoint of each path
mid_y <- (y_2nd - ell_2nd_ry + y_1st + ell_1st_ry) / 2

# Belong (marker = 1, dashed)
p <- p + annotate("text", x = (0 + x_f[1]) / 2 - 0.12, y = mid_y + 0.08,
                  label = "1", size = 1.8, fontface = "bold")

# Gains (λ)
p <- p + annotate("text", x = (0 + x_f[2]) / 2 - 0.06, y = mid_y + 0.05,
                  label = "λ", size = 1.5, fontface = "italic")

# SupportEnv (λ)
p <- p + annotate("text", x = (0 + x_f[3]) / 2 + 0.06, y = mid_y + 0.05,
                  label = "λ", size = 1.5, fontface = "italic")

# Satisf (λ)
p <- p + annotate("text", x = (0 + x_f[4]) / 2 + 0.12, y = mid_y + 0.08,
                  label = "λ", size = 1.5, fontface = "italic")

# First-order loadings (just one λ per factor, on leftmost path)
mid_y_1st <- (y_1st - ell_1st_ry + y_ind + rect_h / 2) / 2
for (f in names(x_f)) {
  sub <- indicators[indicators$factor == f, ]
  left_x <- sub$x[1]
  p <- p + annotate("text", x = (x_f[f] + left_x) / 2 - 0.04, y = mid_y_1st + 0.03,
                    label = "λ", size = 1.1, fontface = "italic")
}

# ==============================================================================
# LAYER 8: VARIANCE ANNOTATIONS
# ==============================================================================

# DevAdj variance (ψ free)
p <- p + annotate("text", x = ell_2nd_rx + 0.08, y = y_2nd,
                  label = "ψ free", size = 1.4, hjust = 0, fontface = "italic")

# One first-order variance label
p <- p + annotate("text", x = x_f[4] + ell_1st_rx + 0.05, y = y_1st,
                  label = "ψ=1", size = 1.2, hjust = 0, fontface = "italic")

# ==============================================================================
# LAYER 9: LEGEND
# ==============================================================================

leg_x <- -2.9
leg_y <- 5.4

p <- p +
  annotate("segment", x = leg_x, xend = leg_x + 0.25, y = leg_y, yend = leg_y,
           linetype = "dashed", linewidth = 0.3) +
  annotate("text", x = leg_x + 0.3, y = leg_y, label = "Fixed",
           size = 1.2, hjust = 0) +
  annotate("segment", x = leg_x, xend = leg_x + 0.25, y = leg_y - 0.12, yend = leg_y - 0.12,
           linetype = "solid", linewidth = 0.3) +
  annotate("text", x = leg_x + 0.3, y = leg_y - 0.12, label = "Free",
           size = 1.2, hjust = 0)

# ==============================================================================
# LAYER 10: FIGURE NOTE
# ==============================================================================

note <- "Note. Bel = Belong; Gns = Gains; Sup = SupportEnv; Sat = Satisf. Dashed = fixed (marker); solid = free. ψ = variance."
p <- p + annotate("text", x = 0, y = 1.2, label = note, size = 1.3, hjust = 0.5)

# ==============================================================================
# SAVE
# ==============================================================================

ggsave(file.path(out_dir, "identification_strategy_diagram.png"),
       plot = p, width = 6, height = 4.5, dpi = 300, bg = "white")

ggsave(file.path(out_dir, "identification_strategy_diagram.pdf"),
       plot = p, width = 6, height = 4.5, device = cairo_pdf)

cat("\n========================================================================\n")
cat("  DIAGRAM CREATED\n")
cat("========================================================================\n")
cat("  PNG: results/figures/identification_strategy_diagram.png\n")
cat("  PDF: results/figures/identification_strategy_diagram.pdf\n")
cat("========================================================================\n\n")
